/* Выбор из списка: родной <select> на телефоне, стилизованный список на десктопе.
   Использование: <select class="select">…</select>, затем enhanceSelects() (или вызывается сам на DOMContentLoaded).
   Родной select остаётся источником значения: value, change, disabled, form — всё как обычно.
   Клавиатура (как у системного списка): Enter/Space/↓/↑ открывают; ↑↓ Home End — ходят; буквы — поиск по началу;
   Enter/Space — выбрать; Esc/Tab — закрыть без выбора. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  // прокрутка только внутри списка: scrollIntoView крутит и страницу — экран «дёргается»
  const reveal = (list, el, center) => {
    const top = el.offsetTop, bottom = top + el.offsetHeight, pad = 4;
    if (center) list.scrollTop = top - (list.clientHeight - el.offsetHeight) / 2;
    else if (top - pad < list.scrollTop) list.scrollTop = top - pad;
    else if (bottom + pad > list.scrollTop + list.clientHeight) list.scrollTop = bottom + pad - list.clientHeight;
  };
  const chevron = '<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  let uid = 0;

  function enhance(sel) {
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = '1';
    const id = 'lb' + (++uid);
    const wrap = document.createElement('span');
    wrap.className = 'select-ui';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'select select-trigger' + (sel.classList.contains('input-sm') ? ' input-sm' : '');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    btn.style.backgroundImage = 'none';
    // подпись: видимый текст поля (span.label внутри <label>) или сам <label>
    const lab = sel.labels && sel.labels[0];
    const labText = lab && (lab.querySelector('.label') || lab);
    if (labText) { labText.id ||= id + '-l'; btn.setAttribute('aria-labelledby', labText.id + ' ' + id + '-v') }
    // клик по подписи фокусирует родной select — переводим фокус на кнопку
    sel.addEventListener('focus', () => btn.focus());
    btn.innerHTML = `<span class="value" id="${id}-v"></span>${chevron}`;
    wrap.appendChild(btn);

    const list = document.createElement('div');
    list.className = 'menu listbox';
    list.id = id;
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    wrap.appendChild(list);

    // опции и группы строятся из родного select
    let opts = [];
    const build = () => {
      list.innerHTML = ''; opts = [];
      const add = (o) => {
        const el = document.createElement('div');
        el.className = 'option'; el.id = `${id}-o${opts.length}`; el.setAttribute('role', 'option');
        el.innerHTML = `<span>${o.textContent}</span>${o.dataset.meta ? `<small>${o.dataset.meta}</small>` : ''}`;
        if (o.disabled) el.setAttribute('aria-disabled', 'true');
        el._o = o; opts.push(el); list.appendChild(el);
      };
      [...sel.children].forEach(ch => {
        if (ch.tagName === 'OPTGROUP') {
          const l = document.createElement('div'); l.className = 'menu-label'; l.textContent = ch.label; list.appendChild(l);
          [...ch.children].forEach(add);
        } else if (!ch.hidden) add(ch);
      });
    };
    const sync = () => {
      const o = sel.options[sel.selectedIndex];
      const v = btn.querySelector('.value');
      const ph = !o || o.value === '' ;
      v.textContent = o ? o.textContent : '';
      v.classList.toggle('placeholder', ph);
      opts.forEach(el => el.setAttribute('aria-selected', el._o === o));
      btn.disabled = sel.disabled;
    };
    build(); sync();

    let active = -1, typed = '', typedT;
    const enabled = () => opts.filter(o => o.getAttribute('aria-disabled') !== 'true');
    const setActive = (el, scroll) => {
      opts.forEach(o => o.classList.toggle('active', o === el));
      active = opts.indexOf(el);
      if (el) { btn.setAttribute('aria-activedescendant', el.id); if (scroll) reveal(list, el, false) }
    };
    const isOpen = () => list.classList.contains('open');
    const open = () => {
      if (sel.disabled || isOpen()) return;
      // открываем вверх, если снизу не помещается
      const r = btn.getBoundingClientRect();
      list.classList.toggle('up', innerHeight - r.bottom < Math.min(296, list.scrollHeight + 16) && r.top > innerHeight - r.bottom);
      list.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      const cur = opts.find(o => o.getAttribute('aria-selected') === 'true') || enabled()[0];
      setActive(cur, false);
      if (cur) reveal(list, cur, true);
    };
    const close = () => {
      if (!isOpen()) return;
      list.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
    };
    const pick = (el) => {
      if (!el || el.getAttribute('aria-disabled') === 'true') return;
      const changed = sel.value !== el._o.value || sel.selectedIndex !== el._o.index;
      sel.selectedIndex = el._o.index;
      sync(); close(); btn.focus();
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })) }
    };
    const move = (d) => {
      const en = enabled(); if (!en.length) return;
      let i = en.indexOf(opts[active]);
      i = d === 'first' ? 0 : d === 'last' ? en.length - 1 : Math.max(0, Math.min(en.length - 1, i + d));
      setActive(en[i], true);
    };

    btn.addEventListener('click', () => (isOpen() ? close() : open()));
    btn.addEventListener('keydown', (e) => {
      const k = e.key;
      if (!isOpen()) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open() }
        return;
      }
      if (k === 'ArrowDown') { e.preventDefault(); move(1) }
      else if (k === 'ArrowUp') { e.preventDefault(); move(-1) }
      else if (k === 'Home') { e.preventDefault(); move('first') }
      else if (k === 'End') { e.preventDefault(); move('last') }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(opts[active]) }
      else if (k === 'Escape') { e.preventDefault(); close() }
      else if (k === 'Tab') close();
      else if (k.length === 1) {
        typed += k.toLowerCase(); clearTimeout(typedT); typedT = setTimeout(() => (typed = ''), 600);
        const hit = enabled().find(o => o._o.textContent.trim().toLowerCase().startsWith(typed));
        if (hit) setActive(hit, true);
      }
    });
    // мышь: подсветка следует за курсором, клик выбирает; фокус остаётся на кнопке
    list.addEventListener('pointermove', (e) => { const o = e.target.closest('.option'); if (o && opts.indexOf(o) !== active) setActive(o, false) });
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => pick(e.target.closest('.option')));
    document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) close() });
    btn.addEventListener('blur', () => setTimeout(() => { if (!wrap.contains(document.activeElement)) close() }, 0));
    // изменения снаружи: значение, disabled, состав опций
    sel.addEventListener('change', sync);
    new MutationObserver(() => { build(); sync() }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  }

  window.enhanceSelects = (root = document) => {
    if (!fine.matches) return;                         // телефон/планшет: родной список
    root.querySelectorAll('select.select').forEach(enhance);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceSelects());
  else enhanceSelects();
})();
