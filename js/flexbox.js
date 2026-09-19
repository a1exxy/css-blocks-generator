/* Flexbox generator: pure core (state -> output) and a thin DOM layer. */
(function () {
  'use strict';

  var common = window.CssBlocks;

  // ---- Pure core: no `document` access below this line until the DOM layer. ----

  // Container properties in output order. Empty default means "no value".
  var CONTAINER_PROPS = [
    { name: 'height', def: '' },
    { name: 'display', def: 'flex', options: ['flex', 'inline-flex'] },
    { name: 'flex-direction', def: 'row', options: ['row', 'row-reverse', 'column', 'column-reverse'] },
    { name: 'flex-wrap', def: 'nowrap', options: ['nowrap', 'wrap', 'wrap-reverse'] },
    { name: 'justify-content', def: 'flex-start',
      options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'] },
    { name: 'align-items', def: 'stretch', options: ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'] },
    { name: 'align-content', def: 'stretch',
      options: ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'] },
  ];

  // Shared item properties (applied to all items via `.container > *`), in output order.
  var ITEM_PROPS = ['width', 'height', 'margin', 'padding'];

  // Per-item properties (Настройка элемента), in output order.
  var OVERRIDE_PROPS = ['width', 'height', 'margin', 'padding', 'order', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis'];

  var MIN_ITEMS = 1;
  var MAX_ITEMS = 50;

  function defaultState() {
    var container = {};
    CONTAINER_PROPS.forEach(function (p) { container[p.name] = p.def; });
    var item = {};
    ITEM_PROPS.forEach(function (n) { item[n] = ''; });
    return { itemCount: 3, container: container, item: item, selected: null, overrides: {} };
  }

  // Parses the item-count field; returns null when the text is not a usable number.
  function parseCount(text) {
    var n = parseInt(String(text).trim(), 10);
    if (!isFinite(n) || !/^\s*[+-]?\d+\s*$/.test(String(text))) return null;
    return Math.min(MAX_ITEMS, Math.max(MIN_ITEMS, n));
  }

  // Non-default container declarations as [property, value] pairs (display is always emitted).
  function containerDeclarations(container) {
    var decls = [];
    CONTAINER_PROPS.forEach(function (p) {
      var value = String(container[p.name] == null ? '' : container[p.name]).trim();
      if (value === '' || (value === p.def && p.name !== 'display')) return;
      decls.push([p.name, value]);
    });
    return decls;
  }

  // Non-empty shared item declarations as [property, value] pairs.
  function itemDeclarations(item) {
    var decls = [];
    ITEM_PROPS.forEach(function (n) {
      var value = String((item && item[n]) == null ? '' : item[n]).trim();
      if (value !== '') decls.push([n, value]);
    });
    return decls;
  }

  function cssTokens(state) {
    var rules = [
      common.ruleTokens('.container, .container > *', [['box-sizing', 'border-box']]),
      common.ruleTokens('.container', containerDeclarations(state.container)),
    ];
    var itemDecls = itemDeclarations(state.item);
    if (itemDecls.length) rules.push(common.ruleTokens('.container > *', itemDecls));
    common.overrideRules(state.overrides || {}, OVERRIDE_PROPS, state.itemCount, function (n) {
      return '.container > :nth-child(' + n + ')';
    }).forEach(function (r) { rules.push(r); });
    var t = [];
    rules.forEach(function (r, i) { if (i) t.push('\n'); t = t.concat(r); });
    return t;
  }

  function htmlTokens(state) {
    var t = [];
    function open(tag, cls) {
      t.push(['tok-punct', '<'], ['tok-tag', tag]);
      if (cls) t.push(' ', ['tok-attr', 'class'], ['tok-punct', '='], ['tok-string', '"' + cls + '"']);
      t.push(['tok-punct', '>']);
    }
    function close(tag) {
      t.push(['tok-punct', '</'], ['tok-tag', tag], ['tok-punct', '>']);
    }
    open('div', 'container');
    t.push('\n');
    for (var i = 1; i <= state.itemCount; i++) {
      t.push('  ');
      open('div');
      t.push(String(i));
      close('div');
      t.push('\n');
    }
    close('div');
    return t;
  }

  // state -> everything the DOM layer needs. Highlighted strings are HTML-escaped.
  function render(state) {
    var css = cssTokens(state);
    var html = htmlTokens(state);
    return {
      css: common.tokensToText(css),
      html: common.tokensToText(html),
      cssHighlighted: common.tokensToHtml(css),
      htmlHighlighted: common.tokensToHtml(html),
      containerDeclarations: containerDeclarations(state.container),
      itemDeclarations: itemDeclarations(state.item),
      // { itemNumber: [[prop, value], ...] } for items within the count.
      overrideDeclarations: (function () {
        var out = {};
        Object.keys(state.overrides || {}).forEach(function (k) {
          if (Number(k) > state.itemCount) return;
          var d = common.overrideDeclarations(state.overrides[k], OVERRIDE_PROPS);
          if (d.length) out[k] = d;
        });
        return out;
      })(),
    };
  }

  var generator = {
    state: defaultState(),
    defaultState: defaultState,
    parseCount: parseCount,
    render: render,
  };
  common.register('flexbox', generator);

  // ---- Thin DOM layer ----

  var previewEl = document.getElementById('flexbox-preview');
  if (!previewEl) return;
  var cssOut = document.getElementById('flexbox-css-output');
  var htmlOut = document.getElementById('flexbox-html-output');
  var itemPanel = document.getElementById('flexbox-item-panel');
  var itemTitle = document.getElementById('flexbox-item-title');
  var countInput = document.getElementById('flexbox-count');

  function update() {
    var state = generator.state;
    var out = render(state);
    cssOut.innerHTML = out.cssHighlighted;
    htmlOut.innerHTML = out.htmlHighlighted;

    // Set property by property: a value the browser rejects leaves the last valid one in place.
    var wanted = {};
    out.containerDeclarations.forEach(function (d) { wanted[d[0]] = d[1]; });
    CONTAINER_PROPS.forEach(function (p) {
      if (wanted[p.name] === undefined) previewEl.style.removeProperty(p.name);
      else previewEl.style.setProperty(p.name, wanted[p.name]);
    });

    while (previewEl.children.length > state.itemCount) previewEl.removeChild(previewEl.lastChild);
    while (previewEl.children.length < state.itemCount) {
      var item = document.createElement('div');
      item.className = 'item';
      item.textContent = String(previewEl.children.length + 1);
      previewEl.appendChild(item);
    }

    // Shared item settings: inline on every preview item.
    var itemWanted = {};
    out.itemDeclarations.forEach(function (d) { itemWanted[d[0]] = d[1]; });
    Array.prototype.forEach.call(previewEl.children, function (el, i) {
      var own = {};
      (out.overrideDeclarations[i + 1] || []).forEach(function (d) { own[d[0]] = d[1]; });
      OVERRIDE_PROPS.forEach(function (n) {
        var v = own[n] !== undefined ? own[n] : itemWanted[n];
        if (v === undefined) el.style.removeProperty(n);
        else el.style.setProperty(n, v);
      });
      el.classList.toggle('selected', state.selected === i + 1);
    });

    itemPanel.hidden = state.selected === null;
    itemTitle.textContent = state.selected === null ? '' : 'Элемент ' + state.selected;
  }

  previewEl.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.parentNode !== previewEl) el = el.parentNode;
    if (!el) return;
    var n = Array.prototype.indexOf.call(previewEl.children, el) + 1;
    generator.state.selected = common.toggleSelected(generator.state.selected, n);
    syncControls();
    update();
  });

  OVERRIDE_PROPS.forEach(function (n) {
    var el = document.getElementById('flexbox-selected-' + n);
    if (!el) return;
    el.addEventListener('input', function () {
      if (generator.state.selected === null) return;
      common.setOverride(generator.state.overrides, generator.state.selected, n, el.value);
      update();
    });
  });

  CONTAINER_PROPS.forEach(function (p) {
    var el = document.getElementById('flexbox-' + p.name);
    if (!el) return;
    el.addEventListener('input', function () {
      generator.state.container[p.name] = el.value;
      update();
    });
  });

  // Pushes state back into the form controls (used after reset).
  function syncControls() {
    CONTAINER_PROPS.forEach(function (p) {
      var el = document.getElementById('flexbox-' + p.name);
      if (el) el.value = generator.state.container[p.name];
    });
    countInput.value = String(generator.state.itemCount);
    ITEM_PROPS.forEach(function (n) {
      var el = document.getElementById('flexbox-item-' + n);
      if (el) el.value = generator.state.item[n];
    });
    var own = generator.state.overrides[generator.state.selected] || {};
    OVERRIDE_PROPS.forEach(function (n) {
      var el = document.getElementById('flexbox-selected-' + n);
      if (el) el.value = own[n] == null ? '' : own[n];
    });
  }

  common.bindActions('flexbox', {
    getText: function (kind) { return render(generator.state)[kind]; },
    reset: function () {
      generator.state = defaultState();
      syncControls();
      update();
    },
  });

  ITEM_PROPS.forEach(function (n) {
    var el = document.getElementById('flexbox-item-' + n);
    if (!el) return;
    el.addEventListener('input', function () {
      generator.state.item[n] = el.value;
      update();
    });
  });

  countInput.addEventListener('input', function () {
    var n = parseCount(countInput.value);
    if (n !== null) {
      generator.state.itemCount = n;
      generator.state.selected = common.pruneOverrides(generator.state.overrides, generator.state.selected, n);
      update();
    }
  });

  update();
})();
