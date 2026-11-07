/* Тема: предпочтение light | dark | system.
   Подключать в <head> БЕЗ defer — тема ставится до первой отрисовки, без мигания чужой темы.
   Переключатели: любые кнопки с data-theme-v="light|dark|system" (aria-checked ставится сам).
   Тема по умолчанию: <html data-theme-default="dark">, иначе dark.
   API: setThemePref(pref, animate), getThemePref(); событие window 'themechange' {theme, pref}. */
// Вид спиннера по умолчанию на всех страницах — меняется этой строкой:
// 'tail' | 'ring' | 'rays' | 'dots' | 'bars' | 'grid' | 'square' | 'arc'
const SPINNER = 'tail';
/* Свои настройки у сайта продукта: <html data-store="coreless"> → ключи 'coreless:ds-theme' и т. п.
   Иначе выбор на витрине (тот же адрес) перекрашивал бы лендинг: у продукта свой акцент и свой режим. */
const DS_KEY = (k) => (document.documentElement.dataset.store ? document.documentElement.dataset.store + ':' : '') + k;
(() => {
  const root = document.documentElement;
  if (!root.dataset.spinner) root.dataset.spinner = SPINNER;
  if (innerWidth <= 960) root.classList.add('nav-compact');   // шапка-бургер до первой отрисовки; точный порог считает nav.js   // страница может задать свой: <html data-spinner="dots">
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let pref = null;
  try { pref = localStorage.getItem(DS_KEY('ds-theme')) } catch (e) {}
  if (!['light', 'dark', 'system'].includes(pref)) pref = root.dataset.themeDefault || 'dark';

  const resolve = (p) => (p === 'system' ? (mqDark.matches ? 'dark' : 'light') : p);
  const paint = () => document.querySelectorAll('[data-theme-v]').forEach((b) => b.setAttribute('aria-checked', b.dataset.themeV === pref));
  const apply = (theme, animate) => {
    const go = () => { root.dataset.theme = theme; dispatchEvent(new CustomEvent('themechange', { detail: { theme, pref } })) };
    // плавная смена — через View Transitions (кадр-снимок растворяется), без перекраски каждого элемента
    // во скрытой вкладке браузер пропускает переход (тема всё равно меняется) — гасим отказ промиса, чтобы не шуметь в консоли
    if (animate && document.startViewTransition && !reduce.matches) { const vt = document.startViewTransition(go); vt.ready.catch(() => {}); vt.finished.catch(() => {}) }
    else go();
  };

  root.dataset.theme = resolve(pref);   // до отрисовки

  window.setThemePref = (p, animate) => {
    pref = p; apply(resolve(p), animate); paint();
    try { localStorage.setItem(DS_KEY('ds-theme'), p) } catch (e) {}
  };
  window.getThemePref = () => pref;
  window.paintThemeControls = paint;

  mqDark.addEventListener('change', () => { if (pref === 'system') apply(resolve('system'), true) });
  // другая вкладка или окно-образец (iframe) сменили тему — подхватываем
  addEventListener('storage', (e) => { if (e.key === DS_KEY('ds-theme') && ['light', 'dark', 'system'].includes(e.newValue)) { pref = e.newValue; apply(resolve(pref), false); paint() } });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-theme-v]'); if (b) setThemePref(b.dataset.themeV, true) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();

// Заголовки: короткий предлог или союз не остаётся в конце строки («договорённости о / сменах»).
// После него ставится неразрывный пробел; data-typo-off на элементе — отключить.
(() => {
  const RE = /(^|[\s(« ])(в|во|на|о|об|обо|с|со|к|ко|у|и|а|но|по|за|из|от|до|для|без|не|при|про|над|под|или|ни) /gi;
  const fix = (root) => root.querySelectorAll('h1, h2, h3, h4, .sec-title, .hero-title').forEach((h) => {
    if (h.closest('[data-typo-off]')) return;
    const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const t = n.textContent.replace(RE, '$1$2 ').replace(RE, '$1$2 '); if (t !== n.textContent) n.textContent = t }
  });
  window.typoFix = fix;   // для заголовков, вставленных скриптом позже
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fix(document)); else fix(document);
})();

/* Режим цвета: mono (Vercel) | accent (Linear, по умолчанию) | tint (Supabase) | rich («Выраженная»: фон и слои в тон акцента) — tokens/palettes.css.
   Кнопки data-palette-v="…" (aria-checked ставится сам). API: setPalette(p, animate), getPalette(); событие 'palettechange'. */
(() => {
  const root = document.documentElement, OK = ['mono', 'accent', 'tint', 'rich'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let pal = null;
  try { pal = localStorage.getItem(DS_KEY('ds-palette')) } catch (e) {}
  if (!OK.includes(pal)) pal = root.dataset.paletteDefault || 'accent';
  const put = () => { if (pal === 'accent') delete root.dataset.palette; else root.dataset.palette = pal };
  put();   // до отрисовки
  const paint = () => document.querySelectorAll('[data-palette-v]').forEach((b) => b.setAttribute('aria-checked', b.dataset.paletteV === pal));
  window.setPalette = (p, animate) => {
    if (!OK.includes(p)) return; pal = p;
    const go = () => { put(); paint(); dispatchEvent(new CustomEvent('palettechange', { detail: { palette: p } })) };
    if (animate && document.startViewTransition && !reduce.matches) { const vt = document.startViewTransition(go); vt.ready.catch(() => {}); vt.finished.catch(() => {}) } else go();
    try { localStorage.setItem(DS_KEY('ds-palette'), p) } catch (e) {}
  };
  window.getPalette = () => pal;
  addEventListener('storage', (e) => { if (e.key === DS_KEY('ds-palette') && OK.includes(e.newValue)) { pal = e.newValue; put(); paint() } });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-palette-v]'); if (b) setPalette(b.dataset.paletteV, true) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();

/* Бесконечные анимации, которых не видно, стоят на паузе (класс .anim-off, стиль — в components.css).
   Спиннеры с анимацией своих свойств (@property: arc, square, bars, grid, dots) и скелеты перерисовываются
   на каждом кадре в основном потоке — даже за экраном. 15 таких на странице съедали треть кадра,
   и любая анимация поверх (окно, список) начинала «лагать». Замер: кадр в покое 18–24 мс → 6 мс (CPU ×4) */
(() => {
  const SEL = '.spinner, .skeleton';
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('anim-off', !e.isIntersecting)), { rootMargin: '64px' });
  const watch = (n) => { if (n.nodeType !== 1) return; if (n.matches(SEL)) io.observe(n); n.querySelectorAll(SEL).forEach((x) => io.observe(x)) };
  const start = () => {
    watch(document.body);
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(watch))).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* Акцентный цвет: evory (по умолчанию) и ещё 17 подобранных вручную (список OK ниже) — tokens/accents.css (только проверенные тона).
   Кнопки data-accent-v="…" (aria-checked ставится сам). API: setAccent(name, animate), getAccent(); событие 'accentchange'. */
(() => {
  const root = document.documentElement, OK = ['evory', 'ink', 'slate', 'petrol', 'aubergine', 'wine', 'terracotta', 'moss', 'ochre', 'brick', 'dustrose', 'lilac', 'heather', 'azure', 'seawave', 'sage', 'pine', 'graphite'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let acc = null;
  try { acc = localStorage.getItem(DS_KEY('ds-accent')) } catch (e) {}
  if (!OK.includes(acc)) acc = root.dataset.accentDefault || 'evory';
  const put = () => { if (acc === 'evory') delete root.dataset.accent; else root.dataset.accent = acc };
  put();   // до отрисовки
  const paint = () => document.querySelectorAll('[data-accent-v]').forEach((b) => b.setAttribute('aria-checked', b.dataset.accentV === acc));
  window.setAccent = (a, animate) => {
    if (!OK.includes(a)) return; acc = a;
    const go = () => { put(); paint(); dispatchEvent(new CustomEvent('accentchange', { detail: { accent: a } })) };
    if (animate && document.startViewTransition && !reduce.matches) { const vt = document.startViewTransition(go); vt.ready.catch(() => {}); vt.finished.catch(() => {}) } else go();
    try { localStorage.setItem(DS_KEY('ds-accent'), a) } catch (e) {}
  };
  window.getAccent = () => acc;
  addEventListener('storage', (e) => { if (e.key === DS_KEY('ds-accent') && OK.includes(e.newValue)) { acc = e.newValue; put(); paint() } });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-accent-v]'); if (b) setAccent(b.dataset.accentV, true) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();
