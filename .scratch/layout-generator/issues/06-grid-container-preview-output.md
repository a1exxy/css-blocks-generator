# 06: Grid: контейнер, превью и вывод

**What to build:** во вкладке Grid пользователь настраивает контейнер и количество элементов, видит превью и получает CSS- и HTML-вывод; доступны «Копировать» и «Сбросить». Дефолты соответствуют спецификации, вместо устаревших `grid-column-gap`/`grid-row-gap` используется одно поле `gap`.

**Blocked by:** 02, 05

**Status:** done

- [x] Поля контейнера: `display`, `height`, `grid-template-columns`, `grid-template-rows`, `gap` (`10px` и `10px 20px`), `justify-items`, `align-items`, `justify-content`, `align-content`, `grid-auto-columns`, `grid-auto-rows`, `grid-auto-flow`
- [x] Поле количества элементов; превью и HTML-вывод содержат нужное число элементов
- [x] CSS-вывод содержит только не-дефолтные значения (по спецификации, `justify-content`/`align-content` по умолчанию `normal`), выводится `gap`
- [x] Вывод соответствует вычисленным стилям превью
- [x] «Копировать» и «Сбросить» работают, сброс не затрагивает Flexbox
- [x] Некорректное значение не ломает страницу
- [x] Сквозные тесты Playwright
