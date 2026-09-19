/* Shared code and the namespace all scripts hang off (no modules, works over file://). */
(function () {
  'use strict';

  var generators = {};

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
  // options: { getText(kind) -> plain text, reset() }. Reusable by Grid.
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

  // Sets one property of one item's override (mutates `overrides`); empty values and empty items are dropped.
  function setOverride(overrides, n, prop, value) {
    var v = String(value == null ? '' : value).trim();
    var cur = overrides[n] || {};
    if (v === '') delete cur[prop]; else cur[prop] = value;
    if (Object.keys(cur).length) overrides[n] = cur; else delete overrides[n];
  }

  // Drops overrides of items beyond `count` (mutates); returns the selection, cleared if it vanished too.
  function pruneOverrides(overrides, selected, count) {
    Object.keys(overrides).forEach(function (k) { if (Number(k) > count) delete overrides[k]; });
    return selected !== null && selected > count ? null : selected;
  }

  // Non-empty declarations of one override as [property, value] pairs, in `props` order.
  function overrideDeclarations(override, props) {
    var decls = [];
    props.forEach(function (n) {
      var v = String((override && override[n]) == null ? '' : override[n]).trim();
      if (v !== '') decls.push([n, v]);
    });
    return decls;
  }

  // Tokens of one CSS rule: selector { prop: value; ... } plus a trailing newline.
  function ruleTokens(selector, decls) {
    var t = [['tok-selector', selector], ' ', ['tok-punct', '{'], '\n'];
    decls.forEach(function (d) {
      t.push('  ', ['tok-property', d[0]], ['tok-punct', ':'], ' ', ['tok-value', d[1]], ['tok-punct', ';'], '\n');
    });
    t.push(['tok-punct', '}'], '\n');
    return t;
  }

  // One rule per item (ascending number) with a non-empty override and number <= count.
  // selectorFor(n) -> selector string. Returns a list of token arrays.
  function overrideRules(overrides, props, count, selectorFor) {
    var rules = [];
    Object.keys(overrides).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      if (n > count) return;
      var decls = overrideDeclarations(overrides[n], props);
      if (decls.length) rules.push(ruleTokens(selectorFor(n), decls));
    });
    return rules;
  }

  window.CssBlocks = {
    toggleSelected: toggleSelected,
    setOverride: setOverride,
    pruneOverrides: pruneOverrides,
    overrideDeclarations: overrideDeclarations,
    ruleTokens: ruleTokens,
    overrideRules: overrideRules,
    copyText: copyText,
    bindActions: bindActions,
    // Each generator file calls register(); state lives in memory only.
    register: function (name, generator) {
      generators[name] = generator;
      window.CssBlocks[name] = generator;
    },
    names: function () {
      return Object.keys(generators);
    },
    escapeHtml: escapeHtml,
    tokensToText: tokensToText,
    tokensToHtml: tokensToHtml,
  };
})();
