/* Flexbox generator: configuration for the shared generator factory (see common.js). */
(function () {
  'use strict';

  window.CssBlocks.createGenerator('flexbox', {
    defaultCount: 3,
    // Container properties in output order. Empty default means "no value"; `always` emits even the default.
    containerProps: [
      { name: 'width', def: '' },
      { name: 'height', def: '300px', always: true },
      { name: 'display', def: 'flex', always: true },
      { name: 'flex-direction', def: 'row' },
      { name: 'flex-wrap', def: 'nowrap' },
      { name: 'justify-content', def: 'flex-start' },
      { name: 'align-items', def: 'stretch' },
      { name: 'align-content', def: 'stretch' },
    ],
    // Per-item properties (Настройка элемента), in output order; the shared item properties come first.
    overrideProps: ['width', 'height', 'margin', 'padding', 'order', 'align-self', 'flex-grow', 'flex-shrink', 'flex-basis'],
    overrideDefaults: { 'align-self': 'auto' },
  });
})();
