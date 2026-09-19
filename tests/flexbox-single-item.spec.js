const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const css = (page) => page.locator('#flexbox-css-output');
const items = (page) => page.locator('#flexbox-preview > *');
const panel = (page) => page.locator('#flexbox-item-panel');
const field = (page, p) => page.locator('#flexbox-selected-' + p);
const style = (page, i, prop) => items(page).nth(i).evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});

test('panel hidden until an item is clicked; selected item is marked', async ({ page }) => {
  await expect(panel(page)).toBeHidden();
  await items(page).nth(1).click();
  await expect(panel(page)).toBeVisible();
  await expect(items(page).nth(1)).toHaveClass(/selected/);
  await expect(items(page).nth(0)).not.toHaveClass(/selected/);
  for (const p of ['width', 'height', 'margin', 'padding', 'order', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis']) {
    await expect(field(page, p)).toBeVisible();
  }
  await items(page).nth(2).click();
  await expect(items(page).nth(2)).toHaveClass(/selected/);
  await expect(items(page).nth(1)).not.toHaveClass(/selected/);
});

test('clicking the selected item again deselects it', async ({ page }) => {
  await items(page).nth(0).click();
  await items(page).nth(0).click();
  await expect(panel(page)).toBeHidden();
  await expect(items(page).nth(0)).not.toHaveClass(/selected/);
});

test('override applies only to the selected item and gets its own css rule', async ({ page }) => {
  await items(page).nth(1).click();
  await field(page, 'width').fill('120px');
  await field(page, 'flex-grow').fill('2');
  await field(page, 'align-self').fill('center');
  expect(await items(page).nth(1).evaluate((e) => e.style.width)).toBe('120px');
  expect(await items(page).nth(0).evaluate((e) => e.style.width)).toBe('');
  expect(await style(page, 1, 'align-self')).toBe('center');
  const text = await css(page).innerText();
  expect(text).toMatch(/\.container > :nth-child\(2\) \{\s+width: 120px;\s+align-self: center;\s+flex-grow: 2;\s+\}/);
  expect(text).not.toContain(':nth-child(1)');
  expect(text).not.toContain(':nth-child(3)');
});

test('empty overrides emit no rule; clearing removes it; values persist across selection', async ({ page }) => {
  await items(page).nth(0).click();
  await field(page, 'order').fill('3');
  expect(await css(page).innerText()).toContain(':nth-child(1)');
  await items(page).nth(1).click();
  await expect(field(page, 'order')).toHaveValue('');
  await items(page).nth(0).click();
  await expect(field(page, 'order')).toHaveValue('3');
  await field(page, 'order').fill('');
  expect(await css(page).innerText()).not.toContain('nth-child');
});

test('override beats shared settings, shared changes do not overwrite it', async ({ page }) => {
  await page.locator('#flexbox-item-width').fill('80px');
  await items(page).nth(1).click();
  await field(page, 'width').fill('150px');
  expect(await style(page, 0, 'width')).toBe('80px');
  expect(await style(page, 1, 'width')).toBe('150px');
  await page.locator('#flexbox-item-width').fill('60px');
  expect(await style(page, 0, 'width')).toBe('60px');
  expect(await style(page, 1, 'width')).toBe('150px');
  const text = await css(page).innerText();
  expect(text).toContain('width: 60px;');
  expect(text).toContain('width: 150px;');
  await field(page, 'width').fill('');
  expect(await style(page, 1, 'width')).toBe('60px');
});

test('reducing the count drops overrides of vanished items', async ({ page }) => {
  await items(page).nth(2).click();
  await field(page, 'padding').fill('9px');
  await items(page).nth(0).click();
  await field(page, 'margin').fill('5px');
  await page.locator('#flexbox-count').fill('2');
  await expect(items(page)).toHaveCount(2);
  await expect(panel(page)).toBeVisible();
  let text = await css(page).innerText();
  expect(text).not.toContain('nth-child(3)');
  expect(text).not.toContain('9px');
  expect(text).toContain(':nth-child(1)');
  await page.locator('#flexbox-count').fill('3');
  text = await css(page).innerText();
  expect(text).not.toContain('9px');
});

test('reducing the count below the selected item clears selection', async ({ page }) => {
  await items(page).nth(2).click();
  await page.locator('#flexbox-count').fill('2');
  await expect(panel(page)).toBeHidden();
});

test('reset clears selection and overrides', async ({ page }) => {
  await items(page).nth(1).click();
  await field(page, 'width').fill('120px');
  await page.locator('#flexbox-reset').click();
  await expect(panel(page)).toBeHidden();
  await expect(items(page).nth(1)).not.toHaveClass(/selected/);
  expect(await css(page).innerText()).not.toContain('nth-child');
  expect(await style(page, 1, 'width')).not.toBe('120px');
  await items(page).nth(1).click();
  await expect(field(page, 'width')).toHaveValue('');
});
