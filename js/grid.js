/* Grid generator: configuration for the shared generator factory (see common.js). */
(function () {
  'use strict';

  window.CssBlocks.createGenerator('grid', {
    defaultCount: 6,
    // Container properties in output order. Empty default means "no value"; `always` emits even the default
    // (display, and the two templates, whose CSS initial value is `none`, not the field default).
    containerProps: [
      { name: 'height', def: '' },
      { name: 'display', def: 'grid', always: true },
      { name: 'grid-template-columns', def: '100px 50px 100px', always: true },
      { name: 'grid-template-rows', def: '50px 50px', always: true },
      { name: 'gap', def: '' },
      { name: 'justify-items', def: 'stretch' },
      { name: 'align-items', def: 'stretch' },
      { name: 'justify-content', def: 'normal' },
      { name: 'align-content', def: 'normal' },
      { name: 'grid-auto-columns', def: 'auto' },
      { name: 'grid-auto-rows', def: 'auto' },
      { name: 'grid-auto-flow', def: 'row' },
    ],
    // Per-item properties (Настройка элемента), in output order; the shared item properties come first.
    overrideProps: ['width', 'height', 'margin', 'padding', 'order', 'align-self', 'justify-self',
      'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end'],
    overrideDefaults: { 'align-self': 'auto', 'justify-self': 'auto' },
  });
})();
