/* Подсказки «?» к полям. Все тексты здесь, ключ - id поля (см. index.html).
   Подсказки рисуются из локальных данных, сетевых запросов нет. */
(function () {
  'use strict';

  // Общие для обоих генераторов поля элементов.
  var SIZE = {
    width: 'Ширина элемента: число с единицей (80px, 20%, 10em) или auto. Пусто - размер по умолчанию.',
    height: 'Высота элемента: число с единицей (50px, 10vh, 5em) или auto. Пусто - размер по содержимому.',
    margin: 'Внешний отступ вокруг элемента. Одно значение - со всех сторон (4px), два - вертикаль и горизонталь (4px 8px), четыре - сверху, справа, снизу, слева.',
    padding: 'Внутренний отступ между рамкой элемента и его содержимым. Значения задаются так же, как у margin: 6px, 6px 12px или четыре числа.',
    order: 'Порядок элемента среди соседей: целое число, по умолчанию 0. Элементы с меньшим числом идут раньше, отрицательные допустимы.',
  };
  var ALL = ' Применяется ко всем элементам.';
  var ONE = ' Только для выбранного элемента, перекрывает общую настройку.';

  var HINTS = {
    flexbox: {
      'flexbox-height': 'Высота контейнера (200px, 50vh). Нужна, чтобы было видно выравнивание по вертикали: без неё контейнер не выше своего содержимого.',
      'flexbox-display': 'Тип контейнера. flex - блочный, занимает всю ширину строки; inline-flex - строчный, ширина по содержимому, соседний текст обтекает его.',
      'flexbox-flex-direction': 'Направление главной оси. row - слева направо; row-reverse - справа налево; column - сверху вниз; column-reverse - снизу вверх.',
      'flexbox-flex-wrap': 'Перенос элементов. nowrap - всё в одну линию, элементы сжимаются; wrap - при нехватке места переносятся на новую линию; wrap-reverse - то же, но линии идут в обратном порядке.',
      'flexbox-justify-content': 'Выравнивание вдоль главной оси. flex-start - к началу; flex-end - к концу; center - по центру; space-between - крайние у краёв, промежутки равны; space-around - равные отступы вокруг каждого элемента; space-evenly - равные промежутки и по краям.',
      'flexbox-align-items': 'Выравнивание элементов внутри линии по поперечной оси. stretch - растянуть на всю высоту линии; center - по центру; flex-start - к началу; flex-end - к концу; baseline - по базовой линии текста.',
      'flexbox-align-content': 'Распределение линий по поперечной оси; работает при нескольких линиях (flex-wrap: wrap). stretch - линии растягиваются; flex-start, flex-end, center - сдвиг группы линий; space-between, space-around, space-evenly - распределение свободного места между линиями.',
      'flexbox-count': 'Сколько элементов создать в контейнере: от 1 до 50.',
      'flexbox-item-width': SIZE.width + ALL,
      'flexbox-item-height': SIZE.height + ALL,
      'flexbox-item-margin': SIZE.margin + ALL,
      'flexbox-item-padding': SIZE.padding + ALL,
      'flexbox-selected-width': SIZE.width + ONE,
      'flexbox-selected-height': SIZE.height + ONE,
      'flexbox-selected-margin': SIZE.margin + ' Только для выбранного элемента.',
      'flexbox-selected-padding': SIZE.padding + ' Только для выбранного элемента.',
      'flexbox-selected-order': SIZE.order,
      'flexbox-selected-align-self': 'Выравнивание одного элемента по поперечной оси в обход align-items. Значения: auto, stretch, center, flex-start, flex-end, baseline. Пусто - берётся align-items контейнера.',
      'flexbox-selected-flex-grow': 'Доля свободного места, которую элемент забирает себе: число, по умолчанию 0 (не растёт). У элемента со значением 2 места вдвое больше, чем у элемента со значением 1.',
      'flexbox-selected-flex-shrink': 'Насколько элемент сжимается при нехватке места: число, по умолчанию 1. Значение 0 запрещает сжатие.',
      'flexbox-selected-flex-basis': 'Начальный размер элемента вдоль главной оси до распределения места: 100px, 30% или auto (брать width/height).',
    },
    grid: {
      'grid-height': 'Высота контейнера (300px, 50vh). Без неё контейнер не выше своих строк; нужна, чтобы работали align-content и строки в fr.',
      'grid-display': 'Тип контейнера. grid - блочный, занимает всю ширину строки; inline-grid - строчный, ширина по содержимому.',
      'grid-grid-template-columns': 'Ширины столбцов через пробел: 100px 1fr 2fr, 30% auto, repeat(3, 1fr). fr - доля свободного места, auto - по содержимому.',
      'grid-grid-template-rows': 'Высоты строк через пробел: 50px auto, repeat(2, 1fr). Форматы те же, что у столбцов. Лишние элементы попадут в неявные строки (см. grid-auto-rows).',
      'grid-gap': 'Промежутки между ячейками. Одно значение (10px) - и между строками, и между столбцами; два (10px 20px) - сначала между строками, затем между столбцами.',
      'grid-justify-items': 'Выравнивание содержимого ячеек по горизонтали. stretch - на всю ширину ячейки; start - к левому краю; end - к правому; center - по центру; baseline - по базовой линии.',
      'grid-align-items': 'Выравнивание содержимого ячеек по вертикали. stretch - на всю высоту ячейки; start - к верху; end - к низу; center - по центру; baseline - по базовой линии текста.',
      'grid-justify-content': 'Положение всей сетки по горизонтали, когда столбцы уже контейнера. normal - по умолчанию (как stretch для auto-столбцов); start, end, center - сдвиг сетки; stretch - растянуть auto-столбцы; space-between, space-around, space-evenly - распределение свободного места между столбцами.',
      'grid-align-content': 'Положение всей сетки по вертикали, когда строки ниже высоты контейнера (нужна height). Значения те же: normal, start, end, center, stretch, space-between, space-around, space-evenly.',
      'grid-grid-auto-columns': 'Ширина столбцов, созданных автоматически, если элементов больше, чем задано в grid-template-columns. По умолчанию auto; можно 60px, 1fr.',
      'grid-grid-auto-rows': 'Высота строк, созданных автоматически сверх grid-template-rows. По умолчанию auto; можно 40px, minmax(40px, auto).',
      'grid-grid-auto-flow': 'Порядок автоматического размещения элементов. row - по строкам; column - по столбцам; dense - заполнять пропуски более поздними элементами (row dense, column dense).',
      'grid-count': 'Сколько элементов создать в контейнере: от 1 до 50.',
      'grid-item-width': SIZE.width + ALL,
      'grid-item-height': SIZE.height + ALL,
      'grid-item-margin': SIZE.margin + ALL,
      'grid-item-padding': SIZE.padding + ALL,
      'grid-selected-width': SIZE.width + ONE,
      'grid-selected-height': SIZE.height + ONE,
      'grid-selected-margin': SIZE.margin + ' Только для выбранного элемента.',
      'grid-selected-padding': SIZE.padding + ' Только для выбранного элемента.',
      'grid-selected-order': SIZE.order,
      'grid-selected-align-self': 'Выравнивание элемента в ячейке по вертикали в обход align-items. Значения: auto, stretch, start, end, center, baseline. Пусто - берётся align-items контейнера.',
      'grid-selected-justify-self': 'Выравнивание элемента в ячейке по горизонтали в обход justify-items. Значения: auto, stretch, start, end, center, baseline. Пусто - берётся justify-items контейнера.',
      'grid-selected-grid-column-start': 'Номер вертикальной линии, с которой начинается элемент: 1, 2, -1 (с конца) или span 2 - занять два столбца.',
      'grid-selected-grid-column-end': 'Номер вертикальной линии, на которой элемент заканчивается (сама линия в элемент не входит): 3, -1 или span 2.',
      'grid-selected-grid-row-start': 'Номер горизонтальной линии, с которой начинается элемент: 1, 2, -1 (с конца) или span 2 - занять две строки.',
      'grid-selected-grid-row-end': 'Номер горизонтальной линии, на которой элемент заканчивается (сама линия в элемент не входит): 3, -1 или span 2.',
    },
  };

  // Плоский доступ по id для DOM-слоя и тестов.
  var byId = {};
  Object.keys(HINTS).forEach(function (g) {
    Object.keys(HINTS[g]).forEach(function (id) { byId[id] = HINTS[g][id]; });
  });
  window.CssBlocks.hints = byId;

  // ---- DOM: кнопка «?» рядом с каждым полем, подсказка всплывает поверх (без сдвига вёрстки). ----
  var open = null; // { btn, pop }

  function close() {
    if (!open) return;
    open.pop.hidden = true;
    open.btn.setAttribute('aria-expanded', 'false');
    open = null;
  }

  function toggle(btn, pop) {
    var wasOpen = open && open.btn === btn;
    close();
    if (wasOpen) return;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    open = { btn: btn, pop: pop };
  }

  var seq = 0;
  Array.prototype.forEach.call(document.querySelectorAll('label.field'), function (label) {
    var control = label.querySelector('input, select');
    var id = control ? control.id : '';
    var name = label.querySelector('span').textContent;
    var wrap = document.createElement('div');
    wrap.className = 'field-wrap';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hint-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'Подсказка: ' + name);
    btn.setAttribute('aria-expanded', 'false');
    btn.dataset.hintFor = id;
    var pop = document.createElement('div');
    pop.className = 'hint-pop';
    pop.id = 'hint-' + (++seq);
    pop.setAttribute('role', 'note');
    pop.hidden = true;
    pop.textContent = byId[id] || '';
    btn.setAttribute('aria-controls', pop.id);
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(btn, pop); });
    label.parentNode.insertBefore(wrap, label);
    wrap.appendChild(label);
    wrap.appendChild(btn);
    wrap.appendChild(pop);
  });

  document.addEventListener('click', function (e) {
    if (open && !open.pop.contains(e.target)) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { var b = open.btn; close(); b.focus(); }
  });
  // Любое действие в полях (ввод, выбор) закрывает открытую подсказку.
  document.addEventListener('input', function () { close(); });
})();
