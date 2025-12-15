import { Page, expect } from '@playwright/test';

export async function loginAs(page: Page, email: string, password?: string) {
  // Ir a la página de login si no estamos allí
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  // Esperar a que el formulario esté visible
  await page.waitForSelector('form', { state: 'visible' });

  // Llenar email
  const emailInput = page.locator('input[name="email"], input[type="email"]');
  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);

  // Llenar contraseña
  if (password) {
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);
  }

  // Click en submit
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Iniciar"), button:has-text("Login")'
  );
  await expect(submitButton).toBeVisible();
  await submitButton.click();
}
