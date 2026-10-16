// space.grapefruit 游標：平常是會換的星球（每 3 秒換一顆），移到能點的東西上變葡萄柚，點下去葡萄柚被切開。
// 只在有滑鼠的裝置開；手機、平板不動。畫風參考 Discord〈Cauldron Chaos〉：粗深色描邊、糖果霓虹色、四角星閃光。
(function () {
  var O = '#2a1630';                 // 描邊
  var C = {
    pink: '#ff7eb6', blush: '#ff9cc9', cyan: '#73e6f5', lime: '#c8f56b', yellow: '#ffe066',
    lilac: '#b8a2ff', peach: '#ffb58a', fruit: '#ff8a6b', pith: '#fff1e6', white: '#ffffff', navy: '#7d9bff'
  };
  var S = 'stroke="' + O + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  function spark(x, y, r, fill) {
    return '<path d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z" fill="' + (fill || C.white) + '" stroke="' + (fill || C.white) + '" stroke-width="1" stroke-linejoin="round"/>';
  }
  function face(x, y, mood) {
    var eyes = mood === 'sleep'
      ? '<path d="M' + (x - 8) + ' ' + y + 'q2.5 2.5 5 0M' + (x + 3) + ' ' + y + 'q2.5 2.5 5 0" fill="none" stroke="' + O + '" stroke-width="2.2" stroke-linecap="round"/>'
      : '<ellipse cx="' + (x - 5.5) + '" cy="' + y + '" rx="2" ry="2.6" fill="' + O + '"/><ellipse cx="' + (x + 5.5) + '" cy="' + y + '" rx="2" ry="2.6" fill="' + O + '"/>' +
        '<circle cx="' + (x - 4.8) + '" cy="' + (y - 1) + '" r=".8" fill="#fff"/><circle cx="' + (x + 6.2) + '" cy="' + (y - 1) + '" r=".8" fill="#fff"/>';
    return eyes +
      '<ellipse cx="' + (x - 10) + '" cy="' + (y + 4.5) + '" rx="3.2" ry="2" fill="' + C.blush + '" opacity=".9"/>' +
      '<ellipse cx="' + (x + 10) + '" cy="' + (y + 4.5) + '" rx="3.2" ry="2" fill="' + C.blush + '" opacity=".9"/>' +
      '<path d="M' + (x - 2.5) + ' ' + (y + 4) + 'q1.25 1.6 2.5 0q1.25 1.6 2.5 0" fill="none" stroke="' + O + '" stroke-width="1.8" stroke-linecap="round"/>';
  }
  function svg(body) { return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'; }

  var rays = '';
  for (var i = 0; i < 8; i++) rays += '<path d="M32 4l5 9h-10z" fill="' + C.peach + '" ' + S + ' transform="rotate(' + (i * 45) + ' 32 32)"/>';

  var planets = [
    ['太陽', svg(rays + '<circle cx="32" cy="32" r="16" fill="' + C.yellow + '" ' + S + '/>' + face(32, 32) + spark(53, 52, 5, C.pink))],
    ['月亮', svg('<path d="M40 10a22 22 0 1 0 14 34a18 18 0 0 1 -14 -34z" fill="' + C.yellow + '" ' + S + '/>' + face(26, 34, 'sleep') + spark(50, 14, 6, C.cyan) + spark(56, 28, 3.5))],
    ['地球', svg('<circle cx="32" cy="32" r="20" fill="' + C.cyan + '" ' + S + '/><path d="M16 26q6-8 12-4t2 8q-6 2-9 0zM38 44q4-6 10-4t1 6q-6 3-11-2z" fill="' + C.lime + '" ' + S.replace('3"', '2"') + '/>' + face(32, 33) + spark(54, 12, 5, C.yellow))],
    ['木星', svg('<circle cx="32" cy="32" r="21" fill="' + C.peach + '" ' + S + '/><path d="M13 24h38M12 40h40" stroke="' + C.pink + '" stroke-width="4" stroke-linecap="round"/><ellipse cx="44" cy="44" rx="5" ry="3" fill="' + C.pink + '" ' + S.replace('3"', '2"') + '/><circle cx="32" cy="32" r="21" fill="none" ' + S + '/>' + face(30, 31) + spark(10, 10, 5, C.cyan))],
    ['土星', svg('<ellipse cx="32" cy="34" rx="29" ry="9" fill="none" stroke="' + O + '" stroke-width="7" transform="rotate(-14 32 34)"/><ellipse cx="32" cy="34" rx="29" ry="9" fill="none" stroke="' + C.pink + '" stroke-width="3.5" transform="rotate(-14 32 34)"/><circle cx="32" cy="32" r="16" fill="' + C.lilac + '" ' + S + '/><path d="M4.6 41.5a29 9 -14 0 0 54.8 -13.6" fill="none" stroke="' + O + '" stroke-width="7"/><path d="M4.6 41.5a29 9 -14 0 0 54.8 -13.6" fill="none" stroke="' + C.pink + '" stroke-width="3.5"/>' + face(32, 30) + spark(52, 10, 5, C.yellow))],
    ['海王星', svg('<circle cx="32" cy="32" r="20" fill="' + C.navy + '" ' + S + '/><path d="M18 22q8-4 16 0M30 46q8 3 16-2" fill="none" stroke="' + C.cyan + '" stroke-width="3" stroke-linecap="round"/>' + face(32, 33) + spark(52, 52, 5, C.pink) + spark(12, 12, 3.5))],
    ['天王星', svg('<ellipse cx="32" cy="32" rx="8" ry="28" fill="none" stroke="' + O + '" stroke-width="7"/><ellipse cx="32" cy="32" rx="8" ry="28" fill="none" stroke="' + C.lime + '" stroke-width="3.5"/><circle cx="32" cy="32" r="16" fill="' + C.cyan + '" ' + S + '/><path d="M32 4a8 28 0 0 1 0 56" fill="none" stroke="' + O + '" stroke-width="7"/><path d="M32 4a8 28 0 0 1 0 56" fill="none" stroke="' + C.lime + '" stroke-width="3.5"/>' + face(31, 32) + spark(52, 14, 5, C.pink))],
    ['冥王星', svg('<circle cx="32" cy="34" r="15" fill="' + C.blush + '" ' + S + '/><path d="M38 38c-2-3 2-6 4-3c2-3 6 0 4 3l-4 4z" fill="' + C.pith + '" ' + S.replace('3"', '2"') + '/>' + face(28, 31) + spark(14, 14, 6, C.yellow) + spark(52, 14, 4, C.cyan) + spark(50, 54, 3))],
    ['流星', svg('<path d="M8 56L34 30" stroke="' + C.pink + '" stroke-width="9" stroke-linecap="round"/><path d="M12 60L36 36" stroke="' + C.cyan + '" stroke-width="5" stroke-linecap="round"/><path d="M4 50L30 26" stroke="' + C.lime + '" stroke-width="4" stroke-linecap="round"/><path d="M42 8l4.5 9.5 10.5 1.4-7.6 7.3 1.9 10.4L42 31.6l-9.3 5 1.9-10.4-7.6-7.3 10.5-1.4z" fill="' + C.yellow + '" ' + S + '/>' + face(42, 22) + spark(16, 14, 5, C.white))]
  ];

  // 葡萄柚：整顆（滑到能點的東西上）跟切開的兩半（點下去）
  var whole = svg('<path d="M32 10q4-8 12-6q-2 8-12 6z" fill="' + C.lime + '" ' + S + '/><circle cx="32" cy="35" r="22" fill="' + C.fruit + '" ' + S + '/><circle cx="24" cy="26" r="2" fill="#fff" opacity=".7"/><circle cx="20" cy="31" r="1.2" fill="#fff" opacity=".7"/>' + face(32, 37) + spark(56, 14, 5, C.yellow) + spark(8, 52, 3.5, C.cyan));
  var segs = '';
  for (var k = 0; k < 8; k++) segs += '<path d="M32 33L32 16.5Q38.5 17.5 43.7 21.3Z" fill="' + C.fruit + '" stroke="' + C.pith + '" stroke-width="1.6" stroke-linejoin="round" transform="rotate(' + (k * 45) + ' 32 33)"/>';
  var half = svg('<circle cx="32" cy="33" r="21" fill="' + C.pith + '" ' + S + '/><circle cx="32" cy="33" r="17.5" fill="' + C.fruit + '"/>' + segs + '<circle cx="32" cy="33" r="2.5" fill="' + C.pith + '"/><circle cx="32" cy="33" r="21" fill="none" ' + S + '/>');

  window.SG_CURSOR_ART = { planets: planets, whole: whole, half: half };

  // 「女巫星塵」那種光：星球外圍一圈會輪流閃的四角星，慢慢轉；移動時沿路撒星塵
  var DUST = [C.pink, C.cyan, C.yellow, C.lime, C.lilac, C.white];
  function star(color) {
    return '<svg viewBox="-10 -10 20 20"><path d="M0-9Q0 0 9 0Q0 0 0 9Q0 0-9 0Q0 0 0-9Z" fill="' + color + '"/></svg>';
  }

  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var touchDemo = !fine && window.SG_CURSOR_TOUCH;   // 只有預覽版會開：手機上手指按住拖，看得到游標效果
  if ((!fine && !touchDemo) || window.SG_CURSOR_PREVIEW) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.createElement('div');
  el.className = 'sg-cursor';
  el.setAttribute('aria-hidden', 'true');
  var halo = '';
  for (var h = 0; h < 8; h++) halo += '<span style="--a:' + (h * 45) + 'deg;--d:' + (h * 0.22) + 's">' + star(DUST[h % DUST.length]) + '</span>';
  el.innerHTML = '<div class="sg-halo">' + halo + '</div><div class="sg-art"></div>';
  document.body.appendChild(el);
  var art = el.querySelector('.sg-art');

  var idx = 0, overLink = false, shown = false, lastDust = 0, alive = 0;
  function paint() { art.innerHTML = overLink ? whole : planets[idx][1]; el.classList.toggle('is-fruit', overLink); }
  paint();
  setInterval(function () { idx = (idx + 1) % planets.length; if (!overLink) paint(); }, 3000);

  var CLICKABLE = 'a[href], button, summary, label, input, select, textarea, [role="button"], [data-copy]';
  var LIFT = touchDemo ? -64 : 0;     // 手機上把圖案畫在手指上方；電腦上圖案跟在系統游標的右下角（CSS 的 margin）
  function moveTo(x, y, target) {
    el.style.transform = 'translate3d(' + x + 'px,' + (y + LIFT) + 'px,0)';
    if (!shown) { shown = true; el.classList.add('on'); }
    var o = !!(target && target.closest && target.closest(CLICKABLE));
    if (o !== overLink) { overLink = o; paint(); }
    var now = performance.now();
    if (!reduce && now - lastDust > 40 && alive < 28) { lastDust = now; dust(x, y + LIFT); }
  }
  function dust(x, y) {
    var d = document.createElement('i');
    d.className = 'sg-dust';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = star(DUST[(Math.random() * DUST.length) | 0]);
    var s = 6 + Math.random() * 8;
    d.style.cssText = 'left:' + (x + (Math.random() * 16 - 8)) + 'px;top:' + (y + (Math.random() * 16 - 8)) + 'px;width:' + s + 'px;height:' + s + 'px;' +
      '--dx:' + (Math.random() * 30 - 15) + 'px;--dy:' + (10 + Math.random() * 24) + 'px';
    document.body.appendChild(d); alive++;
    setTimeout(function () { d.remove(); alive--; }, 800);
  }
  function hide() { shown = false; el.classList.remove('on'); }

  document.addEventListener('pointermove', function (e) {
    if (fine ? e.pointerType !== 'touch' : e.pointerType === 'touch') moveTo(e.clientX, e.clientY, e.target);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', hide);

  function slice(x, y) {
    var burst = document.createElement('div');
    burst.className = 'sg-slice' + (reduce ? ' still' : '');
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = x + 'px'; burst.style.top = y + 'px';
    burst.innerHTML = '<i class="l">' + half + '</i><i class="r">' + half + '</i>' +
      '<b class="d1"></b><b class="d2"></b><b class="d3"></b><b class="d4"></b>';
    document.body.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 750);
  }
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (touchDemo && e.pointerType === 'touch') moveTo(e.clientX, e.clientY, e.target);
    slice(e.clientX, e.clientY + LIFT);
  });
  if (touchDemo) {
    var t;
    document.addEventListener('pointerup', function () { clearTimeout(t); t = setTimeout(hide, 900); });
    document.addEventListener('pointercancel', function () { clearTimeout(t); t = setTimeout(hide, 900); });
  }
})();
