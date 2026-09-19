const { test, expect } = require('@playwright/test');
const { url, locators } = require('./helpers');

const { css, html, preview, computed, setCount } = locators('grid');

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await page.click('#grid-tab');
});

const align = ['stretch', 'start', 'end', 'center', 'baseline'];
const content = ['normal', 'start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'];
const selects = {
  display: ['grid', 'inline-grid'],
  'justify-items': align,
  'align-items': align,
  'justify-content': content,
  'align-content': content,
  'grid-auto-flow': ['row', 'column', 'row dense', 'column dense'],
};

test('all container fields exist, no legacy gap fields', async ({ page }) => {
  for (const [prop, values] of Object.entries(selects)) {
    const opts = await page.locator('#grid-' + prop + ' option').evaluateAll((os) => os.map((o) => o.value));
    expect(opts, prop).toEqual(values);
  }
  for (const p of ['height', 'grid-template-columns', 'grid-template-rows', 'gap', 'grid-auto-columns', 'grid-auto-rows', 'count']) {
    await expect(page.locator('#grid-' + p)).toBeVisible();
  }
  await expect(page.locator('#grid-grid-column-gap')).toHaveCount(0);
  await expect(page.locator('#grid-grid-row-gap')).toHaveCount(0);
});

test('spec defaults: justify/align-content normal, only non-defaults in css', async ({ page }) => {
  await expect(page.locator('#grid-justify-content')).toHaveValue('normal');
  await expect(page.locator('#grid-align-content')).toHaveValue('normal');
  const text = await css(page).innerText();
  expect(text).toContain('box-sizing: border-box');
  expect(text).toContain('display: grid;');
  // The default templates are real: applied to the preview and always emitted.
  expect(text).toContain('grid-template-columns: 100px 50px 100px;');
  expect(text).toContain('grid-template-rows: 50px 50px;');
  expect(await computed(page, 'grid-template-columns')).toBe('100px 50px 100px');
  expect(await computed(page, 'grid-template-rows')).toBe('50px 50px');
  for (const p of ['justify-content', 'align-content', 'justify-items', 'align-items', 'grid-auto', 'gap', 'height']) {
    expect(text).not.toContain(p);
  }
});

test('selects update preview computed style and output', async ({ page }) => {
  for (const [prop, values] of Object.entries(selects)) {
    for (const v of values.slice(1)) {
      await page.locator('#grid-' + prop).selectOption(v);
      const text = await css(page).innerText();
      expect(text, prop + v).toContain(prop + ': ' + v + ';');
      if (prop !== 'display' && prop !== 'grid-auto-flow') {
        expect(await computed(page, prop), prop + ' ' + v).toBe(v);
      }
    }
    await page.locator('#grid-' + prop).selectOption(values[0]);
    if (prop !== 'display') expect(await css(page).innerText()).not.toContain(prop + ':');
  }
});

test('text fields apply to preview and output, gap accepts one or two values', async ({ page }) => {
  await page.fill('#grid-height', '240px');
  await page.fill('#grid-grid-template-columns', '1fr 2fr');
  await page.fill('#grid-grid-template-rows', 'repeat(2, 40px)');
  await page.fill('#grid-grid-auto-columns', '30px');
  await page.fill('#grid-grid-auto-rows', '25px');
  await page.fill('#grid-gap', '10px 20px');
  expect(await computed(page, 'height')).toBe('240px');
  expect(await computed(page, 'row-gap')).toBe('10px');
  expect(await computed(page, 'column-gap')).toBe('20px');
  expect(await computed(page, 'grid-auto-rows')).toBe('25px');
  const text = await css(page).innerText();
  for (const l of ['height: 240px;', 'grid-template-columns: 1fr 2fr;', 'grid-template-rows: repeat(2, 40px);',
    'grid-auto-columns: 30px;', 'grid-auto-rows: 25px;', 'gap: 10px 20px;']) {
    expect(text).toContain(l);
  }
  await page.fill('#grid-gap', '10px');
  expect(await computed(page, 'column-gap')).toBe('10px');
  await page.fill('#grid-gap', '');
  expect(await css(page).innerText()).not.toContain('gap:');
});

test('output css applied to a fresh element matches preview computed styles', async ({ page }) => {
  await page.fill('#grid-grid-template-columns', '50px 1fr');
  await page.fill('#grid-gap', '5px 9px');
  await page.selectOption('#grid-justify-content', 'center');
  const text = await css(page).innerText();
  const decls = text.match(/\.container \{([^}]*)\}/)[1];
  const applied = await page.evaluate((d) => {
    const el = document.createElement('div');
    el.style.cssText = d;
    document.body.appendChild(el);
    const a = getComputedStyle(el);
    const r = { rg: a.rowGap, cg: a.columnGap, j: a.justifyContent, disp: a.display };
    el.remove();
    return r;
  }, decls);
  expect(await computed(page, 'row-gap')).toBe(applied.rg);
  expect(await computed(page, 'column-gap')).toBe(applied.cg);
  expect(await computed(page, 'justify-content')).toBe(applied.j);
  expect(await computed(page, 'display')).toBe(applied.disp);
});

test('item count drives preview and html', async ({ page }) => {
  await setCount(page, 4);
  await expect(preview(page).locator('> *')).toHaveCount(4);
  const text = await html(page).innerText();
  expect(text).toContain('<div class="container">');
  expect((text.match(/<div>/g) || []).length).toBe(4);
  await setCount(page, 2);
  await expect(preview(page).locator('> *')).toHaveCount(2);
});

test('invalid value does not break page and stays in output', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.fill('#grid-grid-template-columns', '100px 50px');
  const before = await computed(page, 'grid-template-columns');
  await page.fill('#grid-grid-template-columns', 'bogus(((');
  expect(await computed(page, 'grid-template-columns')).toBe(before);
  expect(await css(page).innerText()).toContain('grid-template-columns: bogus(((;');
  await setCount(page, '');
  await page.fill('#grid-gap', 'zzz');
  expect(errors).toEqual([]);
});

test('copy and reset; reset leaves Flexbox alone', async ({ page, browserName }) => {
  const canReadClipboard = browserName === 'chromium';
  await page.fill('#grid-gap', '8px');
  await setCount(page, 5);
  await page.click('#grid-copy-css');
  await expect(page.locator('#grid-copy-css-status')).toHaveText('Скопировано');
  if (canReadClipboard) {
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(await css(page).innerText());
    expect(clip).toContain('gap: 8px;');
  }
  await page.click('#grid-copy-html');
  await expect(page.locator('#grid-copy-html-status')).toHaveText('Скопировано');
  if (canReadClipboard) {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await html(page).innerText());
  }

  await page.click('#flexbox-tab');
  await page.selectOption('#flexbox-flex-direction', 'column');
  await page.click('#grid-tab');
  await page.selectOption('#grid-justify-content', 'center');
  await page.click('#grid-reset');
  await expect(page.locator('#grid-gap')).toHaveValue('');
  await expect(page.locator('#grid-justify-content')).toHaveValue('normal');
  await expect(page.locator('#grid-count')).toHaveValue('6');
  await expect(preview(page).locator('> *')).toHaveCount(6);
  expect(await css(page).innerText()).not.toContain('gap:');
  await page.click('#flexbox-tab');
  await expect(page.locator('#flexbox-flex-direction')).toHaveValue('column');
});

test('default templates are re-applied and emitted after reset', async ({ page }) => {
  await page.fill('#grid-grid-template-columns', '1fr');
  await page.click('#grid-reset');
  expect(await computed(page, 'grid-template-columns')).toBe('100px 50px 100px');
  expect(await css(page).innerText()).toContain('grid-template-columns: 100px 50px 100px;');
});
