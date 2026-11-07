/* Блокировка прокрутки страницы под модальными слоями — подключается один раз, работает для всех.
   Модальный слой = любой <dialog>, открытый через showModal(), или <html data-modal-open> (мобильное меню, шторка).
   Внутри слоя прокручиваемые области работают; помечать свои слои: [data-modal-layer].

   Почему не overflow:hidden: он убирает полосу прокрутки за один кадр — на Windows это видно как «мигание»
   правого края (замер: яркость полосы 35.7 → 9.0 в первом кадре, затемнение ещё не началось).
   Здесь полоса остаётся на месте, просто страница не реагирует на колесо, касание и клавиши. */
(() => {
  const root = document.documentElement;
  let locked = false, lockY = 0, touchY = 0;

  const isModalOpen = () => root.hasAttribute('data-modal-open') || !!document.querySelector('dialog:modal');
  const layerOf = (t) => t instanceof Element ? t.closest('dialog:modal, [data-modal-layer]') : null;

  // может ли что-то между целью и слоем прокрутиться в нужную сторону
  const canScroll = (el, dy, stop) => {
    for (; el && el !== stop.parentElement; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      }
    }
    return false;
  };
  const block = (e, dy) => {
    if (!locked) return;
    const layer = layerOf(e.target);
    if (layer && canScroll(e.target, dy, layer)) return;   // прокрутка внутри слоя — можно
    e.preventDefault();                                     // иначе прокрутилась бы страница
  };

  addEventListener('wheel', (e) => block(e, e.deltaY), { passive: false });
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY }, { passive: true });
  addEventListener('touchmove', (e) => { const y = e.touches[0].clientY; block(e, touchY - y); touchY = y }, { passive: false });
  const KEYS = { ' ': 1, PageDown: 1, PageUp: -1, ArrowDown: 1, ArrowUp: -1, End: 1, Home: -1 };
  addEventListener('keydown', (e) => {
    if (!locked || !(e.key in KEYS)) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable], [role=listbox], [role=menu], [role=tablist]')) return;
    block(e, e.key === ' ' && e.shiftKey ? -1 : KEYS[e.key]);
  });
  // запасной путь (перетаскивание бегунка полосы, якоря): возвращаем позицию
  addEventListener('scroll', () => { if (locked && Math.abs(scrollY - lockY) > 0) scrollTo({ top: lockY, behavior: 'instant' }) }, { passive: true });

  const update = () => {
    const m = isModalOpen();
    if (m === locked) return;
    locked = m;
    if (m) lockY = scrollY;
    root.toggleAttribute('data-scroll-locked', m);
  };
  new MutationObserver(update).observe(document, { subtree: true, attributes: true, attributeFilter: ['open', 'data-modal-open'] });
  update();
})();
