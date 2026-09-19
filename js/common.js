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

  window.CssBlocks = {
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
