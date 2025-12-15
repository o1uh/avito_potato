import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { AddressesService } from './../src/modules/users/services/addresses.service';

describe('Address Logic Verification (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let addressesService: AddressesService;

  const testUser = {
    email: `addr_test_${Date.now()}@example.com`,
    password: 'password123',
    fullName: 'Address Tester',
    companyName: 'Address Test LLC',
    inn: '231690025132',
    phone: '123',
  };

  const forceCleanup = async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
        await prisma.companyAddress.deleteMany({ where: { companyId: user.companyId } });
        await prisma.user.deleteMany({ where: { companyId: user.companyId } });
        await prisma.company.delete({ where: { id: user.companyId } });
    }
    const company = await prisma.company.findUnique({ where: { inn: testUser.inn } });
    if (company) {
        await prisma.companyAddress.deleteMany({ where: { companyId: company.id } });
        await prisma.user.deleteMany({ where: { companyId: company.id } });
        await prisma.company.delete({ where: { id: company.id } });
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    addressesService = app.get(AddressesService);

    await forceCleanup();
  });

  afterAll(async () => {
    await forceCleanup();
    await app.close();
  });

  it('1. Should create Address and CompanyAddress upon registration', async () => {
    // 1. Регистрация
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const user = await prisma.user.findUnique({ 
        where: { email: testUser.email },
        include: { company: true }
    });
    
    console.log(`Company Created: ID ${user.companyId}, Name: ${user.company.name}`);

    // 2. Проверка БД
    const companyAddressLink = await prisma.companyAddress.findFirst({
        where: { companyId: user.companyId },
        include: { address: true, addressType: true }
    });

    if (!companyAddressLink) {
        console.error('ERROR: CompanyAddress link NOT found!');
        // Пытаемся понять, почему. Возможно, DaData вернула пустоту?
        // Но в E2E без ключа должен сработать Mock.
    }

    expect(companyAddressLink).toBeDefined(); // Здесь тест упадет с понятной ошибкой
    expect(companyAddressLink.companyId).toBe(user.companyId);
    expect(companyAddressLink.addressType.name).toBe('Юридический');
    
    const address = companyAddressLink.address;
    expect(address).toBeDefined();
    console.log('Saved Address:', address);
    
    // Проверка данных адреса (ожидаем из мока или реальной DaData)
    expect(address.country).toBe('Россия');
  });

  it('2. Should generate correct address string for PDF', async () => {
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    
    const addressString = await addressesService.getLegalAddressString(user.companyId);
    
    console.log('Formatted Address String:', addressString);

    expect(addressString).not.toBe('Адрес не указан');
    expect(addressString).toMatch(/Москва|Россия/); // Гибкая проверка
  });
});