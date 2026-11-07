/* Общее поведение страниц сайта Coreless: иконки и появление блоков при прокрутке. Компоненты запускает библиотека js/. */
(() => {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  try { lucide.createIcons() } catch (e) {}
  /* ===== Появление блоков при прокрутке — один раз ===== */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  // соседи в одной группе входят лесенкой по 60 мс
  $$('.rv').forEach((el) => {
    const sib = [...el.parentElement.children].filter((x) => x.classList.contains('rv'));
    const i = sib.indexOf(el); if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 60 + 'ms';
    io.observe(el);
  });
  // задержку лесенки убираем после входа, чтобы она не тормозила будущие переходы
  document.addEventListener('transitionend', (e) => { if (e.target.classList?.contains('rv') && e.propertyName === 'opacity') e.target.style.transitionDelay = '' });
})();
