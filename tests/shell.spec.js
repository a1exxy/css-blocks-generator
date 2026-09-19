const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

test('page opens over file:// with two tabs, Flexbox active by default', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push('failed: ' + r.url()));
  await page.goto(url);

  const flexTab = page.getByRole('tab', { name: 'Flexbox' });
  const gridTab = page.getByRole('tab', { name: 'Grid' });
  await expect(flexTab).toHaveAttribute('aria-selected', 'true');
  await expect(gridTab).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#flexbox-panel')).toBeVisible();
  await expect(page.locator('#grid-panel')).toBeHidden();
  expect(errors).toEqual([]);
});

test('tabs switch and the active tab is visually distinct', async ({ page }) => {
  await page.goto(url);
  const flexTab = page.getByRole('tab', { name: 'Flexbox' });
  const gridTab = page.getByRole('tab', { name: 'Grid' });

  const bg = (l) => l.evaluate((e) => getComputedStyle(e).backgroundColor);
  const activeBg = await bg(flexTab);
  expect(activeBg).not.toBe(await bg(gridTab));

  await gridTab.click();
  await expect(gridTab).toHaveAttribute('aria-selected', 'true');
  await expect(flexTab).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#grid-panel')).toBeVisible();
  await expect(page.locator('#flexbox-panel')).toBeHidden();
  expect(await bg(gridTab)).toBe(activeBg);

  await flexTab.click();
  await expect(page.locator('#flexbox-panel')).toBeVisible();
  await expect(page.locator('#grid-panel')).toBeHidden();
});

test('generator state survives tab switching', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => { window.CssBlocks.flexbox.state.itemCount = 7; });
  await page.getByRole('tab', { name: 'Grid' }).click();
  await page.getByRole('tab', { name: 'Flexbox' }).click();
  expect(await page.evaluate(() => window.CssBlocks.flexbox.state.itemCount)).toBe(7);
  expect(await page.evaluate(() => window.CssBlocks.grid.state.itemCount)).not.toBe(7);
});
