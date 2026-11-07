/* Навигация и слои · поведение к tokens/layers.css.
   Подключение: <script src="js/layers.js" defer></script>. Инициализация автоматическая; для новой разметки — initLayers(root).
   Открыть любой <dialog> (шторка, подтверждение, палитра): кнопка с data-open="id".
   Меню у кнопки — aria-haspopup="menu" + aria-controls; подсказка — data-tip. Всё включается само.
   API: toast({type, title, text, action:{label, run}, duration}) → {update, close}; fieldError(input, текст | ''); resetDialog(dialog). */
(() => {
  const EASE = 'cubic-bezier(.23,1,.32,1)', DRAWER = 'cubic-bezier(.32,.72,0,1)';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const once = (el, k) => { if (el.dataset[k]) return false; el.dataset[k] = '1'; return true };
  const $ = (id) => document.getElementById(id);
  const P = {
    l: '<path d="m15 18-6-6 6-6"/>', r: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path pathLength="1" d="M20 6 9 17l-5-5"/>', more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    success: '<path d="M20 6 9 17l-5-5"/>', error: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', default: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>'
  };
  const svg = (n, cls = '') => `<svg class="lucide ${cls}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const instant = (el) => { el.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('no-anim'))) };

  /* Позиция плавающей панели: у кнопки (rect) или у курсора (point). Не вылезает за экран, при нехватке места — переворачивается.
     --origin: угол, ближайший к источнику, — оттуда панель и «растёт» */
  const place = (el, at, align) => {
    const pt = at.width === undefined, m = 8, gap = pt ? 2 : 8, W = innerWidth, H = innerHeight;
    const r = pt ? { left: at.x, right: at.x, top: at.y, bottom: at.y } : at;
    el.style.left = '0px'; el.style.top = '0px';
    const w = el.offsetWidth, h = el.offsetHeight;
    const below = r.bottom + gap + h <= H - m || r.top - gap - h < m;
    let y = below ? r.bottom + gap : r.top - gap - h;
    let x = align === 'end' ? r.right - w : r.left;
    if (x + w > W - m) x = pt ? r.left - w : W - m - w;
    x = Math.max(m, Math.min(x, W - m - w)); y = Math.max(m, Math.min(y, H - m - h));
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    el.style.setProperty('--origin', `${below ? 'top' : 'bottom'} ${x + w / 2 < (r.left + r.right) / 2 ? 'right' : 'left'}`);
    el.style.setProperty('--dir', below ? -1 : 1);
  };
  // стрелки, Home/End, Esc по пунктам меню
  const menuKeys = (m, close) => m.addEventListener('keydown', (e) => {
    const it = [...m.querySelectorAll('.menu-item:not([aria-disabled=true])')], i = it.indexOf(document.activeElement);
    const go = (k) => { e.preventDefault(); it[(k + it.length) % it.length]?.focus() };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i < 0 ? -1 : i - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(-1);
    else if (e.key === 'Escape') { e.preventDefault(); close(true) } else if (e.key === 'Tab') close(false);
  });

  /* ===== Хлебные крошки: data-collapse — длинный путь сворачивается в «…» ===== */
  function crumbs(nav) {
    if (!once(nav, 'ly')) return;
    const lis = [...nav.querySelectorAll('li')];
    if (!nav.hasAttribute('data-collapse') || lis.length <= 4) return;
    const mid = lis.slice(1, -2); mid.forEach((li) => li.classList.add('folded'));
    const more = document.createElement('li');
    more.innerHTML = `<button type="button" class="crumb-more" aria-label="Показать путь полностью">${svg('more')}</button>`;
    lis[0].after(more);
    more.firstChild.addEventListener('click', () => {
      mid.forEach((li) => li.classList.remove('folded'));
      mid[0].querySelector('a')?.focus({ preventScroll: true });
      if (reduce.matches) { more.remove(); return }
      // середина разворачивается по ширине, «…» схлопывается — путь растёт плавно, без скачка
      mid.forEach((li) => { const w = li.offsetWidth; li.style.overflow = 'hidden';
        li.animate([{ width: '0px', opacity: 0 }, { width: w + 'px', opacity: 1 }], { duration: 240, easing: EASE }).onfinish = () => (li.style.overflow = '') });
      more.style.overflow = 'hidden';
      more.animate([{ width: more.offsetWidth + 'px', opacity: 1 }, { width: '0px', opacity: 0 }], { duration: 200, easing: EASE }).onfinish = () => more.remove();
    });
  }

  /* ===== Страницы: data-total, data-page, (data-per, data-count — подпись «1–20 из 248») ===== */
  function pager(n) {
    if (!once(n, 'ly')) return;
    const total = +n.dataset.total, per = +n.dataset.per || 0, count = +n.dataset.count || 0, slots = Math.min(7, total);
    let page = Math.min(total, Math.max(1, +n.dataset.page || 1));
    n.setAttribute('role', 'navigation'); if (!n.getAttribute('aria-label')) n.setAttribute('aria-label', 'Страницы');
    n.innerHTML = (per ? '<span class="pager-range"></span>' : '')
      + `<button type="button" class="pg-prev" aria-label="Предыдущая страница">${svg('l')}</button>`
      + `<div class="pager-nums"><span class="pager-plate"></span>${'<button type="button"></button>'.repeat(slots)}</div>`
      + `<span class="pager-info"></span><button type="button" class="pg-next" aria-label="Следующая страница">${svg('r')}</button>`;
    const btns = [...n.querySelectorAll('.pager-nums button')], plate = n.querySelector('.pager-plate');
    const prev = n.querySelector('.pg-prev'), next = n.querySelector('.pg-next'), info = n.querySelector('.pager-info'), range = n.querySelector('.pager-range');
    // всегда 7 мест: 1 … 4 5 6 … 24 — ширина не прыгает
    const seq = () => {
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
      if (page <= 4) return [1, 2, 3, 4, 5, 0, total];
      if (page >= total - 3) return [1, 0, total - 4, total - 3, total - 2, total - 1, total];
      return [1, 0, page - 1, page, page + 1, 0, total];
    };
    const render = (anim) => {
      const s = seq();
      btns.forEach((b, i) => { const v = s[i]; b.textContent = v || '…'; b.classList.toggle('gap', !v); b.disabled = !v;
        if (v) b.setAttribute('aria-label', 'Страница ' + v); else b.removeAttribute('aria-label');
        if (v === page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current') });
      const cur = btns[s.indexOf(page)];
      if (!anim) instant(n);
      plate.style.setProperty('--x', cur.offsetLeft + 'px'); plate.style.setProperty('--w', cur.offsetWidth + 'px');
      prev.disabled = page === 1; next.disabled = page === total;
      info.innerHTML = `Страница <b>${page}</b> из ${total}`;
      if (range) range.textContent = `${((page - 1) * per + 1).toLocaleString('ru-RU')}–${Math.min(page * per, count).toLocaleString('ru-RU')} из ${count.toLocaleString('ru-RU')}`;
      n.dataset.page = page;
    };
    const go = (p) => { if (p < 1 || p > total || p === page) return; page = p; render(true); n.dispatchEvent(new CustomEvent('page', { detail: { page } })) };
    btns.forEach((b) => b.addEventListener('click', () => go(+b.textContent)));
    prev.addEventListener('click', () => go(page - 1)); next.addEventListener('click', () => go(page + 1));
    n.setPage = go;
    render(false); document.fonts?.ready.then(() => render(false));
    new ResizeObserver(() => render(false)).observe(n);
  }

  /* ===== Шаги: el.setStep(i) — 0…n (n = все пройдены) ===== */
  function steps(ol) {
    if (!once(ol, 'ly')) return;
    const items = [...ol.children];
    items.forEach((li) => { const d = li.querySelector('.step-dot'); if (d && !d.querySelector('svg')) d.insertAdjacentHTML('beforeend', svg('check')) });
    ol.setStep = (i, anim = true) => {
      if (!anim) instant(ol);
      items.forEach((li, k) => { li.classList.toggle('done', k < i); if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current') });
      ol.dataset.step = i; ol.dispatchEvent(new CustomEvent('step', { detail: { step: i } }));
    };
    ol.setStep(+ol.dataset.step || 0, false);
  }

  /* ===== Боковое меню: сворачивание в полосу иконок, группы, выбор пункта ===== */
  function side(s) {
    if (!once(s, 'ly')) return;
    let user = false;
    const set = (c) => {
      s.classList.toggle('collapsed', c);
      s.querySelectorAll('[data-side-toggle]').forEach((b) => b.setAttribute('aria-expanded', !c));
      s.querySelectorAll('.side-item, .side-search').forEach((it) => { const t = it.querySelector('.side-tx')?.textContent; if (c && t) it.setAttribute('aria-label', t); else it.removeAttribute('aria-label') });
    };
    s.querySelectorAll('[data-side-toggle]').forEach((b) => b.addEventListener('click', () => { user = true; set(!s.classList.contains('collapsed')) }));
    // в свёрнутом виде кнопка-рабочее пространство разворачивает меню
    s.querySelector('.side-ws')?.addEventListener('click', (e) => { if (s.classList.contains('collapsed')) { e.stopPropagation(); user = true; set(false) } }, true);
    s.querySelectorAll('.side-label').forEach((l) => l.addEventListener('click', () => l.setAttribute('aria-expanded', l.getAttribute('aria-expanded') === 'false')));
    s.querySelectorAll('.side-item').forEach((it) => it.addEventListener('click', (e) => {
      if (it.getAttribute('href') === '#') e.preventDefault();
      s.querySelectorAll('.side-item[aria-current]').forEach((x) => x.removeAttribute('aria-current')); it.setAttribute('aria-current', 'page');
    }));
    // узкий контейнер — свёрнуто, пока человек сам не развернул
    if (s.parentElement) new ResizeObserver(([e]) => { if (!user) set(e.contentRect.width < 560) }).observe(s.parentElement);
  }

  /* ===== Оглавление: подсвечивает раздел, который сейчас читают; клик — плавная прокрутка ===== */
  function onpage(nav) {
    if (!once(nav, 'ly')) return;
    const sc = nav.dataset.scroll ? document.querySelector(nav.dataset.scroll) : null;
    const links = [...nav.querySelectorAll('a[href^="#"]')], targets = links.map((a) => document.querySelector(a.hash));
    const ul = nav.querySelector('ul'); let mark = nav.querySelector('.onpage-mark');
    if (!mark) { mark = document.createElement('span'); mark.className = 'onpage-mark'; ul.append(mark) }
    let cur = -1, lock = false;
    // отступ сверху при переходе: у области прокрутки 16, у страницы — высота шапки + 16 (data-offset переопределяет).
    // Раздел считается текущим, когда его заголовок дошёл до этой линии (+24) — иначе после клика подсветка уходила на предыдущий
    const off = nav.dataset.offset ? +nav.dataset.offset : sc ? 16 : ((document.querySelector('.site-header')?.offsetHeight || 64) + 16);
    const set = (i, anim) => {
      if (i === cur && anim) return; cur = i;
      links.forEach((a, k) => a.setAttribute('aria-current', k === i));
      if (!anim) instant(nav);
      mark.style.setProperty('--y', links[i].offsetTop + 'px'); mark.style.setProperty('--h', links[i].offsetHeight + 'px');
    };
    const top = () => (sc ? sc.getBoundingClientRect().top : 0);
    const spy = () => {
      if (lock) return;
      const t = top(), end = sc ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      let i = 0; targets.forEach((el, k) => { if (el && el.getBoundingClientRect().top - t <= off + 24) i = k });
      set(end ? targets.length - 1 : i, true);
    };
    (sc || window).addEventListener('scroll', spy, { passive: true });
    links.forEach((a, i) => a.addEventListener('click', (e) => {
      e.preventDefault(); const el = targets[i]; if (!el) return;
      lock = true; set(i, true);
      const y = sc ? el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off : el.getBoundingClientRect().top + scrollY - off;
      (sc || window).scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
      const done = () => { lock = false }; (sc || window).addEventListener('scrollend', done, { once: true }); setTimeout(done, 900);
    }));
    set(0, false); requestAnimationFrame(spy);
  }

  /* ===== Поповер: кнопка data-pop="id" (клик) или data-pop-hover (карточка по наведению) ===== */
  const pops = new Set();
  const closeAll = (except) => pops.forEach((f) => f !== except && f(false));
  function popover(btn) {
    const p = $(btn.dataset.pop); if (!p || !once(btn, 'ly')) return;
    if (p.parentElement !== document.body) document.body.append(p);   // fixed-слой не должен зависеть от предков
    const hover = btn.hasAttribute('data-pop-hover');
    let tOpen, tClose;
    btn.setAttribute('aria-expanded', 'false'); if (!hover) btn.setAttribute('aria-haspopup', 'dialog');
    const pos = () => place(p, btn.getBoundingClientRect(), p.dataset.align);
    const close = (ret) => {
      if (!p.classList.contains('open')) return;
      p.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      if (ret === true) btn.focus();
    };
    const open = () => {
      closeAll(close); pos(); p.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      if (!hover) { const f = p.querySelector('input, textarea, select, button'); f?.focus({ preventScroll: true }); if (f?.select) f.select() }
    };
    pops.add(close);
    if (hover) {
      const enter = () => { clearTimeout(tClose); tOpen = setTimeout(open, 400) };
      const leave = () => { clearTimeout(tOpen); tClose = setTimeout(() => close(), 160) };
      btn.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && enter()); btn.addEventListener('pointerleave', leave);
      p.addEventListener('pointerenter', () => clearTimeout(tClose)); p.addEventListener('pointerleave', leave);
      btn.addEventListener('focus', () => btn.matches(':focus-visible') && open()); btn.addEventListener('blur', () => close());
    } else btn.addEventListener('click', () => (p.classList.contains('open') ? close() : open()));
    p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true) } });
    p.querySelectorAll('[data-pop-close]').forEach((b) => b.addEventListener('click', () => close(true)));
    p.querySelector('form')?.addEventListener('submit', (e) => { e.preventDefault(); p.dispatchEvent(new CustomEvent('pop-submit', { detail: new FormData(e.target) })); close(true) });
    addEventListener('pointerdown', (e) => { if (!p.contains(e.target) && !btn.contains(e.target)) close() });
    addEventListener('resize', () => p.classList.contains('open') && pos());
    addEventListener('scroll', () => p.classList.contains('open') && pos(), { passive: true, capture: true });
  }

  /* ===== Контекстное меню: data-ctx="menuId" на списке, строки .ctx-row (правый клик, клавиша меню, долгое нажатие) ===== */
  function ctx(zone) {
    const m = $(zone.dataset.ctx); if (!m || !once(zone, 'ly')) return;
    if (m.parentElement !== document.body) document.body.append(m);
    m.classList.add('fixed');
    let row = null, tLong;
    const close = (ret) => {
      if (!m.classList.contains('open')) return;
      m.classList.remove('open'); row?.classList.remove('ctx-on');
      if (ret === true) row?.focus(); row = null;
    };
    const open = (x, y, r) => {
      row?.classList.remove('ctx-on'); row = r; r.classList.add('ctx-on');
      place(m, { x, y }); m.classList.add('open');
      m.querySelector('.menu-item:not([aria-disabled=true])')?.focus({ preventScroll: true });
    };
    zone.querySelectorAll('.ctx-row').forEach((r) => { r.tabIndex = 0; r.setAttribute('aria-haspopup', 'menu') });
    zone.addEventListener('contextmenu', (e) => {
      const r = e.target.closest('.ctx-row'); if (!r) return; e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) { const b = r.getBoundingClientRect(); open(b.left + 12, b.bottom, r) } else open(e.clientX, e.clientY, r);
    });
    zone.addEventListener('keydown', (e) => {
      const r = e.target.closest('.ctx-row'); if (!r) return;
      if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const b = r.getBoundingClientRect(); open(b.left + 12, b.bottom, r) }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); (e.key === 'ArrowDown' ? r.nextElementSibling : r.previousElementSibling)?.focus() }
    });
    // iOS не присылает contextmenu — долгое нажатие 500 мс
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return; const r = e.target.closest('.ctx-row'); if (!r) return;
      const x = e.clientX, y = e.clientY; tLong = setTimeout(() => open(x, y, r), 500);
    });
    ['pointerup', 'pointercancel', 'pointermove'].forEach((t) => zone.addEventListener(t, () => clearTimeout(tLong)));
    menuKeys(m, close);
    m.querySelectorAll('.menu-item').forEach((it) => it.addEventListener('click', () => {
      const r = row; close(true); zone.dispatchEvent(new CustomEvent('ctx-pick', { detail: { row: r, item: it, label: it.querySelector('span')?.textContent } }));
    }));
    addEventListener('pointerdown', (e) => { if (!m.contains(e.target)) close() });
    addEventListener('resize', () => close()); addEventListener('scroll', () => close(), { passive: true, capture: true }); addEventListener('blur', () => close());
  }

  /* ===== Любой <dialog>: закрытие по фону и кнопкам [data-close] ===== */
  /* data-guard="id": если в форме что-то введено, фон / Esc / крестик сначала спрашивают через этот диалог */
  const dirty = (d) => [...d.querySelectorAll('input, textarea, select')].some((f) =>
    f.type === 'checkbox' || f.type === 'radio' ? f.checked !== f.defaultChecked
      : f.tagName === 'SELECT' ? [...f.options].some((o) => o.selected !== o.defaultSelected) : f.value !== f.defaultValue);
  const tryClose = (d) => {
    const g = d.dataset.guard && $(d.dataset.guard);
    if (g && dirty(d)) { g.parentDialog = d; g.showModal(); return }
    d.close();
  };
  // форма очищается, когда окно уже погасло — не на глазах
  const resetLater = (d) => setTimeout(() => {
    d.querySelectorAll('form').forEach((f) => f.reset());
    d.querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
    d.querySelectorAll('.field .error').forEach((e) => e.remove());
    d.querySelectorAll('.field .hint[hidden]').forEach((h) => (h.hidden = false));
    d.querySelectorAll('select').forEach((s) => s.dispatchEvent(new Event('change', { bubbles: true })));
    d.dispatchEvent(new CustomEvent('reset-done'));
  }, 260);
  function dlg(d) {
    if (!once(d, 'dlg')) return;
    // закрытие по фону — в момент НАЖАТИЯ (pointerdown), не по click: click приходит только на отпускании,
    // окно висит лишнее мгновение. Нажали внутри, отпустили снаружи (выделяли текст) — не закрываем: target не фон.
    d.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target !== d) return; const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { e.preventDefault(); tryClose(d) }   // preventDefault: под фоном не начнётся выделение
    });
    d.addEventListener('cancel', (e) => { if (d.dataset.guard && dirty(d)) { e.preventDefault(); tryClose(d) } });
    d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => tryClose(d)));
    // подтверждение выхода: «Не сохранять» закрывает и его, и форму под ним
    d.querySelector('[data-discard]')?.addEventListener('click', () => { const p = d.parentDialog; d.close(); if (p) { p.close(); resetLater(p) } });
    // длинное окно: линии под шапкой и над кнопками — только когда за ними есть скрытый текст
    const main = d.classList.contains('dialog-scroll') && d.querySelector('.dialog-main');
    if (main) {
      const edges = () => { d.classList.toggle('sh-top', main.scrollTop > 1); d.classList.toggle('sh-bottom', main.scrollTop + main.clientHeight < main.scrollHeight - 1) };
      main.addEventListener('scroll', edges, { passive: true }); new ResizeObserver(edges).observe(main);
      d.addEventListener('close', () => setTimeout(() => { main.scrollTop = 0 }, 260));
    }
  }

  /* Ошибка поля: красный контур + текст вместо подсказки; исправили — подсказка возвращается */
  const fieldError = (inp, msg) => {
    const f = inp.closest('.field'); if (!f) return;
    const hint = f.querySelector('.hint'); let er = f.querySelector('.error');
    if (msg) {
      inp.setAttribute('aria-invalid', 'true');
      if (!er) { er = document.createElement('span'); er.className = 'error'; er.setAttribute('role', 'alert'); (hint || f.lastElementChild).after(er) }
      er.textContent = msg; if (hint) hint.hidden = true;
    } else if (inp.hasAttribute('aria-invalid')) {
      inp.removeAttribute('aria-invalid'); er?.remove();
      if (hint) { hint.hidden = false; hint.classList.remove('is-back'); void hint.offsetWidth; hint.classList.add('is-back') }
    }
  };

  /* ===== Меню у кнопки: button[aria-haspopup=menu][aria-controls=id] + div.menu#id рядом (в обёртке position: relative) =====
     Клик или ↓ открывает, стрелки ходят по пунктам, Esc закрывает и возвращает фокус, нажатие мимо закрывает.
     Выбор пункта — событие menu-pick на меню (detail: {item, label}) */
  function menuBtn(btn) {
    const m = $(btn.getAttribute('aria-controls')); if (!m || !m.classList.contains('menu') || !once(btn, 'mb')) return;
    btn.setAttribute('aria-expanded', 'false');
    const isOpen = () => m.classList.contains('open');
    const close = (ret) => { if (!isOpen()) return; const inside = m.contains(document.activeElement); m.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); if (ret && inside) btn.focus() };
    const open = (kb) => { m.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); if (kb) m.querySelector('.menu-item:not([aria-disabled=true])')?.focus() };
    btn.addEventListener('click', (e) => (isOpen() ? close(true) : open(e.detail === 0)));   // detail 0 — нажали с клавиатуры
    btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(true) } });
    menuKeys(m, close);
    m.addEventListener('click', (e) => {
      const it = e.target.closest('.menu-item'); if (!it || it.getAttribute('aria-disabled') === 'true') return;
      close(true); m.dispatchEvent(new CustomEvent('menu-pick', { bubbles: true, detail: { item: it, label: it.querySelector('span')?.textContent } }));
    });
    addEventListener('pointerdown', (e) => { if (!m.contains(e.target) && !btn.contains(e.target)) close(false) });
  }

  /* ===== Подсказка: [data-tip="текст"] (+ data-kbd="⌘C"). Одна .tip на страницу, создаётся сама.
     Только мышь и фокус с клавиатуры; первая — через 400 мс, соседние — сразу и без анимации, пока «прогрето» ===== */
  {
    let tip = null, timer = 0, coolT = 0, warm = false, cur = null;
    const box = () => {
      if (tip) return tip;
      tip = document.querySelector('.tip[role=tooltip]');
      if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip) }
      return tip;
    };
    const show = (el) => {
      const t = box(); cur = el;
      t.textContent = el.dataset.tip;
      if (el.dataset.kbd) { const k = document.createElement('span'); k.className = 'kbd'; k.textContent = el.dataset.kbd; t.append(k) }
      t.style.left = '0px'; t.style.top = '0px';
      const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, M = 8;
      const up = r.top - h - M >= M;   // сверху не влезает — под элементом
      t.style.left = Math.round(Math.max(M, Math.min(r.left + r.width / 2 - w / 2, innerWidth - M - w))) + 'px';
      t.style.top = Math.round(up ? r.top - h - M : r.bottom + M) + 'px';
      t.style.setProperty('--origin', up ? 'bottom center' : 'top center');
      t.classList.toggle('instant', warm); t.classList.add('show'); warm = true; clearTimeout(coolT);
    };
    const hide = () => { clearTimeout(timer); cur = null; if (!tip?.classList.contains('show')) return; tip.classList.remove('show'); coolT = setTimeout(() => { warm = false }, 300) };
    addEventListener('pointerover', (e) => {
      const el = e.target.closest?.('[data-tip]'); if (!el || el === cur || e.pointerType !== 'mouse') return;
      clearTimeout(timer); if (warm) show(el); else { cur = el; timer = setTimeout(() => show(el), 400) }
    });
    addEventListener('pointerout', (e) => { const el = e.target.closest?.('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide() });
    addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el?.matches(':focus-visible')) show(el) });
    addEventListener('focusout', (e) => { if (e.target.closest?.('[data-tip]')) hide() });
    addEventListener('pointerdown', hide, true);
    addEventListener('scroll', hide, { passive: true, capture: true });
  }

  /* ===== Шторка: нижнюю можно смахнуть вниз — за 30% высоты или быстрым движением ===== */
  function sheet(d) {
    dlg(d);
    if (!d.classList.contains('sheet-bottom') || !once(d, 'drag')) return;
    let y0 = 0, t0 = 0, dy = 0, on = false;
    d.querySelectorAll('.sheet-grab, .sheet-head').forEach((h) => {
      h.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        on = true; y0 = e.clientY; t0 = performance.now(); dy = 0; h.setPointerCapture(e.pointerId); d.classList.add('dragging');
      });
      h.addEventListener('pointermove', (e) => {
        if (!on) return; const raw = e.clientY - y0;
        dy = raw < 0 ? raw / 4 : raw;                 // вверх — с сопротивлением
        d.style.transform = `translateY(${dy}px)`;
      });
      const up = () => {
        if (!on) return; on = false;
        const v = dy / Math.max(1, performance.now() - t0), from = `translateY(${dy}px)`;
        if (dy > d.offsetHeight * 0.3 || v > 0.6) {
          // уходит: одна анимация из скрипта; .dragging остаётся до закрытия, чтобы CSS-переход не включился параллельно
          d.style.transform = '';
          d.animate([{ transform: from }, { transform: 'translateY(100%)' }], { duration: 220, easing: EASE, fill: 'forwards' });
          const bd = d.animate([{ background: getComputedStyle(d, '::backdrop').backgroundColor }, { background: '#0000' }], { duration: 220, easing: EASE, fill: 'forwards', pseudoElement: '::backdrop' });
          bd.onfinish = () => { d.style.transition = 'none'; d.classList.remove('dragging'); d.close(); d.getAnimations({ subtree: false }).forEach((a) => a.cancel()); bd.cancel(); requestAnimationFrame(() => (d.style.transition = '')) };
        } else {
          // возвращается: только CSS-переход шторки от текущего места к нулю, без второй анимации поверх (она давала рывок и «пружину» в конце)
          d.classList.remove('dragging'); d.style.transform = '';
        }
      };
      h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
  }

  /* ===== Подтверждение опасного действия: data-name — что нужно ввести ===== */
  function danger(d) {
    if (!once(d, 'ly')) return; dlg(d);
    const inp = d.querySelector('input'), ok = d.querySelector('[data-confirm]'), name = d.dataset.name;
    const check = () => { ok.disabled = inp.value.trim() !== name };
    inp.addEventListener('input', check); check();
    d.addEventListener('close', () => setTimeout(() => { inp.value = ''; check() }, 260));   // очищаем после того, как погас
    d.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault(); if (ok.disabled) return;
      btnLoading(ok, true);
      setTimeout(() => { btnLoading(ok, false); d.close(); d.dispatchEvent(new CustomEvent('confirmed')) }, 1100);
    });
  }

  /* ===== Командная палитра: пункты в разметке (.cmdk-item, data-k — синонимы для поиска). ⌘K / Ctrl+K ===== */
  function cmdk(d) {
    if (!once(d, 'ly')) return; dlg(d);
    const inp = d.querySelector('input'), list = d.querySelector('.cmdk-list'), empty = d.querySelector('.cmdk-empty');
    const items = [...d.querySelectorAll('.cmdk-item')], groups = [...d.querySelectorAll('.cmdk-group')];
    items.forEach((it, i) => { const s = it.querySelector('span'); it.dataset.label = s.textContent; it.id ||= 'cmdk-' + i; it.setAttribute('role', 'option') });
    list.setAttribute('role', 'listbox'); inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-controls', list.id ||= 'cmdk-list'); inp.setAttribute('aria-expanded', 'true');
    let vis = items, act = null, mouse = false;
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const setAct = (it, scroll) => {
      act?.classList.remove('active'); act = it || null; act?.classList.add('active');
      if (act) { inp.setAttribute('aria-activedescendant', act.id); if (scroll) { const lt = list.scrollTop, r = act.offsetTop - list.offsetTop, h = act.offsetHeight;
        if (r < lt + 8) list.scrollTop = r - 8; else if (r + h > lt + list.clientHeight - 8) list.scrollTop = r + h - list.clientHeight + 8 } }
      else inp.removeAttribute('aria-activedescendant');
    };
    const filter = (animate) => {
      const q = inp.value.trim().toLowerCase(), h0 = list.offsetHeight;
      vis = [];
      items.forEach((it) => {
        const lab = it.dataset.label, i = lab.toLowerCase().indexOf(q), hit = !q || i >= 0 || (it.dataset.k || '').toLowerCase().includes(q);
        it.hidden = !hit; if (hit) vis.push(it);
        it.querySelector('span').innerHTML = q && i >= 0 ? esc(lab.slice(0, i)) + '<mark>' + esc(lab.slice(i, i + q.length)) + '</mark>' + esc(lab.slice(i + q.length)) : esc(lab);
      });
      groups.forEach((g) => (g.hidden = !g.querySelector('.cmdk-item:not([hidden])')));
      empty.hidden = !!vis.length; if (!vis.length) empty.querySelector('b').textContent = `«${inp.value.trim()}»`;
      setAct(vis[0]); list.scrollTop = 0;
      // высота списка меняется плавно — без скачка нижнего края
      const h1 = list.offsetHeight;
      if (animate && h0 !== h1 && !reduce.matches) list.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 180, easing: EASE });
    };
    const run = (it) => { if (!it) return; d.close(); d.dispatchEvent(new CustomEvent('cmdk-run', { detail: { item: it, label: it.dataset.label, action: it.dataset.run } })) };
    inp.addEventListener('input', () => filter(true));
    inp.addEventListener('keydown', (e) => {
      const i = vis.indexOf(act);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (vis.length) setAct(vis[(i + (e.key === 'ArrowDown' ? 1 : -1) + vis.length) % vis.length], true) }
      else if (e.key === 'Enter') { e.preventDefault(); run(act) }
    });
    // мышь выделяет, только если она действительно двигалась (а не список уехал под неподвижным курсором)
    list.addEventListener('pointermove', (e) => { const it = e.target.closest('.cmdk-item'); if (it && mouse && it !== act) setAct(it); mouse = true });
    list.addEventListener('click', (e) => run(e.target.closest('.cmdk-item')));
    d.addEventListener('close', () => { mouse = false });
    d.openPalette = () => { if (d.open) return; inp.value = ''; filter(false); d.showModal(); inp.focus() };
    addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !document.querySelector('[data-hotkey="mod+k"]')) { e.preventDefault(); d.open ? d.close() : d.openPalette() }
    });
  }

  /* ===== Стопка уведомлений: колода внизу по центру ===== */
  let host = null; const live = [];   // от старого к новому
  const MAX = 3, PEEK = 12, GAP = 8;
  let open = false;
  const layout = () => {
    if (!host) return;
    const list = live.filter((t) => !t.gone).reverse();   // спереди — самое новое
    const h0 = list[0]?.h || 0; let acc = 0;
    list.forEach((t, i) => {
      const st = t.el.style, back = i > 0 && !open;
      st.setProperty('--z', String(100 - i));
      st.setProperty('--y', (open ? -acc : -i * PEEK) + 'px');
      st.setProperty('--s', open ? '1' : String(1 - i * 0.05));
      st.setProperty('--h', (back ? h0 : t.h) + 'px');
      t.el.classList.toggle('behind', back);
      t.el.classList.toggle('behind-out', i >= MAX);
      acc += t.h + GAP;
    });
    host.style.setProperty('--stack-h', (open ? Math.max(0, acc - GAP) : list.length ? h0 + Math.min(list.length - 1, MAX - 1) * PEEK : 0) + 'px');
  };
  const setOpen = (o) => { if (open === o) return; open = o; layout(); live.forEach((t) => (o ? t.pause() : t.resume())) };
  const ensureHost = () => {
    if (host) return host;
    host = document.createElement('section'); host.className = 'toasts'; host.setAttribute('aria-label', 'Уведомления'); host.setAttribute('aria-live', 'polite');
    document.body.append(host);
    host.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setOpen(true));
    host.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && setOpen(false));
    host.addEventListener('focusin', () => setOpen(true));
    host.addEventListener('focusout', (e) => { if (!host.contains(e.relatedTarget)) setOpen(false) });
    // на телефоне тап по колоде раскрывает её, тап мимо — сворачивает
    host.addEventListener('click', (e) => { if (matchMedia('(pointer: coarse)').matches && !e.target.closest('button')) setOpen(!open) });
    addEventListener('pointerdown', (e) => { if (open && !host.contains(e.target)) setOpen(false) });
    addEventListener('resize', () => { live.forEach((t) => t.measure()); layout() });
    return host;
  };
  window.toast = (o) => {
    if (typeof o === 'string') o = { title: o };
    ensureHost();
    const el = document.createElement('div'); el.className = 'tst enter'; el.setAttribute('role', 'status');
    el.innerHTML = `<span class="tst-ic">${['success', 'error', 'info', 'default'].map((k) => svg(k, 'off i-' + k)).join('')}<span class="spinner off i-loading"></span></span>`
      + `<div class="tst-body"><b></b><span></span><div class="tst-foot"></div></div><div class="tst-act"><button type="button" class="toast-x" aria-label="Закрыть">${svg('x')}</button></div>`;
    const act = el.querySelector('.tst-act');
    let timer = 0, left = 0, start = 0;
    const arm = (ms) => { clearTimeout(timer); left = ms; if (ms === Infinity) return; start = Date.now(); if (!open) timer = setTimeout(api.close, ms) };
    const api = {
      el, h: 0, gone: false,
      measure() { const s = el.style.getPropertyValue('--h'); el.style.setProperty('--h', 'auto'); api.h = el.offsetHeight; el.style.setProperty('--h', s) },
      update(n) {
        const type = n.type || 'default';
        el.dataset.type = type;
        el.querySelectorAll('.tst-ic > *').forEach((x) => x.classList.toggle('off', !x.classList.contains('i-' + type)));
        if ('title' in n) el.querySelector('b').textContent = n.title || '';
        const sp = el.querySelector('.tst-body span'); if ('text' in n) { sp.textContent = n.text || ''; sp.hidden = !n.text }
        el.querySelectorAll('.tst-act .btn, .tst-foot .btn').forEach((x) => x.remove());
        if (n.action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm btn-secondary'; b.textContent = n.action.label;
          b.addEventListener('click', () => { api.close(); n.action.run?.() }); if (n.text) el.querySelector('.tst-foot').append(b); else act.prepend(b) }
        arm(n.duration ?? (type === 'loading' ? Infinity : n.action ? 6000 : 4000));
        if (el.isConnected) { api.measure(); layout() }
        return api;
      },
      pause() { if (left === Infinity || api.gone) return; clearTimeout(timer); left -= Date.now() - start },
      resume() { if (left === Infinity || api.gone) return; arm(Math.max(left, 1200)) },
      close() {
        if (api.gone) return; api.gone = true; clearTimeout(timer);
        el.classList.add('leave'); live.splice(live.indexOf(api), 1); layout();
        setTimeout(() => el.remove(), 320);
        if (!live.length) setOpen(false);
      }
    };
    el.querySelector('.toast-x').addEventListener('click', api.close);
    // смахнуть вниз или вбок. Ось выбирается по первым 6px движения и дальше не меняется (не уезжает по диагонали).
    // Вниз — за 40px или быстрым движением, вверх — с сопротивлением. Вбок — в обе стороны, бледнеет со сдвигом,
    // закрывается за треть ширины или быстрым движением. Скорость — по последним 100 мс, а не от начала жеста
    let x0 = 0, y0 = 0, dx = 0, dy = 0, axis = '', drag = false, trail = [];
    const speed = (k) => { const a = trail[0], z = trail.at(-1); return a && z && z.t > a.t ? (z[k] - a[k]) / (z.t - a.t) : 0 };
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = true; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; axis = ''; trail = []; el.setPointerCapture(e.pointerId) });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rx = e.clientX - x0, ry = e.clientY - y0, t = performance.now();
      if (!axis) { if (Math.hypot(rx, ry) < 6) return; axis = Math.abs(rx) > Math.abs(ry) ? 'x' : 'y'; el.classList.add('dragging') }
      trail.push({ x: rx, y: ry, t }); while (trail.length > 2 && t - trail[0].t > 100) trail.shift();
      if (axis === 'x') { dx = rx; el.style.setProperty('--dx', dx + 'px'); el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / el.offsetWidth)) }
      else { dy = ry < 0 ? ry / 6 : ry; el.style.setProperty('--dy', dy + 'px') }
    });
    const up = () => {
      if (!drag) return; drag = false; el.classList.remove('dragging');
      if (axis === 'x') {
        const v = speed('x');
        if (Math.abs(dx) > el.offsetWidth / 3 || (Math.abs(v) > 0.5 && Math.sign(v) === Math.sign(dx))) {
          el.style.setProperty('--dir', String(Math.sign(dx || v))); el.classList.add('leave-x'); el.style.opacity = ''; api.close();
        } else { el.style.setProperty('--dx', '0px'); el.style.opacity = '' }
      } else if (axis === 'y') {
        if (dy > 40 || speed('y') > 0.5) api.close();
        else el.style.setProperty('--dy', '0px');
      }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    host.append(el); live.push(api);
    api.update(o); api.measure();
    layout();
    el.offsetHeight; el.classList.remove('enter');
    if (open) api.pause();
    while (live.filter((t) => !t.gone).length > MAX + 1) live.find((t) => !t.gone).close();
    return api;
  };

  // ошибка поля и очистка окна после закрытия — для своих форм страницы
  window.fieldError = fieldError; window.resetDialog = resetLater;

  window.initLayers = (root = document) => {
    const each = (s, f) => root.querySelectorAll(s).forEach(f);
    each('.crumbs', crumbs); each('.pager', pager); each('.steps', steps); each('.side', side); each('.onpage', onpage);
    each('[data-pop]', popover); each('[data-ctx]', ctx); each('dialog.sheet', sheet); each('dialog.dialog-danger', danger); each('dialog.cmdk', cmdk);
    each('dialog.dialog', dlg); each('button[aria-haspopup="menu"][aria-controls]', menuBtn);
    each('[data-open]', (b) => { if (!once(b, 'op')) return; b.addEventListener('click', () => { const d = $(b.dataset.open); if (!d) return; d.openPalette ? d.openPalette() : d.showModal() }) });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initLayers()); else initLayers();
})();
