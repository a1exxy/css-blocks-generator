const { test, expect } = require('@playwright/test');
const { url, locators } = require('./helpers');

const { css, items, itemStyle, setCount } = locators('flexbox');

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});

test('shared item fields are visible', async ({ page }) => {
  for (const p of ['width', 'height', 'margin', 'padding']) {
    await expect(page.locator('#flexbox-item-' + p)).toBeVisible();
  }
});

test('defaults: no item rule in css output', async ({ page }) => {
  const text = await css(page).innerText();
  expect(text).not.toMatch(/^.container > \* \{/m);
  expect(text).not.toMatch(/margin|padding|width/);
});

test('shared values apply to every item and appear in output', async ({ page }) => {
  await page.locator('#flexbox-item-width').fill('80px');
  await page.locator('#flexbox-item-height').fill('50px');
  await page.locator('#flexbox-item-margin').fill('4px');
  await page.locator('#flexbox-item-padding').fill('6px');
  await setCount(page, 5);
  await expect(items(page)).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    expect(await itemStyle(page, i, 'width')).toBe('80px');
    expect(await itemStyle(page, i, 'height')).toBe('50px');
    expect(await itemStyle(page, i, 'margin-top')).toBe('4px');
    expect(await itemStyle(page, i, 'padding-left')).toBe('6px');
  }
  const text = await css(page).innerText();
  expect(text).toContain('.container > * {');
  for (const d of ['width: 80px;', 'height: 50px;', 'margin: 4px;', 'padding: 6px;']) expect(text).toContain(d);
});

test('only non-default values are emitted; clearing removes the rule', async ({ page }) => {
  await page.locator('#flexbox-item-margin').fill('10px 20px');
  let text = await css(page).innerText();
  expect(text).toContain('margin: 10px 20px;');
  expect(text).not.toMatch(/(^|\s)(width|height|padding):/);
  expect(await itemStyle(page, 0, 'margin-left')).toBe('20px');
  await page.locator('#flexbox-item-margin').fill('');
  text = await css(page).innerText();
  expect(text).not.toMatch(/^.container > \* \{/m);
  expect(await itemStyle(page, 0, 'margin-left')).toBe('0px');
});

test('preview item size equals what the exported CSS implies', async ({ page }) => {
  await page.locator('#flexbox-item-width').fill('80px');
  await page.locator('#flexbox-item-height').fill('50px');
  await page.locator('#flexbox-item-padding').fill('6px');
  await page.locator('#flexbox-item-margin').fill('4px');
  const text = await css(page).innerText();
  const htmlText = await page.locator('#flexbox-html-output').innerText();
  const applied = await page.evaluate(([cssText, markup]) => {
    const style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
    const host = document.createElement('div');
    host.innerHTML = markup;
    document.body.appendChild(host);
    const r = host.querySelector('.container > div').getBoundingClientRect();
    host.remove();
    style.remove();
    return { w: r.width, h: r.height };
  }, [text, htmlText]);
  const box = await items(page).nth(0).boundingBox();
  expect(applied).toEqual({ w: 80, h: 50 });
  expect({ w: box.width, h: box.height }).toEqual(applied);
});
