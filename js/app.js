/* Page bootstrap: tab switching. Generator state is kept in memory, panels are only hidden. */
(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  function select(name) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-generator') === name;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      select(tab.getAttribute('data-generator'));
    });
  });
})();
