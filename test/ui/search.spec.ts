import { test, expect } from '@playwright/test';

test.describe('Find Someone Feature', () => {
  
  test('Complete search journey with visual snapshots', async ({ page }) => {
    // 1. Visit Homepage
    await page.goto('/');
    
    // Verify page renders
    await expect(page.locator('h1')).toContainText('Find someone');

    // Visual Snapshot of the search form
    await expect(page).toHaveScreenshot('search-form.png', { fullPage: true });

    // 2. Perform a search
    await page.fill('input[name="searchTerm"]', 'Jane Doe');
    await page.click('button:has-text("Search")');

    // 3. View Results (handled by PRG pattern redirection)
    await expect(page).toHaveURL('/results');
    await expect(page.locator('h1')).toContainText('Search results for "Jane Doe"');
    
    // Verify our Mock Backend data renders
    await expect(page.locator('table')).toContainText('QQ123456C');
    await expect(page.locator('table')).toContainText('Active');

    // Visual Snapshot of the results page
    await expect(page).toHaveScreenshot('search-results.png', { fullPage: true });
    
    // 4. Test clearing the session
    await page.click('a:has-text("Start a new search")');
    await expect(page).toHaveURL('/');
  });

  test('Validates empty search submission', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Search")');

    await expect(page).toHaveURL(/\/\?error=empty/);
    await expect(page.locator('.govuk-error-summary')).toBeVisible();
    await expect(page.locator('.govuk-error-summary')).toContainText('Enter a name or National Insurance number');
  });

});