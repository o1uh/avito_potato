import { test, expect } from '@playwright/test';

// Увеличиваем таймаут до 2 минут, так как сценарий включает 3-х пользователей и задержки
test.setTimeout(120000); 

// Хелпер генерации валидного ИНН
function generateUniqueInn() {
  const region = '77'; 
  const body = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  const base = region + body;
  const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  let sum = 0;
  for(let i = 0; i < 9; i++) {
    sum += parseInt(base[i]) * weights[i];
  }
  const checksum = (sum % 11) % 10;
  return base + checksum;
}

const BUYER_EMAIL = `e2e_buyer_${Date.now()}@test.com`;
const SUPPLIER_EMAIL = `e2e_supplier_${Date.now()}@test.com`;
const PASSWORD = 'password123';
const PRODUCT_NAME = `E2E Product ${Date.now()}`;

// Хелпер регистрации
async function register(page: any, email: string, name: string) {
  await page.goto('/auth/register');
  const inn = generateUniqueInn();
  await page.fill('input[id="inn"]', inn);
  await page.click('body'); 
  await page.waitForTimeout(500); 

  const companyName = await page.inputValue('input[id="companyName"]');
  if (!companyName) await page.fill('input[id="companyName"]', name);

  await page.fill('input[id="fullName"]', name);
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  
  // Ожидаем редирект на профиль
  await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });
}

test('Full Trade Cycle: Buyer RFQ -> Supplier Offer -> Deal -> Payment -> Shipment -> Completion', async ({ browser }) => {
  const buyerContext = await browser.newContext();
  const supplierContext = await browser.newContext();
  const adminContext = await browser.newContext();

  const buyerPage = await buyerContext.newPage();
  const supplierPage = await supplierContext.newPage();
  const adminPage = await adminContext.newPage();

  // 1. Регистрация участников
  await Promise.all([
    register(buyerPage, BUYER_EMAIL, 'Buyer Inc'),
    register(supplierPage, SUPPLIER_EMAIL, 'Supplier Corp')
  ]);

  // --- SUPPLIER: Создание товара ---
  await supplierPage.goto('/catalog/create');
  
  // Шаг 1: Основное
  await supplierPage.fill('input[id="name"]', PRODUCT_NAME);
  // Клик по селекту категории
  await supplierPage.locator('.ant-form-item-control-input-content .ant-select').first().click(); 
  await expect(supplierPage.locator('.ant-select-item-option').first()).toBeVisible();
  await supplierPage.locator('.ant-select-item-option').first().click();
  await supplierPage.fill('textarea[id="description"]', 'Best product description');
  await supplierPage.click('button:has-text("Далее")');
  
  // Шаг 2: Варианты
  await expect(supplierPage.getByLabel('Название фасовки')).toBeVisible({ timeout: 10000 });
  await supplierPage.getByLabel('Название фасовки').fill('Box 10kg');
  await supplierPage.fill('input[id*="price"]', '1000'); 
  
  // Выбор единицы измерения
  await supplierPage.locator('.ant-card .ant-select').click();
  await supplierPage.locator('.ant-select-item-option').first().click();
  
  await supplierPage.click('button:has-text("Создать товар")');
  
  // Шаг 3: Фото и Публикация
  await expect(supplierPage.getByText('Товар создан!', { exact: true })).toBeVisible({ timeout: 10000 });
  
  // Загрузка фото (фиктивная)
  const fileInput = supplierPage.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'test-image.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('test image')
  });
  await expect(supplierPage.locator('.ant-upload-list-item-thumbnail')).toBeVisible({ timeout: 10000 });

  // Нажимаем обновленную кнопку
  await supplierPage.click('button:has-text("Отправить на модерацию")');
  await expect(supplierPage).toHaveURL(/\/catalog/);

  // --- ADMIN: Одобрение товара ---
  console.log('Admin: Starting moderation...');
  await adminPage.goto('/auth/login');
  await adminPage.fill('input[id="email"]', 'admin@prodopt.ru');
  await adminPage.fill('input[id="password"]', 'admin123');
  await adminPage.click('button[type="submit"]');
  await expect(adminPage).toHaveURL(/\/profile/);
  
  await adminPage.goto('/admin');
  
  // Ищем товар в списке модерации
  const productRow = adminPage.locator('tr', { hasText: PRODUCT_NAME });
  await expect(productRow).toBeVisible({ timeout: 10000 });
  
  // Одобряем (ищем кнопку с иконкой галочки или primary в этой строке)
  await productRow.locator('button.ant-btn-primary').click();
  
  // Ждем, пока товар исчезнет (значит обработано)
  await expect(productRow).toBeHidden();
  
  console.log('Admin: Product approved. Waiting for Elastic Sync...');
  // !!! КРИТИЧЕСКИ ВАЖНО: Ждем индексации в Elastic !!!
  await adminPage.waitForTimeout(3000); 
  await adminPage.close(); 

  // --- BUYER: Создание RFQ ---
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('button:has-text("Создать запрос")');
  await expect(buyerPage.locator('.ant-modal-title:has-text("Публичный запрос")')).toBeVisible();
  
  // Поиск товара с ретраями
  let selected = false;
  const searchInput = buyerPage.locator('input[id="productVariantId"]'); // Input внутри Select

  console.log('Buyer: Searching for product...');
  
  for (let i = 0; i < 15; i++) {
    try {
      // Очищаем и пишем заново (эмуляция набора текста для триггера поиска)
      await searchInput.clear();
      await searchInput.pressSequentially(PRODUCT_NAME, { delay: 100 });
      
      // Ждем появления выпадающего списка
      const option = buyerPage.locator('.ant-select-item-option-content').filter({ hasText: PRODUCT_NAME }).first();
      await option.waitFor({ state: 'visible', timeout: 2000 });

      // Кликаем
      await option.click();

      // Проверяем, что в селекте отобразилось выбранное значение
      const selection = buyerPage.locator('.ant-select-selection-item').filter({ hasText: PRODUCT_NAME });
      await expect(selection).toBeVisible({ timeout: 1000 });

      selected = true;
      console.log('Buyer: Product selected!');
      break;
    } catch (e) {
      console.log(`Buyer: Retry ${i+1}. Product not ready yet.`);
      await buyerPage.waitForTimeout(2000); // Ждем перед следующей попыткой
    }
  }

  if (!selected) {
      throw new Error(`Failed to select product "${PRODUCT_NAME}" after retries.`);
  }

  await buyerPage.fill('input[id="quantity"]', '10');
  await buyerPage.fill('textarea[id="comment"]', 'Need ASAP delivery');
  
  // Клик по кнопке "Создать запрос" в футере модалки
  await buyerPage.locator('.ant-modal-footer button.ant-btn-primary').click();
  
  // Ждем исчезновения модалки
  await expect(buyerPage.locator('.ant-modal')).toBeHidden();
  // Проверяем, что запрос появился в таблице
  await expect(buyerPage.locator('table')).toContainText(PRODUCT_NAME);

  // --- SUPPLIER: Найти RFQ и создать Offer ---
  console.log('Supplier: Creating Offer...');
  await supplierPage.goto('/trade/deals');
  await supplierPage.reload(); // Обновляем список, чтобы увидеть RFQ
  
  // Проверяем, что запрос виден
  await expect(supplierPage.locator('table')).toContainText(PRODUCT_NAME);
  
  await supplierPage.click('button:has-text("Предложить КП")');
  await expect(supplierPage.locator('.ant-drawer-title')).toContainText('Новое коммерческое предложение');
  
  await supplierPage.fill('textarea[id="deliveryConditions"]', 'Pickup from Moscow');
  await supplierPage.click('button:has-text("Отправить КП")');
  
  // Переключаемся на таб "Коммерческие предложения" для проверки
  await supplierPage.reload(); // Иногда нужно обновить, чтобы счетчики сбросились/обновились
  await supplierPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  
  // Ищем строку с нашим товаром и статусом Sent
  await expect(supplierPage.locator('tr').filter({ hasText: PRODUCT_NAME }).filter({ hasText: 'Sent' })).toBeVisible();

  // --- BUYER: Принять Offer ---
  console.log('Buyer: Accepting Offer...');
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  
  // Ждем появления оффера
  const offerRow = buyerPage.locator('tr').filter({ hasText: PRODUCT_NAME }).filter({ hasText: 'Sent' });
  await expect(offerRow).toBeVisible();
  
  // Нажимаем просмотр -> закрываем (опционально, для теста UX)
  await offerRow.locator('button:has-text("Просмотр")').click();
  await buyerPage.locator('.ant-drawer-close').click(); 
  await expect(buyerPage.locator('.ant-drawer-open')).toHaveCount(0);
  
  // Нажимаем Принять (в таблице)
  await offerRow.locator('button').filter({ hasText: 'Принять' }).click();

  // Добавление адреса (если его нет)
  // Для надежности просто добавим адрес всегда, нажав отмену в модалке принятия
  await expect(buyerPage.locator('.ant-modal-title:has-text("Принятие условий сделки")')).toBeVisible();
  await buyerPage.click('button:has-text("Отмена")');
  
  await buyerPage.goto('/profile/company');
  await buyerPage.click('button:has-text("Добавить адрес")');
  await buyerPage.fill('input[id="city"]', 'Moscow');
  await buyerPage.fill('input[id="street"]', 'Tverskaya');
  await buyerPage.fill('input[id="house"]', '1');
  await buyerPage.click('button:has-text("Сохранить")');
  // Ждем пока модалка исчезнет
  await expect(buyerPage.locator('.ant-modal')).toBeHidden();

  // Принятие (повторно, уже с адресом)
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  await buyerPage.locator(`tr:has-text("${PRODUCT_NAME}") button`).filter({ hasText: 'Принять' }).click();
  
  // Выбираем адрес
  await buyerPage.click('#addressId'); 
  // Выбираем первый вариант в выпадающем списке (наш адрес)
  await buyerPage.locator('.ant-select-item-option').first().click();
  
  await buyerPage.click('button:has-text("Подтвердить и создать сделку")');

  // --- BUYER: Оплата ---
  console.log('Buyer: Paying...');
  // Ждем редиректа на страницу сделки
  await expect(buyerPage).toHaveURL(/\/trade\/deals\/\d+/);
  
  // Парсим ID сделки из URL для поставщика
  const dealUrl = buyerPage.url();
  const dealId = dealUrl.split('/').pop(); 
  console.log(`Deal created with ID: ${dealId}`);

  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Согласована');
  
  await buyerPage.click('button:has-text("Оплатить")');
  // В Dev режиме открывается модалка эмуляции
  await buyerPage.click('button:has-text("Внести средства")'); 
  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Оплачена');

  // --- SUPPLIER: Отгрузка ---
  console.log('Supplier: Shipping...');
  // Переходим сразу в сделку по ID
  await supplierPage.goto(`/trade/deals/${dealId}`);
  
  // Ждем статуса "Оплачена", чтобы кнопка появилась
  await expect(supplierPage.locator('.ant-tag').first()).toContainText('Оплачена', { timeout: 15000 });

  await supplierPage.click('button:has-text("Отгрузить заказ")');
  
  // Вводим УНИКАЛЬНЫЙ трек-номер
  await supplierPage.fill('input[id="trackingNumber"]', `TRACK-${Date.now()}`);

  // Ожидаем ответ от API, чтобы убедиться, что отгрузка прошла
  const shipmentResponsePromise = supplierPage.waitForResponse(res => 
    res.url().includes('/shipment') && res.status() === 201
  );

  await supplierPage.click('button:has-text("Подтвердить отгрузку")');
  
  await shipmentResponsePromise;
  await expect(supplierPage.locator('.ant-modal-content')).toBeHidden();

  // Проверяем статус "В пути"
  await expect(supplierPage.locator('.ant-tag').first()).toContainText('В пути', { timeout: 10000 });

  // --- BUYER: Приемка ---
  console.log('Buyer: Completing...');
  await buyerPage.reload();
  await expect(buyerPage.locator('.ant-tag').first()).toContainText('В пути');
  
  // Нажимаем подтверждение
  // Сначала открываем Popconfirm (кнопка "Товар получен...")
  await buyerPage.click('button:has-text("Товар получен")');
  // Подтверждаем в Popover ("Да, товар принят")
  await buyerPage.click('button:has-text("Да, товар принят")'); 

  // Финальная проверка статуса
  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Завершена');
  
  console.log('Test Finished Successfully!');
});