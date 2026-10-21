// 首頁的角色段（#cards）：一段很高的捲動軌道，裡面釘住一個舞台，鏡頭像走樓梯。
//   ① 黃昏的城市：一串彗星從左上劃進來，CHARACTERS 是一棟一棟沒點燈的大樓，帶頭的彗星像皮克斯開場一樣在三個字母上跳，
//      跳到哪個字母就從第一棟亮到那一棟，第三下之後全亮。每次回到這一段都重播。
//   ② 往下捲：大樓各自用不同的速度往上飄散，暖光從地平線漫上來，天亮成網頁的底色。
//   ③ 鏡頭直直往下翻到下一頁，一顆彗星落在第一行的第一個字，字從左到右升上來；之後四行字句子永遠在畫面正中間、只橫移，
//      換行時鏡頭直直往下。每一行的開頭跟結尾都有吸附點（不管捲多快都會先停在那裡）。
//   四行字是影片標題（.ft，main.js filmTitles 畫字、升起、被滑鼠戳），這裡只管鏡頭、大樓、彗星。聲音用 sfx.js。
(function () {
  var track = document.querySelector('.cast-track');
  if (!track) return;
  var stage = track.querySelector('.ct-stage'), plane = track.querySelector('.ct-plane'), cvs = track.querySelector('.ct-scene');
  var lines = Array.prototype.slice.call(track.querySelectorAll('.ct-line'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function sfx(name) { var S = window.SG_SFX; if (S && S[name]) S[name].apply(null, Array.prototype.slice.call(arguments, 1)); }
  function penta(i) { return (window.SG_SFX ? SG_SFX.PENTA : [587.3, 659.3, 740, 880, 987.8, 1174.7, 1318.5, 1480, 1760, 1975.5])[i % 10]; }

  // 網頁底色（白天、夜晚不一樣）：天亮最後要接到它，不然會有一條分界
  var BG = [255, 244, 239];
  function readBg() {
    var p = document.createElement('i'); p.style.cssText = 'position:absolute;width:1px;height:1px;background:var(--bg)'; document.body.appendChild(p);
    var c = document.createElement('canvas'); c.width = c.height = 1; var cx = c.getContext('2d');
    cx.fillStyle = getComputedStyle(p).backgroundColor; cx.fillRect(0, 0, 1, 1); p.remove();
    var d = cx.getImageData(0, 0, 1, 1).data; BG = [d[0], d[1], d[2]];
  }
  function bg(a) { return 'rgba(' + BG[0] + ',' + BG[1] + ',' + BG[2] + ',' + a + ')'; }

  // =================== ① 黃昏的城市：CHARACTERS 是一棟一棟的大樓 ===================
  var x = cvs.getContext('2d'), WORD = 'CHARACTERS', S = 2.1;
  var SW = 0, SH = 0, dpr = 1, ground = 0, letters = [], stars = [], comets = [], sparks = [], lead = null, lastSeg = -1, drift = 0;
  function buildScene() {
    var W = stage.clientWidth, H = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    SW = Math.round(W * 1.7); SH = H;                    // 天空比螢幕寬，左右邊緣淡掉，鏡頭往右走時溶進底色
    cvs.width = SW * dpr; cvs.height = SH * dpr; cvs.style.width = SW + 'px'; cvs.style.height = SH + 'px';
    cvs.style.left = (-SW / 2) + 'px'; cvs.style.top = (-SH / 2) + 'px';
    ground = SH * .8;
    S = W < H ? 3.4 : 2.1;                               // 直的螢幕字寬先被限制住，拉得更長才像大樓
    x.font = '900 100px "Big Shoulders Display"';
    // 圓頂的字母（C、S）比平頂的高一點、底下也超出基線一點：照整個字最高、最低的那個字母算，頭頂才不會被切掉
    var asc100 = 0, desc100 = 0;
    Array.from(WORD).forEach(function (ch) { var m = x.measureText(ch); asc100 = Math.max(asc100, m.actualBoundingBoxAscent || 72); desc100 = Math.max(desc100, m.actualBoundingBoxDescent || 0); });
    var w100 = x.measureText(WORD).width, gap = .045;
    var fs = Math.min(W * .88 / (w100 / 100 * (1 + gap * 1.2)), H * .58 / (asc100 / 100 * S));
    x.font = '900 ' + fs + 'px "Big Shoulders Display"';
    var asc = asc100 * fs / 100, desc = desc100 * fs / 100;
    var widths = Array.from(WORD).map(function (ch) { return x.measureText(ch).width; }), sp = fs * gap;
    var total = widths.reduce(function (s, w) { return s + w; }, 0) + sp * (WORD.length - 1), lx = SW / 2 - total / 2;
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var Q = dpr;                                          // 大樓的小畫布也照螢幕解析度畫（Retina 才不會糊）
    function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.ceil(w * Q); c.height = Math.ceil(h * Q); var g = c.getContext('2d', { willReadFrequently: true }); g.scale(Q, Q); return [c, g]; }
    letters = Array.from(WORD).map(function (ch, i) {
      var w = widths[i], pad = 6, cw = Math.ceil(w + pad * 2), chh = Math.ceil((asc + desc) * S + pad * 2), by = chh - pad - desc * S;
      var mm = mk(cw, chh), m = mm[0], mx = mm[1];
      mx.font = x.font; mx.fillStyle = '#000'; mx.save(); mx.translate(pad, by); mx.scale(1, S); mx.fillText(ch, 0, 0); mx.restore();
      var md = mx.getImageData(0, 0, m.width, m.height).data, mw = m.width;
      function inside(px, py) { px = Math.round(px * Q); py = Math.round(py * Q); return px >= 0 && py >= 0 && px < mw && py < m.height && md[(py * mw + px) * 4 + 3] > 200; }
      // 屋頂跟左邊接到一點天光：先畫亮一點的一層往左上偏，再把本體蓋上去
      var rr = mk(cw, chh), rim = rr[0], rx = rr[1]; rx.drawImage(m, 0, 0, cw, chh); rx.globalCompositeOperation = 'source-in'; rx.fillStyle = '#6f7f9c'; rx.fillRect(0, 0, cw, chh);
      var oo = mk(cw, chh), body = oo[0], ox = oo[1]; ox.drawImage(m, 0, 0, cw, chh); ox.globalCompositeOperation = 'source-in';
      var gr = ox.createLinearGradient(0, 0, 0, chh); gr.addColorStop(0, '#141a28'); gr.addColorStop(1, '#090c14');
      ox.fillStyle = gr; ox.fillRect(0, 0, cw, chh);
      var bb = mk(cw, chh), b = bb[0], bx = bb[1];
      bx.drawImage(rim, -1, -1.5, cw, chh); bx.drawImage(body, 0, 0, cw, chh);
      bx.globalCompositeOperation = 'source-atop';
      var wx = Math.max(2.5, fs * .034), wy = wx * 1.5, gx = wx * .85, gy = wy * .7, wins = [];
      for (var yy = by - wy * 1.6; yy > wy; yy -= wy + gy) for (var xx = pad + gx * .6; xx + wx < cw - pad; xx += wx + gx) {
        if (inside(xx, yy) && inside(xx + wx, yy) && inside(xx, yy + wy) && inside(xx + wx, yy + wy)) wins.push({ x: xx, y: yy, w: wx, h: wy, o: rnd(), dark: rnd() < .14, ph: rnd() * 6.28 });
      }
      bx.fillStyle = 'rgba(150,170,205,.09)';
      wins.forEach(function (q) { bx.fillRect(q.x, q.y, q.w, q.h); });
      var top = 0; for (var ty = 0; ty < m.height && !top; ty++) for (var tx = 0; tx < mw; tx++) if (md[(ty * mw + tx) * 4 + 3] > 200) { top = ty / Q; break; }
      var L = { x: lx, w: w, cw: cw, chh: chh, by: by, pad: pad, base: b, wins: wins, top: top, light: -1, lightAt: 0, sq: 0, sv: 0, lift: 0, lv: 0, hoverAt: 0,
        antenna: /[HTERA]/.test(ch) && rnd() < .55 ? fs * (.12 + rnd() * .12) : 0, blink: rnd() * 6, rise: .55 + rnd() * 1.1, spin: (rnd() - .5) * 14 };
      lx += w + sp;
      return L;
    });
    stars = []; for (var k = 0; k < 90; k++) stars.push({ x: Math.random() * SW, y: Math.random() * ground * .7, r: Math.random() * 1.2 + .2, p: Math.random() * 6.28 });
    if (reduce) letters.forEach(function (L) { L.light = 1; L.lightAt = -1e9; });
  }
  function letterTop(L) { return { x: L.x + L.w / 2, y: ground - L.by + L.top }; }
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function lightUpTo(k, now) {                             // 從第一棟亮到第 k 棟（還沒亮的才亮，一棟接一棟）
    var n = 0;
    letters.forEach(function (L, i) { if (i <= k && L.light < 0) { L.light = 1; L.lightAt = now + n * 90; later(function () { sfx('spark', .5); }, n * 90); n++; } });
  }
  function pickHops() {                                    // 三個落點，每次不一樣、左到右遞增（例如 h、t、s 或 c、a、t）
    var n = WORD.length, a = Math.floor(Math.random() * 3), b = Math.min(a + 2 + Math.floor(Math.random() * 3), n - 3), c = Math.max(b + 1, Math.min(n - 1, b + 2 + Math.floor(Math.random() * (n - b - 2))));
    return [a, b, c];
  }
  function play() {
    if (reduce || !letters.length) return;
    var now = performance.now();
    timers.forEach(clearTimeout); timers = [];
    dsm = drift = 0;                                       // 從下面跳回來時大樓直接站好，不要邊往下飄邊被彗星撞
    letters.forEach(function (L) { L.light = -1; L.lightAt = 0; });
    comets = []; sparks = [];
    var W = stage.clientWidth, off = SW / 2 - W / 2;
    for (var i = 0; i < 6; i++) {
      var sp = (.9 + Math.random() * .5) * W / 900;
      comets.push({ x: off - 60 - i * 70 - Math.random() * 60, y: -40 - i * 26 - Math.random() * 30, vx: 9.5 * sp, vy: 4.2 * sp + Math.random() * 1.2, tr: [], life: 1, r: 1.2 + Math.random() * 1.4, born: now + i * 70 });
    }
    var hops = pickHops();
    lead = { hops: hops, pts: hops.map(function (k) { return letterTop(letters[k]); }), from: { x: off - 40, y: -60 }, t0: now + 160, tr: [], done: false };
    lastSeg = -1;
    sfx('whoosh', 1.4, .5);
  }
  var SEG = [900, 620, 620, 900];
  function leadPos(now) {                                   // 帶頭的彗星：劃到第一個落點，一跳一跳到第二、第三個，再往右上飛走
    var t = now - lead.t0, acc = 0;
    for (var s = 0; s < SEG.length; s++) {
      if (t < acc + SEG[s]) {
        var u = Math.max(0, (t - acc) / SEG[s]), a, b, peak;
        if (s === 0) { a = lead.from; b = lead.pts[0]; return { s: s, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * (u * u) }; }
        if (s < 3) { a = lead.pts[s - 1]; b = lead.pts[s]; peak = Math.min(a.y, b.y) - SH * .22; }
        else { a = lead.pts[2]; b = { x: a.x + SW * .3, y: -80 }; peak = Math.min(a.y, b.y) - SH * .1; }
        var cy = peak * 2 - (a.y + b.y) / 2;
        return { s: s, x: a.x + (b.x - a.x) * u, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y };
      }
      acc += SEG[s];
    }
    return null;
  }
  function burst(p) { for (var i = 0; i < 18; i++) { var a = -Math.PI * (.1 + Math.random() * .8), v = 2 + Math.random() * 4; sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 }); } }
  function trail(c, tr, r, alpha) {
    if (alpha <= 0 || tr.length < 2) return;
    for (var i = tr.length - 1; i > 0; i--) {
      var k = 1 - i / tr.length;
      c.strokeStyle = 'rgba(255,' + Math.round(200 + 50 * k) + ',' + Math.round(140 + 100 * k) + ',' + (k * .55 * alpha) + ')';
      c.lineWidth = r * 2 * k + .4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(tr[i].x, tr[i].y); c.lineTo(tr[i - 1].x, tr[i - 1].y); c.stroke();
    }
    var h = tr[0], gr = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 7);
    gr.addColorStop(0, 'rgba(255,255,255,' + alpha + ')'); gr.addColorStop(.25, 'rgba(255,230,180,' + (.6 * alpha) + ')'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(h.x, h.y, r * 7, 0, 6.3); c.fill();
  }
  function drawScene(now) {
    if (reduce) now = 0;                                   // 減少動態：星星、警示燈、窗戶都不閃
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, SW, SH);
    if (drift >= 1) return;
    // 大樓飄散時像日出：暖光從地平線往上漫，把深藍蓋過去（直接混色會經過一片灰）
    var dawn = smooth((drift - .12) / .88), fade = 1 - smooth((drift - .45) / .55);
    var g = x.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, '#151d31'); g.addColorStop(.45, '#2d3b58'); g.addColorStop(.72, '#55657f'); g.addColorStop(.795, '#c4956a'); g.addColorStop(.8, '#0b0f18'); g.addColorStop(1, '#080b12');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    if (dawn > 0) {
      var edge = SH * (1.05 - dawn * 1.6), soft = SH * .45, w = x.createLinearGradient(0, edge - soft, 0, edge + soft * .6);
      var dark = BG[0] + BG[1] + BG[2] < 300;               // 深色模式：暖光調暗
      w.addColorStop(0, bg(0)); w.addColorStop(.35, dark ? 'rgba(120,84,70,.6)' : 'rgba(245,214,182,.75)'); w.addColorStop(.7, dark ? 'rgba(96,66,56,1)' : 'rgba(240,196,150,1)'); w.addColorStop(1, bg(1));
      x.fillStyle = w; x.fillRect(0, edge - soft, SW, SH - edge + soft);
      if (edge + soft * .6 < SH) { x.fillStyle = bg(1); x.fillRect(0, edge + soft * .6, SW, SH); }
    }
    stars.forEach(function (s) { x.globalAlpha = (1 - dawn) * (.35 + .35 * Math.sin(now / 900 + s.p)); x.fillStyle = '#e8eefc'; x.fillRect(s.x, s.y, s.r, s.r); });
    x.globalAlpha = fade;
    if (lead && !lead.done) {
      var p = leadPos(now);
      if (!p) { lead.done = true; lead.doneAt = now; }
      else {
        if (p.s !== lastSeg) {                             // 落在字母上的那一下
          if (p.s >= 1 && p.s <= 3) {
            var k = lead.hops[p.s - 1];
            letters[k].sv -= 9; burst(lead.pts[p.s - 1]);
            sfx('tink', penta([2, 4, 7][p.s - 1]), .4, 1.6); sfx('thump', .32);
            lightUpTo(k, now);
            if (p.s === 3) later(function () {
              lightUpTo(WORD.length - 1, performance.now());
              [1174.7, 1480, 1760].forEach(function (f, i) { later(function () { sfx('tink', f, .13, 2.2); }, i * 110); });
            }, 380);
          }
          lastSeg = p.s;
        }
        lead.tr.unshift({ x: p.x, y: p.y }); if (lead.tr.length > 28) lead.tr.pop();
      }
    }
    letters.forEach(function (L) {
      L.sv += (-L.sq * 260 - L.sv * 15) / 60; L.sq += L.sv / 60;
      L.lv += ((L.hover ? 1 : 0) - L.lift) * 4 / 60 - L.lv * .2; L.lift += L.lv;
      var up = smooth(drift) * L.rise * SH * 1.15, la = clamp(1 - drift * L.rise * 1.1, 0, 1);   // 往上飄散：每棟速度、轉的角度都不一樣
      if (la <= 0) return;
      x.save();
      x.globalAlpha = fade * la;
      x.translate(L.x + L.cw / 2 - L.pad, ground - L.lift * SH * .008 - up);
      x.rotate(L.spin * smooth(drift) * Math.PI / 180);
      x.scale(1 - L.sq * .05, 1 + L.sq * .09);
      x.translate(-L.cw / 2, -L.by);
      x.drawImage(L.base, 0, 0, L.cw, L.chh);
      if (L.antenna) {                                     // 屋頂的天線＋航空警示燈
        var ax = L.cw / 2, ay = L.top;
        x.strokeStyle = '#1b2233'; x.lineWidth = 2; x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax, ay - L.antenna); x.stroke();
        var bl = (Math.sin(now / 520 + L.blink) + 1) / 2;
        x.fillStyle = 'rgba(255,90,70,' + (.25 + bl * .75) + ')'; x.beginPath(); x.arc(ax, ay - L.antenna, 2.2, 0, 6.3); x.fill();
      }
      var hov = L.hoverAt ? Math.max(0, 1 - (now - L.hoverAt) / 700) : 0;
      if (L.light > 0 || hov) {                            // 窗戶一格一格打開，剛亮時閃兩下；滑過去整棟閃一下
        var since = now - L.lightAt;
        x.globalCompositeOperation = 'lighter';
        L.wins.forEach(function (q) {
          var on = L.light > 0 ? since - q.o * 520 : -1, a = 0;
          if (on > 0 && !q.dark) a = on < 60 ? .9 : on < 110 ? .15 : on < 170 ? 1 : .78 + .08 * Math.sin(now / 1300 + q.ph);
          if (L.light <= 0) a = q.o < .35 ? hov * .55 : 0;
          else a = Math.min(1, a + hov * .35);
          if (a <= 0) return;
          x.fillStyle = 'rgba(255,196,120,' + (a * .16) + ')'; x.fillRect(q.x - q.w * .6, q.y - q.h * .4, q.w * 2.2, q.h * 1.8);
          x.fillStyle = 'rgba(255,214,150,' + a + ')'; x.fillRect(q.x, q.y, q.w, q.h);
        });
        x.globalCompositeOperation = 'source-over';
      }
      x.restore();
      if (drift < .05) { x.save(); x.globalAlpha = .1 * fade; x.translate(L.x - L.pad, ground + 2); x.scale(1, -.35); x.drawImage(L.base, 0, -L.by, L.cw, L.chh); x.restore(); }
    });
    x.globalAlpha = fade;
    x.globalCompositeOperation = 'lighter';
    comets.forEach(function (c) {
      if (now < c.born) return;
      c.x += c.vx; c.y += c.vy; c.vy += .02; c.life -= .006;
      c.tr.unshift({ x: c.x, y: c.y }); if (c.tr.length > 34) c.tr.pop();
      trail(x, c.tr, c.r, Math.max(0, c.life) * fade);
    });
    comets = comets.filter(function (c) { return c.life > 0 && c.x < SW + 200; });
    if (lead && lead.tr.length) trail(x, lead.tr, 2.6, (lead.done ? Math.max(0, 1 - (now - lead.doneAt) / 400) : 1) * fade);
    sparks.forEach(function (s) { s.x += s.vx; s.y += s.vy; s.vy += .18; s.life -= .022; x.fillStyle = 'rgba(255,226,170,' + Math.max(0, s.life) * fade + ')'; x.fillRect(s.x, s.y, 2, 2); });
    sparks = sparks.filter(function (s) { return s.life > 0; });
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'destination-in';                // 左右邊緣淡掉，接到底色
    var fx = x.createLinearGradient(0, 0, SW, 0), e1 = clamp((SW - stage.clientWidth) / 2 / SW, .01, .45);
    fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(e1 * .5, 'rgba(0,0,0,1)'); fx.addColorStop(1 - e1 * .9, 'rgba(0,0,0,1)'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fx; x.fillRect(0, 0, SW, SH);
    x.globalCompositeOperation = 'source-over';
  }
  var hoverIdx = -1;                                       // 滑過大樓：浮起一點、燈閃一下，各自一個音
  cvs.addEventListener('pointermove', function (e) {
    if (drift > .05) { if (hoverIdx >= 0) { letters[hoverIdx].hover = false; hoverIdx = -1; } return; }
    var r = cvs.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, hit = -1;
    letters.forEach(function (L, i) { if (px >= L.x - 4 && px <= L.x + L.w + 4 && py <= ground && py >= ground - L.by) hit = i; });
    if (hit !== hoverIdx) {
      if (hoverIdx >= 0) letters[hoverIdx].hover = false;
      hoverIdx = hit;
      if (hit >= 0) { var L = letters[hit]; L.hover = true; L.hoverAt = performance.now(); L.sv -= 2.5; sfx('tink', penta(hit), .15, .9); }
    }
  });
  cvs.addEventListener('pointerleave', function () { if (hoverIdx >= 0) letters[hoverIdx].hover = false; hoverIdx = -1; });

  // =================== ③ 第一行的彗星過場（亮的底色上：玫瑰粉漸層到琥珀色的尾巴） ===================
  var fxc = document.createElement('canvas'); fxc.className = 'ct-fx'; fxc.setAttribute('aria-hidden', 'true'); stage.appendChild(fxc);
  var fc = fxc.getContext('2d'), c2 = null, c2done = false, fxDirty = false;
  function sizeFx() { var d = Math.min(window.devicePixelRatio || 1, 2); fxc.width = stage.clientWidth * d; fxc.height = stage.clientHeight * d; fc.setTransform(d, 0, 0, d, 0, 0); }
  function firstFt() { return lines[0] && lines[0].querySelector('.ft'); }
  function fxTrail(tr, r, alpha) {
    for (var i = tr.length - 1; i > 0; i--) {
      var k = 1 - i / tr.length;
      fc.strokeStyle = 'rgba(' + Math.round(194 + 50 * k) + ',' + Math.round(87 + 90 * k) + ',' + Math.round(127 - 30 * k) + ',' + (k * .85 * alpha) + ')';
      fc.lineWidth = r * 2.4 * k + .6; fc.lineCap = 'round';
      fc.beginPath(); fc.moveTo(tr[i].x, tr[i].y); fc.lineTo(tr[i - 1].x, tr[i - 1].y); fc.stroke();
    }
    var h = tr[0], g = fc.createRadialGradient(h.x, h.y, 0, h.x, h.y, r * 9);
    g.addColorStop(0, 'rgba(255,170,90,' + (.55 * alpha) + ')'); g.addColorStop(1, 'rgba(255,170,90,0)');
    fc.fillStyle = g; fc.beginPath(); fc.arc(h.x, h.y, r * 9, 0, 6.3); fc.fill();
    fc.fillStyle = 'rgba(232,120,80,' + alpha + ')'; fc.beginPath(); fc.arc(h.x, h.y, r * 1.9, 0, 6.3); fc.fill();
    fc.fillStyle = 'rgba(255,252,246,' + alpha + ')'; fc.beginPath(); fc.arc(h.x, h.y, r * 1.1, 0, 6.3); fc.fill();
  }
  function revealFirst(now) { c2done = true; var T = window.SG_TITLES, el = firstFt(); if (T && el) { T.hold(el, false); T.reveal(el, 0, true); } }
  function fireComet(now) { c2done = true; c2 = { t0: now, tr: [], sp: [], landed: false }; sfx('whoosh', 1.1, .45); }
  function drawFx(now) {
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!c2) { if (fxDirty) { fc.clearRect(0, 0, W, H); fxDirty = false; } return; }
    fxDirty = true; fc.clearRect(0, 0, W, H);
    var fb = (firstFt() || lines[0]).getBoundingClientRect(), sb = stage.getBoundingClientRect(), chW = GFS || 100;
    var tx = fb.left - sb.left + chW * .3, ty = fb.top - sb.top + fb.height * .15;   // 落點：第一個字的左上
    var u = (now - c2.t0) / 1000, head;
    if (u < 1) { var e = u * u * (3 - 2 * u); head = { x: -W * .1 + (tx + W * .1) * e, y: -H * .12 + (ty + H * .12) * (u * u) }; c2.tr.unshift(head); if (c2.tr.length > 30) c2.tr.pop(); }
    else {
      if (!c2.landed) {
        c2.landed = true; revealFirst(now); sfx('thump', .28); sfx('tink', penta(4), .2, 1.4);
        for (var i = 0; i < 22; i++) { var a = -Math.PI * (.05 + Math.random() * .9), v = 2 + Math.random() * 5; c2.sp.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 }); }
      }
      c2.tr.pop();
    }
    if (c2.tr.length > 1) fxTrail(c2.tr, 3.2, 1);
    c2.sp.forEach(function (p, i) { p.x += p.vx; p.y += p.vy; p.vy += .16; p.life -= .02; fc.fillStyle = (i % 2 ? 'rgba(194,87,127,' : 'rgba(230,150,70,') + Math.max(0, p.life) + ')'; fc.fillRect(p.x, p.y, 2.6, 2.6); });
    c2.sp = c2.sp.filter(function (p) { return p.life > 0; });
    if (c2.landed && !c2.tr.length && !c2.sp.length) c2 = null;
  }

  // =================== 鏡頭：像走樓梯，每個停點有一段「停住」的捲動距離跟一個吸附點 ===================
  var VH = 0, GFS = 0, PATH = [];
  function layout() {
    VH = stage.clientHeight; var W = stage.clientWidth;
    GFS = Math.min(VH * .48, W * .42);
    track.style.setProperty('--gfs', GFS + 'px');
    readBg(); buildScene(); sizeFx();
    if (!away && lead) letters.forEach(function (L) { L.light = 1; L.lightAt = -1e9; });   // 停在開場時縮放視窗：重建後大樓直接亮著
    // 第一行在 CHARACTERS 的正下方（鏡頭直直往下就是下一頁）；之後每一行的開頭對齊上一行的結尾，鏡頭在兩行之間直直往下
    var y = VH * 1.05, startX = -W * .42, rows = [];
    lines.forEach(function (ln) {
      ln.style.left = startX + 'px'; ln.style.top = (y - ln.offsetHeight / 2) + 'px';
      rows.push({ l: startX, r: startX + ln.offsetWidth, y: y });
      startX = startX + Math.max(ln.offsetWidth, W * .84) - W * .84; y += VH * 1.05;
    });
    var pts = [{ x: 0, y: 0 }];
    rows.forEach(function (r) {
      pts.push({ x: Math.max(r.l + W * .42, pts[pts.length - 1].x), y: r.y });
      pts.push({ x: Math.max(r.r - W * .42, pts[pts.length - 1].x), y: r.y });
    });
    var uniq = [pts[0]];                                   // 頭尾一樣（短的那行）就併成一個停點
    pts.slice(1).forEach(function (q) { var l = uniq[uniq.length - 1]; if (Math.hypot(q.x - l.x, q.y - l.y) > 2) uniq.push(q); });
    PATH = []; var sc = 0;
    uniq.forEach(function (q, i) {
      var c = { x: q.x - W / 2, y: q.y - VH / 2 };
      if (i) { var d = Math.hypot(c.x - PATH[i - 1].x, c.y - PATH[i - 1].y); sc += Math.max(VH * .5, d * .9); }
      c.a = sc; c.dw = i ? VH * .6 : VH * 1.3; sc += c.dw;
      PATH.push(c);
    });
    track.style.height = (sc + VH) + 'px';
    Array.prototype.forEach.call(track.querySelectorAll('.ct-snap'), function (n) { n.remove(); });
    PATH.forEach(function (c, i) { var n = document.createElement('span'); n.className = 'ct-snap'; n.setAttribute('aria-hidden', 'true'); n.style.top = (i ? c.a + c.dw / 2 : 0) + 'px'; track.appendChild(n); });
  }
  function camAt(sy) {                                     // 捲到 sy 時鏡頭在哪：停點的「停住」範圍內就停在那裡，其他時候在兩個停點之間
    for (var i = 0; i < PATH.length; i++) {
      var c = PATH[i];
      if (sy < c.a) { var b = PATH[i - 1], e = b.a + b.dw, t = smooth((sy - e) / (c.a - e)); return { x: b.x + (c.x - b.x) * t, y: b.y + (c.y - b.y) * t }; }
      if (sy <= c.a + c.dw) return { x: c.x, y: c.y };
    }
    return PATH[PATH.length - 1];
  }
  var cam = null, last = 0, dsm = 0, away = true, running = false, visible = false, dusk = false;
  function setDusk(on) { if (on === dusk) return; dusk = on; document.body.classList.toggle('on-film', on); }   // 只改自己設過的，不要蓋到開場影片那頁
  function frame(now) {
    if (!visible) { setDusk(false); running = false; return; }
    requestAnimationFrame(frame);
    var dt = Math.min(now - (last || now), 50) / 1000; last = now;
    var r = track.getBoundingClientRect(), sy = Math.max(0, -r.top), target = camAt(sy);
    if (!cam) cam = { x: target.x, y: target.y };
    var k = reduce ? 1 : 1 - Math.exp(-dt / .16);
    cam.x += (target.x - cam.x) * k; cam.y += (target.y - cam.y) * k;
    dsm += (clamp((sy - VH * .2) / (VH * .9), 0, 1) - dsm) * k; drift = reduce ? (sy > VH * .6 ? 1 : 0) : dsm;
    plane.style.transform = 'translate3d(' + (-cam.x).toFixed(1) + 'px,' + (-cam.y).toFixed(1) + 'px,0)';
    // 每次回到開場（CHARACTERS 那一站）都重播彗星
    var atTitle = r.top < VH * .35 && r.top > -VH * .25;
    if (atTitle && away) { away = false; play(); }
    if (!atTitle && (r.top > VH * .6 || sy > VH * .5)) away = true;
    setDusk(r.top < VH * .5 && r.bottom > VH * .5 && drift < .45 && sy < VH * 1.2);   // 黑夜那段：左上的標頭換淺色字（跟開場影片那頁一樣）
    // 第一行幾乎整個進到畫面，彗星才出發
    if (!c2done && lines[0]) {
      var lb = lines[0].getBoundingClientRect(), stb = stage.getBoundingClientRect();
      if (lb.top - stb.top > -lb.height * .15 && lb.bottom - stb.top < VH + lb.height * .15 && lb.left < stb.right) { if (reduce) revealFirst(now); else fireComet(now); }
    }
    if (sy < VH * .5 && c2done) { c2done = false; c2 = null; var T = window.SG_TITLES, el = firstFt(); if (T && el) T.hold(el, true); }   // 回到開場：第一行下次再讓彗星點亮一次
    if (Math.abs(cam.x) < SW && drift < 1) drawScene(now); else if (drift >= 1 && cvs.width) x.clearRect(0, 0, SW, SH);
    drawFx(now);
  }
  function start() { if (!running && visible) { running = true; last = 0; requestAnimationFrame(frame); } }
  function init() {
    layout();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (!visible) away = true; start(); }, { rootMargin: '10% 0px' }).observe(track);
    else { visible = true; start(); }
  }
  var rt, lw = 0;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (Math.abs(innerWidth - lw) < 2 && Math.abs(stage.clientHeight - VH) < 120) return; lw = innerWidth; layout(); }, 200); });
  new MutationObserver(function () { readBg(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  lw = innerWidth;
  init();                                                  // 先排一次，吸附點馬上就有；字型真的到了再排一次（Google Fonts 的中文字型是照用到的字分批下載）
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('900 100px "Big Shoulders Display"', 'CHARACTERS'), document.fonts.load('900 100px "Noto Serif TC"', lines.map(function (l) { return l.textContent; }).join(''))]).then(layout, function () {});
})();
