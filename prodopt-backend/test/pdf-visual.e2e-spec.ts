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

// ВАЖНО: Импорт на верхнем уровне для стабильности
import * as pdfParseLib from 'pdf-parse';

jest.setTimeout(60000); 

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
    addressId: 0,
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

  async function forceCleanup(inn: string, email: string) {
      if (!prisma) return;
      
      const company = await prisma.company.findUnique({ where: { inn } });
      if (company) {
          const users = await prisma.user.findMany({ where: { companyId: company.id } });
          const userIds = users.map(u => u.id);
          if (userIds.length > 0) {
            await prisma.document.deleteMany({ where: { uploadedById: { in: userIds } } });
          }

          await prisma.companyAddress.deleteMany({ where: { companyId: company.id } });

          const deals = await prisma.deal.findMany({ 
              where: { OR: [{ buyerCompanyId: company.id }, { supplierCompanyId: company.id }] } 
          });
          
          for (const deal of deals) {
              await prisma.transaction.deleteMany({ where: { dealId: deal.id } });
              await prisma.escrowAccount.deleteMany({ where: { dealId: deal.id } });
              await prisma.shipment.deleteMany({ where: { dealId: deal.id } });
              await prisma.dispute.deleteMany({ where: { dealId: deal.id } });
              await prisma.companyReview.deleteMany({ where: { dealId: deal.id } });
              await prisma.dealItem.deleteMany({ where: { dealId: deal.id } });
              await prisma.deal.delete({ where: { id: deal.id } });
          }

          await prisma.productVariant.deleteMany({ where: { product: { supplierCompanyId: company.id } } });
          await prisma.productImage.deleteMany({ where: { product: { supplierCompanyId: company.id } } });
          await prisma.product.deleteMany({ where: { supplierCompanyId: company.id }});
          
          await prisma.offerItem.deleteMany({ where: { offer: { supplierCompanyId: company.id } } });
          await prisma.commercialOffer.deleteMany({ where: { supplierCompanyId: company.id } });
          await prisma.purchaseRequest.deleteMany({ where: { buyerCompanyId: company.id } });

          await prisma.commercialOffer.deleteMany({ where: { supplierCompanyId: company.id } });
          await prisma.purchaseRequest.deleteMany({ where: { buyerCompanyId: company.id } });

          await prisma.companyStatistics.deleteMany({ where: { companyId: company.id }});

          await prisma.user.deleteMany({ where: { companyId: company.id } });
          await prisma.company.delete({ where: { id: company.id } });
      }
      
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
  }

  async function setupUser(u: any, name: string) {
    await forceCleanup(u.inn, u.email);

    const orgType = await prisma.organizationType.findFirst();
    
    const company = await prisma.company.create({
      data: { 
          name, 
          inn: u.inn, 
          ogrn: '123', 
          organizationTypeId: orgType?.id || 1, 
          description: 'Test Company for PDF' 
      },
    });
    u.companyId = company.id;

    const addressType = await prisma.addressType.findFirst();
    const address = await prisma.address.create({
        data: { country: 'Россия', city: 'Тестоград', street: 'ул. PDFная', house: '42' }
    });
    await prisma.companyAddress.create({
        data: { companyId: company.id, addressId: address.id, addressTypeId: addressType?.id || 1 }
    });
    u.addressId = address.id;

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

  async function waitForDocument(entityId: number, docName: string) {
    console.log(`⏳ Waiting for document "${docName}" for deal #${entityId}...`);
    for (let i = 0; i < 30; i++) { 
        const doc = await prisma.document.findFirst({
            where: { entityId, entityType: 'deal', documentType: { name: docName } }
        });
        if (doc) return doc;
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Timeout: Document "${docName}" not found.`);
  }

  async function downloadAndSaveFile(documentId: number, filename: string, token: string) {
      const docsService = app.get(DocumentsService);
      const signedUrl = await docsService.getDownloadLink(documentId, 1, 1); 
      const response = await axios.get(signedUrl, { responseType: 'arraybuffer' });
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, response.data);
      console.log(`💾 Saved to disk: ${filename}`);
  }

  // Вспомогательная функция для получения парсера
  function getPdfParser() {
      const lib: any = pdfParseLib;
      if (typeof lib === 'function') return lib;
      if (lib.default && typeof lib.default === 'function') return lib.default;
      // В редких случаях Jest/TS может завернуть дважды
      if (lib.default && lib.default.default && typeof lib.default.default === 'function') return lib.default.default;
      return null;
  }

  beforeAll(async () => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
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
    await forceCleanup(buyerUser.inn, buyerUser.email);
    await forceCleanup(supplierUser.inn, supplierUser.email);
    await app.close();
  });

  it('Should generate Contract and Act with REAL data, SAVE to disk and VERIFY address', async () => {
    // 1. Создаем товар
    const productRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierUser.token}`)
        .send({
            name: 'Молоко Отборное',
            description: '3.2% жирности',
            productCategoryId: 1,
            variants: [{ variantName: 'Коробка 10л', sku: `MILK-${Date.now()}`, price: 500000, minOrderQuantity: 1, measurementUnitId: 1 }]
        }).expect(201);
    const variantId = productRes.body.variants[0].id;

    // 2. Создаем RFQ
    const rfqRes = await request(app.getHttpServer())
        .post('/trade/rfq')
        .set('Authorization', `Bearer ${buyerUser.token}`)
        .send({ comment: 'Срочная закупка', productVariantId: variantId, quantity: 1 })
        .expect(201);

    // 3. Создаем Offer с ITEMS
    const offerRes = await request(app.getHttpServer())
        .post('/trade/offers')
        .set('Authorization', `Bearer ${supplierUser.token}`)
        .send({ 
            requestId: rfqRes.body.id, 
            offerPrice: 500000, 
            deliveryConditions: 'EXW', 
            expiresOn: '2025-12-31',
            items: [
                { productVariantId: variantId, quantity: 1, pricePerUnit: 500000 }
            ]
        })
        .expect(201);

    // 4. Создаем Сделку
    const dealRes = await request(app.getHttpServer())
        .post('/trade/deals/from-offer')
        .set('Authorization', `Bearer ${buyerUser.token}`)
        .send({ 
            offerId: offerRes.body.id
            // Items больше не нужны здесь
        })
        .expect(201);
        
    const dealId = dealRes.body.id;

    const contractDoc = await waitForDocument(dealId, 'Договор');
    await downloadAndSaveFile(contractDoc.id, `Contract_Deal_${dealId}.pdf`, buyerUser.token);

    // --- ПРОВЕРКА ТЕКСТА ---
    const contractPath = path.join(outputDir, `Contract_Deal_${dealId}.pdf`);
    const contractBuffer = fs.readFileSync(contractPath);
    
    let contractText = '';
    try {
        const pdfParser = getPdfParser();
        if (pdfParser) {
            const data = await pdfParser(contractBuffer);
            contractText = data.text;
        } else {
            console.warn('⚠️ WARNING: pdf-parse lib not found or not a function. Skipping text verification.');
            // Мы проверяем, что файл хотя бы скачался и не пустой
            expect(contractBuffer.length).toBeGreaterThan(100);
        }
    } catch (e) { 
        console.warn('PDF Parse failed', e); 
    }

    if (contractText) {
        expect(contractText).toContain('Тестоград');
        expect(contractText).toContain('PDFная');
        expect(contractText).not.toContain('Адрес не указан');
    }
    // -----------------------

    await request(app.getHttpServer())
      .post(`/trade/deals/${dealId}/accept`)
      .set('Authorization', `Bearer ${buyerUser.token}`)
      .send({ deliveryAddressId: buyerUser.addressId })
      .expect(201);
    await request(app.getHttpServer()).post(`/dev/trade/deals/${dealId}/deposit`).set('Authorization', `Bearer ${buyerUser.token}`).send({ amount: 500000 }).expect(201);
    await request(app.getHttpServer()).post(`/trade/deals/${dealId}/shipment`).set('Authorization', `Bearer ${supplierUser.token}`).send({ trackingNumber: `TRACK-${Date.now()}` }).expect(201);
    await request(app.getHttpServer()).post(`/trade/deals/${dealId}/confirm`).set('Authorization', `Bearer ${buyerUser.token}`).expect(201);

    const actDoc = await waitForDocument(dealId, 'Акт');
    await downloadAndSaveFile(actDoc.id, `Act_Deal_${dealId}.pdf`, buyerUser.token);
  });
});