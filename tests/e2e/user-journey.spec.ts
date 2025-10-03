import { test, expect } from '@playwright/test';

test.describe('Business Finance Tracker - User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should allow user to register and create first transaction', async ({ page }) => {
    // Step 1: User Registration
    await page.click('text=Sign Up');

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="business-name-input"]', 'Test Business');

    await page.click('[data-testid="register-button"]');

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();

    // Step 2: Create first transaction
    await page.click('[data-testid="add-transaction-button"]');

    // Fill transaction form
    await page.fill('[data-testid="transaction-description"]', 'Bought office supplies from Staples for $45.67');
    await page.fill('[data-testid="transaction-amount"]', '45.67');
    await page.fill('[data-testid="transaction-date"]', '2025-10-02');

    // Submit transaction
    await page.click('[data-testid="save-transaction-button"]');

    // Verify transaction appears in list
    await expect(page.locator('text=Office supplies purchase at Staples')).toBeVisible();
    await expect(page.locator('text=$45.67')).toBeVisible();

    // Step 3: Verify dashboard updates
    await page.click('[data-testid="dashboard-tab"]');

    // Should show updated financial summary
    await expect(page.locator('[data-testid="total-expenses"]')).toContainText('$45.67');
    await expect(page.locator('[data-testid="transaction-count"]')).toContainText('1');
  });

  test('should allow AI-powered transaction categorization', async ({ page }) => {
    // Log in with existing user
    await page.click('text=Sign In');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Create transaction with AI assistance
    await page.click('[data-testid="add-transaction-button"]');
    await page.fill('[data-testid="transaction-description"]', 'Team lunch at Italian restaurant for project celebration, $125.50 including tip');
    await page.fill('[data-testid="transaction-amount"]', '125.50');

    // Enable AI assistance
    await page.click('[data-testid="ai-assist-toggle"]');

    // Wait for AI processing
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-processing"]')).not.toBeVisible();

    // Verify AI suggestion
    await expect(page.locator('[data-testid="suggested-category"]')).toContainText('Meals & Entertainment');
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('%');

    // Accept AI suggestion
    await page.click('[data-testid="accept-ai-suggestion"]');
    await page.click('[data-testid="save-transaction-button"]');

    // Verify transaction was categorized
    await expect(page.locator('text=Meals & Entertainment')).toBeVisible();
  });

  test('should generate and display financial insights', async ({ page }) => {
    // Log in
    await page.click('text=Sign In');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Add multiple transactions for meaningful insights
    const transactions = [
      { description: 'Office supplies purchase', amount: 45.67 },
      { description: 'Software subscription', amount: 99.00 },
      { description: 'Client payment', amount: 5000.00, type: 'income' }
    ];

    for (const transaction of transactions) {
      await page.click('[data-testid="add-transaction-button"]');
      await page.fill('[data-testid="transaction-description"]', transaction.description);
      await page.fill('[data-testid="transaction-amount"]', transaction.amount.toString());
      if (transaction.type === 'income') {
        await page.selectOption('[data-testid="transaction-type"]', 'income');
      }
      await page.click('[data-testid="save-transaction-button"]');
      await page.waitForTimeout(1000); // Brief pause between transactions
    }

    // Navigate to insights
    await page.click('[data-testid="insights-tab"]');

    // Wait for AI to generate insights
    await expect(page.locator('[data-testid="generating-insights"]')).toBeVisible();
    await expect(page.locator('[data-testid="generating-insights"]')).not.toBeVisible();

    // Verify insights are displayed
    await expect(page.locator('[data-testid="insight-card"]')).toHaveCount.greaterThan(0);

    // Verify insight content
    const firstInsight = page.locator('[data-testid="insight-card"]').first();
    await expect(firstInsight.locator('[data-testid="insight-title"]')).toBeVisible();
    await expect(firstInsight.locator('[data-testid="insight-description"]')).toBeVisible();
    await expect(firstInsight.locator('[data-testid="insight-impact"]')).toBeVisible();
  });

  test('should allow data export functionality', async ({ page }) => {
    // Log in
    await page.click('text=Sign In');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Navigate to export page
    await page.click('[data-testid="settings-tab"]');
    await page.click('[data-testid="export-data-button"]');

    // Configure export
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.fill('[data-testid="export-start-date"]', '2025-10-01');
    await page.fill('[data-testid="export-end-date"]', '2025-10-03');

    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="generate-export"]');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    // Verify export contains data
    // Note: In a real test, you would read the downloaded file and verify its contents
    await expect(page.locator('text=Export completed successfully')).toBeVisible();
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Log in
    await page.click('text=Sign In');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

    // Add transaction on mobile
    await page.click('[data-testid="mobile-nav-menu"] >> text=Transactions');
    await page.click('[data-testid="floating-action-button"]');

    // Verify mobile form works
    await expect(page.locator('[data-testid="transaction-form-modal"]')).toBeVisible();
    await page.fill('[data-testid="transaction-description"]', 'Mobile test transaction');
    await page.fill('[data-testid="transaction-amount"]', '25.00');
    await page.click('[data-testid="save-transaction-button"]');

    // Verify transaction appears
    await expect(page.locator('text=Mobile test transaction')).toBeVisible();
  });
});