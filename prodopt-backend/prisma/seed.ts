import { PrismaClient } from '@prisma/client';

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

  // 5. Статусы товаров (добавлено, так как есть в схеме)
  const productStatuses = ['Черновик', 'Опубликован', 'Архив', 'На модерации'];
  for (const name of productStatuses) {
    await prisma.productStatus.upsert({
      where: { name },
      update: {},
      create: { name },
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