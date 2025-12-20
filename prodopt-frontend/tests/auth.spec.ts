import { test, expect } from '@playwright/test';

// Helper to generate a valid 10-digit INN with correct checksum
function generateUniqueInn() {
  const region = '77'; // Moscow prefix
  // Generate 7 random digits
  const body = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  const base = region + body;
  
  // Calculate checksum for INN 10
  const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  let sum = 0;
  for(let i = 0; i < 9; i++) {
    sum += parseInt(base[i]) * weights[i];
  }
  const checksum = (sum % 11) % 10;
  
  return base + checksum;
}

test('User Registration and Login Flow', async ({ page }) => {
  // Generate unique data inside the test
  const timestamp = Date.now();
  const email = `e2e_${timestamp}@test.com`;
  const password = 'password123';
  const inn = generateUniqueInn(); // Use unique valid INN

  // 1. Registration
  await page.goto('/auth/register');
  
  await page.fill('input[id="inn"]', inn);
  await page.click('body'); 
  await page.waitForTimeout(1000);
  
  const companyValue = await page.inputValue('input[id="companyName"]');
  if (!companyValue) {
      await page.fill('input[id="companyName"]', `Company ${timestamp}`);
  }

  await page.fill('input[id="fullName"]', 'E2E User');
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Additional fields required by your updated form
  // Only if you added the Phone field as discussed previously, otherwise remove this line:
  const phoneInput = page.locator('input[id="phone"]');
  if (await phoneInput.isVisible()) {
      await phoneInput.fill('+79990000000');
  }

  await page.click('button[type="submit"]');

  // 2. Expect redirect
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('h2')).toContainText('E2E User');

  // 3. Logout
  await page.click('button:has-text("Выйти")');
  await expect(page).toHaveURL(/\/auth\/login/);

  // 4. Login
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');

  // 5. Verify Login
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('h2')).toContainText('E2E User');
});