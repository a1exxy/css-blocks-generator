const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

test('static: no modules, imports, fetch/XHR or http(s) URLs', () => {
  const files = [indexPath, ...walk(path.join(root, 'css')), ...walk(path.join(root, 'js'))];
  const rules = [
    [/type\s*=\s*["']?module/i, 'type=module'],
    [/^\s*import\s*[\w{*"']/m, 'import statement'],
    [/^\s*export\s+/m, 'export statement'],
    [/\bimport\s*\(/, 'dynamic import'],
    [/\bfetch\s*\(/, 'fetch('],
    [/XMLHttpRequest/, 'XMLHttpRequest'],
    [/https?:\/\//i, 'http(s) URL'],
    [/@import/, '@import'],
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const [re, name] of rules) expect(re.test(src), path.relative(root, f) + ': ' + name).toBe(false);
  }
});

function watch(page) {
  const problems = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) problems.push('request ' + r.url()); });
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
  return problems;
}

test('no network requests or errors while exercising both tabs', async ({ page, context }) => {
  const problems = watch(page);
  await context.route(/^(?!file:|data:)/, (route) => { problems.push('routed ' + route.request().url()); route.abort(); });
  await page.goto(pathToFileURL(indexPath).href);
  for (const gen of ['flexbox', 'grid']) {
    await page.click('#' + gen + '-tab');
    await expect(page.locator('#' + gen + '-panel')).toBeVisible();
    await page.fill('#' + gen + '-height', '300px');
    await expect(page.locator('#' + gen + '-css-output')).toContainText('300px');
    await page.fill('#' + gen + '-count', '4');
    await page.locator('#' + gen + '-preview .item').first().click();
    await expect(page.locator('#' + gen + '-item-panel')).toBeVisible();
    await page.fill('#' + gen + '-selected-width', '77px');
    await expect(page.locator('#' + gen + '-css-output')).toContainText('77px');
    await page.click('#' + gen + '-copy-css');
    await page.click('#' + gen + '-copy-html');
    await page.locator('#' + gen + '-panel .hint-btn').first().click();
    await page.click('#' + gen + '-reset');
    await expect(page.locator('#' + gen + '-height')).toHaveValue('');
  }
  expect(problems).toEqual([]);
});

test('inlining all linked CSS and JS into one HTML yields a working page', async ({ page }) => {
  const html = indexHtml
    .replace(/<link\s+[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) =>
      '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n</style>')
    .replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) =>
      '<script>\n' + fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
  expect(html).not.toMatch(/<link\s[^>]*stylesheet/);
  expect(html).not.toMatch(/<script\s+src=/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-'));
  const file = path.join(dir, 'single.html');
  fs.writeFileSync(file, html);
  try {
    const problems = watch(page);
    await page.goto(pathToFileURL(file).href);
    await page.fill('#flexbox-height', '321px');
    await expect(page.locator('#flexbox-css-output')).toContainText('height: 321px');
    await page.selectOption('#flexbox-flex-direction', 'column');
    await expect(page.locator('#flexbox-css-output')).toContainText('flex-direction: column');
    await page.click('#grid-tab');
    await expect(page.locator('#grid-panel')).toBeVisible();
    await expect(page.locator('#flexbox-panel')).toBeHidden();
    await page.fill('#grid-gap', '12px');
    await expect(page.locator('#grid-css-output')).toContainText('gap: 12px');
    await page.locator('#grid-preview .item').first().click();
    await expect(page.locator('#grid-item-panel')).toBeVisible();
    await page.locator('#grid-panel .hint-btn').first().click();
    await page.click('#grid-reset');
    await expect(page.locator('#grid-gap')).toHaveValue('');
    expect(problems).toEqual([]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
