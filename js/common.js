/* Shared code and the namespace all scripts hang off (no modules, works over file://). */
(function () {
  'use strict';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Output is built as tokens: a token is a [className, text] pair, or a plain string (no highlight).
  // Pure helpers, no DOM access.
  function tokensToText(tokens) {
    return tokens.map(function (t) { return typeof t === 'string' ? t : t[1]; }).join('');
  }

  function tokensToHtml(tokens) {
    return tokens.map(function (t) {
      return typeof t === 'string' ? escapeHtml(t) : '<span class="' + t[0] + '">' + escapeHtml(t[1]) + '</span>';
    }).join('');
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Copies plain text; resolves to true on success. Falls back to execCommand where the async API is unavailable.
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  // Wires the shared Copy/Reset buttons of a generator whose element ids start with `prefix + '-'`:
  //   <prefix>-copy-css / -copy-html (+ <prefix>-copy-css-status / -copy-html-status), <prefix>-reset.
  // options: { getText(kind) -> plain text, reset() }.
  function bindActions(prefix, options) {
    ['css', 'html'].forEach(function (kind) {
      var btn = document.getElementById(prefix + '-copy-' + kind);
      var status = document.getElementById(prefix + '-copy-' + kind + '-status');
      if (!btn) return;
      var timer;
      btn.addEventListener('click', function () {
        copyText(options.getText(kind)).then(function (ok) {
          if (!status) return;
          status.textContent = ok ? 'Скопировано' : 'Не удалось скопировать';
          clearTimeout(timer);
          timer = setTimeout(function () { status.textContent = ''; }, 2000);
        });
      });
    });
    var reset = document.getElementById(prefix + '-reset');
    if (reset) reset.addEventListener('click', function () { options.reset(); });
  }

  // ---- Per-item overrides (Настройка элемента), generator-agnostic. ----
  // Overrides live in generator state as { "<item number>": { prop: value } } (item numbers are 1-based),
  // the selected item as a number or null. All helpers are pure.

  // Clicking the selected item deselects it; clicking another selects that one.
  function toggleSelected(current, n) {
    return current === n ? null : n;
  }

  // Sets one property of one item's override (mutates `overrides`); the trimmed value is what gets stored.
  // Empty values, values equal to `defaults[prop]` (a select's "auto") and empty items are dropped.
  function setOverride(overrides, n, prop, value, defaults) {
    var trimmed = String(value == null ? '' : value).trim();
    var cur = overrides[n] || {};
    if (trimmed === '' || (defaults && trimmed === defaults[prop])) delete cur[prop]; else cur[prop] = trimmed;
    if (Object.keys(cur).length) overrides[n] = cur; else delete overrides[n];
  }

  // Drops overrides of items beyond `count` (mutates); returns the selection, cleared if it vanished too.
  function pruneOverrides(overrides, selected, count) {
    Object.keys(overrides).forEach(function (k) { if (Number(k) > count) delete overrides[k]; });
    return selected !== null && selected > count ? null : selected;
  }

  // Non-empty declarations of one override as [property, value] pairs, in `props` order.
  // A value equal to `defaults[prop]` counts as empty.
  function overrideDeclarations(override, props, defaults) {
    var decls = [];
    props.forEach(function (prop) {
      var value = String((override && override[prop]) == null ? '' : override[prop]).trim();
      if (value !== '' && !(defaults && value === defaults[prop])) decls.push([prop, value]);
    });
    return decls;
  }

  // Tokens of one CSS rule: selector { prop: value; ... } plus a trailing newline.
  function ruleTokens(selector, decls) {
    var t = [['tok-selector', selector], ' ', ['tok-punct', '{'], '\n'];
    decls.forEach(function (decl) {
      t.push('  ', ['tok-property', decl[0]], ['tok-punct', ':'], ' ', ['tok-value', decl[1]], ['tok-punct', ';'], '\n');
    });
    t.push(['tok-punct', '}'], '\n');
    return t;
  }

  // One rule per item (ascending number) with a non-empty override and number <= count.
  // selectorFor(n) -> selector string. Returns a list of token arrays.
  function overrideRules(overrides, props, count, selectorFor, defaults) {
    var rules = [];
    Object.keys(overrides).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      if (n > count) return;
      var decls = overrideDeclarations(overrides[n], props, defaults);
      if (decls.length) rules.push(ruleTokens(selectorFor(n), decls));
    });
    return rules;
  }

  // ---- Generator factory: everything Flexbox and Grid share. ----

  var MIN_ITEMS = 1;
  var MAX_ITEMS = 50;
  // Shared item properties (applied to all items via `.container > *`), in output order.
  var ITEM_PROPS = ['width', 'height', 'margin', 'padding'];

  // Parses the item-count field; returns null when the text is not a usable number, else a number clamped to 1..50.
  function parseCount(text) {
    if (!/^\s*[+-]?\d+\s*$/.test(String(text))) return null;
    return Math.min(MAX_ITEMS, Math.max(MIN_ITEMS, parseInt(String(text).trim(), 10)));
  }

  // Pure core (no `document` below): state -> output. Only the DOM layer (bindDom) touches the page.
  //   config.defaultCount    initial number of items
  //   config.containerProps  [{ name, def, always? }] in output order: `def` is the field default (not emitted),
  //                          `always` props are emitted even at their default
  //   config.overrideProps   per-item properties in output order (the shared ones come first)
  //   config.overrideDefaults { prop: value } values that mean "not set" for a per-item select
  function createCore(config) {
    var containerProps = config.containerProps;
    var overrideProps = config.overrideProps;

    function defaultState() {
      var container = {};
      containerProps.forEach(function (p) { container[p.name] = p.def; });
      var item = {};
      ITEM_PROPS.forEach(function (name) { item[name] = ''; });
      return { itemCount: config.defaultCount, container: container, item: item, selected: null, overrides: {} };
    }

    function containerDeclarations(container) {
      var decls = [];
      containerProps.forEach(function (p) {
        var value = String(container[p.name] == null ? '' : container[p.name]).trim();
        if (value === '' || (value === p.def && !p.always)) return;
        decls.push([p.name, value]);
      });
      return decls;
    }

    function cssTokens(state) {
      var rules = [
        ruleTokens('.container, .container > *', [['box-sizing', 'border-box']]),
        ruleTokens('.container', containerDeclarations(state.container)),
      ];
      var itemDecls = overrideDeclarations(state.item, ITEM_PROPS);
      if (itemDecls.length) rules.push(ruleTokens('.container > *', itemDecls));
      overrideRules(state.overrides, overrideProps, state.itemCount, function (n) {
        return '.container > :nth-child(' + n + ')';
      }, config.overrideDefaults).forEach(function (rule) { rules.push(rule); });
      var tokens = [];
      rules.forEach(function (rule, i) { if (i) tokens.push('\n'); tokens = tokens.concat(rule); });
      return tokens;
    }

    function htmlTokens(state) {
      var tokens = [];
      function open(tag, cls) {
        tokens.push(['tok-punct', '<'], ['tok-tag', tag]);
        if (cls) tokens.push(' ', ['tok-attr', 'class'], ['tok-punct', '='], ['tok-string', '"' + cls + '"']);
        tokens.push(['tok-punct', '>']);
      }
      function close(tag) {
        tokens.push(['tok-punct', '</'], ['tok-tag', tag], ['tok-punct', '>']);
      }
      open('div', 'container');
      tokens.push('\n');
      for (var i = 1; i <= state.itemCount; i++) {
        tokens.push('  ');
        open('div');
        tokens.push(String(i));
        close('div');
        tokens.push('\n');
      }
      close('div');
      return tokens;
    }

    // state -> everything the DOM layer needs. Highlighted strings are HTML-escaped.
    function render(state) {
      var css = cssTokens(state);
      var html = htmlTokens(state);
      var perItem = {}; // { itemNumber: [[prop, value], ...] } for items within the count
      Object.keys(state.overrides).forEach(function (k) {
        if (Number(k) > state.itemCount) return;
        var decls = overrideDeclarations(state.overrides[k], overrideProps, config.overrideDefaults);
        if (decls.length) perItem[k] = decls;
      });
      return {
        css: tokensToText(css),
        html: tokensToText(html),
        cssHighlighted: tokensToHtml(css),
        htmlHighlighted: tokensToHtml(html),
        containerDeclarations: containerDeclarations(state.container),
        itemDeclarations: overrideDeclarations(state.item, ITEM_PROPS),
        overrideDeclarations: perItem,
      };
    }

    return { defaultState: defaultState, render: render, parseCount: parseCount };
  }

  // ---- DOM layer: fields, preview, click-to-select, copy/reset. Ids all start with `prefix + '-'`. ----
  function bindDom(prefix, config, generator) {
    var previewEl = document.getElementById(prefix + '-preview');
    if (!previewEl) return;
    var cssOut = document.getElementById(prefix + '-css-output');
    var htmlOut = document.getElementById(prefix + '-html-output');
    var itemPanel = document.getElementById(prefix + '-item-panel');
    var itemTitle = document.getElementById(prefix + '-item-title');
    var countInput = document.getElementById(prefix + '-count');
    var overrideDefaults = config.overrideDefaults || {};

    function field(kind, name) { return document.getElementById(prefix + '-' + (kind ? kind + '-' : '') + name); }

    function update() {
      var state = generator.state;
      var out = generator.render(state);
      cssOut.innerHTML = out.cssHighlighted;
      htmlOut.innerHTML = out.htmlHighlighted;

      // Set property by property: a value the browser rejects leaves the last valid one in place.
      var containerValues = {};
      out.containerDeclarations.forEach(function (decl) { containerValues[decl[0]] = decl[1]; });
      config.containerProps.forEach(function (p) {
        if (containerValues[p.name] === undefined) previewEl.style.removeProperty(p.name);
        else previewEl.style.setProperty(p.name, containerValues[p.name]);
      });

      while (previewEl.children.length > state.itemCount) previewEl.removeChild(previewEl.lastChild);
      while (previewEl.children.length < state.itemCount) {
        var item = document.createElement('div');
        item.className = 'item';
        item.textContent = String(previewEl.children.length + 1);
        previewEl.appendChild(item);
      }

      // Shared item settings inline on every preview item; the item's own override wins.
      var sharedValues = {};
      out.itemDeclarations.forEach(function (decl) { sharedValues[decl[0]] = decl[1]; });
      Array.prototype.forEach.call(previewEl.children, function (el, i) {
        var ownValues = {};
        (out.overrideDeclarations[i + 1] || []).forEach(function (decl) { ownValues[decl[0]] = decl[1]; });
        config.overrideProps.forEach(function (prop) {
          var value = ownValues[prop] !== undefined ? ownValues[prop] : sharedValues[prop];
          if (value === undefined) el.style.removeProperty(prop);
          else el.style.setProperty(prop, value);
        });
        el.classList.toggle('selected', state.selected === i + 1);
      });

      itemPanel.hidden = state.selected === null;
      itemTitle.textContent = state.selected === null ? '' : 'Элемент ' + state.selected;
    }

    // Pushes state back into the form controls (used after reset and selection changes).
    function syncControls() {
      var state = generator.state;
      config.containerProps.forEach(function (p) {
        var el = field('', p.name);
        if (el) el.value = state.container[p.name];
      });
      countInput.value = String(state.itemCount);
      ITEM_PROPS.forEach(function (name) {
        var el = field('item', name);
        if (el) el.value = state.item[name];
      });
      var own = state.overrides[state.selected] || {};
      config.overrideProps.forEach(function (name) {
        var el = field('selected', name);
        if (el) el.value = own[name] == null ? (overrideDefaults[name] || '') : own[name];
      });
    }

    previewEl.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el.parentNode !== previewEl) el = el.parentNode;
      if (!el) return;
      var n = Array.prototype.indexOf.call(previewEl.children, el) + 1;
      generator.state.selected = toggleSelected(generator.state.selected, n);
      syncControls();
      update();
    });

    function listen(kind, name, onValue) {
      var el = field(kind, name);
      if (el) el.addEventListener('input', function () { onValue(el.value); });
    }
    config.containerProps.forEach(function (p) {
      listen('', p.name, function (value) { generator.state.container[p.name] = value; update(); });
    });
    ITEM_PROPS.forEach(function (name) {
      listen('item', name, function (value) { generator.state.item[name] = value; update(); });
    });
    config.overrideProps.forEach(function (name) {
      listen('selected', name, function (value) {
        if (generator.state.selected === null) return;
        setOverride(generator.state.overrides, generator.state.selected, name, value, overrideDefaults);
        update();
      });
    });

    countInput.addEventListener('input', function () {
      var n = generator.parseCount(countInput.value);
      if (n === null) return;
      generator.state.itemCount = n;
      generator.state.selected = pruneOverrides(generator.state.overrides, generator.state.selected, n);
      update();
    });

    bindActions(prefix, {
      getText: function (kind) { return generator.render(generator.state)[kind]; },
      reset: function () {
        generator.state = generator.defaultState();
        syncControls();
        update();
      },
    });

    update();
  }

  // Creates the generator `name` (its DOM ids start with `name + '-'`) and exposes it as window.CssBlocks[name].
  // Its state lives in memory only.
  function createGenerator(name, config) {
    var core = createCore(config);
    var generator = {
      state: core.defaultState(),
      defaultState: core.defaultState,
      parseCount: core.parseCount,
      render: core.render,
    };
    window.CssBlocks[name] = generator;
    bindDom(name, config, generator);
    return generator;
  }

  window.CssBlocks = {
    createGenerator: createGenerator,
    escapeHtml: escapeHtml,
    tokensToText: tokensToText,
    tokensToHtml: tokensToHtml,
  };
})();
