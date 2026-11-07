/* Своя полоса прокрутки поверх содержимого (стили — tokens/scrollbar.css). Подключается один раз, находит всё сама:
   страницу и каждую область с overflow auto/scroll, включая появившиеся позже (меню, диалоги, шторки).
   Отказаться у области: data-sb="off" или scrollbar-width: none в её стилях (так делают ленты чипов, боковое меню). */
(() => {
  const root = document.documentElement;
  const HIDE = 1000, EDGE = 16, MIN = 32, INSET = 2, SIZE = 12;
  const items = new Map();   // элемент → { v, h, host, timer, hover, drag }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // бегунок внутри модального слоя/попапа кладём в сам слой — иначе верхний слой (<dialog>) его перекроет
  const hostFor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
      if (p.matches('dialog, [popover], [data-modal-layer]')) return p;
    return null;
  };
  const make = (axis, it) => {
    const b = document.createElement('div');
    b.className = `sb-bar ${axis}${it.host ? ' in-host' : ''}`;
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = '<div class="sb-thumb"></div>';
    b.addEventListener('pointerenter', () => { it.hover = true; clearTimeout(it.timer) });
    b.addEventListener('pointerleave', () => { it.hover = false; hideLater(it) });
    b.addEventListener('pointerdown', (e) => down(e, it, axis));
    (it.host || document.body).appendChild(b);
    return b;
  };

  const attach = (el, v, h) => {
    if (items.has(el)) return;
    const it = { el, host: el === root ? null : hostFor(el), timer: 0, hover: false, drag: false };
    if (el !== root) el.classList.add('sb');
    if (v) it.v = make('v', it);
    if (h) it.h = make('h', it);
    items.set(el, it);
    ro.observe(el);
  };
  const detach = (el, it) => { it.v?.remove(); it.h?.remove(); items.delete(el); ro.unobserve(el) };

  // геометрия: позиция дорожки по краю области, длина и сдвиг бегунка
  const metrics = (it) => {
    const el = it.el, page = el === root;
    const sc = page ? (document.scrollingElement || root) : el;
    let L, T, W, H;
    if (page) { L = 0; T = 0; W = root.clientWidth; H = root.clientHeight }
    else { const r = el.getBoundingClientRect(); L = r.left + el.clientLeft; T = r.top + el.clientTop; W = el.clientWidth; H = el.clientHeight }
    let ox = 0, oy = 0;
    if (it.host) { const hr = it.host.getBoundingClientRect(); ox = hr.left + it.host.clientLeft - it.host.scrollLeft; oy = hr.top + it.host.clientTop - it.host.scrollTop }
    const canV = !!it.v && sc.scrollHeight > sc.clientHeight + 1, canH = !!it.h && sc.scrollWidth > sc.clientWidth + 1;
    const both = canV && canH ? SIZE : 0;
    const out = { sc, canV, canH };
    if (canV) {
      const track = H - INSET * 2 - both, max = sc.scrollHeight - sc.clientHeight;
      const len = Math.max(MIN, Math.round(track * sc.clientHeight / sc.scrollHeight));
      out.v = { track, len, max, left: L + W - SIZE - ox, top: T - oy, size: H - both, pos: INSET + (track - len) * Math.min(1, Math.max(0, sc.scrollTop / max)) };
    }
    if (canH) {
      const track = W - INSET * 2 - both, max = sc.scrollWidth - sc.clientWidth;
      const len = Math.max(MIN, Math.round(track * sc.clientWidth / sc.scrollWidth));
      out.h = { track, len, max, left: L - ox, top: T + H - SIZE - oy, size: W - both, pos: INSET + (track - len) * Math.min(1, Math.max(0, Math.abs(sc.scrollLeft) / max)) };
    }
    return out;
  };
  const place = (it) => {
    const m = metrics(it);
    for (const axis of ['v', 'h']) {
      const b = it[axis]; if (!b) continue;
      const g = m[axis];
      if (!g) { b.classList.remove('on'); continue }
      const s = b.style;
      s.left = g.left + 'px'; s.top = g.top + 'px';
      if (axis === 'v') s.height = g.size + 'px'; else s.width = g.size + 'px';
      s.setProperty('--len', g.len + 'px'); s.setProperty('--pos', g.pos + 'px');
    }
    return m;
  };

  const hideLater = (it) => {
    clearTimeout(it.timer);
    if (it.hover || it.drag) return;
    it.timer = setTimeout(() => { it.v?.classList.remove('on'); it.h?.classList.remove('on') }, HIDE);
  };
  const show = (it, axis) => {
    const m = place(it);
    for (const a of axis ? [axis] : ['v', 'h']) if (it[a] && m[a]) it[a].classList.add('on');
    hideLater(it);
  };

  // прокрутка любой области: показать её бегунок; остальные видимые — переставить (их область могла съехать вместе со страницей)
  let raf = 0; const pending = new Set();
  addEventListener('scroll', (e) => {
    const t = e.target === document ? root : e.target;
    if (items.has(t)) pending.add(t);
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const [el, it] of items) {
        if (pending.has(el)) {
          const sc = el === root ? (document.scrollingElement || root) : el;
          const dx = sc.scrollLeft !== it.sl, dy = sc.scrollTop !== it.st;
          it.sl = sc.scrollLeft; it.st = sc.scrollTop;
          show(it, dy && !dx ? 'v' : dx && !dy ? 'h' : null);
        } else if (it.v?.classList.contains('on') || it.h?.classList.contains('on')) place(it);
      }
      pending.clear();
    });
  }, { capture: true, passive: true });

  // курсор у правого/нижнего края области — проявить бегунок, чтобы его можно было взять
  let pmRaf = 0, lastE;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastE = e;
    if (pmRaf) return;
    pmRaf = requestAnimationFrame(() => {
      pmRaf = 0;
      const { clientX: x, clientY: y, target } = lastE;
      if (target instanceof Element && target.closest('.sb-bar')) return;
      const chain = [];
      for (let p = target instanceof Element ? target : null; p; p = p.parentElement) if (items.has(p) && p !== root) chain.push(p);
      chain.push(root);
      for (const el of chain) {
        const it = items.get(el);
        const r = el === root ? { right: root.clientWidth, bottom: root.clientHeight, left: 0, top: 0 } : el.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        if (it.v && x >= r.right - EDGE) { show(it, 'v'); break }
        if (it.h && y >= r.bottom - EDGE) { show(it, 'h'); break }
      }
    });
  }, { passive: true });

  // перетаскивание бегунка; клик по дорожке — прыжок к этому месту
  const down = (e, it, axis) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const b = it[axis], m = metrics(it), g = m[axis]; if (!g) return;
    const sc = m.sc, V = axis === 'v';
    const thumb = b.firstChild.getBoundingClientRect();
    const p = V ? e.clientY : e.clientX;
    const onThumb = V ? p >= thumb.top && p <= thumb.bottom : p >= thumb.left && p <= thumb.right;
    const ratio = g.max / Math.max(1, g.track - g.len);
    if (!onThumb) {
      const br = b.getBoundingClientRect();
      const want = ((V ? p - br.top : p - br.left) - INSET - g.len / 2) * ratio;
      sc.scrollTo({ [V ? 'top' : 'left']: want, behavior: reduce.matches ? 'instant' : 'smooth' });
      return;
    }
    const start = p, from = V ? sc.scrollTop : sc.scrollLeft;
    it.drag = true; b.classList.add('drag'); root.classList.add('sb-dragging'); clearTimeout(it.timer);
    b.setPointerCapture(e.pointerId);
    const move = (ev) => sc.scrollTo({ [V ? 'top' : 'left']: from + ((V ? ev.clientY : ev.clientX) - start) * ratio, behavior: 'instant' });
    const up = () => {
      it.drag = false; b.classList.remove('drag'); root.classList.remove('sb-dragging');
      b.removeEventListener('pointermove', move); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
      hideLater(it);
    };
    b.addEventListener('pointermove', move); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };

  // размеры областей меняются — переставить видимые бегунки
  const ro = new ResizeObserver((es) => { for (const e of es) { const it = items.get(e.target); if (it && (it.v?.classList.contains('on') || it.h?.classList.contains('on'))) place(it) } });
  addEventListener('resize', () => { for (const it of items.values()) place(it) }, { passive: true });

  // поиск прокручиваемых областей. Вся страница проверяется один раз при загрузке; дальше — ТОЛЬКО добавленные
  // узлы, в простое браузера. Раньше любое изменение DOM (строка в списке, уведомление) перепроверяло все ~3000
  // элементов страницы через getComputedStyle — пересчёт стилей всей страницы посреди анимации, отсюда «лаги»
  const SKIP = '.sb, .sb-bar, .sb-thumb, input, select, svg, svg *';
  const check = (el) => {
    if (el.matches(SKIP) || el.dataset.sb === 'off') return;
    const cs = getComputedStyle(el);
    const v = /auto|scroll/.test(cs.overflowY), h = /auto|scroll/.test(cs.overflowX);
    if ((v || h) && cs.scrollbarWidth !== 'none') attach(el, v, h);   // scrollbar-width: none — область сама отказалась
  };
  const scan = (roots = [document.body]) => {
    for (const r of roots) { if (!r.isConnected) continue; if (r !== document.body) check(r); r.querySelectorAll('*').forEach(check) }
  };
  const added = new Set(); let idle = 0;
  const idleCb = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  new MutationObserver((ms) => {
    for (const m of ms) {
      for (const n of m.addedNodes) if (n.nodeType === 1 && !n.closest('.sb-bar')) added.add(n);
      if (m.removedNodes.length) for (const [el, it] of items) if (el !== root && !el.isConnected) detach(el, it);
    }
    if (added.size && !idle) idle = idleCb(() => { idle = 0; const r = [...added]; added.clear(); scan(r) }, { timeout: 1000 });
  }).observe(document.body, { childList: true, subtree: true });

  attach(root, true, false);
  scan();
  window.scrollbars = { scan, show: (el) => { const it = items.get(el || root); if (it) show(it) } };
})();
