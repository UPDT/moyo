/* Лендинг Moyo: поведение страницы. Компоненты (сегменты, вкладки, аккордеон, тема, график) — из библиотеки js/. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  try { lucide.createIcons() } catch (e) {}

  /* ===== Сцена первого экрана: камень ставят на доску, телефон ловит его рамкой и записывает ход =====
     Камень опускается на точку чуть со стороны игрока (чёрные — с ближней, белые — с дальней), тень на доске собирается, пока он опускается,
     в конце — короткое проскальзывание и посадка. Прозрачность — только у дисков камня: у контейнера с preserve-3d она сплющивает объём. Через полсекунды на экране телефона рамка распознавания, потом камень и подпись хода.
     Цикл: 10 ходов, пауза, партия гаснет целиком, снова с первого хода. Вне экрана и на скрытой вкладке цикл стоит.
     При «меньше движения» — готовый кадр с позицией. */
  const hs = $('.hs');
  if (hs) {
    const moves = [[4, 4], [6, 2], [2, 6], [6, 6], [2, 2], [5, 5], [5, 6], [6, 4], [3, 3], [4, 6]];
    const cols = 'ABCDEFGHJ';
    const NS = 'http://www.w3.org/2000/svg';
    const bWrap = $('.hs-stones', hs), pWrap = $('.hp-stones', hs), last = $('.hp-last', hs), focus = $('.hp-focus', hs);
    const nEl = $('.hp-n', hs), mvEl = $('.hp-mv', hs);
    const bSt = [], pSt = [];
    moves.forEach(([c, r], i) => {
      const color = i % 2 ? 'w' : 'b';
      const s = document.createElement('i');
      s.className = 'hs-stn ' + color; s.style.setProperty('--x', 10 + c * 10 + '%'); s.style.setProperty('--y', 10 + r * 10 + '%');
      s.innerHTML = '<i class="sh"></i><i class="bd"><i class="ed"></i><i class="fc"></i></i>';
      bWrap.append(s); bSt.push(s);
      const p = document.createElementNS(NS, 'circle');
      p.setAttribute('cx', 20 + c * 20); p.setAttribute('cy', 20 + r * 20); p.setAttribute('r', 9); p.setAttribute('class', color);
      pWrap.append(p); pSt.push(p);
    });
    const setText = (el, t, quiet) => {
      if (el.textContent === t) return;
      if (quiet) { el.textContent = t; return }
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out' }).onfinish = () => {
        el.textContent = t; el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      };
    };
    const SH = 'translate(9%, 11%) translateZ(.05px)';
    const place = (i) => {
      const s = bSt[i], sh = s.children[0], bd = s.children[1], disc = [...bd.children];
      // камень опускается на точку чуть со стороны игрока: чёрные с ближней стороны, белые с дальней
      const side = i % 2 ? -1 : 1, dx = side * (8 + (i * 7) % 12), dy = side * 45;
      const ease = 'cubic-bezier(.3, 0, .2, 1)';
      s.classList.add('on');
      // полупрозрачным бывает только верх: два полупрозрачных диска просвечивают друг через друга «призраком»
      disc[1].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      disc[0].animate([{ opacity: 0 }, { opacity: 0, offset: .99 }, { opacity: 1 }], { duration: 160 });
      bd.animate([
        { transform: `translate3d(${dx}%, ${dy}%, 7cqw)` },
        { transform: 'translate3d(0, 0, .25cqw)', offset: .7 },
        { transform: `translate3d(${-dx * .06}%, ${-dy * .06}%, 0)`, offset: .86 },
        { transform: 'translate3d(0, 0, 0)' },
      ], { duration: 560, easing: ease });
      sh.animate([
        { transform: `translate(${9 + dx * .6}%, ${11 + dy * .6}%) translateZ(.05px) scale(1.6)`, opacity: 0 },
        { transform: SH + ' scale(1)', opacity: 1, offset: .7 },
        { transform: SH, opacity: 1 },
      ], { duration: 560, easing: ease });
    };
    // конец партии: камни уходят по одному, последний поставленный — первым, с лёгким подъёмом
    const clearBoard = () => {
      const anims = [];
      bSt.slice().reverse().forEach((s, k) => {
        const i = bSt.length - 1 - k, side = i % 2 ? -1 : 1;
        const sh = s.children[0], bd = s.children[1], [ed, fc] = bd.children;
        const o = { duration: 480, delay: k * 60, easing: 'cubic-bezier(.4, 0, .7, 1)', fill: 'forwards' };
        anims.push(bd.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${side * 10}%, ${side * 70}%, 6cqw)` }], o));
        anims.push(ed.animate([{ opacity: 1 }, { opacity: 0, offset: .01 }, { opacity: 0 }], o));
        anims.push(fc.animate([{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], o));
        anims.push(sh.animate([{ opacity: 1 }, { opacity: 0, offset: .6 }, { opacity: 0 }], o));
      });
      return anims;
    };
    const lock = (i) => {
      const [c, r] = moves[i], x = 20 + c * 20, y = 20 + r * 20;
      focus.animate([
        { transform: `translate(${x}px, ${y}px) scale(1.9)`, opacity: 0 },
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1, offset: .35 },
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1, offset: .75 },
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 0 },
      ], { duration: 760, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    };
    const showOnPhone = (i, quiet) => {
      const [c, r] = moves[i];
      pSt[i].classList.add('on');
      last.style.transform = `translate(${20 + c * 20}px, ${20 + r * 20}px)`; last.classList.add('on');
      setText(nEl, 'Ход ' + (i + 1), quiet);
      setText(mvEl, (i % 2 ? 'Белые ' : 'Чёрные ') + cols[c] + (9 - r), quiet);
    };

    if (reduce.matches) {
      bSt.forEach((s) => s.classList.add('on')); pSt.forEach((s) => s.classList.add('on'));
      showOnPhone(moves.length - 1, true);
    } else {
      // шаги цикла: [задержка до шага, действие]
      let step = 0, t = null, visible = false, fades = [];
      const plan = [];
      moves.forEach((_, i) => {
        plan.push([i ? 640 : 700, () => place(i)]);
        plan.push([420, () => lock(i)]);
        plan.push([420, () => showOnPhone(i)]);
      });
      plan.push([2800, () => {
        hs.classList.add('clr');
        fades = clearBoard();
        pSt.forEach((s) => s.classList.remove('on')); last.classList.remove('on');
      }]);
      plan.push([1100, () => {
        bSt.forEach((s) => s.classList.remove('on')); fades.forEach((a) => a.cancel()); fades = [];
        hs.classList.remove('clr'); setText(nEl, 'Ход 0'); setText(mvEl, 'Ждём ход');
      }]);
      const tick = () => {
        const [, fn] = plan[step]; fn();
        step = (step + 1) % plan.length;
        t = setTimeout(tick, plan[step][0]);
      };
      const run = (on) => {
        if (on === visible) return; visible = on;
        hs.classList.toggle('paused', !on);
        clearTimeout(t);
        if (on) t = setTimeout(tick, Math.min(plan[step][0], 500));
      };
      let inView = false;
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; run(inView && !document.hidden) }).observe(hs);
      document.addEventListener('visibilitychange', () => run(inView && !document.hidden));
    }
  }

  /* ===== Кнопки Telegram-канала =====
     Ссылку на канал вписать сюда, и все кнопки с data-tg (шапка, меню, первый экран, финал, подвал) поведут в канал.
     Пока ссылки нет, кнопки ведут к финалу страницы. */
  const TG_URL = '';
  if (TG_URL) $$('[data-tg]').forEach((a) => { a.href = TG_URL; a.target = '_blank'; a.rel = 'noopener' });
})();
