import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. Типы организаций
  const orgTypes = ['ИП', 'ООО', 'АО', 'ПАО', 'Самозанятый'];
  for (const name of orgTypes) {
    await prisma.organizationType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Единицы измерения
  const units = ['кг', 'г', 'тонна', 'литр', 'шт', 'упаковка', 'коробка'];
  for (const name of units) {
    await prisma.measurementUnit.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Категории товаров
  const categories = [
    { name: 'Молочная продукция' },
    { name: 'Мясо и птица' },
    { name: 'Овощи и фрукты' },
    { name: 'Бакалея' },
    { name: 'Напитки' },
  ];
  
  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name },
    });
  }

  // 4. Статусы верификации
  await prisma.verificationStatus.upsert({ where: { name: 'Не верифицирован' }, update: {}, create: { id: 1, name: 'Не верифицирован' } });
  await prisma.verificationStatus.upsert({ where: { name: 'Верифицирован' }, update: {}, create: { id: 2, name: 'Верифицирован' } });

  // 5. Статусы товаров
  const productStatuses = ['Черновик', 'Опубликован', 'Архив', 'На модерации'];
  for (const name of productStatuses) {
    await prisma.productStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 6. Создание Супер-Админа и Компании Платформы
  const adminEmail = 'admin@prodopt.ru';
  const platformOoo = await prisma.organizationType.findFirst({ where: { name: 'ООО' } });
  
  // ИСПОЛЬЗУЕМ ВАЛИДНЫЙ ИНН
  const validInn = '7736207543'; 

  const adminCompany = await prisma.company.upsert({
    where: { inn: validInn }, 
    update: {},
    create: {
      name: 'ПродОпт Администрация',
      inn: validInn, 
      ogrn: '1027700229193', // Реальный ОГРН для приличия
      organizationTypeId: platformOoo?.id || 1,
      rating: 5.0,
    },
  });

  // Создаем пользователя
  const passwordHash = await argon2.hash('admin123');
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: 'Super Admin',
      passwordHash: passwordHash,
      roleInCompanyId: 1, // Пока заглушка, т.к. таблица ролей не заполнена в этом скрипте, но поле Int
      companyId: adminCompany.id,
      phone: '+70000000000',
    },
  });

  // 7. Типы документов
  const docTypes = ['Договор', 'Счет', 'УПД', 'Акт', 'Сертификат'];
  for (const name of docTypes) {
    await prisma.documentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 8. Статусы документов
  const docStatuses = ['Создан', 'На проверке', 'Подписан', 'Отклонен'];
  for (const name of docStatuses) {
    await prisma.documentStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 9. Статусы запросов (RFQ)
  const reqStatuses = ['New', 'Closed'];
  for (const name of reqStatuses) {
    await prisma.requestStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 10. Статусы офферов
  const offerStatuses = ['Sent', 'Accepted', 'Rejected'];
  for (const name of offerStatuses) {
    await prisma.offerStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 11. Статусы сделок (DealStatus)
  // ВАЖНО: ID должны совпадать с DealStatus enum (utils/deal-state-machine.ts)
  // 1=CREATED, 2=AGREED, 3=PAID, 4=SHIPPED, 5=COMPLETED, 6=CANCELED, 7=DISPUTE
  const dealStatuses = [
    { id: 1, name: 'Created' },
    { id: 2, name: 'Agreed' },
    { id: 3, name: 'Paid' },
    { id: 4, name: 'Shipped' },
    { id: 5, name: 'Completed' },
    { id: 6, name: 'Canceled' },
    { id: 7, name: 'Dispute' },
  ];
  
  for (const s of dealStatuses) {
    // Используем upsert по ID, чтобы гарантировать совпадение с Enum
    // Т.к. поле name уникально, а id автоинкремент, upsert по id может не сработать если есть конфликт имен.
    // Но так как это seed, предполагаем чистоту или совпадение.
    // Проще найти по имени, но тогда ID могут уехать.
    // Для надежности в тестах лучше создавать, если пусто. 
    // Но тут попробуем жестко задать ID при создании.
    
    const existing = await prisma.dealStatus.findFirst({ where: { id: s.id } });
    if (!existing) {
        // Если ID занят другим именем (вряд ли), это проблема.
        // Пытаемся создать с конкретным ID
        await prisma.dealStatus.create({ data: { id: s.id, name: s.name } });
    }
  }

  // 12. Статусы Cooperation Request
  const coopStatuses = ['Pending', 'Approved', 'Rejected'];
  for (const name of coopStatuses) {
    await prisma.cooperationRequestStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  
  // 13. Статусы Эскроу
  const escrowStatuses = [
      { id: 1, name: 'Waiting Payment' },
      { id: 2, name: 'Funded' },
      { id: 3, name: 'Released' },
      { id: 4, name: 'Refunded' }
  ];
  for (const s of escrowStatuses) {
      const existing = await prisma.escrowAccountStatus.findFirst({ where: { id: s.id } });
      if (!existing) {
          await prisma.escrowAccountStatus.create({ data: { id: s.id, name: s.name } });
      }
  }

  // 14. Типы транзакций
  const txTypes = [
      { id: 1, name: 'Deposit' },
      { id: 2, name: 'Release' },
      { id: 3, name: 'Refund' }
  ];
  for (const s of txTypes) {
      const existing = await prisma.transactionType.findFirst({ where: { id: s.id } });
      if (!existing) {
          await prisma.transactionType.create({ data: { id: s.id, name: s.name } });
      }
  }
  
  // 15. Статусы транзакций
  const txStatuses = [
      { id: 1, name: 'Pending' },
      { id: 2, name: 'Success' },
      { id: 3, name: 'Fail' }
  ];
  for (const s of txStatuses) {
      const existing = await prisma.transactionStatus.findFirst({ where: { id: s.id } });
      if (!existing) {
          await prisma.transactionStatus.create({ data: { id: s.id, name: s.name } });
      }
  }

  // 16. Статусы доставки (Logistics)
  const deliveryStatuses = [
      { id: 1, name: 'In Transit' }, // В пути
      { id: 2, name: 'Delivered' },  // Доставлено
      { id: 3, name: 'Problem' }     // Проблема
  ];
  
  for (const s of deliveryStatuses) {
      // Используем upsert, чтобы скрипт можно было запускать много раз
      await prisma.deliveryStatus.upsert({
          where: { id: s.id },
          update: {},
          create: { id: s.id, name: s.name }
      });
  }

  // 17. Статусы споров
  const disputeStatuses = [
      { id: 1, name: 'Open' },
      { id: 2, name: 'Closed' }
  ];
  for (const s of disputeStatuses) {
      await prisma.disputeStatus.upsert({
          where: { id: s.id }, update: {}, create: { id: s.id, name: s.name }
      });
  }

  // 18. Статусы отзывов
  const reviewStatuses = [
      { id: 1, name: 'On Moderation' },
      { id: 2, name: 'Published' },
      { id: 3, name: 'Rejected' }
  ];
  for (const s of reviewStatuses) {
      await prisma.reviewStatus.upsert({
          where: { id: s.id }, update: {}, create: { id: s.id, name: s.name }
      });
  }

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });