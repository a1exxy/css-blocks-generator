const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

test('copy CSS puts plain text (no markup) on the clipboard and confirms', async ({ page }) => {
  await page.selectOption('#flexbox-flex-direction', 'column');
  await page.click('#flexbox-copy-css');
  await expect(page.locator('#flexbox-copy-css-status')).toHaveText('Скопировано');
  const text = await clipboard(page);
  expect(text).toBe(await page.locator('#flexbox-css-output').innerText());
  expect(text).toContain('flex-direction: column;');
  expect(text).not.toContain('<span');
});

test('copy HTML puts plain text on the clipboard', async ({ page }) => {
  await page.fill('#flexbox-count', '2');
  await page.click('#flexbox-copy-html');
  await expect(page.locator('#flexbox-copy-html-status')).toHaveText('Скопировано');
  expect(await clipboard(page)).toBe('<div class="container">\n  <div>1</div>\n  <div>2</div>\n</div>');
});

test('reset restores defaults in controls, preview and output', async ({ page }) => {
  await page.fill('#flexbox-height', '200px');
  await page.selectOption('#flexbox-justify-content', 'center');
  await page.selectOption('#flexbox-display', 'inline-flex');
  await page.fill('#flexbox-count', '7');
  await page.click('#flexbox-reset');
  await expect(page.locator('#flexbox-height')).toHaveValue('');
  await expect(page.locator('#flexbox-justify-content')).toHaveValue('flex-start');
  await expect(page.locator('#flexbox-display')).toHaveValue('flex');
  await expect(page.locator('#flexbox-count')).toHaveValue('3');
  await expect(page.locator('#flexbox-preview .item')).toHaveCount(3);
  const css = await page.locator('#flexbox-css-output').innerText();
  expect(css).not.toContain('justify-content');
  expect(css).not.toContain('height');
  expect(css).toContain('display: flex;');
  // edits still work after reset
  await page.selectOption('#flexbox-flex-wrap', 'wrap');
  expect(await page.locator('#flexbox-css-output').innerText()).toContain('flex-wrap: wrap;');
});

test('reset does not touch Grid state', async ({ page }) => {
  await page.evaluate(() => { window.CssBlocks.grid.state.itemCount = 9; });
  await page.click('#flexbox-reset');
  expect(await page.evaluate(() => window.CssBlocks.grid.state.itemCount)).toBe(9);
});
