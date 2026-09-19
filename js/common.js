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

  window.CssBlocks = {
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
