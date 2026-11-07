/* Данные и обратная связь · поведение к tokens/data.css.
   Подключение: <script src="js/data.js" defer></script>; для новой разметки — initData(root).
   API: setCount(el, n) — счётчик со сменой числа сдвигом. */
(() => {
  const EASE = 'cubic-bezier(.23,1,.32,1)', INOUT = 'cubic-bezier(.77,0,.175,1)';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const once = (el, k) => { if (el.dataset[k]) return false; el.dataset[k] = '1'; return true };
  const P = {
    updown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>', up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>'
  };
  const svg = (n, cls = '') => `<svg class="lucide ${cls}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = (v) => (+v).toLocaleString('ru-RU');
  const short = (v) => v >= 1e6 ? (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн' : v >= 1e4 ? (v / 1e3).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' тыс' : fmt(v);
  const nice = (x) => { const p = 10 ** Math.floor(Math.log10(x || 1)), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p };
  let uid = 0;

  /* Смена числа: старое уходит вверх (или вниз при уменьшении), новое приходит с другой стороны */
  const swapNum = (box, text, dir) => {
    const cur = box.lastElementChild;
    if (cur && cur.textContent === text) return;
    const nx = document.createElement('span'); nx.textContent = text; box.append(nx);
    if (!cur) return;
    if (reduce.matches) { cur.remove(); return }
    cur.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-dir * 100}%)`, opacity: 0 }], { duration: 240, easing: EASE, fill: 'forwards' }).onfinish = () => cur.remove();
    nx.animate([{ transform: `translateY(${dir * 100}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: EASE });
  };
  window.setCount = (el, n) => {
    const old = +(el.dataset.n || 0); el.dataset.n = n;
    el.classList.toggle('zero', n <= 0);
    el.setAttribute('aria-label', n > 0 ? `${n} непрочитанных` : 'Нет непрочитанных');
    if (n <= 0) return;                                           // ноль — гаснет, прежнее число остаётся, пока гаснет
    const t = n > 99 ? '99+' : String(n);
    if (old <= 0) { el.replaceChildren(Object.assign(document.createElement('span'), { textContent: t })); return }
    swapNum(el, t, n > old ? 1 : -1);
  };

  /* ===== Аккордеон: высота плавно, можно прервать на середине; data-single — открыт один ===== */
  function acc(root) {
    if (!once(root, 'da')) return;
    const items = [...root.querySelectorAll('.acc-item')];
    const toggle = (d, open) => {
      const s = d.querySelector('summary'), from = d.offsetHeight;
      d._a?.cancel();
      if (open) { d.open = true; d.classList.add('is-open') } else d.classList.remove('is-open');
      if (reduce.matches) { if (!open) d.open = false; return }
      const to = open ? d.scrollHeight : s.offsetHeight;
      d._a = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: open ? 280 : 200, easing: EASE });
      if (open) d.querySelector('.acc-body')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 40, easing: EASE, fill: 'backwards' });
      d._a.onfinish = () => { d._a = null; if (!open) d.open = false };
    };
    items.forEach((d) => {
      if (d.open) d.classList.add('is-open');
      const s = d.querySelector('summary');
      if (!s.querySelector('svg')) s.insertAdjacentHTML('beforeend', svg('chev'));
      s.addEventListener('click', (e) => {
        e.preventDefault(); const open = !d.classList.contains('is-open');
        if (open && root.hasAttribute('data-single')) items.forEach((o) => o !== d && o.classList.contains('is-open') && toggle(o, false));
        toggle(d, open);
      });
    });
  }

  /* ===== Таблица: сортировка (строки переезжают на новые места), выбор, действия над выбранными ===== */
  function dt(root) {
    if (!once(root, 'da')) return;
    const table = root.querySelector('table'), tbody = table.tBodies[0], bulk = root.querySelector('.bulk'), all = table.querySelector('thead .check');
    const flip = (rows, change) => {
      const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
      change();
      if (reduce.matches) return;
      rows.forEach((r) => { if (!r.isConnected) return; const dy = before.get(r) - r.getBoundingClientRect().top;
        if (Math.abs(dy) > .5) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 360, easing: INOUT }) });
    };
    // сортировка
    table.querySelectorAll('th[data-sort]').forEach((th) => {
      const lab = th.textContent.trim();
      th.innerHTML = `<button type="button" class="th-sort">${esc(lab)}<span class="sort-ic">${svg('updown', 'idle')}${svg('up', 'dir')}</span></button>`;
      th.setAttribute('aria-sort', 'none');
      th.querySelector('button').addEventListener('click', () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        table.querySelectorAll('th[aria-sort]').forEach((x) => x.setAttribute('aria-sort', 'none')); th.setAttribute('aria-sort', dir);
        const i = th.cellIndex, num = th.dataset.sort === 'num';
        const key = (r) => { const c = r.cells[i], v = c.dataset.v ?? c.textContent.trim(); return num ? parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.')) || 0 : v.toLowerCase() };
        const rows = [...tbody.rows];
        const sorted = [...rows].sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'ascending' ? 1 : -1) });
        flip(rows, () => tbody.append(...sorted));
      });
    });
    // выбор
    let last = -1;
    const boxes = () => [...tbody.querySelectorAll('.check')];
    const sync = () => {
      const b = boxes(), n = b.filter((x) => x.checked).length;
      b.forEach((x) => x.closest('tr').classList.toggle('sel', x.checked));
      if (all) { all.checked = n > 0 && n === b.length; all.indeterminate = n > 0 && n < b.length }
      if (bulk) {
        bulk.classList.toggle('on', n > 0);
        const nb = bulk.querySelector('.bulk-n b'), tot = bulk.querySelector('.bulk-n i');
        if (n > 0 && nb) { const old = +nb.dataset.n || 0; nb.dataset.n = n; if (!nb.firstElementChild) nb.innerHTML = `<span>${n}</span>`; else swapNum(nb, String(n), n > old ? 1 : -1) }
        if (tot) tot.textContent = b.length;
      }
    };
    tbody.addEventListener('click', (e) => {
      const cb = e.target.closest('.check'); if (!cb) return;
      const b = boxes(), i = b.indexOf(cb);
      if (e.shiftKey && last >= 0) { const [a, z] = [Math.min(last, i), Math.max(last, i)]; b.slice(a, z + 1).forEach((x) => (x.checked = cb.checked)) }
      last = i; sync();
    });
    all?.addEventListener('change', () => { boxes().forEach((x) => (x.checked = all.checked)); sync() });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && boxes().some((x) => x.checked)) { boxes().forEach((x) => (x.checked = false)); sync() } });
    // действия: data-bulk="clear" | "remove" (уходят из таблицы, можно вернуть)
    bulk?.querySelectorAll('[data-bulk]').forEach((btn) => btn.addEventListener('click', () => {
      const act = btn.dataset.bulk, sel = boxes().filter((x) => x.checked).map((x) => x.closest('tr'));
      if (act === 'clear') { boxes().forEach((x) => (x.checked = false)); sync(); return }
      const pos = sel.map((r) => [r, r.previousElementSibling]);
      sel.forEach((r) => r.classList.add('gone'));
      setTimeout(() => {
        const rest = [...tbody.rows].filter((r) => !sel.includes(r));
        flip(rest, () => sel.forEach((r) => r.remove()));
        sel.forEach((r) => { r.classList.remove('gone', 'sel'); r.querySelector('.check').checked = false });
        sync();
        root.dispatchEvent(new CustomEvent('bulk', { detail: { action: act, rows: sel, label: btn.textContent.trim(),
          undo: () => { const rows = [...tbody.rows]; flip(rows, () => pos.reverse().forEach(([r, prev]) => (prev && prev.isConnected ? prev.after(r) : tbody.prepend(r))));
            sel.forEach((r) => r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE })); sync() } } }));
      }, 150);
    }));
    sync();
  }

  /* ===== Графики: data-type="bar" | "line", data-values, data-labels, data-unit; data-views — id переключателя «График/Таблица» ===== */
  function chart(el) {
    if (!once(el, 'da')) return;
    const vals = el.dataset.values.split(',').map(Number), labs = el.dataset.labels.split(','), unit = el.dataset.unit || '', H = +el.dataset.h || 220, line = el.dataset.type === 'line';
    const id = 'ch' + ++uid, title = el.getAttribute('aria-label') || '';
    el.tabIndex = 0; el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${title}. ${labs[0]} — ${labs.at(-1)}, от ${fmt(Math.min(...vals))} до ${fmt(Math.max(...vals))}${unit}. Стрелки — по значениям.`);
    const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.setAttribute('aria-live', 'polite');
    let g = {}, cur = -1;
    const draw = () => {
      const W = el.clientWidth; if (!W) return;
      const L = 44, T = 8, B = 24, iw = W - L, ih = H - T - B, y0 = T + ih;
      const step = nice(Math.max(...vals) / 5), nt = Math.ceil(Math.max(...vals) / step), max = step * nt;   // шкала до ближайшего круглого, столбцы занимают высоту
      const Y = (v) => y0 - (ih * v) / max;
      let s = `<svg height="${H}" aria-hidden="true"><defs><linearGradient id="${id}g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--accent-text);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--accent-text);stop-opacity:0"/></linearGradient></defs><g class="grid">`;
      for (let t = 0; t <= nt; t++) { const y = Math.round(Y(step * t)) + .5; s += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}"${t === 0 ? ' class="base"' : ''}/>` }
      s += '</g><g class="ax">';
      for (let t = 0; t <= nt; t++) s += `<text x="${L - 8}" y="${Y(step * t) + 4}" text-anchor="end">${short(step * t)}</text>`;
      if (line) {
        const X = (i) => L + 8 + ((iw - 16) * i) / (vals.length - 1);
        const k = Math.max(1, Math.round((vals.length - 1) / Math.max(1, Math.floor(iw / 90))));
        for (let i = 0; i < vals.length; i += k) s += `<text x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : 'middle'}">${esc(labs[i])}</text>`;
        const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
        s += `</g><path class="ar" fill="url(#${id}g)" d="M${pts.join('L')}L${X(vals.length - 1)},${y0}L${X(0)},${y0}Z"/><path class="ln" d="M${pts.join('L')}"/>`
          + `<line class="xh" y1="${T}" y2="${y0}"/><circle class="pt" r="4"/></svg>`;
        g = { X, Y, y0, n: vals.length, hitL: L, hitW: iw };
      } else {
        const band = iw / vals.length, bw = Math.max(4, Math.min(28, band * .62)), k = Math.ceil(56 / band);
        for (let i = 0; i < vals.length; i += k) s += `<text x="${L + band * i + band / 2}" y="${H - 6}" text-anchor="middle">${esc(labs[i])}</text>`;
        s += '</g><g>';
        vals.forEach((v, i) => {
          const x = L + band * i + (band - bw) / 2, top = Y(v), h = y0 - top, r = Math.min(4, h, bw / 2);
          s += `<path class="bar" d="M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${y0}Z"/>`;
        });
        s += '</g></svg>';
        g = { band, bw, Y, L, y0, n: vals.length, hitL: L, hitW: iw };
      }
      el.innerHTML = s; el.append(tip); cur = -1; el.classList.remove('hovering');
    };
    const set = (i) => {
      if (i === cur) return; cur = i; el.classList.toggle('hovering', i >= 0); if (i < 0) return;
      const v = vals[i]; let cx, cy;
      if (line) { cx = g.X(i); cy = g.Y(v); const xh = el.querySelector('.xh'), pt = el.querySelector('.pt');
        xh.setAttribute('x1', Math.round(cx) + .5); xh.setAttribute('x2', Math.round(cx) + .5); pt.setAttribute('cx', cx); pt.setAttribute('cy', cy) }
      else { el.querySelectorAll('.bar').forEach((b, k) => b.classList.toggle('on', k === i)); cx = g.L + g.band * i + g.band / 2; cy = g.Y(v) }
      tip.innerHTML = `<b>${fmt(v)}${esc(unit)}</b>${esc(labs[i])}`;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.transform = `translate(${Math.round(Math.max(0, Math.min(el.clientWidth - w, cx - w / 2)))}px, ${Math.round(Math.max(-h - 4, cy - h - 12))}px)`;
    };
    el.addEventListener('pointermove', (e) => {
      const x = e.clientX - el.getBoundingClientRect().left - g.hitL; if (x < 0) return set(-1);
      set(line ? Math.max(0, Math.min(g.n - 1, Math.round((x - 8) / (g.hitW - 16) * (g.n - 1)))) : Math.max(0, Math.min(g.n - 1, Math.floor(x / g.band))));
    });
    el.addEventListener('pointerleave', () => set(-1)); el.addEventListener('blur', () => set(-1));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); set(Math.max(0, Math.min(vals.length - 1, cur + (e.key === 'ArrowRight' ? 1 : -1) + (cur < 0 && e.key === 'ArrowLeft' ? vals.length + 1 : 0)))) }
      if (e.key === 'Escape') set(-1);
    });
    new ResizeObserver(draw).observe(el);
    // табличный вид — те же данные
    const tg = el.dataset.views && document.getElementById(el.dataset.views);
    if (tg) {
      const wrap = document.createElement('div'); wrap.className = 'table-wrap chart-table'; wrap.hidden = true;
      wrap.innerHTML = `<table class="table"><thead><tr><th>${esc(el.dataset.col || 'Период')}</th><th class="num">${esc(title)}</th></tr></thead><tbody>${vals.map((v, i) => `<tr><td>${esc(labs[i])}</td><td class="num">${fmt(v)}${esc(unit)}</td></tr>`).join('')}</tbody></table>`;
      el.after(wrap);
      tg.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
        const t = b.dataset.view === 'table', show = t ? wrap : el; if (!show.hidden) return;
        wrap.hidden = !t; el.hidden = t; if (!t) draw();
        if (!reduce.matches) show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE });
      }));
    }
  }
  // искра в карточке с цифрой: тренд без осей, конец отмечен точкой
  function spark(el) {
    if (!once(el, 'da')) return;
    const vals = el.dataset.values.split(',').map(Number), id = 'sp' + ++uid;
    const draw = () => {
      const W = el.clientWidth, H = el.clientHeight || 40; if (!W) return;
      const lo = Math.min(...vals), hi = Math.max(...vals), X = (i) => 2 + ((W - 6) * i) / (vals.length - 1), Y = (v) => 4 + (H - 8) * (1 - (v - lo) / (hi - lo || 1));
      const d = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('L');
      el.innerHTML = `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--accent-text);stop-opacity:.2"/><stop offset="1" style="stop-color:var(--accent-text);stop-opacity:0"/></linearGradient></defs>`
        + `<path d="M${d}L${X(vals.length - 1)},${H}L${X(0)},${H}Z" fill="url(#${id})"/><path class="ln" d="M${d}"/><circle class="end" r="3" cx="${X(vals.length - 1)}" cy="${Y(vals.at(-1))}"/>`;
    };
    el.setAttribute('aria-hidden', 'true');
    new ResizeObserver(draw).observe(el);
  }

  /* ===== Комментарии: реакции, ответ, новый комментарий въезжает плавно ===== */
  function cmts(root) {
    if (!once(root, 'da')) return;
    root.addEventListener('click', (e) => {
      const r = e.target.closest('.react');
      if (r) { const on = r.getAttribute('aria-pressed') !== 'true', n = r.querySelector('.n'), v = +(n.textContent) + (on ? 1 : -1);
        r.setAttribute('aria-pressed', on); if (!n.firstElementChild) n.innerHTML = `<span>${n.textContent}</span>`; swapNum(n, String(v), on ? 1 : -1); return }
      const rp = e.target.closest('.cmt-reply');
      if (rp) { const ta = root.querySelector('.composer textarea'); if (!ta) return; const who = rp.closest('.cmt').querySelector('.cmt-head b').textContent.split(' ')[0];
        ta.value = `@${who} `; ta.focus(); ta.dispatchEvent(new Event('input')) }
    });
    const f = root.querySelector('.composer'); if (!f) return;
    const ta = f.querySelector('textarea'), send = f.querySelector('[type=submit]');
    const upd = () => (send.disabled = !ta.value.trim()); ta.addEventListener('input', upd); upd();
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); f.requestSubmit() } });
    f.addEventListener('submit', (e) => {
      e.preventDefault(); const t = ta.value.trim(); if (!t) return;
      const w = document.createElement('div'); w.className = 'grow-in';
      const body = esc(t).replace(/^@(\S+)/, '<span class="mention">@$1</span>');
      w.innerHTML = `<div><article class="cmt"><span class="avatar avatar-md" data-hue="${f.dataset.hue || 5}">${esc(f.dataset.initials || 'Я')}</span><div class="cmt-main"><header class="cmt-head"><b>${esc(f.dataset.name || 'Вы')}</b><time>только что</time></header><p class="cmt-text">${body}</p></div></article></div>`;
      f.before(w); w.offsetHeight; w.classList.add('on'); ta.value = ''; upd();
      root.dispatchEvent(new CustomEvent('comment', { detail: { text: t } }));
    });
  }

  /* ===== Команда установки во вкладках: npm / pnpm / yarn / bun ===== */
  function codeTabs(c) {
    if (!once(c, 'da')) return;
    const tabs = [...c.querySelectorAll('.code-tab')], code = c.querySelector('pre code'), cp = c.querySelector('[data-copy]');
    const line = (cmd) => { const [b, ...r] = cmd.split(' '); return `<span class="line"><span class="tk-p">$ </span><span class="tk-f">${esc(b)}</span> ${esc(r.join(' '))}</span>` };
    const pick = (t, anim) => {
      tabs.forEach((x) => { x.setAttribute('aria-selected', x === t); x.tabIndex = x === t ? 0 : -1 });
      if (cp) cp.dataset.copy = t.dataset.cmd;
      if (!anim || reduce.matches) { code.innerHTML = line(t.dataset.cmd); return }
      code.classList.add('swap'); setTimeout(() => { code.innerHTML = line(t.dataset.cmd); code.classList.remove('swap') }, 140);
    };
    tabs.forEach((t, i) => { t.setAttribute('role', 'tab'); t.addEventListener('click', () => pick(t, true));
      t.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n, true) } }) });
    pick(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0], false);
  }

  /* ===== Баннер: крестик прячет плавно по высоте ===== */
  function banner(w) {
    if (!once(w, 'da')) return;
    w.querySelector('.banner-x')?.addEventListener('click', () => { w.classList.add('off'); w.dispatchEvent(new CustomEvent('dismiss')) });
  }

  /* ===== Уведомления: клик — прочитано (точка гаснет), счётчик уменьшается ===== */
  function notifs(list) {
    if (!once(list, 'da')) return;
    const cnt = list.dataset.count && document.getElementById(list.dataset.count);
    const sync = () => cnt && setCount(cnt, list.querySelectorAll('.notif:not(.read)').length);
    list.addEventListener('click', (e) => { const n = e.target.closest('.notif'); if (n) { n.classList.add('read'); sync() } });
    list.readAll = () => { list.querySelectorAll('.notif').forEach((n) => n.classList.add('read')); sync() };
    sync();
  }

  window.initData = (root = document) => {
    const each = (s, f) => root.querySelectorAll(s).forEach(f);
    each('.acc', acc); each('.dt', dt); each('.chart[data-values]', chart); each('svg.spark[data-values]', spark); each('.cmts', cmts);
    each('.code[data-tabs]', codeTabs); each('.banner-w', banner); each('.notifs', notifs);
    each('.count[data-n]', (c) => { const n = +c.dataset.n; c.dataset.n = 0; setCount(c, n) });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initData()); else initData();
})();
