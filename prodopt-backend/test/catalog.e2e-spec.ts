import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import * as argon2 from 'argon2';

// Увеличиваем глобальный таймаут для этого файла до 60 секунд
jest.setTimeout(60000);

describe('Catalog Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let elastic: ElasticsearchService;

  // Данные поставщика А
  const supplierA = {
    email: `suppA_${Date.now()}@test.com`,
    password: 'pass',
    inn: '7707083893', // Sberbank
    token: '',
    companyId: 0,
  };

  // Данные поставщика Б (для проверки изоляции)
  const supplierB = {
    email: `suppB_${Date.now()}@test.com`,
    password: 'pass',
    inn: '7704340310', // Yandex
    token: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    elastic = app.get(ElasticsearchService);

    // Очистка перед тестом
    await cleanup();

    // Регистрация Поставщика А
    await registerUser(supplierA);
    // Регистрация Поставщика Б
    await registerUser(supplierB);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    // Если инициализация упала, prisma может быть undefined
    if (!prisma) return;

    // Удаляем созданные компании (каскадно удалит юзеров и товары)
    const companyA = await prisma.company.findUnique({ where: { inn: supplierA.inn } });
    if (companyA) await prisma.company.delete({ where: { id: companyA.id } });
    
    const companyB = await prisma.company.findUnique({ where: { inn: supplierB.inn } });
    if (companyB) await prisma.company.delete({ where: { id: companyB.id } });

    // Очистка индекса Elastic
    if (elastic) {
      try {
        await elastic.deleteByQuery({
          index: 'products',
          query: { match_all: {} },
        });
      } catch (e) {}
    }
  }

  async function registerUser(user: any) {
    // Создаем организацию (если нет в seed)
    const orgType = await prisma.organizationType.findFirst();
    
    // Используем AuthService логику или напрямую в БД
    const company = await prisma.company.create({
      data: {
        name: `Company ${user.email}`,
        inn: user.inn,
        ogrn: '123',
        organizationTypeId: orgType?.id || 1,
      },
    });
    user.companyId = company.id;

    const hash = await argon2.hash(user.password);
    await prisma.user.create({
      data: {
        email: user.email,
        fullName: 'Test User',
        passwordHash: hash,
        companyId: company.id,
        roleInCompanyId: 1,
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password });
    
    user.token = loginRes.body.data.accessToken;
  }

  // Хелпер ожидания индексации
  async function waitForIndexRefresh(productId: number, retries = 20, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      await new Promise((r) => setTimeout(r, delay));
      try {
        const result = await elastic.get({
          index: 'products',
          id: productId.toString(),
        });
        if (result.found) return true;
      } catch (e) {
        // ignore 404
      }
    }
    throw new Error(`Product ${productId} not found in Elastic after ${retries} retries`);
  }

  // --- ТЕСТЫ ---

  let createdProductId: number;
  const uniqueProductName = `УникальныйСыр_${Date.now()}`;

  it('1. Create Product (Postgres) - Supplier A', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${supplierA.token}`)
      .send({
        name: uniqueProductName,
        description: 'Вкусный сыр',
        productCategoryId: 1, // Из seed
        variants: [
          {
            variantName: 'Головка 5кг',
            sku: `CHEESE-${Date.now()}`,
            price: 5000,
            minOrderQuantity: 1,
            measurementUnitId: 1,
          },
        ],
      })
      .expect(201);

    createdProductId = res.body.id;
    expect(createdProductId).toBeDefined();
  });

  it('2. Wait for Sync (Elastic)', async () => {
    // Ждем, пока BullMQ обработает задачу и запишет в Elastic
    // Увеличиваем таймаут для этого шага, т.к. очередь может быть ленивой
    await waitForIndexRefresh(createdProductId);
  }, 20000); 

  it('3. Search Product (Elastic)', async () => {
    const res = await request(app.getHttpServer())
      .post('/catalog/search')
      .set('Authorization', `Bearer ${supplierA.token}`)
      .send({
        q: uniqueProductName,
      })
      .expect(200);

    expect(res.body.total).toBeGreaterThanOrEqual(1);
    const item = res.body.items.find((p) => p.id === createdProductId);
    expect(item).toBeDefined();
    expect(item.name).toBe(uniqueProductName);
  });

  it('4. Isolation: Supplier B cannot update Supplier A product', async () => {
    await request(app.getHttpServer())
      .put(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${supplierB.token}`)
      .send({
        name: 'Hacked Name',
        productCategoryId: 1,
        variants: [],
      })
      .expect(403); // ForbiddenException
  });

  it('5. Delete Product', async () => {
    await request(app.getHttpServer())
      .delete(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${supplierA.token}`)
      .expect(200);
    
    // Проверяем удаление из БД
    const product = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(product).toBeNull();
  });

  it('6. Verify deletion from Elastic', async () => {
    // Ждем синхронизации удаления
    await new Promise((r) => setTimeout(r, 2000)); 

    try {
        await elastic.get({
            index: 'products',
            id: createdProductId.toString(),
        });
        throw new Error('Product should be deleted from Elastic');
    } catch (e) {
        expect(e.meta.statusCode).toBe(404);
    }
  });
});