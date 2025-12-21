import { test, expect } from '@playwright/test';

// Увеличиваем таймаут
test.setTimeout(120000); 

// Хелпер ИНН
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
  await expect(page).toHaveURL(/\/profile/);
}

test('Full Trade Cycle: Buyer RFQ -> Supplier Offer -> Deal -> Payment -> Shipment -> Completion', async ({ browser }) => {
  const buyerContext = await browser.newContext();
  const supplierContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  const supplierPage = await supplierContext.newPage();

  // 1. Регистрация
  await Promise.all([
    register(buyerPage, BUYER_EMAIL, 'Buyer Inc'),
    register(supplierPage, SUPPLIER_EMAIL, 'Supplier Corp')
  ]);

  // --- SUPPLIER: Создание товара ---
  await supplierPage.goto('/catalog/create');
  
  // Шаг 1
  await supplierPage.fill('input[id="name"]', PRODUCT_NAME);
  await supplierPage.click('input[id="productCategoryId"]'); 
  await expect(supplierPage.locator('.ant-select-item-option').first()).toBeVisible();
  await supplierPage.locator('.ant-select-item-option').first().click();
  await supplierPage.fill('textarea[id="description"]', 'Best product description');
  await supplierPage.click('button:has-text("Далее")');
  
  // Шаг 2
  await expect(supplierPage.getByLabel('Название фасовки')).toBeVisible({ timeout: 10000 });
  await supplierPage.getByLabel('Название фасовки').fill('Box 10kg');
  await supplierPage.fill('input[id*="price"]', '1000'); 
  await supplierPage.locator('.ant-card .ant-select').click();
  await supplierPage.locator('.ant-select-item-option').first().click();
  await supplierPage.click('button:has-text("Создать товар")');
  
  // Шаг 3: Фото
  await expect(supplierPage.getByText('Товар создан!', { exact: true })).toBeVisible({ timeout: 10000 });
  
  // Загрузка фото (из предыдущего фикса)
  const fileInput = supplierPage.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'test-image.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('test image')
  });
  await expect(supplierPage.locator('.ant-upload-list-item-thumbnail')).toBeVisible({ timeout: 10000 });

  await supplierPage.click('button:has-text("Завершить")');
  await expect(supplierPage).toHaveURL(/\/catalog/);

  // --- BUYER: Создание RFQ ---
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('button:has-text("Создать запрос")');
  // ... existing code ...
  await expect(buyerPage.locator('.ant-modal-title:has-text("Публичный запрос")')).toBeVisible();
  
  // === FIX START: Выбор товара (Retry Logic) ===
  let selected = false;
  // Ant Design Form.Item name="productVariantId" генерирует input с id="productVariantId"
  const searchInput = buyerPage.locator('input[id="productVariantId"]');

  for (let i = 0; i < 20; i++) {
    try {
      // 1. Вводим текст поиска. force: true нужен, если input перекрыт кастомным UI селекта
      await searchInput.fill(PRODUCT_NAME, { force: true });
      
      // 2. Ждем появления опции (Elasticsearch может иметь задержку индексации)
      const option = buyerPage.locator('.ant-select-item-option-content').filter({ hasText: PRODUCT_NAME }).first();
      await option.waitFor({ state: 'visible', timeout: 3000 });

      // 3. Выбираем опцию
      await option.click();

      // 4. Проверяем, что выбор зафиксирован (текст появился в селекторе)
      const selection = buyerPage.locator('.ant-select-selection-item').filter({ hasText: PRODUCT_NAME });
      await expect(selection).toBeVisible({ timeout: 1000 });

      selected = true;
      break;
    } catch (e) {
      console.log(`Retry ${i}: Product "${PRODUCT_NAME}" not found yet. Waiting...`);
      await buyerPage.waitForTimeout(2000); // Ждем перед следующей попыткой
    }
  }

  if (!selected) {
      throw new Error(`Failed to select product "${PRODUCT_NAME}" after retries.`);
  }

  await buyerPage.fill('input[id="quantity"]', '10');
  await buyerPage.fill('textarea[id="comment"]', 'Need ASAP delivery');
  await buyerPage.click('div.ant-modal-footer button.ant-btn-primary');
  
  await expect(buyerPage.locator('.ant-modal')).toBeHidden();
  await expect(buyerPage.locator('table')).toContainText(PRODUCT_NAME);

  // --- SUPPLIER: Найти RFQ и создать Offer ---
  await supplierPage.goto('/trade/deals');
  await supplierPage.reload();
  await expect(supplierPage.locator('table')).toContainText(PRODUCT_NAME);
  
  await supplierPage.click('button:has-text("Предложить КП")');
  await expect(supplierPage.locator('.ant-drawer-title')).toContainText('Новое коммерческое предложение');
  await supplierPage.fill('textarea[id="deliveryConditions"]', 'Pickup from Moscow');
  await supplierPage.click('button:has-text("Отправить КП")');
  await supplierPage.reload();
  await supplierPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  await expect(supplierPage.locator('tr').filter({ hasText: PRODUCT_NAME }).filter({ hasText: 'Sent' })).toBeVisible();

  // --- BUYER: Принять Offer ---
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  await expect(buyerPage.locator('tr').filter({ hasText: PRODUCT_NAME }).filter({ hasText: 'Sent' })).toBeVisible();
  
  await buyerPage.click('button:has-text("Просмотр")');
  await buyerPage.locator('.ant-drawer-open .ant-drawer-close').click(); 
  await expect(buyerPage.locator('.ant-drawer-open')).toHaveCount(0);
  
  await buyerPage.locator(`tr:has-text("${PRODUCT_NAME}") button`).filter({ hasText: 'Принять' }).click();

  // Добавление адреса
  await expect(buyerPage.locator('.ant-modal-title:has-text("Принятие условий сделки")')).toBeVisible();
  await buyerPage.click('button:has-text("Отмена")');
  
  await buyerPage.goto('/profile/company');
  await buyerPage.click('button:has-text("Добавить адрес")');
  await buyerPage.fill('input[id="city"]', 'Moscow');
  await buyerPage.fill('input[id="street"]', 'Tverskaya');
  await buyerPage.fill('input[id="house"]', '1');
  await buyerPage.click('button:has-text("Сохранить")');
  await expect(buyerPage.locator('.ant-modal')).toBeHidden();

  // Принятие (повторно)
  await buyerPage.goto('/trade/deals');
  await buyerPage.click('div[role="tab"]:has-text("Коммерческие предложения")');
  await buyerPage.locator(`tr:has-text("${PRODUCT_NAME}") button`).filter({ hasText: 'Принять' }).click();
  
  await buyerPage.click('#addressId'); 
  await buyerPage.keyboard.press('Enter'); 
  await buyerPage.click('button:has-text("Подтвердить и создать сделку")');

  // --- BUYER: Оплата ---
  // Ждем редиректа на страницу сделки
  await expect(buyerPage).toHaveURL(/\/trade\/deals\/\d+/);
  
  // === ИСПРАВЛЕНИЕ: Извлекаем ID сделки из URL покупателя ===
  const dealUrl = buyerPage.url();
  const dealId = dealUrl.split('/').pop(); // Получаем ID (например, "1")
  // ==========================================================

  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Согласована');
  
  await buyerPage.click('button:has-text("Оплатить")');
  await buyerPage.click('button:has-text("Внести средства")'); 
  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Оплачена');

  // --- SUPPLIER: Отгрузка ---
  // Используем полученный dealId для перехода
  await supplierPage.goto(`/trade/deals/${dealId}`);
  
  // Ждем загрузки статуса PAID, чтобы кнопка стала активна
  await expect(supplierPage.locator('.ant-tag').first()).toContainText('Оплачена', { timeout: 15000 });

  await supplierPage.click('button:has-text("Отгрузить заказ")');
// Используем timestamp для уникальности
  await supplierPage.fill('input[id="trackingNumber"]', `TRACK-${Date.now()}`);  // Убираем проверку статуса из предиката, чтобы поймать возможные ошибки (400/500) и не зависнуть
  const shipmentResponsePromise = supplierPage.waitForResponse(response => 
    response.url().includes('/shipment')
  );

  await supplierPage.click('button:has-text("Подтвердить отгрузку")');
  
  // Ждем завершения запроса
  const shipmentResponse = await shipmentResponsePromise;
  
  // Логируем ошибку, если статус не 201, для упрощения отладки
  if (shipmentResponse.status() !== 201) {
    console.error('Shipment API Error:', await shipmentResponse.text());
  }
  
  // Явно проверяем успешность
  expect(shipmentResponse.status()).toBe(201);

  // Ждем исчезновения модалки
  await expect(supplierPage.locator('.ant-modal-content')).toBeHidden();

  // Теперь проверяем статус. React Query должен был обновить данные.
  await expect(supplierPage.locator('.ant-tag').first()).toContainText('В пути', { timeout: 10000 });
  // --- BUYER: Приемка ---
  await buyerPage.reload();
  await expect(buyerPage.locator('.ant-tag').first()).toContainText('В пути');
  await buyerPage.click('button:has-text("Товар получен")');
  await buyerPage.click('button:has-text("Да, товар принят")'); 

  await expect(buyerPage.locator('.ant-tag').first()).toContainText('Завершена');
});