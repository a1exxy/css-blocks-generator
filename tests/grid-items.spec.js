const { test, expect } = require('@playwright/test');
const { url, locators } = require('./helpers');

const { css, items, panel, field, shared, itemStyle: style, setCount } = locators('grid');

const box = (page, i) => items(page).nth(i).boundingBox();
const PROPS = ['width', 'height', 'margin', 'padding', 'order', 'align-self', 'justify-self',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end'];

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await page.click('#grid-tab');
});

test('shared width/height/margin/padding apply to all items and output', async ({ page }) => {
  await shared(page, 'width').fill('40px');
  await shared(page, 'height').fill('30px');
  await shared(page, 'margin').fill('2px');
  await shared(page, 'padding').fill('3px');
  for (let i = 0; i < 6; i++) {
    expect(await style(page, i, 'margin-top')).toBe('2px');
    expect(await style(page, i, 'padding-left')).toBe('3px');
  }
  expect(await items(page).nth(4).evaluate((e) => e.style.width)).toBe('40px');
  expect(await css(page).innerText()).toMatch(/\.container > \* \{\s+width: 40px;\s+height: 30px;\s+margin: 2px;\s+padding: 3px;\s+\}/);
});

test('no shared rule when empty', async ({ page }) => {
  expect(await css(page).innerText()).not.toMatch(/^\.container > \* \{/m);
  expect(await css(page).innerText()).toContain('.container, .container > *');
});

test('panel hidden until click; click selects, second click deselects', async ({ page }) => {
  await expect(panel(page)).toBeHidden();
  await items(page).nth(1).click();
  await expect(panel(page)).toBeVisible();
  await expect(items(page).nth(1)).toHaveClass(/selected/);
  for (const p of PROPS) await expect(field(page, p)).toBeVisible();
  await items(page).nth(2).click();
  await expect(items(page).nth(1)).not.toHaveClass(/selected/);
  await items(page).nth(2).click();
  await expect(panel(page)).toBeHidden();
});

test('override applies to selected item only, own css rule', async ({ page }) => {
  await items(page).nth(1).click();
  await field(page, 'width').fill('120px');
  await field(page, 'justify-self').selectOption('center');
  await field(page, 'order').fill('2');
  expect(await items(page).nth(1).evaluate((e) => e.style.width)).toBe('120px');
  expect(await items(page).nth(0).evaluate((e) => e.style.width)).toBe('');
  expect(await style(page, 1, 'justify-self')).toBe('center');
  const text = await css(page).innerText();
  expect(text).toMatch(/\.container > :nth-of-type\(2\) \{\s+width: 120px;\s+order: 2;\s+justify-self: center;\s+\}/);
  expect(text).not.toContain(':nth-of-type(1)');
});

test('override beats shared, shared changes do not overwrite it', async ({ page }) => {
  await shared(page, 'width').fill('80px');
  await items(page).nth(1).click();
  await field(page, 'width').fill('150px');
  await shared(page, 'width').fill('60px');
  expect(await items(page).nth(0).evaluate((e) => e.style.width)).toBe('60px');
  expect(await items(page).nth(1).evaluate((e) => e.style.width)).toBe('150px');
  await field(page, 'width').fill('');
  expect(await items(page).nth(1).evaluate((e) => e.style.width)).toBe('60px');
});

test('spanning via start/end is consistent in preview and output', async ({ page }) => {
  await page.fill('#grid-grid-template-columns', '100px 100px 100px');
  await page.fill('#grid-grid-template-rows', '50px 50px');
  await items(page).nth(0).click();
  await field(page, 'grid-column-start').fill('1');
  await field(page, 'grid-column-end').fill('3');
  await field(page, 'grid-row-start').fill('1');
  await field(page, 'grid-row-end').fill('span 2');
  const b = await box(page, 0);
  expect(Math.round(b.width)).toBe(200);
  expect(Math.round(b.height)).toBe(100);
  const text = await css(page).innerText();
  expect(text).toMatch(/:nth-of-type\(1\) \{\s+grid-column-start: 1;\s+grid-column-end: 3;\s+grid-row-start: 1;\s+grid-row-end: span 2;\s+\}/);
  await field(page, 'grid-column-start').fill('span 2');
  await field(page, 'grid-column-end').fill('');
  expect(Math.round((await box(page, 0)).width)).toBe(200);
});

test('reducing count drops overrides and selection', async ({ page }) => {
  await items(page).nth(5).click();
  await field(page, 'padding').fill('9px');
  await items(page).nth(0).click();
  await field(page, 'margin').fill('5px');
  await setCount(page, 2);
  await expect(panel(page)).toBeVisible();
  const text = await css(page).innerText();
  expect(text).not.toContain('nth-of-type(6)');
  expect(text).toContain(':nth-of-type(1)');
  await setCount(page, 6);
  expect(await css(page).innerText()).not.toContain('9px');
  await items(page).nth(5).click();
  await setCount(page, 3);
  await expect(panel(page)).toBeHidden();
});

test('reset clears shared fields, selection and overrides', async ({ page }) => {
  await shared(page, 'width').fill('40px');
  await items(page).nth(1).click();
  await field(page, 'width').fill('120px');
  await page.locator('#grid-reset').click();
  await expect(panel(page)).toBeHidden();
  await expect(shared(page, 'width')).toHaveValue('');
  await expect(items(page).nth(1)).not.toHaveClass(/selected/);
  const text = await css(page).innerText();
  expect(text).not.toContain('nth-of-type');
  expect(text).not.toContain('40px');
  expect(await items(page).nth(1).evaluate((e) => e.style.width)).toBe('');
  await items(page).nth(1).click();
  await expect(field(page, 'width')).toHaveValue('');
});

test('align-self and justify-self are selects with the valid values, auto is not emitted', async ({ page }) => {
  await items(page).nth(0).click();
  for (const prop of ['align-self', 'justify-self']) {
    const opts = await field(page, prop).locator('option').evaluateAll((os) => os.map((o) => o.value));
    expect(opts, prop).toEqual(['auto', 'start', 'end', 'center', 'stretch', 'baseline']);
    await expect(field(page, prop)).toHaveValue('auto');
  }
  await field(page, 'align-self').selectOption('end');
  expect(await css(page).innerText()).toContain('align-self: end;');
  await field(page, 'align-self').selectOption('auto');
  expect(await css(page).innerText()).not.toContain('nth-of-type');
});

test('a value the browser rejects falls back to the shared value', async ({ page }) => {
  await shared(page, 'width').fill('60px');
  await items(page).nth(1).click();
  await field(page, 'width').fill('150px');
  expect(await style(page, 1, 'width')).toBe('150px');
  await field(page, 'width').fill('abc');
  expect(await style(page, 1, 'width')).toBe('60px');
  expect(await css(page).innerText()).toContain('width: abc;');
});
