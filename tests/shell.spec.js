const { test, expect } = require('@playwright/test');
const { url } = require('./helpers');

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

test('generator state survives tab switching, each generator keeps its own', async ({ page }) => {
  await page.goto(url);
  await page.selectOption('#flexbox-flex-direction', 'column');
  await page.getByRole('tab', { name: 'Grid' }).click();
  await page.fill('#grid-gap', '7px');
  await page.getByRole('tab', { name: 'Flexbox' }).click();
  await expect(page.locator('#flexbox-flex-direction')).toHaveValue('column');
  await expect(page.locator('#flexbox-css-output')).toContainText('flex-direction: column');
  await expect(page.locator('#flexbox-css-output')).not.toContainText('gap');
  await page.getByRole('tab', { name: 'Grid' }).click();
  await expect(page.locator('#grid-gap')).toHaveValue('7px');
  await expect(page.locator('#grid-css-output')).toContainText('gap: 7px;');
});
