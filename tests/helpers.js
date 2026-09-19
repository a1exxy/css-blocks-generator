// Shared helpers for the Playwright specs (external behaviour only: DOM ids and computed styles).
const path = require('path');
const { pathToFileURL } = require('url');

const url = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

// Locators and small actions for one generator; `prefix` is 'flexbox' or 'grid'.
function locators(prefix) {
  const id = (suffix) => '#' + prefix + '-' + suffix;
  return {
    css: (page) => page.locator(id('css-output')),
    html: (page) => page.locator(id('html-output')),
    preview: (page) => page.locator(id('preview')),
    items: (page) => page.locator(id('preview') + ' > *'),
    panel: (page) => page.locator(id('item-panel')),
    field: (page, prop) => page.locator(id('selected-' + prop)),
    shared: (page, prop) => page.locator(id('item-' + prop)),
    control: (page, prop) => page.locator(id(prop)),
    count: (page) => page.locator(id('count')),
    // Types a count and commits it the way a user does (Enter).
    setCount: async (page, value) => {
      await page.locator(id('count')).fill(String(value));
      await page.locator(id('count')).press('Enter');
    },
    // Computed style of the preview container.
    computed: (page, prop) =>
      page.locator(id('preview')).evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop),
    // Computed style of the i-th preview item (0-based).
    itemStyle: (page, i, prop) =>
      page.locator(id('preview') + ' > *').nth(i).evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop),
  };
}

module.exports = { url, locators };
