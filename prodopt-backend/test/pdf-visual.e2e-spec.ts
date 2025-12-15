import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from '../src/modules/documents/services/documents.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

jest.setTimeout(60000); // 60 секунд на весь тест

describe('PDF Visual Verification (Save to Disk)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const buyerUser = {
    email: `pdf_buyer_${Date.now()}@test.com`,
    password: 'pass',
    inn: '9913542345',
    token: '',
    companyId: 0,
    userId: 0,
  };

  const supplierUser = {
    email: `pdf_supplier_${Date.now()}@test.com`,
    password: 'pass',
    inn: '0509264119',
    token: '',
    companyId: 0,
    userId: 0,
  };

  const outputDir = path.join(process.cwd(), '_test_pdfs');

  // Вспомогательная функция для очистки
  async function cleanupUser(u: any) {
    if (u.companyId) {
       try {
         // Получаем prisma из приложения, чтобы избежать ошибок инициализации
         const p = app.get(PrismaService); 
         await p.document.deleteMany({ where: { uploadedById: u.userId }});
         await p.productVariant.deleteMany({ where: { product: { supplierCompanyId: u.companyId }}});
         await p.product.deleteMany({ where: { supplierCompanyId: u.companyId }});
         await p.user.deleteMany({ where: { companyId: u.companyId } });
         await p.company.delete({ where: { id: u.companyId } });
       } catch (e) {}
    }
  }

  async function setupUser(u: any, name: string) {
    const orgType = await prisma.organizationType.findFirst();
    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    
    if (existingUser) {
        const tempUser = { ...u, userId: existingUser.id, companyId: existingUser.companyId };
        await cleanupUser(tempUser);
    }

    const company = await prisma.company.create({
      data: { name, inn: u.inn, ogrn: '123', organizationTypeId: orgType?.id || 1, description: 'Test Company for PDF' },
    });
    u.companyId = company.id;

    const hash = await argon2.hash(u.password);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        fullName: `Director of ${name}`,
        passwordHash: hash,
        companyId: company.id,
        roleInCompanyId: 1,
      },
    });
    u.userId = user.id;

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: u.email, password: u.password });
    u.token = res.body.data.accessToken;
  }

  // --- ФУНКЦИЯ ОЖИДАНИЯ ДОКУМЕНТА (POLLING) ---
  // Ждет появления документа в БД до 15 секунд
  async function waitForDocument(entityId: number, docName: string) {
    console.log(`⏳ Waiting for document "${docName}" for deal #${entityId}...`);
    
    for (let i = 0; i < 30; i++) { // 30 попыток * 500мс = 15 секунд
        const doc = await prisma.document.findFirst({
            where: { 
                entityId: entityId, 
                entityType: 'deal', 
                documentType: { name: docName } 
            }
        });

        if (doc) {
            console.log(`✅ Found document: ID ${doc.id}`);
            return doc;
        }
        
        await new Promise(r => setTimeout(r, 500)); // Ждем 500мс
    }
    
    // Если документ так и не нашелся, выводим все документы для отладки
    const allDocs = await prisma.document.findMany({ where: { entityId } });
    console.error('Available documents for this deal:', allDocs);
    
    throw new Error(`Timeout: Document "${docName}" was not created. Check server logs for PDF generation errors.`);
  }

  beforeAll(async () => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    console.log(`📂 PDF files will be saved to: ${outputDir}`);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await setupUser(buyerUser, 'ООО "Покупатель-Тест"');
    await setupUser(supplierUser, 'АО "Поставщик-Продакшн"');
  });

  afterAll(async () => {
    await cleanupUser(buyerUser);
    await cleanupUser(supplierUser);
    await app.close();
  });

  async function downloadAndSaveFile(documentId: number, filename: string, token: string) {
  const docsService = app.get(DocumentsService); 
  
  const signedUrl = await docsService.getDownloadLink(documentId, 1, 1); 
  const response = await axios.get(signedUrl, { responseType: 'arraybuffer' });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, response.data);
  console.log(`💾 Saved to disk: ${filename}`);
}

  it('Should generate Contract and Act with REAL data and save to disk', async () => {
    
    // 0. Supplier: Создаем конкретный товар
    const productRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierUser.token}`)
        .send({
            name: 'Молоко Отборное',
            description: '3.2% жирности',
            productCategoryId: 1,
            variants: [{ 
                variantName: 'Коробка 10л', 
                sku: `MILK-${Date.now()}`, 
                price: 500000, 
                minOrderQuantity: 1, 
                measurementUnitId: 1 
            }]
        })
        .expect(201);
    
    const variantId = productRes.body.variants[0].id;

    // 1. Создаем RFQ
    const rfqRes = await request(app.getHttpServer())
      .post('/trade/rfq')
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({ comment: 'Срочная закупка' })
      .expect(201);
    const rfqId = rfqRes.body.id;

    // 2. Создаем Offer
    const offerRes = await request(app.getHttpServer())
      .post('/trade/offers')
      .set('Authorization', `Bearer ${supplierUser.token}`)
      .send({
        requestId: rfqId,
        offerPrice: 500000, 
        deliveryConditions: 'Доставка до склада в Москве',
        expiresOn: '2025-12-31',
      })
      .expect(201);
    const offerId = offerRes.body.id;

    // 3. Создаем Сделку (ПЕРЕДАЕМ ITEMS ЯВНО!)
    const dealRes = await request(app.getHttpServer())
      .post('/trade/deals/from-offer')
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({ 
          offerId,
          items: [
              { productVariantId: variantId, quantity: 1 }
          ]
      })
      .expect(201);
    const dealId = dealRes.body.id;

    // --- ПРОВЕРКА И СКАЧИВАНИЕ ДОГОВОРА ---
    // Используем новую функцию ожидания вместо sleep
    const contractDoc = await waitForDocument(dealId, 'Договор');
    
    expect(contractDoc).not.toBeNull(); // Строгая проверка
    await downloadAndSaveFile(contractDoc.id, `Contract_Deal_${dealId}.pdf`, buyerUser.token);

    // 4. Двигаем сделку
    await request(app.getHttpServer())
        .post(`/trade/deals/${dealId}/accept`)
        .set('Authorization', `Bearer ${buyerUser.token}`)
        .expect(201);

    await request(app.getHttpServer())
        .post(`/dev/trade/deals/${dealId}/deposit`)
        .set('Authorization', `Bearer ${buyerUser.token}`)
        .send({ amount: 500000 })
        .expect(201);

    await request(app.getHttpServer())
        .post(`/trade/deals/${dealId}/shipment`)
        .set('Authorization', `Bearer ${supplierUser.token}`)
        .send({ trackingNumber: `TRACK-${Date.now()}` })
        .expect(201);

    await request(app.getHttpServer())
        .post(`/trade/deals/${dealId}/confirm`)
        .set('Authorization', `Bearer ${buyerUser.token}`)
        .expect(201);

    // --- ПРОВЕРКА И СКАЧИВАНИЕ АКТА ---
    const actDoc = await waitForDocument(dealId, 'Акт');

    expect(actDoc).not.toBeNull();
    await downloadAndSaveFile(actDoc.id, `Act_Deal_${dealId}.pdf`, buyerUser.token);
  });
});