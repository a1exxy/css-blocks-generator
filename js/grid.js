/* Grid generator: pure core (state -> output) and a thin DOM layer. */
(function () {
  'use strict';

  var common = window.CssBlocks;

  // ---- Pure core: no `document` access below this line until the DOM layer. ----

  var ALIGN = ['stretch', 'start', 'end', 'center', 'baseline'];
  var CONTENT = ['normal', 'start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'];
  // Container properties in output order. Empty default means "no value".
  var CONTAINER_PROPS = [
    { name: 'height', def: '' },
    { name: 'display', def: 'grid', options: ['grid', 'inline-grid'] },
    { name: 'grid-template-columns', def: '100px 50px 100px' },
    { name: 'grid-template-rows', def: '50px 50px' },
    { name: 'gap', def: '' },
    { name: 'justify-items', def: 'stretch', options: ALIGN },
    { name: 'align-items', def: 'stretch', options: ALIGN },
    { name: 'justify-content', def: 'normal', options: CONTENT },
    { name: 'align-content', def: 'normal', options: CONTENT },
    { name: 'grid-auto-columns', def: 'auto' },
    { name: 'grid-auto-rows', def: 'auto' },
    { name: 'grid-auto-flow', def: 'row', options: ['row', 'column', 'row dense', 'column dense'] },
  ];

  var MIN_ITEMS = 1;
  var MAX_ITEMS = 50;
  var DEFAULT_ITEMS = 6;

  function defaultState() {
    var container = {};
    CONTAINER_PROPS.forEach(function (p) { container[p.name] = p.def; });
    return { itemCount: DEFAULT_ITEMS, container: container };
  }

  // Parses the item-count field; returns null when the text is not a usable number.
  function parseCount(text) {
    if (!/^\s*[+-]?\d+\s*$/.test(String(text))) return null;
    var n = parseInt(String(text).trim(), 10);
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

  function cssTokens(state) {
    var t = [];
    function rule(selector, decls) {
      t.push(['tok-selector', selector], ' ', ['tok-punct', '{'], '\n');
      decls.forEach(function (d) {
        t.push('  ', ['tok-property', d[0]], ['tok-punct', ':'], ' ', ['tok-value', d[1]], ['tok-punct', ';'], '\n');
      });
      t.push(['tok-punct', '}']);
    }
    rule('.container, .container > *', [['box-sizing', 'border-box']]);
    t.push('\n\n');
    rule('.container', containerDeclarations(state.container));
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
    };
  }

  var generator = {
    state: defaultState(),
    defaultState: defaultState,
    parseCount: parseCount,
    render: render,
  };
  common.register('grid', generator);

  // ---- Thin DOM layer ----

  var previewEl = document.getElementById('grid-preview');
  if (!previewEl) return;
  var cssOut = document.getElementById('grid-css-output');
  var htmlOut = document.getElementById('grid-html-output');
  var countInput = document.getElementById('grid-count');

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
  }

  CONTAINER_PROPS.forEach(function (p) {
    var el = document.getElementById('grid-' + p.name);
    if (!el) return;
    el.addEventListener('input', function () {
      generator.state.container[p.name] = el.value;
      update();
    });
  });

  // Pushes state back into the form controls (used after reset).
  function syncControls() {
    CONTAINER_PROPS.forEach(function (p) {
      var el = document.getElementById('grid-' + p.name);
      if (el) el.value = generator.state.container[p.name];
    });
    countInput.value = String(generator.state.itemCount);
  }

  common.bindActions('grid', {
    getText: function (kind) { return render(generator.state)[kind]; },
    reset: function () {
      generator.state = defaultState();
      syncControls();
      update();
    },
  });

  countInput.addEventListener('input', function () {
    var n = parseCount(countInput.value);
    if (n !== null) {
      generator.state.itemCount = n;
      update();
    }
  });

  update();
})();
