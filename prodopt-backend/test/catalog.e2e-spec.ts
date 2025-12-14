import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import * as argon2 from 'argon2';

jest.setTimeout(60000);

describe('Catalog Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let elastic: ElasticsearchService;

  const supplierA = {
    email: `suppA_${Date.now()}@test.com`,
    password: 'pass',
    inn: '7728168971', // Ашан (Уникальный для этого теста)
    token: '',
    companyId: 0,
  };

  const supplierB = {
    email: `suppB_${Date.now()}@test.com`,
    password: 'pass',
    inn: '7703270067', // Перекресток (Уникальный)
    token: '',
  };

  // ... (beforeAll, afterAll, cleanup, registerUser остаются почти такими же, 
  //      но используйте новые ИНН и добавьте обработку ошибок очистки как в auth.e2e-spec.ts) ...

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    elastic = app.get(ElasticsearchService);

    await cleanup();
    await registerUser(supplierA);
    await registerUser(supplierB);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    if (!prisma) return;
    const deleteCo = async (inn) => {
        const c = await prisma.company.findUnique({ where: { inn } });
        if (c) {
            await prisma.productVariant.deleteMany({ where: { product: { supplierCompanyId: c.id } } });
            await prisma.productImage.deleteMany({ where: { product: { supplierCompanyId: c.id } } });
            await prisma.product.deleteMany({ where: { supplierCompanyId: c.id } });
            await prisma.user.deleteMany({ where: { companyId: c.id } });
            await prisma.company.delete({ where: { id: c.id } });
        }
    }
    await deleteCo(supplierA.inn);
    await deleteCo(supplierB.inn);
    
    if (elastic) {
      try { await elastic.deleteByQuery({ index: 'products', query: { match_all: {} } }); } catch (e) {}
    }
  }

  async function registerUser(user: any) {
    const orgType = await prisma.organizationType.findFirst();
    const company = await prisma.company.create({
      data: { name: `Company ${user.email}`, inn: user.inn, ogrn: '123', organizationTypeId: orgType?.id || 1 },
    });
    user.companyId = company.id;
    const hash = await argon2.hash(user.password);
    await prisma.user.create({
      data: { email: user.email, fullName: 'Test User', passwordHash: hash, companyId: company.id, roleInCompanyId: 1 },
    });
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: user.password });
    user.token = loginRes.body.data.accessToken;
  }

  async function waitForIndexRefresh(productId: number, retries = 20, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      await new Promise((r) => setTimeout(r, delay));
      try {
        const result = await elastic.get({ index: 'products', id: productId.toString() });
        if (result.found) return true;
      } catch (e) {}
    }
    throw new Error(`Product ${productId} not found in Elastic`);
  }

  let createdProductId: number;
  const uniqueProductName = `УникальныйСыр_${Date.now()}`;

  it('1. Create Product (Postgres) - Supplier A', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${supplierA.token}`)
      .send({
        name: uniqueProductName,
        description: 'Вкусный сыр',
        productCategoryId: 1,
        variants: [{ variantName: 'Головка 5кг', sku: `CHEESE-${Date.now()}`, price: 5000, minOrderQuantity: 1, measurementUnitId: 1 }],
      })
      .expect(201);
    createdProductId = res.body.id;
    expect(createdProductId).toBeDefined();
  });

  it('2. Wait for Sync (Elastic)', async () => {
    await new Promise((r) => setTimeout(r, 1000));
    await elastic.indices.refresh({ index: 'products' });
    await waitForIndexRefresh(createdProductId);
  }, 20000);

  it('3. Search Product (Elastic)', async () => {
    const res = await request(app.getHttpServer())
      .post('/catalog/search')
      .set('Authorization', `Bearer ${supplierA.token}`)
      .send({ q: uniqueProductName })
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('4. Isolation: Supplier B cannot update Supplier A product', async () => {
    await request(app.getHttpServer())
      .put(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${supplierB.token}`)
      .send({ name: 'Hacked Name', productCategoryId: 1, variants: [] })
      .expect(403);
  });

  it('5. Delete Product', async () => {
    await request(app.getHttpServer())
      .delete(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${supplierA.token}`)
      .expect(200);
    const product = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(product).toBeNull();
  });

  it('6. Verify deletion from Elastic', async () => {
    await new Promise((r) => setTimeout(r, 2000));
    try {
        await elastic.get({ index: 'products', id: createdProductId.toString() });
        throw new Error('Product should be deleted from Elastic');
    } catch (e) {
        // ИСПРАВЛЕНИЕ: Проверка статуса ошибки
        const status = e.meta?.statusCode || e.statusCode || 0;
        if (status === 404 || (e.message && e.message.includes('Not Found'))) {
            expect(true).toBe(true);
        } else {
            throw e;
        }
    }
  });
});