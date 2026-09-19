const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

test.beforeEach(async ({ page }) => { await page.goto(url); });

for (const gen of ['flexbox', 'grid']) {
  test(gen + ': every field has a ? hint with non-empty text', async ({ page }) => {
    const fields = await page.locator('#' + gen + '-panel label.field').evaluateAll((ls) =>
      ls.map((l) => {
        const wrap = l.parentElement;
        const btn = wrap.querySelector('.hint-btn');
        const pop = wrap.querySelector('.hint-pop');
        return { id: l.querySelector('input, select').id, hasBtn: !!btn, text: pop ? pop.textContent.trim() : '' };
      }));
    expect(fields.length).toBeGreaterThan(15);
    for (const f of fields) {
      expect(f.hasBtn, f.id + ' has ?').toBe(true);
      expect(f.text.length, f.id + ' hint text').toBeGreaterThan(10);
    }
  });
}

test('hint opens on click and keyboard, closes on Escape and field use, without layout shift', async ({ page }) => {
  const btn = page.locator('.hint-btn[data-hint-for="flexbox-flex-direction"]');
  const pop = btn.locator('xpath=../*[contains(@class,"hint-pop")]');
  const before = await page.locator('#flexbox-align-items').boundingBox();
  await expect(pop).toBeHidden();
  await btn.click();
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('row-reverse');
  expect(await page.locator('#flexbox-align-items').boundingBox()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(pop).toBeVisible();
  await page.selectOption('#flexbox-flex-direction', 'column');
  await expect(pop).toBeHidden();
  await expect(page.locator('#flexbox-css-output')).toContainText('flex-direction: column');
});

test('hints make no network requests', async ({ page }) => {
  const reqs = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:')) reqs.push(r.url()); });
  await page.goto(url);
  await page.click('.hint-btn');
  expect(reqs).toEqual([]);
});
