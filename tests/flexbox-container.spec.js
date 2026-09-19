const { test, expect } = require('@playwright/test');
const { url, locators } = require('./helpers');

const { css, html, preview, computed } = locators('flexbox');

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});

const selects = {
  display: ['flex', 'inline-flex'],
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
  'align-items': ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'],
  'align-content': ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
};

test('container fields offer every value from the spec', async ({ page }) => {
  for (const [prop, values] of Object.entries(selects)) {
    const opts = await page.locator('#flexbox-' + prop + ' option').evaluateAll((os) => os.map((o) => o.value));
    expect(opts, prop).toEqual(values);
  }
  await expect(page.locator('#flexbox-height')).toBeVisible();
  await expect(page.locator('#flexbox-count')).toBeVisible();
});

test('defaults: css output has only box-sizing and display, preview shows 3 items', async ({ page }) => {
  const text = await css(page).innerText();
  expect(text).toContain('box-sizing: border-box');
  expect(text).toContain('display: flex');
  for (const p of ['flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'height']) {
    expect(text).not.toContain(p);
  }
  await expect(preview(page).locator('> *')).toHaveCount(3);
  await expect(html(page)).toContainText('<div class="container">');
});

test('each select updates preview computed style and output, non-defaults only', async ({ page }) => {
  for (const [prop, values] of Object.entries(selects)) {
    for (const v of values.slice(1)) {
      await page.locator('#flexbox-' + prop).selectOption(v);
      expect(await computed(page, prop), prop + ' ' + v).toBe(v);
      const text = await css(page).innerText();
      expect(text).toContain(prop + ': ' + v + ';');
    }
    await page.locator('#flexbox-' + prop).selectOption(values[0]);
    if (prop !== 'display') expect(await css(page).innerText()).not.toContain(prop + ':');
  }
});

test('height applies to the preview and appears in output', async ({ page }) => {
  await page.locator('#flexbox-height').fill('240px');
  expect(await computed(page, 'height')).toBe('240px');
  expect(await css(page).innerText()).toContain('height: 240px;');
  await page.locator('#flexbox-height').fill('');
  expect(await css(page).innerText()).not.toContain('height');
});

test('item count drives preview and html output', async ({ page }) => {
  await page.locator('#flexbox-count').fill('5');
  await expect(preview(page).locator('> *')).toHaveCount(5);
  expect(await html(page).innerText()).toBe(
    '<div class="container">\n' + [1, 2, 3, 4, 5].map((n) => '  <div>' + n + '</div>').join('\n') + '\n</div>'
  );
  await page.locator('#flexbox-count').fill('2');
  await expect(preview(page).locator('> *')).toHaveCount(2);
});

test('output is syntax highlighted with spans and text stays plain', async ({ page }) => {
  expect(await css(page).locator('span').count()).toBeGreaterThan(3);
  expect(await html(page).locator('span').count()).toBeGreaterThan(2);
  expect(await css(page).innerText()).toMatch(/^\.container \{/m);
});

test('invalid input does not throw, breaks nothing, and is escaped in output', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.locator('#flexbox-height').fill('200px');
  await page.locator('#flexbox-height').fill('<b>oops</b>');
  expect(await computed(page, 'height')).toBe('200px');
  expect(await css(page).innerText()).toContain('height: <b>oops</b>;');
  expect(await css(page).locator('b').count()).toBe(0);

  await page.locator('#flexbox-count').evaluate((e) => { e.value = 'abc'; e.dispatchEvent(new Event('input')); });
  for (const bad of ['-4', '', '0', '1e9']) {
    await page.locator('#flexbox-count').fill(bad);
  }
  const n = await preview(page).locator('> *').count();
  expect(n).toBeGreaterThanOrEqual(1);
  await page.locator('#flexbox-justify-content').selectOption('center');
  expect(await computed(page, 'justify-content')).toBe('center');
  expect(errors).toEqual([]);
});

test('state survives tab switch with fields and preview intact', async ({ page }) => {
  await page.locator('#flexbox-flex-direction').selectOption('column');
  await page.locator('#flexbox-count').fill('4');
  await page.getByRole('tab', { name: 'Grid' }).click();
  await page.getByRole('tab', { name: 'Flexbox' }).click();
  await expect(page.locator('#flexbox-flex-direction')).toHaveValue('column');
  expect(await computed(page, 'flex-direction')).toBe('column');
  await expect(preview(page).locator('> *')).toHaveCount(4);
});
