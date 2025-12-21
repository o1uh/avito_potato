import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  // Данные Супер-Админа из seed.ts
  const ADMIN_EMAIL = 'admin@prodopt.ru';
  const ADMIN_PASS = 'admin123';

  test('Login as Admin -> Dashboard -> Arbitration Tab', async ({ page }) => {
    // 1. Вход под Админом
    await page.goto('/auth/login');
    await page.fill('input[id="email"]', ADMIN_EMAIL);
    await page.fill('input[id="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Ждем редиректа на профиль, затем переходим в админку
    await expect(page).toHaveURL(/\/profile/);
    
    // В хедере должна быть кнопка "Администрирование" (доступна только ID=1)
    await page.click('a[href="/admin"]');
    
    // 2. Проверка Дашборда
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('h2')).toContainText('Панель Администратора');
    
    // Проверка статистики (должны быть карточки)
    await expect(page.locator('.ant-statistic-title').first()).toBeVisible();

    // 3. Переход к Арбитражу
    // Находим таб "Арбитраж" (возможно с цифрой, например "Арбитраж (1)")
    await page.click('div[role="tab"]:has-text("Арбитраж")');

    // 4. Проверка списка споров
    // Если споров нет, будет Empty state, если есть - таблица
    // Мы проверяем, что контент таба загрузился
    const emptyState = page.locator('.ant-empty-description');
    const tableRow = page.locator('.ant-table-row');

    // Ждем либо таблицу, либо "Нет данных"
    await expect(emptyState.or(tableRow.first())).toBeVisible();
  });

  /* 
   * Примечание: Полный цикл "Создать спор -> Решить спор" в E2E 
   * требует регистрации двух юзеров, создания сделки, оплаты, перевода в спор
   * и затем захода админа. Это дублирует trade.spec.ts и делает тест очень хрупким.
   * Для E2E достаточно проверить доступность интерфейса Админа.
   * Логика разрешения спора (API) проверена в Unit/Integration тестах на бэкенде.
   */
});