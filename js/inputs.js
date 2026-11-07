/* Ввод · поведение расширенных полей. Стили — tokens/inputs.css. Подключать с defer; всё находится по классам само.
   Повторная инициализация для нового куска страницы: initInputs(root).
   Компоненты и разметка — 03-components/index.html#inputs. */
(() => {
  const P = {
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    l: '<path d="m15 18-6-6 6-6"/>', r: '<path d="m9 18 6-6-6-6"/>', d: '<path d="m6 9 6 6 6-6"/>',
    cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    img: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    err: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  };
  const svg = (n, s = 16) => `<svg class="lucide" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const once = (el, k) => (el.dataset[k] ? false : (el.dataset[k] = '1'));
  const fire = (el, t, detail) => el.dispatchEvent(new CustomEvent(t, { bubbles: true, detail }));
  let uid = 0;
  // список/панель: открывается вниз, если снизу мало места и сверху больше — вверх
  const flip = (pop, anchor, need) => { const r = anchor.getBoundingClientRect(); pop.classList.toggle('up', innerHeight - r.bottom < need && r.top > innerHeight - r.bottom) };
  /* Плавность — главное правило: размеры соседей не прыгают, элементы не возникают и не пропадают скачком.
     resize — высота меняется плавно (замер до → изменение → замер после → анимация между ними).
     growIn / shrinkOut — строка списка появляется/уходит вместе со своей высотой, соседи сдвигаются плавно.
     tagOut — тег в строке сжимается по ширине, соседи подъезжают. */
  const EASE = 'cubic-bezier(.23, 1, .32, 1)', reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const resize = (el, change, ms = 180) => {
    const h0 = el.offsetHeight; change(); const h1 = el.offsetHeight;          // высота раскладки, без transform (список может ещё масштабироваться при открытии)
    if (Math.abs(h0 - h1) < 0.5 || reduce.matches) return;
    el._h?.cancel(); el.style.overflow ||= ''; const prev = el.style.overflow; el.style.overflow = 'hidden';
    el._h = el.animate({ height: [h0 + 'px', h1 + 'px'] }, { duration: ms, easing: EASE });
    el._h.onfinish = el._h.oncancel = () => { el.style.overflow = prev };
  };
  const box4 = (el) => { const s = getComputedStyle(el); return { h: el.getBoundingClientRect().height + 'px', pt: s.paddingTop, pb: s.paddingBottom, mt: s.marginTop } };
  const growIn = (el, ms = 220) => {
    if (reduce.matches) return; const b = box4(el); el.style.overflow = 'hidden';
    el.animate({ height: ['0px', b.h], paddingTop: ['0px', b.pt], paddingBottom: ['0px', b.pb], marginTop: ['0px', b.mt], opacity: [0, 1] }, { duration: ms, easing: EASE })
      .onfinish = () => { el.style.overflow = '' };
  };
  const shrinkOut = (el, done, ms = 180) => {
    if (reduce.matches) return done(); const b = box4(el); el.style.overflow = 'hidden';
    el.animate({ height: [b.h, '0px'], paddingTop: [b.pt, '0px'], paddingBottom: [b.pb, '0px'], marginTop: [b.mt, '0px'], opacity: [1, 0] }, { duration: ms, easing: EASE, fill: 'forwards' }).onfinish = done;
  };
  const tagOut = (el, gap, done) => {
    if (reduce.matches) return done(); const s = getComputedStyle(el); el.style.overflow = 'hidden';
    el.animate({ width: [el.getBoundingClientRect().width + 'px', '0px'], paddingLeft: [s.paddingLeft, '0px'], paddingRight: [s.paddingRight, '0px'], marginRight: ['0px', -gap + 'px'], opacity: [1, 0] },
      { duration: 180, easing: EASE, fill: 'forwards' }).onfinish = done;
  };
  // сменить иконку кроссфейдом, а не подменой
  const swapIcon = (holder, html) => { holder.innerHTML = html; if (!reduce.matches) holder.firstElementChild?.animate({ opacity: [0, 1], transform: ['scale(.7)', 'none'] }, { duration: 200, easing: EASE }) };
  /* Составное поле (теги, кнопки внутри) нельзя оборачивать в <label>: браузер пересылает любой клик внутри подписи
     первому «подписываемому» элементу — у мультивыбора это крестик первого тега (выбор пункта удалял тег),
     у степпера — кнопка «−». Если обёртка всё же есть — заменяем её на div и связываем подпись через aria-labelledby. */
  const unlabel = (el, target) => {
    const lab = el.closest('label'); if (!lab) return;
    const div = document.createElement('div'); div.className = lab.className; [...lab.attributes].forEach((a) => a.name !== 'for' && div.setAttribute(a.name, a.value));
    while (lab.firstChild) div.appendChild(lab.firstChild); lab.replaceWith(div);
    const cap = div.querySelector('.label'); if (cap && target) { cap.id ||= 'lbl' + ++uid; target.setAttribute('aria-labelledby', cap.id);
      cap.addEventListener('click', () => target.focus()) }   // клик по подписи — фокус в поле, как у обычной подписи
  };
  const reveal = (list, el) => { const t = el.offsetTop, b = t + el.offsetHeight; if (t - 4 < list.scrollTop) list.scrollTop = t - 4; else if (b + 4 > list.scrollTop + list.clientHeight) list.scrollTop = b + 4 - list.clientHeight };

  /* ===== Поиск: очистка, Esc, горячая клавиша ===== */
  function search(w) {
    if (!once(w, 'ui')) return;
    const inp = w.querySelector('.input'), clr = w.querySelector('.clear');
    inp.placeholder ||= ' ';                       // :placeholder-shown нужен для показа кнопки очистки
    const clear = () => { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus() };
    clr?.addEventListener('click', clear);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (inp.value) { e.preventDefault(); clear() } else inp.blur() } });
  }
  // «/» или ⌘K/Ctrl+K фокусирует поле с data-hotkey, если фокус не в другом поле
  addEventListener('keydown', (e) => {
    const t = e.target, typing = t.closest?.('input, textarea, select, [contenteditable=true]');
    const k = (e.key === '/' && !typing) ? '/' : ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ? 'mod+k' : null;
    if (!k) return;
    const f = document.querySelector(`[data-hotkey="${k}"]`); if (!f) return;
    e.preventDefault(); f.focus(); f.select?.();
  });

  /* ===== Пароль: показать/скрыть и надёжность ===== */
  const LEVELS = ['', 'Слабый', 'Средний', 'Хороший', 'Надёжный'];
  function password(w) {
    if (!once(w, 'ui')) return;
    const inp = w.querySelector('.input'), btn = w.querySelector('[data-pw-toggle]');
    btn?.addEventListener('click', () => {
      const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show); btn.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
      const end = inp.value.length; inp.focus(); inp.setSelectionRange(end, end);
    });
    const meter = inp.id && document.querySelector(`.strength[data-for="${inp.id}"]`);
    if (!meter) return;
    const txt = meter.querySelector('.strength-text');
    const rate = (v) => {
      if (!v) return 0;
      let s = 0; if (v.length >= 8) s++; if (v.length >= 12) s++;
      if (/[a-zа-я]/.test(v) && /[A-ZА-Я]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^\w\sа-яё]/i.test(v)) s++;
      return Math.max(1, Math.min(4, s - (v.length < 8 ? 1 : 0)));
    };
    const upd = () => { const l = rate(inp.value); meter.dataset.level = l; txt.textContent = LEVELS[l] || txt.dataset.empty || '' };
    txt.dataset.empty = txt.textContent; inp.addEventListener('input', upd); upd();
  }

  /* ===== Код из SMS ===== */
  function otp(g) {
    if (!once(g, 'ui')) return;
    const cells = [...g.querySelectorAll('input')];
    cells.forEach((c, i) => {
      c.inputMode = 'numeric'; c.autocomplete = i ? 'off' : 'one-time-code'; c.maxLength = cells.length; c.setAttribute('aria-label', `Цифра ${i + 1} из ${cells.length}`);
      c.addEventListener('focus', () => c.select());
      c.addEventListener('input', () => {
        const d = c.value.replace(/\D/g, '');
        if (d.length > 1) return fill(i, d);                 // автозаполнение кода из SMS кладёт всё в первую ячейку
        c.value = d; g.removeAttribute('aria-invalid');
        if (d && cells[i + 1]) cells[i + 1].focus();
        check();
      });
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !c.value && cells[i - 1]) { e.preventDefault(); cells[i - 1].value = ''; cells[i - 1].focus() }
        else if (e.key === 'ArrowLeft' && cells[i - 1]) { e.preventDefault(); cells[i - 1].focus() }
        else if (e.key === 'ArrowRight' && cells[i + 1]) { e.preventDefault(); cells[i + 1].focus() }
      });
      c.addEventListener('paste', (e) => { e.preventDefault(); fill(i, (e.clipboardData.getData('text') || '').replace(/\D/g, '')) });
    });
    const fill = (from, d) => { [...d].slice(0, cells.length - from).forEach((ch, k) => (cells[from + k].value = ch)); g.removeAttribute('aria-invalid'); (cells[Math.min(from + d.length, cells.length - 1)]).focus(); check() };
    const check = () => { const code = cells.map((c) => c.value).join(''); if (code.length === cells.length) fire(g, 'otp-complete', { code }) };
    // ошибка: красная рамка, короткая встряска, всё очищается, фокус на первую ячейку
    g.otpError = () => { g.setAttribute('aria-invalid', 'true'); g.classList.remove('shake'); g.offsetWidth; g.classList.add('shake'); cells.forEach((c) => (c.value = '')); cells[0].focus() };
  }

  /* ===== Число со степпером ===== */
  function stepper(w) {
    if (!once(w, 'ui')) return;
    const inp = w.querySelector('input'), [dec, inc] = w.querySelectorAll('button');
    unlabel(w, inp);
    const num = (a, d) => (a === '' || a == null ? d : +a);
    const min = num(inp.min, -Infinity), max = num(inp.max, Infinity), step = num(inp.step, 1);
    const dp = (String(step).split('.')[1] || '').length;
    const clamp = (v) => +Math.min(max, Math.max(min, v)).toFixed(dp);
    const paint = () => { const v = +inp.value; dec.disabled = v <= min; inc.disabled = v >= max };
    const set = (v) => { const n = clamp(v); if (+inp.value !== n) { inp.value = n; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })) } paint() };
    // удержание: первый шаг сразу, через 400 мс — повтор каждые 60 мс
    [[dec, -1], [inc, 1]].forEach(([b, d]) => {
      let t1, t2; const stop = () => { clearTimeout(t1); clearInterval(t2) };
      b.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); set(+inp.value + d * step); t1 = setTimeout(() => (t2 = setInterval(() => { set(+inp.value + d * step); if (b.disabled) stop() }, 60)), 400) });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(+inp.value + d * step) } });
      b.tabIndex = -1;                                  // с клавиатуры — стрелки в самом поле
    });
    inp.addEventListener('keydown', (e) => {
      const big = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') { e.preventDefault(); set(+inp.value + step * big) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); set(+inp.value - step * big) }
    });
    inp.addEventListener('blur', () => set(inp.value === '' ? (min > -Infinity ? min : 0) : +inp.value));
    inp.addEventListener('input', paint);
    paint();
  }

  /* ===== Ползунок и диапазон ===== */
  function slider(s) {
    if (!once(s, 'ui')) return;
    const [a, b] = s.querySelectorAll('input[type=range]'), out = s.dataset.out && document.getElementById(s.dataset.out);
    const fmt = (v) => { const f = s.dataset.format || '{}'; return f.replace('{}', (+v).toLocaleString('ru-RU')) };
    const pct = (i) => (i.value - i.min) / (i.max - i.min);   // доля 0…1 — CSS сам ставит заливку в центр бегунка
    const track = s.querySelector('.track');
    if (!track.querySelector('.fill')) track.insertAdjacentHTML('beforeend', '<span class="fill"></span>');
    // data-scale: деления на дорожке и подписи под каждым шагом (для дискретных шкал, до ~12 шагов)
    let marks = [];
    if (s.hasAttribute('data-scale')) {
      const min = +a.min, max = +a.max, step = +a.step || 1, n = Math.round((max - min) / step);
      const at = (k) => `calc(var(--th) / 2 + (100% - var(--th)) * ${k / n})`;
      for (let k = 1; k < n; k++) track.insertAdjacentHTML('afterbegin', `<span class="tick" style="left:${at(k)}"></span>`);
      const sc = document.createElement('div'); sc.className = 'slider-scale'; sc.setAttribute('aria-hidden', 'true');
      for (let k = 0; k <= n; k++) { const v = min + k * step; sc.insertAdjacentHTML('beforeend', `<span style="left:${at(k)}" data-v="${v}">${v.toLocaleString('ru-RU')}</span>`) }
      s.after(sc); marks = [...sc.children];
    }
    const lit = () => { const lo = b ? +a.value : -Infinity, hi = b ? +b.value : +a.value; marks.forEach((m) => m.classList.toggle('in', +m.dataset.v >= lo && +m.dataset.v <= hi)) };
    const upd = (e) => {
      if (b) {
        const gap = +(s.dataset.gap || 0);
        if (+a.value > +b.value - gap) { if (e?.target === a) a.value = +b.value - gap; else b.value = +a.value + gap }
        s.style.setProperty('--p', pct(a)); s.style.setProperty('--p2', pct(b));
        // бегунок, который сейчас тянут, — сверху (иначе сведённые вместе нельзя развести)
        a.style.zIndex = e?.target === a || +a.value > (+a.max + +a.min) / 2 ? 2 : 1;
        if (out) out.textContent = `${fmt(a.value)} — ${fmt(b.value)}`;
      } else { s.style.setProperty('--p', pct(a)); if (out) out.textContent = fmt(a.value) }
      lit();
    };
    [a, b].filter(Boolean).forEach((i) => i.addEventListener('input', upd));
    upd();
  }

  /* ===== Группа переключателей ===== */
  function toggles(g) {
    if (!once(g, 'ui')) return;
    const single = g.dataset.mode === 'single', btns = [...g.querySelectorAll('button')];
    btns.forEach((b) => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true'); b.addEventListener('click', () => {
      if (single) btns.forEach((x) => x.setAttribute('aria-pressed', x === b)); else b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      fire(g, 'change', { pressed: btns.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.dataset.v) });
    }) });
  }

  /* ===== Цвет: образцы + HEX ===== */
  function color(box) {
    if (!once(box, 'ui')) return;
    const sw = [...box.querySelectorAll('.swatch')], hex = box.querySelector('.hex'), inp = hex?.querySelector('.input'), prev = hex?.querySelector('.preview'), native = prev?.querySelector('input');
    const norm = (v) => { v = v.trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(v)) v = [...v].map((c) => c + c).join(''); return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : null };
    const set = (v, from) => {
      sw.forEach((s) => { const on = s.dataset.c === v; s.setAttribute('aria-checked', on); s.tabIndex = on ? 0 : -1 });
      if (!sw.some((s) => s.tabIndex === 0) && sw[0]) sw[0].tabIndex = 0;
      if (inp && from !== 'hex') { inp.value = v.slice(1).toUpperCase(); inp.removeAttribute('aria-invalid') }
      if (prev) prev.style.setProperty('--c', v); if (native) native.value = v;
      box.dataset.value = v; fire(box, 'colorchange', { value: v });
    };
    sw.forEach((s, i) => {
      s.style.setProperty('--c', s.dataset.c); s.setAttribute('role', 'radio');
      s.addEventListener('click', () => set(s.dataset.c));
      s.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault(); const n = sw[(i + d + sw.length) % sw.length]; n.focus(); set(n.dataset.c);
      });
    });
    inp?.addEventListener('input', () => { const v = norm(inp.value); inp.toggleAttribute('aria-invalid', !v && inp.value.length >= 6); if (v) set(v, 'hex') });
    inp?.addEventListener('blur', () => { if (!norm(inp.value)) set(box.dataset.value) });
    native?.addEventListener('input', () => set(native.value));
    set(norm(box.dataset.value || sw[0]?.dataset.c || '#0a806c'));
  }

  /* ===== Поле с подсказками и мультивыбор =====
     <div class="combo" data-options="Москва|Казань:RU-TA|…" [data-multi] [data-create]>
       <input class="input" placeholder="…">            — одиночный
       <div class="input multi"><input placeholder="…"></div>  — мультивыбор
     Значение: data-value (одиночный — строка, мультивыбор — через «|»), событие change. */
  function combo(c) {
    if (!once(c, 'ui')) return;
    const multi = c.hasAttribute('data-multi'), create = c.hasAttribute('data-create');
    const all = c.dataset.options.split('|').map((s) => { const [t, m] = s.split(':'); return { t: t.trim(), m: m?.trim() } });
    const box = multi ? c.querySelector('.multi') : null, inp = c.querySelector('input'), id = 'cb' + ++uid;
    unlabel(c, inp);
    /* Одной строкой (data-one-line): поле всегда 36. Не помещается — теги сначала сужаются до MIN (текст с многоточием),
       дальше лишние уходят в счётчик «+N» (в подсказке — их названия). Все изменения ширины — плавные. */
    const one = multi && c.hasAttribute('data-one-line'), MIN = 80;   // ~7–8 букв: уже меньше — нечитаемо, лучше свернуть в «+N»
    let more = null;
    if (one) { box.classList.add('one-line'); inp.insertAdjacentHTML('beforebegin', '<span class="tag-more" hidden></span>'); more = box.querySelector('.tag-more');
      more.addEventListener('pointerdown', (e) => { e.preventDefault(); inp.focus(); open() }) }
    const widths = () => new Map([...box.querySelectorAll('.tag, .tag-more')].map((t) => [t, t.hidden ? 0 : t.getBoundingClientRect().width]));
    const fit = (animate, before) => {
      if (!one) return;
      const tg = [...box.querySelectorAll('.tag')].filter((t) => !t._out);
      const w0 = before || widths();   // снимок до изменения — чтобы сжатие соседей при добавлении шло плавно
      // естественная ширина каждого тега (без сжатия, с потолком max-width)
      tg.forEach((t) => { t.hidden = false; t.style.flexShrink = '0' }); more.hidden = true;
      const nat = tg.map((t) => t.getBoundingClientRect().width);
      tg.forEach((t, i) => { t.style.flexShrink = ''; t.style.minWidth = Math.min(nat[i], MIN) + 'px' });   // короткие не растягиваем
      const cs = getComputedStyle(box), gap = parseFloat(cs.columnGap) || 0;
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (parseFloat(getComputedStyle(inp).minWidth) || 0) - gap;
      const need = (k, withMore) => nat.slice(0, k).reduce((s, w) => s + Math.min(w, MIN) + gap, 0) + (withMore ? 40 + gap : 0);
      let k = tg.length;
      while (k > 0 && need(k, k < tg.length) > avail) k--;
      const hiddenNames = tg.slice(k).map((t) => t.dataset.t);
      tg.forEach((t, i) => (t.hidden = i >= k));
      if (hiddenNames.length) { more.hidden = false; more.textContent = '+' + hiddenNames.length; more.title = hiddenNames.join(', '); more.setAttribute('aria-label', 'Ещё ' + hiddenNames.length + ': ' + hiddenNames.join(', ')) }
      if (!animate || reduce.matches) return;
      // FLIP по ширине: видимые сжимаются/растягиваются, ушедшие в «+N» — схлопываются, счётчик — растёт
      [...tg, more].forEach((t) => {
        const a = w0.get(t) || 0, hid = t.hidden; if (hid && !a) return;
        if (hid) t.hidden = false;
        const b = hid ? 0 : t.getBoundingClientRect().width; if (Math.abs(a - b) < 0.5) { if (hid) t.hidden = true; return }
        const mw = t.style.minWidth; t.style.overflow = 'hidden'; t.style.minWidth = '0';   // min-width не даёт анимировать ширину с нуля
        const an = t.animate({ width: [a + 'px', b + 'px'], ...(hid ? { opacity: [1, 0], marginRight: ['0px', -gap + 'px'] } : !a ? { opacity: [0, 1] } : {}) }, { duration: 200, easing: EASE });
        an.onfinish = () => { t.style.overflow = ''; t.style.minWidth = mw; if (hid) t.hidden = true };
      });
    };
    if (one) new ResizeObserver(() => fit(false)).observe(box);
    let picked = multi ? (c.dataset.value ? c.dataset.value.split('|') : []) : null, active = -1, items = [], armed = false;
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false'); inp.setAttribute('aria-controls', id);
    inp.autocomplete = 'off'; inp.spellcheck = false;
    c.insertAdjacentHTML('beforeend', `<span class="chev">${svg('d')}</span><div class="menu listbox" role="listbox" id="${id}" ${multi ? 'aria-multiselectable="true"' : ''}></div>`);
    const list = c.querySelector('.listbox');
    const hl = (t, q) => { if (!q) return esc(t); const i = t.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)) };
    const render = () => {
      const q = typed ? inp.value.trim() : '';      // открыли с выбранным значением — показываем весь список, фильтр с первой буквы
      const hits = all.filter((o) => !q || o.t.toLowerCase().includes(q.toLowerCase()));
      // точные начала — выше
      hits.sort((x, y) => (q ? +!x.t.toLowerCase().startsWith(q.toLowerCase()) - +!y.t.toLowerCase().startsWith(q.toLowerCase()) : 0));
      let html = hits.map((o, i) => {
        const sel = multi ? picked.includes(o.t) : c.dataset.value === o.t;
        return `<div class="option" role="option" id="${id}-${i}" data-t="${esc(o.t)}" aria-selected="${sel}">${multi ? `<input type="checkbox" class="check" tabindex="-1" aria-hidden="true" ${sel ? 'checked' : ''}>` : ''}<span>${hl(o.t, q)}</span>${o.m ? `<small>${esc(o.m)}</small>` : ''}</div>`;
      }).join('');
      if (create && q && !all.some((o) => o.t.toLowerCase() === q.toLowerCase())) html += `<div class="option create" role="option" id="${id}-new" data-t="${esc(q)}" data-new="1">${svg('plus')}<span>Добавить «${esc(q)}»</span></div>`;
      if (!html) html = `<div class="option empty">Ничего не найдено</div>`;
      list.innerHTML = html; items = [...list.querySelectorAll('.option:not(.empty)')];
      setActive(q || !multi ? 0 : -1);
    };
    const setActive = (i) => { active = i; items.forEach((o, k) => o.classList.toggle('active', k === i)); if (items[i]) { inp.setAttribute('aria-activedescendant', items[i].id); reveal(list, items[i]) } else inp.removeAttribute('aria-activedescendant') };
    const isOpen = () => list.classList.contains('open');
    let typed = false;
    /* Сенсорный экран: первое нажатие только открывает список — поле readonly, клавиатура не выезжает и не закрывает пол-экрана.
       Искать — второе нажатие в поле: снимаем readonly и заново ставим фокус, клавиатура открывается. Список закрылся — снова readonly */
    const touch = matchMedia('(pointer: coarse)').matches;
    const lock = (on) => { if (!touch) return; inp.readOnly = on; inp.placeholder = picked?.length ? '' : on ? (inp.dataset.ph ??= inp.placeholder) : 'Поиск' };
    const open = () => { if (isOpen()) return; typed = false; render(); if (!multi && !inp.readOnly) inp.select(); flip(list, c, 296); list.classList.add('open'); inp.setAttribute('aria-expanded', 'true') };
    const close = () => { list.classList.remove('open'); inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); lock(true) };
    const tags = (first) => {
      const before = one && !first ? widths() : null;
      const live = [...box.querySelectorAll('.tag')].filter((t) => !t._out), have = live.map((t) => t.dataset.t);
      const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
      // ушедшие — сжимаются по ширине, поле меняет высоту плавно, если строка тегов схлопнулась
      live.forEach((t) => { t.classList.remove('armed'); if (!picked.includes(t.dataset.t)) { t._out = 1; tagOut(t, gap, () => resize(box, () => t.remove())) } });
      // новые — добавляются в конец со своей анимацией входа; поле растёт плавно, если тег ушёл на новую строку
      const add = picked.filter((v) => !have.includes(v));
      if (add.length) { const put = () => add.forEach((v) => (more || inp).insertAdjacentHTML('beforebegin', `<span class="tag${first ? ' still' : ''}" data-t="${esc(v)}"><span>${esc(v)}</span><button type="button" tabindex="-1" aria-label="Убрать ${esc(v)}">${svg('x')}</button></span>`)); first ? put() : resize(box, put) }
      inp.placeholder = picked.length ? '' : (inp.dataset.ph ??= inp.placeholder);
      c.dataset.value = picked.join('|'); armed = false;
      fit(!first, before);
    };
    // выбор в открытом списке: пункты обновляются на месте — флажок ставится своей анимацией
    const mark = () => items.forEach((o) => { const on = picked.includes(o.dataset.t); o.setAttribute('aria-selected', on); const cb = o.querySelector('.check'); if (cb) cb.checked = on });
    const choose = (o) => {
      if (!o) return; const t = o.dataset.t;
      if (o.dataset.new) all.push({ t });
      if (multi) { picked = picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t]; const q = inp.value; inp.value = ''; tags(); if (q) resize(list, render); else mark(); setActive(Math.max(0, items.findIndex((x) => x.dataset.t === t))) }
      else { c.dataset.value = t; inp.value = t; close() }
      fire(c, 'change', { value: multi ? picked : t });
    };
    inp.addEventListener('focus', open);
    // фильтр: высота списка меняется плавно, а не прыжком
    inp.addEventListener('input', () => { typed = true; if (isOpen()) resize(list, render); else open(); if (!multi && !inp.value) { delete c.dataset.value } });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen()) open(); else setActive(Math.min(items.length - 1, active + 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)) }
      else if (e.key === 'Enter') { if (isOpen() && items[active]) { e.preventDefault(); choose(items[active]) } }
      else if (e.key === 'Escape') { if (isOpen()) { e.preventDefault(); close() } else if (!multi) { inp.value = ''; delete c.dataset.value } }
      else if (e.key === 'Tab') close();
      // Backspace в пустом поле: первый раз подсвечивает последний тег, второй — удаляет
      else if (multi && e.key === 'Backspace' && !inp.value && picked.length) {
        const last = [...box.querySelectorAll('.tag')].filter((t) => !t._out).pop();
        // последний тег свёрнут в «+N» — «на взвод» подсвечивается счётчик
        if (armed) { picked.pop(); tags(); mark(); fire(c, 'change', { value: picked }) } else { armed = true; (last.hidden ? more : last).classList.add('armed') }
      } else if (armed) { armed = false; box.querySelectorAll('.armed').forEach((x) => x.classList.remove('armed')) }
    });
    // одиночный: ушли из поля с текстом, которого нет в списке — возвращаем выбранное
    inp.addEventListener('blur', () => setTimeout(() => { if (c.contains(document.activeElement)) return; close(); if (!multi) inp.value = c.dataset.value || '' }, 0));
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('pointermove', (e) => { const o = e.target.closest('.option'); const i = items.indexOf(o); if (i >= 0 && i !== active) setActive(i) });
    list.addEventListener('click', (e) => choose(e.target.closest('.option:not(.empty)')));
    if (multi) {
      box.addEventListener('pointerdown', (e) => { if (e.target === box) { e.preventDefault(); inp.focus(); open() } });
      box.addEventListener('click', (e) => { const b = e.target.closest('.tag button'); if (!b) return; const t = b.closest('.tag').dataset.t; picked = picked.filter((x) => x !== t); tags(); if (isOpen()) mark(); inp.focus(); fire(c, 'change', { value: picked }) });
      tags(true);
    } else if (c.dataset.value) inp.value = c.dataset.value;
    document.addEventListener('pointerdown', (e) => { if (!c.contains(e.target)) close() });
    // стрелка: открыта — закрывает, закрыта — открывает; фокус остаётся в поле
    c.querySelector('.chev').addEventListener('pointerdown', (e) => { e.preventDefault(); if (isOpen()) close(); else { inp.focus(); open() } });
    // клик по полю в фокусе (например, после Esc) снова открывает список; на телефоне второе нажатие при открытом списке включает поиск
    let wasOpen = false;   // список открывается уже на фокусе — к клику он открыт; поиск включаем, только если был открыт до касания
    inp.addEventListener('pointerdown', () => { wasOpen = isOpen() });
    inp.addEventListener('click', () => {
      if (!isOpen()) open();
      else if (touch && inp.readOnly && wasOpen) { lock(false); if (!multi) inp.select(); inp.blur(); inp.focus({ preventScroll: true }) }
    });
    lock(true);
  }

  /* ===== Выбор даты =====
     <div class="date" data-mode="single|range" [data-value="2026-11-05" | "2026-11-01..2026-11-07"] [data-min] [data-max] [data-placeholder]>
     Значение: data-value (ISO), событие change {from, to}. Неделя с понедельника, подписи — по-русски. */
  const MN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MG = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) };
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const same = (a, b) => a && b && a.getTime() === b.getTime();
  const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
  const human = (d, year = true) => `${d.getDate()} ${MG[d.getMonth()]}${year ? ' ' + d.getFullYear() : ''}`;
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()) };

  function datePicker(w) {
    if (!once(w, 'ui')) return;
    const range = w.dataset.mode === 'range', id = 'dp' + ++uid;
    const min = parse(w.dataset.min), max = parse(w.dataset.max);
    let [from, to] = (w.dataset.value || '').split('..').map(parse);
    if (!range) to = null;
    let view = new Date((from || today()).getFullYear(), (from || today()).getMonth(), 1), focus = from || today(), hover = null;
    let draft = [from, to];                                  // диапазон применяется кнопкой «Применить»
    const presets = range ? [['Сегодня', 0, 0], ['Последние 7 дней', -6, 0], ['Последние 30 дней', -29, 0], ['Этот месяц', 'm'], ['Прошлый месяц', 'pm']] : [];

    w.innerHTML = `<button type="button" class="input date-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}" ${w.dataset.label ? `aria-label="${esc(w.dataset.label)}"` : ''}>${svg('cal')}<span class="value"></span></button>
      <div class="menu cal-pop" id="${id}" role="dialog" aria-label="${range ? 'Выбор периода' : 'Выбор даты'}">
        ${range ? `<div class="cal-presets">${presets.map((p, i) => `<button type="button" class="menu-item" data-p="${i}">${p[0]}</button>`).join('')}</div>` : ''}
        <div class="cal-body"><div class="cal-months"></div>
        ${range ? `<div class="cal-foot"><span class="hint"></span><div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="reset">Сбросить</button><button type="button" class="btn btn-primary btn-sm" data-act="apply">Применить</button></div></div>` : ''}</div>
      </div>`;
    const trig = w.querySelector('.date-trigger'), pop = w.querySelector('.cal-pop'), months = pop.querySelector('.cal-months'), foot = pop.querySelector('.cal-foot .hint');
    if (w.id) { const l = document.querySelector(`label[for="${w.id}"], [data-label-for="${w.id}"]`); if (l) { l.id ||= id + '-l'; trig.setAttribute('aria-labelledby', `${l.id} ${id}-v`); trig.querySelector('.value').id = id + '-v' } }

    const two = () => range && matchMedia('(min-width: 641px)').matches;
    const off = (d) => (min && d < min) || (max && d > max);
    const label = () => {
      const v = trig.querySelector('.value');
      const ph = w.dataset.placeholder || (range ? 'Выберите период' : 'Выберите дату');
      if (!from) { v.textContent = ph; v.classList.add('placeholder'); return }
      v.classList.remove('placeholder');
      v.textContent = !range ? human(from) : !to || same(from, to) ? human(from) : `${human(from, from.getFullYear() !== to.getFullYear())} — ${human(to)}`;
    };
    const month = (base) => {
      const first = (base.getDay() + 6) % 7, start = addD(base, -first), t = today();
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = addD(start, i), out = d.getMonth() !== base.getMonth();
        if (out && two()) { cells += '<div class="cal-cell"></div>'; continue }   // в двух месяцах «чужие» дни не дублируем
        cells += `<div class="cal-cell" role="gridcell"><button type="button" class="cal-day${out ? ' out' : ''}${same(d, t) ? ' today' : ''}" data-d="${iso(d)}" tabindex="-1" aria-selected="false" ${off(d) ? 'disabled' : ''} aria-label="${human(d)}">${d.getDate()}</button></div>`;
      }
      return `<div class="cal"><div class="cal-grid" role="grid" aria-label="${MN[base.getMonth()]} ${base.getFullYear()}">${WD.map((x) => `<div class="cal-wd">${x}</div>`).join('')}${cells}</div></div>`;
    };
    const draw = (dir) => {
      const n = two() ? 2 : 1, ms = [...Array(n)].map((_, i) => addM(view, i));
      months.innerHTML = ms.map(month).join('');
      // заголовок со стрелками над каждым месяцем: ← у первого, → у последнего
      months.querySelectorAll('.cal').forEach((cal, i) => cal.insertAdjacentHTML('afterbegin', `<div class="cal-head">${i === 0 ? `<button type="button" class="icon-btn" data-nav="-1" aria-label="Предыдущий месяц">${svg('l')}</button>` : '<span class="spacer"></span>'}<span class="cal-title" aria-live="polite">${MN[ms[i].getMonth()]} ${ms[i].getFullYear()}</span>${i === n - 1 ? `<button type="button" class="icon-btn" data-nav="1" aria-label="Следующий месяц">${svg('r')}</button>` : '<span class="spacer"></span>'}</div>`));
      if (dir) { months.classList.remove('slide-l', 'slide-r'); months.offsetWidth; months.classList.add(dir < 0 ? 'slide-l' : 'slide-r') }
      paint(true);
    };
    // состояние дней — на месте: подложка выбранного и полоса диапазона появляются и сдвигаются плавно
    const paint = (fresh) => {
      const [a, b0] = draft, b = b0 || (a && hover && hover > a ? hover : null);
      months.classList.toggle('instant', !!fresh);            // только что построенная сетка — без переходов
      months.querySelectorAll('.cal-day').forEach((btn) => {
        const d = parse(btn.dataset.d), cell = btn.parentElement;
        btn.setAttribute('aria-selected', range ? !!(same(d, a) || same(d, b)) : !!same(d, from));
        btn.tabIndex = same(d, focus) ? 0 : -1;
        // в одном месяце полоса идёт и по дням соседнего — без разрыва
        const on = range && a && b;
        cell.classList.toggle('from', !!(on && same(d, a))); cell.classList.toggle('to', !!(on && same(d, b))); cell.classList.toggle('in', !!(on && d > a && d < b));
      });
      if (fresh) { months.offsetWidth; months.classList.remove('instant') }
      if (foot) { const [x, y] = draft; foot.textContent = x && y ? `${human(x, false)} — ${human(y, false)} · ${(y - x) / 864e5 + 1} ${plural((y - x) / 864e5 + 1, ['день', 'дня', 'дней'])}` : x ? 'Выберите конец периода' : 'Выберите начало периода' }
      pop.querySelectorAll('.cal-presets [data-p]').forEach((p) => p.setAttribute('aria-pressed', 'false'));
    };
    // сторона (от левого или правого края поля) — и для ЗАКРЫТОГО календаря: невидимый, он всё равно занимает место,
    // и два месяца у правого края расширяли страницу (прокрутка вбок на 961–1100px). Пересчёт — при загрузке и смене ширины
    const side = () => { const r = trig.getBoundingClientRect(); pop.classList.toggle('right', r.left + pop.offsetWidth > document.documentElement.clientWidth - 16 && r.right - pop.offsetWidth > 16) };
    let sideRaf = 0; const sideLater = () => { cancelAnimationFrame(sideRaf); sideRaf = requestAnimationFrame(() => { if (!isOpen()) side() }) };
    addEventListener('resize', sideLater); document.fonts?.ready.then(sideLater); sideLater();
    const isOpen = () => pop.classList.contains('open');
    const open = () => {
      if (isOpen()) return; draft = [from, to]; focus = from || today(); view = new Date(focus.getFullYear(), focus.getMonth(), 1);
      draw(); side();
      flip(pop, trig, pop.offsetHeight + 16); pop.classList.add('open'); trig.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => pop.querySelector('.cal-day[tabindex="0"]')?.focus({ preventScroll: true }));
    };
    const close = (back) => { if (!isOpen()) return; pop.classList.remove('open'); trig.setAttribute('aria-expanded', 'false'); hover = null; if (back) trig.focus() };
    const commit = () => {
      [from, to] = range ? draft : [draft[0], null];
      w.dataset.value = from ? (range ? `${iso(from)}..${iso(to || from)}` : iso(from)) : '';
      if (range && from && !to) to = from;
      label(); fire(w, 'change', { from: from && iso(from), to: to && iso(to) });
    };
    const pick = (d) => {
      if (!range) { draft = [d, null]; commit(); paint(); close(true); return }
      const [a, b] = draft;
      draft = !a || b || d < a ? [d, null] : [a, d]; focus = d; hover = null; paint();
      pop.querySelector(`[data-d="${iso(d)}"]`)?.focus({ preventScroll: true });
    };
    const moveFocus = (d) => {
      if (off(d)) return; focus = d;
      const last = addM(view, two() ? 2 : 1);
      if (d < view) { view = new Date(d.getFullYear(), d.getMonth(), 1); draw(-1) } else if (d >= last) { view = addM(new Date(d.getFullYear(), d.getMonth(), 1), two() ? -1 : 0); draw(1) } else paint();
      pop.querySelector(`[data-d="${iso(d)}"]`)?.focus({ preventScroll: true });
    };

    trig.addEventListener('click', () => (isOpen() ? close() : open()));
    trig.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open() } });
    pop.addEventListener('click', (e) => {
      const day = e.target.closest('.cal-day'), nav = e.target.closest('[data-nav]'), p = e.target.closest('[data-p]'), act = e.target.closest('[data-act]');
      if (day) pick(parse(day.dataset.d));
      else if (nav) { view = addM(view, +nav.dataset.nav); focus = new Date(view); draw(+nav.dataset.nav) }
      else if (p) {
        const [, x, y] = presets[p.dataset.p], t = today();
        draft = x === 'm' ? [new Date(t.getFullYear(), t.getMonth(), 1), t] : x === 'pm' ? [addM(t, -1), addD(new Date(t.getFullYear(), t.getMonth(), 1), -1)] : [addD(t, x), addD(t, y)];
        focus = draft[0];
        // месяцы перестраиваются, только если период не виден целиком; иначе полоса просто переезжает
        const shown = (d) => d >= view && d < addM(view, two() ? 2 : 1);
        if (shown(draft[0]) && shown(draft[1])) paint();
        else { const old = view; view = addM(new Date(draft[1].getFullYear(), draft[1].getMonth(), 1), two() && draft[0].getMonth() === draft[1].getMonth() ? -1 : 0); if (draft[0] >= view) view = new Date(draft[0].getFullYear(), draft[0].getMonth(), 1); draw(view < old ? -1 : 1) }
        p.setAttribute('aria-pressed', 'true');
      } else if (act?.dataset.act === 'apply') { if (draft[0] && !draft[1]) draft[1] = draft[0]; commit(); close(true) }
      else if (act?.dataset.act === 'reset') { draft = [null, null]; paint() }
    });
    // наведение во время выбора конца — предпросмотр полосы
    pop.addEventListener('pointerover', (e) => { if (!range || !draft[0] || draft[1]) return; const d = e.target.closest('.cal-day'); const h = d && parse(d.dataset.d); if (!same(h, hover)) { hover = h; paint() } });
    pop.addEventListener('keydown', (e) => {
      const day = e.target.closest('.cal-day');
      if (e.key === 'Escape') { e.preventDefault(); close(true); return }
      if (!day) return;
      const d = parse(day.dataset.d), k = e.key;
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (map[k]) { e.preventDefault(); moveFocus(addD(d, map[k])) }
      else if (k === 'Home') { e.preventDefault(); moveFocus(addD(d, -((d.getDay() + 6) % 7))) }
      else if (k === 'End') { e.preventDefault(); moveFocus(addD(d, 6 - ((d.getDay() + 6) % 7))) }
      else if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); const n = new Date(d.getFullYear(), d.getMonth() + (k === 'PageUp' ? -1 : 1), Math.min(d.getDate(), 28)); view = new Date(n.getFullYear(), n.getMonth(), 1); focus = n; draw(k === 'PageUp' ? -1 : 1); pop.querySelector(`[data-d="${iso(n)}"]`)?.focus({ preventScroll: true }) }
    });
    document.addEventListener('pointerdown', (e) => { if (!w.contains(e.target)) close() });
    pop.addEventListener('focusout', (e) => { if (e.relatedTarget && !w.contains(e.relatedTarget)) close() });
    label();
  }

  /* ===== Загрузка файлов =====
     <label class="dz" data-max="10" data-accept="image/*,.pdf"><input type="file" multiple>…</label><ul class="files"></ul>
     Отправку делает приложение: событие files-added {files}; для витрины прогресс имитируется (data-demo). */
  const size = (b) => (b < 1024 ? b + ' Б' : b < 1048576 ? (b / 1024).toFixed(0) + ' КБ' : (b / 1048576).toFixed(1).replace('.', ',') + ' МБ');
  function dropzone(dz) {
    if (!once(dz, 'ui')) return;
    const inp = dz.querySelector('input[type=file]'), list = dz.nextElementSibling?.classList.contains('files') ? dz.nextElementSibling : null;
    const maxB = (+dz.dataset.max || Infinity) * 1048576, acc = (dz.dataset.accept || inp.accept || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (acc.length) inp.accept = acc.join(',');
    const okType = (f) => !acc.length || acc.some((a) => (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
    const add = (files) => {
      fire(dz, 'files-added', { files });
      if (!list) return;
      [...files].forEach((f) => {
        const err = !okType(f) ? 'Этот тип не поддерживается' : f.size > maxB ? `Больше ${dz.dataset.max} МБ` : '';
        const li = document.createElement('li'); li.className = 'file' + (err ? ' error' : '');
        li.innerHTML = `<span class="file-ic">${svg(err ? 'err' : f.type.startsWith('image/') ? 'img' : 'file')}</span>
          <div class="file-main"><div class="file-row"><span class="file-name" title="${esc(f.name)}">${esc(f.name)}</span><span class="file-meta">${err || size(f.size)}</span></div>${err ? '' : '<div class="progress"><i></i></div>'}</div>
          <button type="button" class="icon-btn icon-btn-sm" aria-label="Убрать ${esc(f.name)}">${svg('x')}</button>`;
        list.appendChild(li); growIn(li);
        li.querySelector('button').onclick = () => { clearInterval(li._t); shrinkOut(li, () => li.remove()) };
        if (!err && dz.hasAttribute('data-demo')) {
          let p = 0; const bar = li.querySelector('.progress > i'), meta = li.querySelector('.file-meta');
          li._t = setInterval(() => {
            p = Math.min(1, p + 0.08 + Math.random() * 0.12); bar.style.setProperty('--p', p);
            meta.textContent = p < 1 ? `${Math.round(p * 100)}%` : size(f.size);
            // готово: полоса гаснет, строка плавно становится ниже, иконка меняется кроссфейдом
            if (p >= 1) { clearInterval(li._t); setTimeout(() => { resize(li, () => li.classList.add('done'), 220); swapIcon(li.querySelector('.file-ic'), svg('ok')) }, 280) }
          }, 180);
        }
      });
    };
    inp.addEventListener('change', () => { add(inp.files); inp.value = '' });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click() } });
    let depth = 0;   // dragenter/leave приходят и от вложенных элементов — считаем глубину, чтобы рамка не мигала
    dz.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dz.classList.add('over') });
    dz.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' });
    dz.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; dz.classList.remove('over') } });
    dz.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; dz.classList.remove('over'); add(e.dataTransfer.files) });
  }
  // файл, брошенный мимо зоны, не должен открываться во вкладке
  addEventListener('dragover', (e) => { if (!e.target.closest?.('.dz')) e.preventDefault() });
  addEventListener('drop', (e) => { if (!e.target.closest?.('.dz')) e.preventDefault() });

  /* ===== Кнопка «Скопировать» (data-copy="текст") ===== */
  function copyBtn(b) {
    if (!once(b, 'ui')) return;
    b.classList.add('copy-btn');
    b.innerHTML = '<svg class="lucide i-copy" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'
      + '<svg class="lucide i-ok" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M20 6 9 17l-5-5"/></svg>';
    const label = b.getAttribute('aria-label') || 'Копировать';
    let t;
    b.addEventListener('click', () => {
      // не ждём буфер обмена: writeText может висеть (фокус, разрешение) — отклик на клик должен быть сразу
      navigator.clipboard?.writeText(b.dataset.copy || '').catch(() => {});
      b.classList.add('done'); b.setAttribute('aria-label', 'Скопировано');
      clearTimeout(t); t = setTimeout(() => { b.classList.remove('done'); b.setAttribute('aria-label', label) }, 1600);
    });
  }

  /* ===== Загрузка кнопки: btnLoading(btn, true|false) ===== */
  window.btnLoading = (b, on) => {
    clearTimeout(b._settle);
    if (on) { b.classList.remove('is-settling'); b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true'); return }
    b.classList.remove('is-loading'); b.removeAttribute('aria-busy');
    b.classList.add('is-settling'); b._settle = setTimeout(() => b.classList.remove('is-settling'), 320);   // докручивается, пока гаснет
  };

  /* ===== Кнопка с подтверждением: data-done="Итог", data-load="мс" (сначала загрузка), data-copy="текст" ===== */
  const CHECK = '<svg class="lucide" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M20 6 9 17l-5-5"/></svg>';
  function doneBtn(b) {
    if (!once(b, 'ui')) return;
    const a = document.createElement('span'); a.className = 'lb-a';
    while (b.firstChild) a.appendChild(b.firstChild);
    const st = document.createElement('span'); st.className = 'btn-stack';
    st.append(a); st.insertAdjacentHTML('beforeend', `<span class="lb-b" aria-hidden="true">${CHECK}<span>${esc(b.dataset.done)}</span></span>`);
    b.append(st);
    const bb = st.lastChild; let t;
    const set = (on) => { b.classList.toggle('done', on); a.setAttribute('aria-hidden', on); bb.setAttribute('aria-hidden', !on) };
    b.addEventListener('click', () => {
      if (b.classList.contains('is-loading')) return;
      clearTimeout(t);
      if ('copy' in b.dataset) navigator.clipboard?.writeText(b.dataset.copy).catch(() => {});
      const finish = () => { set(true); t = setTimeout(() => set(false), +(b.dataset.doneFor || 2000)) };
      if (b.dataset.load) { set(false); btnLoading(b, true); t = setTimeout(() => { btnLoading(b, false); finish() }, +b.dataset.load) }
      else finish();
    });
  }

  /* ===== Сегменты .seg и вкладки .tabs: одна плашка .thumb / линия .line едет к выбранному =====
     Выбор пользователем — событие pick на .seg/.tabs (detail — кнопка; по уже выбранной не приходит).
     Задать из кода: box.select(кнопка, anim). Вкладки: стрелки ←/→, Home/End, фокус только у выбранной. */
  function rail(box) {
    if (!once(box, 'rail')) return;
    const tabs = box.classList.contains('tabs'), attr = tabs ? 'aria-selected' : 'aria-pressed';
    const mark = box.querySelector(tabs ? ':scope > .line' : ':scope > .thumb');
    const items = [...box.querySelectorAll(tabs ? '.tab' : ':scope > button')];
    if (!mark || !items.length) return;
    const cur = () => items.find((x) => x.getAttribute(attr) === 'true') || items[0];
    const place = (el, anim) => {
      box.classList.toggle('no-anim', !anim);
      mark.style.setProperty('--x', el.offsetLeft + 'px'); mark.style.setProperty('--w', el.offsetWidth + 'px');
      if (!anim) requestAnimationFrame(() => box.classList.remove('no-anim'));
    };
    const rove = (el) => { if (tabs) items.forEach((x) => { x.tabIndex = x === el ? 0 : -1 }) };
    box.select = (el, anim = true) => { items.forEach((x) => x.setAttribute(attr, x === el)); rove(el); place(el, anim) };
    const pick = (el) => { if (el.getAttribute(attr) === 'true') return; box.select(el); fire(box, 'pick', el) };
    items.forEach((el) => el.addEventListener('click', () => pick(el)));
    if (tabs) box.addEventListener('keydown', (e) => {
      const i = items.indexOf(document.activeElement); if (i < 0) return;
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
      if (n === null) return;
      e.preventDefault(); const el = items[(n + items.length) % items.length]; el.focus(); pick(el);
    });
    rove(cur());
    document.fonts.ready.then(() => place(cur(), false));
    new ResizeObserver(() => place(cur(), false)).observe(box);   // ширина шрифта, перестройка, показ скрытого блока
  }

  window.initInputs = (root = document) => {
    const each = (s, f) => root.querySelectorAll(s).forEach(f);
    each('.search', search); each('.pw', password); each('.otp', otp); each('.stepper', stepper); each('.slider', slider);
    each('.tgl', toggles); each('.color', color); each('.combo', combo); each('.date', datePicker); each('.dz', dropzone); each('.icon-btn[data-copy]', copyBtn); each('.btn[data-done]', doneBtn); each('.seg, .tabs', rail);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initInputs()); else initInputs();
})();
