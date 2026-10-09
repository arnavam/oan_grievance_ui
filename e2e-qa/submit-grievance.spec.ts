import { test, expect, type Page } from '@playwright/test';

// Real end-to-end pass through Submit Grievance against the live backend:
// register a fresh Individual Farmer, then drive all three wizard steps and
// confirm a real ticket comes back. This is the one flow nothing in this
// session had actually watched succeed in a browser end to end.

/**
 * Registers a fresh Individual Farmer and logs them in, landing on
 * /submit-grievance. Shared by every test below so each one only has to
 * describe what it does differently from there.
 */
async function registerAndLogin(page: Page, label: string) {
  const stamp = Date.now();
  const email = `qa-pw-${label}-${stamp}@example.com`;
  const phoneLocal = `0911${String(stamp).slice(-6)}`;

  // --- Register -----------------------------------------------------------
  await page.goto('/register');
  await page.locator('#register-full-name').fill(`Playwright ${label}`);
  await page.locator('#register-email').fill(email);
  await page.locator('#register-phone').fill(phoneLocal);
  await page.locator('#register-password').fill('Str0ng!Passw0rd');
  await page.locator('#register-confirm-password').fill('Str0ng!Passw0rd');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Almost done!')).toBeVisible({ timeout: 15_000 });

  // Individual Farmer, with the required Fayda ID (not collected at registration itself).
  await page.locator('#register-submitter-type').click();
  await page.getByRole('option', { name: 'Individual Farmer' }).click();
  await page.locator('#si-faydaId').fill('1234567890123456');
  // The checkbox input is visually `sr-only`; its decorative sibling sits at
  // the same spot and intercepts a direct .check(). Click the wrapping
  // <label> text instead, same as a real user would.
  await page.getByText(/I consent to providing my national ID/i).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Account Created!')).toBeVisible({ timeout: 15_000 });

  // --- Log in ---------------------------------------------------------------
  await page.getByRole('link', { name: /proceed to login/i }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('Str0ng!Passw0rd');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/submit-grievance/, { timeout: 15_000 });
}

test('SG full flow: register, log in, submit a grievance, get a real ticket', async ({ page }) => {
  await registerAndLogin(page, 'submit');

  // --- Step 1: Submitter Identity (mostly prefilled from the account) -----
  // The wizard's progress nav also says "Submitter Identity", so target the heading specifically.
  await expect(page.getByRole('heading', { name: 'Submitter Identity' })).toBeVisible();
  await page.locator('#submission-channel').click();
  await page.getByRole('option', { name: 'Web Portal' }).click();
  await page.getByRole('button', { name: /save & continue/i }).click();

  // --- Step 2: Grievance Details -------------------------------------------
  await expect(page.getByRole('heading', { name: 'Grievance Details' })).toBeVisible({ timeout: 10_000 });
  await page.locator('#service-category').click();
  await page.getByRole('option', { name: 'Inputs' }).click();
  await page.locator('#grievance-type').click();
  await page.getByRole('option', { name: 'Fertilizer Shortage' }).click();
  await page.locator('#grievance-region').click();
  await page.getByRole('option', { name: 'Oromia' }).click();
  // Zone/Woreda are listbox comboboxes, not free-text inputs — .fill() never
  // actually selects a value in them (that's what left Step 2 on-screen
  // instead of advancing). Open each and click the real option, the same way
  // Region above does. Woreda depends on Zone, so it isn't populated until
  // Zone is chosen.
  await page.locator('#grievance-zone').click();
  await page.getByRole('option', { name: 'North Shewa (OR)' }).click();
  await page.locator('#grievance-woreda').click();
  // Real backend-driven woreda list for this zone — "Basona Werana" isn't
  // one of its options, so pick whichever real option (not the placeholder)
  // comes first rather than pinning to a name that may not exist.
  await page.getByRole('listbox', { name: 'Select Woreda' }).getByRole('option').nth(1).click();
  await page
    .locator('#grievance-description')
    .fill('Playwright QA smoke test: fertilizer allocated for the season has not reached the kebele store.');
  await page.getByRole('button', { name: /save & continue/i }).click();

  // --- Step 3: Review & Submit ----------------------------------------------
  await expect(page.getByRole('heading', { name: 'Review & Submit' })).toBeVisible({ timeout: 10_000 });
  await page.getByText('I consent to this grievance being shared').click();
  await page.getByRole('button', { name: /submit grievance/i }).click();

  // --- Confirmation -----------------------------------------------------------
  await expect(page.getByRole('heading', { name: 'Grievance Submitted', level: 2 })).toBeVisible({ timeout: 20_000 });
  const ticket = page.locator('text=Ticket Number').locator('..').locator('p').last();
  await expect(ticket).not.toHaveText('', { timeout: 5_000 });
});

test('SG-Step2 empty form: every required field is flagged and the wizard does not advance', async ({ page }) => {
  await registerAndLogin(page, 'step2-empty');

  await expect(page.getByRole('heading', { name: 'Submitter Identity' })).toBeVisible();
  await page.locator('#submission-channel').click();
  await page.getByRole('option', { name: 'Web Portal' }).click();
  await page.getByRole('button', { name: /save & continue/i }).click();

  await expect(page.getByRole('heading', { name: 'Grievance Details' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /save & continue/i }).click();

  // Category, type, region, zone, woreda and description all come back empty.
  await expect(page.getByText('This field is required.')).toHaveCount(6);
  // Still on Step 2 — nothing advanced past the failed validation.
  await expect(page.getByRole('heading', { name: 'Grievance Details' })).toBeVisible();
});
