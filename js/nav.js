/* Шапка сайта: подменю (одна панель), меню аккаунта, мобильное меню.
   Разметка — 03-components/nav-demo.html, стили — tokens/nav.css.
   Прокрутку под мобильным меню блокирует js/scroll-lock.js (подключить), здесь только ставится html[data-modal-open].
   API: window.siteNav = { show(name), hide(), mobile(open), account(open) } */
(() => {
  function init() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const root = document.documentElement;
    const icons = () => { try { lucide.createIcons() } catch (e) {} };
    const api = (window.siteNav = {});

    /* ===== подменю: одна панель, намерение наведения, клавиатура ===== */
    const nav = header.querySelector('.navmenu'), panel = header.querySelector('.nav-panel');
    if (nav && panel) {
      const wrap = panel.parentElement;
      const triggers = [...nav.querySelectorAll('.nav-trigger')];
      const order = triggers.map((t) => t.dataset.menu);
      const contents = Object.fromEntries([...panel.querySelectorAll('.nav-content')].map((c) => [c.dataset.menu, c]));
      const css = getComputedStyle(root);
      const ms = (v) => parseFloat(css.getPropertyValue(v)) || 0;   // '60ms' → 60
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let current = null, openT, closeT;

      const place = (name) => {
        const box = contents[name].firstElementChild;
        const w = box.offsetWidth, h = box.offsetHeight;
        const wr = wrap.getBoundingClientRect(), nr = nav.getBoundingClientRect();
        // по левому краю навигации, но не вылезая за контейнер
        const x = Math.max(16, Math.min(nr.left - wr.left - 8, wr.width - w - 16));
        panel.style.setProperty('--panel-w', w + 'px'); panel.style.setProperty('--panel-h', h + 'px'); panel.style.setProperty('--panel-x', x + 'px');
      };
      const show = (name) => {
        clearTimeout(closeT); clearTimeout(openT);
        if (name === current || !nav.offsetParent) return;   // навигация скрыта (бургер) — панель не открываем
        const prev = current; current = name;
        triggers.forEach((t) => t.setAttribute('aria-expanded', t.dataset.menu === name));
        const next = contents[name];
        if (!prev) {
          // первое открытие: размер сразу, анимируется только появление
          panel.classList.add('fresh'); place(name);
          Object.values(contents).forEach((c) => { c.classList.remove('active'); c.style.transform = '' });
          next.style.transition = 'none'; next.classList.add('active'); next.offsetWidth; next.style.transition = '';
          panel.offsetWidth; panel.classList.add('open');
          requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('fresh')));
          return;
        }
        // переключение: панель меняет размер, содержимое сдвигается по направлению движения
        const dir = Math.sign(order.indexOf(name) - order.indexOf(prev)) || 1, d = reduce ? 0 : 12;
        const old = contents[prev];
        old.classList.remove('active'); old.style.transform = `translateX(${-dir * d}px)`;
        next.style.transition = 'none'; next.style.transform = `translateX(${dir * d}px)`; next.offsetWidth;
        next.style.transition = ''; next.style.transform = ''; next.classList.add('active');
        place(name);
      };
      const hide = () => {
        clearTimeout(openT); clearTimeout(closeT);
        if (!current) return; current = null;
        triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
        panel.classList.remove('open');
      };
      const scheduleClose = () => { clearTimeout(openT); clearTimeout(closeT); closeT = setTimeout(hide, ms('--delay-close')) };

      triggers.forEach((t) => {
        t.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse') return;
          clearTimeout(closeT); clearTimeout(openT);
          if (current) show(t.dataset.menu);                     // уже открыто — переключаемся сразу
          else openT = setTimeout(() => show(t.dataset.menu), ms('--delay-open'));
        });
        t.addEventListener('click', () => (current === t.dataset.menu ? hide() : show(t.dataset.menu)));
        t.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); show(t.dataset.menu); requestAnimationFrame(() => contents[t.dataset.menu].querySelector('a')?.focus()) }
        });
      });
      // курсор ушёл с пункта/панели — закрываем с запасом на путь к панели
      [nav, panel].forEach((el) => {
        el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') scheduleClose() });
        el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && current) clearTimeout(closeT) });
      });
      nav.querySelectorAll('.nav-link').forEach((l) => l.addEventListener('pointerenter', () => { if (current) scheduleClose() }));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) { const t = triggers.find((x) => x.dataset.menu === current); hide(); t.focus() } });
      document.addEventListener('pointerdown', (e) => { if (current && !panel.contains(e.target) && !nav.contains(e.target)) hide() });
      wrap.addEventListener('focusout', (e) => { if (current && !wrap.contains(e.relatedTarget)) hide() });
      panel.addEventListener('click', (e) => { if (e.target.closest('a')) hide() });   // ссылка на этой же странице (#раздел) — панель закрывается
      addEventListener('resize', () => { if (current) place(current) });
      api.show = show; api.hide = hide;
    }

    /* ===== меню аккаунта ===== */
    const acctBtn = header.querySelector('.acct-btn'), acctMenu = header.querySelector('.acct-menu');
    if (acctBtn && acctMenu) {
      const items = () => [...acctMenu.querySelectorAll('[role^=menuitem]')];
      const isOpen = () => acctMenu.classList.contains('open');
      const setOpen = (o, focusFirst) => {
        acctMenu.classList.toggle('open', o); acctBtn.setAttribute('aria-expanded', o);
        if (o && focusFirst) items()[0]?.focus({ preventScroll: true });
      };
      // фокус на первый пункт — только при открытии с клавиатуры (e.detail === 0)
      acctBtn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!isOpen(), e.detail === 0) });
      acctBtn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, true) } });
      document.addEventListener('pointerdown', (e) => { if (isOpen() && !acctMenu.contains(e.target) && !acctBtn.contains(e.target)) setOpen(false) });
      acctMenu.addEventListener('keydown', (e) => {
        const l = items(), i = l.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus() }
        else if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length].focus() }
        else if (e.key === 'Home') { e.preventDefault(); l[0].focus() }
        else if (e.key === 'End') { e.preventDefault(); l.at(-1).focus() }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); acctBtn.focus() }
        else if (e.key === 'Tab') setOpen(false);
      });
      // переход по пункту закрывает меню; переключатель темы — нет (видно результат)
      acctMenu.addEventListener('click', (e) => { if (e.target.closest('.acct-item')) setOpen(false) });
      api.account = setOpen;
    }

    /* ===== выбор акцента: кнопка + меню; меню не закрывается при выборе — цвет видно сразу ===== */
    header.querySelectorAll('.accp').forEach((box) => {
      const btn = box.querySelector('.accp-btn'), menu = box.querySelector('.accp-menu'), cur = btn.querySelector('.sw');
      const items = () => [...menu.querySelectorAll('[role^=menuitem]')];
      const isOpen = () => menu.classList.contains('open');
      const setOpen = (o, focus) => {
        menu.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
        if (o && focus) (menu.querySelector('[aria-checked=true]') || items()[0])?.focus({ preventScroll: true });
      };
      const sync = () => { const a = window.getAccent?.() || 'evory', it = menu.querySelector(`[data-accent-v="${a}"] .sw`); if (it) cur.style.setProperty('--c', it.style.getPropertyValue('--c')) };
      sync(); addEventListener('accentchange', sync);
      btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!isOpen(), e.detail === 0) });
      btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, true) } });
      document.addEventListener('pointerdown', (e) => { if (isOpen() && !box.contains(e.target)) setOpen(false) });
      addEventListener('nav-wide', () => setOpen(false));
      menu.addEventListener('keydown', (e) => {
        const l = items(), i = l.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus() }
        else if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length].focus() }
        else if (e.key === 'Home') { e.preventDefault(); l[0].focus() }
        else if (e.key === 'End') { e.preventDefault(); l.at(-1).focus() }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.focus() }
        else if (e.key === 'Tab') setOpen(false);
      });
    });

    /* ===== мобильное меню: строки собираются из десктопных подменю — один источник ===== */
    const burger = header.querySelector('.burger'), mnav = document.getElementById(burger?.getAttribute('aria-controls') || '');
    if (burger && mnav) {
      const list = mnav.querySelector('.mnav-list');
      // подпись пункта: data-m (короткая) → заголовок → текст без счётчиков
      const label = (el) => {
        if (el.dataset.m) return el.dataset.m;
        const t = ['.mega-t', '.story-t', 'b', 'span:not(.mega-ic):not(.story-thumb)'].map((q) => el.querySelector(q)).find(Boolean) || el;
        return [...t.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() || t.textContent.trim();
      };
      let i = 0, uid = 0;
      nav?.querySelectorAll(':scope > *').forEach((top) => {
        if (top.classList.contains('nav-trigger')) {
          const content = header.querySelector(`.nav-content[data-menu="${top.dataset.menu}"]`), id = 'macc-' + uid++;
          let body = '';
          content.querySelectorAll('.mega-col, .mega-aside').forEach((col) => [...col.children].forEach((el) => {
            if (el.classList.contains('mega-label')) body += `<span class="mlabel">${el.textContent}</span>`;
            else (el.matches('a') ? [el] : [...el.querySelectorAll('a')]).forEach((a) => (body += `<a class="msub" href="${a.getAttribute('href') || '#'}">${label(a)}</a>`));
          }));
          const row = document.createElement('div'); row.style.setProperty('--i', i++);
          row.innerHTML = `<button class="mrow" aria-expanded="false" aria-controls="${id}">${top.childNodes[0].textContent.trim()}<i data-lucide="chevron-down"></i></button>
            <div class="macc" id="${id}"><div class="macc-in"><div class="macc-body">${body}</div></div></div>`;
          list.appendChild(row);
        } else {
          const a = document.createElement('a'); a.className = 'mrow'; a.href = top.getAttribute('href') || '#'; a.textContent = top.textContent.trim();
          if (top.getAttribute('aria-current')) a.setAttribute('aria-current', top.getAttribute('aria-current'));   // текущая страница переносится из шапки
          a.style.setProperty('--i', i++); list.appendChild(a);
        }
      });
      icons();
      // в закрытом аккордеоне ссылки недоступны с клавиатуры
      const setAcc = (btn, o) => { btn.setAttribute('aria-expanded', o); const acc = document.getElementById(btn.getAttribute('aria-controls')); acc.classList.toggle('open', o); acc.inert = !o };
      const rows = () => list.querySelectorAll('button.mrow');
      rows().forEach((b) => { setAcc(b, false); b.onclick = () => { const o = b.getAttribute('aria-expanded') !== 'true'; rows().forEach((x) => x !== b && setAcc(x, false)); setAcc(b, o) } });

      mnav.inert = true;
      // Страницу под меню НЕ делаем inert: inert на <main> пересчитывает стили всей страницы — длинная задача 36–66 мс
      // (CPU ×4) через полсекунды после открытия. Для читалок меню — role="dialog" aria-modal="true",
      // для клавиатуры фокус ходит по кругу: бургер → пункты меню → бургер.
      const trap = (e) => {
        if (e.key !== 'Tab' || !mnav.classList.contains('open')) return;
        const f = [burger, ...[...mnav.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.closest('[inert]') && el.getClientRects().length)];
        const i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 || i < 0 ? 0 : i + 1);
        e.preventDefault(); f[n].focus();
      };
      addEventListener('keydown', trap);
      const set = (o) => {
        burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Закрыть меню' : 'Меню');
        mnav.classList.toggle('open', o); mnav.inert = !o;
        root.toggleAttribute('data-modal-open', o);            // scroll-lock.js — без overflow:hidden, без мигания
        root.classList.toggle('mnav-open', o);
        if (o) mnav.scrollTop = 0; else rows().forEach((x) => setAcc(x, false));
      };
      burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
      mnav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false) });
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && mnav.classList.contains('open')) { set(false); burger.focus() } });
      addEventListener('nav-wide', () => set(false));   // шапка снова помещается — мобильное меню закрываем
      api.mobile = (o, accIndex) => { set(o); if (o && accIndex != null) rows()[accIndex]?.click() };
    }
  }
  /* ===== бургер, когда шапка не помещается: порог — от реальной ширины, а не числом =====
     Начальное значение (≤960) ставит theme.js до первой отрисовки; здесь — точный замер.
     Меряем «полную» шапку: на время замера снимаем класс (в одном кадре — без мигания). */
  function fit() {
    const header = document.querySelector('.site-header'), wrap = header?.querySelector('.wrap');
    if (!wrap || !header.querySelector('.navmenu')) return;
    const root = document.documentElement;
    const check = () => {
      const was = root.classList.contains('nav-compact');
      root.classList.remove('nav-compact');
      const need = [...wrap.children].filter((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).position !== 'absolute')
        .reduce((w, el) => w + el.offsetWidth, 0) + parseFloat(getComputedStyle(wrap).columnGap) * (wrap.children.length - 1);
      const room = wrap.clientWidth - parseFloat(getComputedStyle(wrap).paddingLeft) - parseFloat(getComputedStyle(wrap).paddingRight);
      const compact = need > room;
      root.classList.toggle('nav-compact', compact);
      if (was && !compact) dispatchEvent(new CustomEvent('nav-wide'));
    };
    let raf = 0; new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check) }).observe(header);
    document.fonts?.ready.then(check); check();
  }
  const start = () => { init(); fit() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
