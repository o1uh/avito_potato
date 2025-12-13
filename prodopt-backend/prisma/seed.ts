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

  // ... (дальше код создания юзера)

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