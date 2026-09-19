const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  reporter: 'list',
  use: { headless: true },
  projects: [
    // Clipboard read-back needs explicit permissions, which only Chromium supports.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // WebKit is supported by the page but not run here: the Playwright WebKit build needs system libraries
    // (`npx playwright install-deps webkit`). Add { name: 'webkit', use: { ...devices['Desktop Safari'] } } where available.
  ],
});
