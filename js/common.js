/* Shared code and the namespace all scripts hang off (no modules, works over file://). */
(function () {
  'use strict';

  var generators = {};

  window.CssBlocks = {
    // Each generator file calls register(); state lives in memory only.
    register: function (name, generator) {
      generators[name] = generator;
      window.CssBlocks[name] = generator;
    },
    names: function () {
      return Object.keys(generators);
    },
  };
})();
