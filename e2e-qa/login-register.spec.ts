import { test, expect } from '@playwright/test';

// Real-browser smoke pass over the UI-only Login/Register cases that the
// Vitest component tests already prove in jsdom, but which hadn't been
// observed in an actual rendered browser until now. Test IDs match the
// grievance-portal-test-cases.xlsx workbook.

test('LG-09: empty login form shows a message under each field and focuses Email', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await expect(page.locator('#login-email')).toBeFocused();
});

test('LG-10: malformed email is flagged on blur and clears once fixed', async ({ page }) => {
  await page.goto('/login');
  const email = page.locator('#login-email');
  await email.fill('not-an-email');
  await email.blur();
  await expect(page.getByText('Enter a valid email address, e.g. name@example.com.')).toBeVisible();
  await email.fill('abebe@example.com');
  await expect(page.getByText('Enter a valid email address, e.g. name@example.com.')).toBeHidden();
});

test('LG-15: password show/hide toggle actually switches the input type', async ({ page }) => {
  await page.goto('/login');
  const password = page.locator('#login-password');
  await password.fill('Str0ng!Passw0rd');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByLabel(/show password/i).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByLabel(/hide password/i).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('RG-01: empty register account step shows 5 messages and focuses Full Name', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Enter your full name.')).toBeVisible();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your phone number.')).toBeVisible();
  await expect(page.getByText('Enter a password.')).toBeVisible();
  await expect(page.getByText('Re-enter your password to confirm it.')).toBeVisible();
  await expect(page.locator('#register-full-name')).toBeFocused();
});

test('RG-04/RG-05: phone rule is country-aware in a real browser', async ({ page }) => {
  await page.goto('/register');
  const phone = page.locator('#register-phone');
  // Ethiopia (+251, the default) rejects a plausible-looking but wrong number.
  await phone.fill('5454444444');
  await phone.blur();
  await expect(page.getByText(/valid Ethiopian mobile number/)).toBeVisible();
  // Switching to a non-Ethiopian country accepts the same digits.
  await page.getByLabel(/country code/i).click();
  await page.getByRole('menuitemradio', { name: /Kenya/i }).click();
  await expect(page.getByText(/valid Ethiopian mobile number/)).toBeHidden();
});

test('RG-13: valid account step reaches the profile step', async ({ page }) => {
  await page.goto('/register');
  await page.locator('#register-full-name').fill('Playwright QA');
  await page.locator('#register-email').fill(`qa-pw-${Date.now()}@example.com`);
  await page.locator('#register-phone').fill('0911000222');
  await page.locator('#register-password').fill('Str0ng!Passw0rd');
  await page.locator('#register-confirm-password').fill('Str0ng!Passw0rd');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Almost done!')).toBeVisible();
});

test('RG-16/RG-24: Development Agent shows no identity fields and no consent box', async ({ page }) => {
  await page.goto('/register');
  await page.locator('#register-full-name').fill('Playwright QA Agent');
  await page.locator('#register-email').fill(`qa-pw-agent-${Date.now()}@example.com`);
  await page.locator('#register-phone').fill('0911000333');
  await page.locator('#register-password').fill('Str0ng!Passw0rd');
  await page.locator('#register-confirm-password').fill('Str0ng!Passw0rd');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Development Agent/i }).click();
  await expect(page.locator('#si-faydaId')).toHaveCount(0);
  await expect(page.getByText(/I consent to providing my national ID/i)).toHaveCount(0);
});
