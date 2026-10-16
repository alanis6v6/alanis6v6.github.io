// 第一頁的背景短片：一格一格畫（每秒 12 格），像手持相機邊跑邊拍。
// 蒙太奇剪輯：森林奔跑、腳邊的地面、逆光、城市夜路、失焦的燈、雲上追鳥，一顆鏡頭 0.3～2 秒，
// 同場景裡跳剪、偶爾定格或慢動作再轉快，一輪約 15 秒。低解析度畫再放大，加上顆粒跟動態模糊。
// 之後要換成真的照片或影片，把 index.html 裡的 <canvas class="film"> 換掉、這支檔案拿掉就好。
(function () {
  var cvs = document.querySelector('.film');
  if (!cvs || !cvs.getContext) return;
  var ctx = cvs.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0;
  function size() {
    var r = cvs.getBoundingClientRect();
    var scale = Math.min(1, 420 / Math.max(r.width, 1));       // 刻意低解析度，放大後自然糊
    W = Math.max(160, Math.round(r.width * scale));
    H = Math.max(160, Math.round(r.height * scale));
    cvs.width = W; cvs.height = H;
    makeGrain();
  }

  // 固定的亂數，讓每一輪的樹、樓、雲長得一樣
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function list(n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f(i)); return a; }
  var farTrees = list(18, function () { return { x: rnd(), h: .18 + rnd() * .16, w: .05 + rnd() * .05 }; });
  var midTrees = list(10, function () { return { x: rnd(), h: .32 + rnd() * .22, w: .07 + rnd() * .06 }; });
  var trunks = list(6, function () { return { x: rnd(), w: .04 + rnd() * .07 }; });
  var flies = list(26, function () { return { x: rnd(), y: .35 + rnd() * .5, s: rnd() }; });
  var farTowers = list(16, function () { return { x: rnd(), h: .18 + rnd() * .22, w: .05 + rnd() * .06, lit: rnd() }; });
  var nearTowers = list(9, function () { return { x: rnd(), h: .35 + rnd() * .3, w: .1 + rnd() * .08, lit: rnd() }; });
  var cars = list(12, function () { return { y: .74 + rnd() * .12, x: rnd(), len: .12 + rnd() * .25, pink: rnd() > .5 }; });
  var lamps = list(4, function () { return { x: rnd() }; });
  var clouds = list(14, function () { return { x: rnd(), y: rnd(), r: .12 + rnd() * .2 }; });
  var birds = list(5, function () { return { x: .55 + rnd() * .3, y: .25 + rnd() * .2, p: rnd() * 6 }; });

  var grains = [];
  function makeGrain() {
    grains = [];
    for (var k = 0; k < 3; k++) {
      var g = document.createElement('canvas');
      g.width = W; g.height = H;
      var gx = g.getContext('2d'), img = gx.createImageData(W, H), d = img.data;
      for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      gx.putImageData(img, 0, 0);
      grains.push(g);
    }
  }

  function wrap(v) { return ((v % 1) + 1) % 1; }
  function grad(stops) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  }
  function glow(x, y, r, inner, outer) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 沿著水平方向拖出殘影＝動態模糊
  function smear(n, dist, draw) {
    for (var i = n - 1; i >= 0; i--) {
      ctx.globalAlpha = i === 0 ? 1 : .22;
      draw(-dist * i / n);
    }
    ctx.globalAlpha = 1;
  }

  function forest(t) {
    grad([[0, '#2a2342'], [.45, '#7b4a6e'], [.62, '#f2957f'], [.66, '#3a2b3f'], [1, '#160f1c']]);
    glow(W * .7, H * .6, H * .45, 'rgba(255,170,140,.85)', 'rgba(255,170,140,0)');
    ctx.fillStyle = '#ff9b7d'; ctx.beginPath(); ctx.arc(W * .7, H * .6, H * .09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b2c47';
    farTrees.forEach(function (o) {
      var x = wrap(o.x - t * .05) * W * 1.2 - W * .1, base = H * .64;
      ctx.beginPath(); ctx.moveTo(x - o.w * W, base); ctx.lineTo(x, base - o.h * H); ctx.lineTo(x + o.w * W, base); ctx.fill();
    });
    ctx.fillStyle = '#231a2c';
    midTrees.forEach(function (o) {
      var x = wrap(o.x - t * .16) * W * 1.3 - W * .15, base = H * .72;
      smear(3, W * .02, function (dx) {
        ctx.beginPath(); ctx.moveTo(x + dx - o.w * W, base); ctx.lineTo(x + dx, base - o.h * H); ctx.lineTo(x + dx + o.w * W, base); ctx.fill();
      });
    });
    ctx.fillStyle = '#140e19'; ctx.fillRect(-W, H * .7, W * 3, H);
    flies.forEach(function (o, i) {
      var x = wrap(o.x - t * (.08 + o.s * .1)) * W, y = o.y * H + Math.sin(t * 2 + i) * 4;
      glow(x, y, 2 + o.s * 3, 'rgba(255,190,220,.9)', 'rgba(255,190,220,0)');
    });
    ctx.fillStyle = '#0c0810';
    trunks.forEach(function (o) {
      var x = wrap(o.x - t * .55) * W * 1.6 - W * .3;
      smear(6, W * .12, function (dx) { ctx.fillRect(x + dx, -H, o.w * W, H * 3); });
    });
  }

  function city(t) {
    grad([[0, '#17142c'], [.5, '#4a2c55'], [.7, '#c2577f'], [.72, '#1a1426'], [1, '#0d0a14']]);
    farTowers.forEach(function (o) {
      var x = wrap(o.x - t * .04) * W * 1.2 - W * .1, top = H * (.72 - o.h);
      ctx.fillStyle = '#2a2140'; ctx.fillRect(x, top, o.w * W, H);
      ctx.fillStyle = o.lit > .5 ? 'rgba(255,214,140,.75)' : 'rgba(255,150,200,.7)';
      for (var yy = top + 4; yy < H * .7; yy += 6) for (var xx = x + 3; xx < x + o.w * W - 3; xx += 5) if ((xx * 7 + yy * 3) % 11 < 4) ctx.fillRect(xx, yy, 1.5, 2);
    });
    nearTowers.forEach(function (o) {
      var x = wrap(o.x - t * .14) * W * 1.4 - W * .2, top = H * (.76 - o.h);
      smear(3, W * .03, function (dx) { ctx.fillStyle = '#150f20'; ctx.fillRect(x + dx, top, o.w * W, H); });
      ctx.fillStyle = o.lit > .5 ? 'rgba(255,200,120,.55)' : 'rgba(120,220,240,.45)';
      for (var yy = top + 6; yy < H * .74; yy += 9) ctx.fillRect(x + 4, yy, o.w * W - 8, 2);
    });
    ctx.fillStyle = '#0a0710'; ctx.fillRect(-W, H * .76, W * 3, H);
    cars.forEach(function (o) {
      var x = wrap(o.x - t * .7) * W * 2 - W * .5, y = o.y * H;
      var g = ctx.createLinearGradient(x, 0, x + o.len * W, 0);
      var c = o.pink ? '255,110,170' : '255,190,110';
      g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(1, 'rgba(' + c + ',.95)');
      ctx.fillStyle = g; ctx.fillRect(x, y, o.len * W, 2.2);
    });
    lamps.forEach(function (o) {
      var x = wrap(o.x - t * .45) * W * 1.6 - W * .3;
      ctx.fillStyle = '#07050b';
      smear(5, W * .08, function (dx) { ctx.fillRect(x + dx, H * .2, W * .012, H); });
      glow(x, H * .2, H * .12, 'rgba(255,220,170,.8)', 'rgba(255,220,170,0)');
    });
  }

  function sky(t) {
    grad([[0, '#251f4d'], [.4, '#8a5b9c'], [.75, '#f19aa0'], [1, '#ffc49a']]);
    glow(W * .3, H * .78, H * .5, 'rgba(255,200,160,.9)', 'rgba(255,200,160,0)');
    ctx.fillStyle = '#ffb08e'; ctx.beginPath(); ctx.arc(W * .3, H * .8, H * .11, 0, Math.PI * 2); ctx.fill();
    clouds.forEach(function (o, i) {
      var k = wrap(o.y + t * .09);                       // 往鏡頭飛過來：越近越大、越往下
      var x = (o.x - .5) * W * (1 + k * 2) + W * .5, y = H * (.45 + k * .9), r = o.r * H * (.4 + k * 1.6);
      ctx.globalAlpha = Math.min(1, k * 1.5) * .8;
      glow(x, y, r, 'rgba(255,240,245,.95)', 'rgba(255,225,235,0)');
      glow(x + r * .5, y + r * .1, r * .8, 'rgba(255,235,240,.8)', 'rgba(255,225,235,0)');
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(40,24,52,.85)'; ctx.lineWidth = Math.max(1.2, H * .006); ctx.lineCap = 'round';
    birds.forEach(function (o, i) {
      var x = (o.x + Math.sin(t * .7 + i) * .05) * W, y = (o.y + Math.cos(t * .9 + i) * .03) * H;
      var f = Math.sin(t * 14 + o.p) * H * .018, s = H * .03;
      ctx.beginPath(); ctx.moveTo(x - s, y - f); ctx.quadraticCurveTo(x - s * .4, y - s * .2, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .2, x + s, y - f); ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (var i = 0; i < 9; i++) {                       // 風切的速度線
      var y = wrap(i * .37 + t * .8) * H, x = wrap(i * .61) * W;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - W * .25, y - H * .08); ctx.stroke();
    }
  }

  // ---- 特寫鏡頭：腳下的地面、失焦的燈、逆光的太陽 ----
  function rush(t) {                                   // 低角度：腳邊的地面跟落葉往後衝
    grad([[0, '#3b2840'], [.35, '#6b3f55'], [.4, '#1c1420'], [1, '#0e0a12']]);
    for (var i = 0; i < 22; i++) {
      var y = H * (.42 + (i / 22) * .6), sp = 1 + (i / 22) * 5;
      var x = wrap(i * .37 - t * sp * .25) * W * 1.5 - W * .25;
      ctx.fillStyle = i % 3 ? 'rgba(255,170,140,.18)' : 'rgba(255,120,170,.22)';
      ctx.fillRect(x, y, W * (.08 + i * .012), 1 + i * .12);
    }
    flies.slice(0, 10).forEach(function (o, i) {
      var x = wrap(o.x - t * (1.2 + o.s)) * W * 1.4 - W * .2, y = H * (.5 + o.y * .45);
      ctx.fillStyle = i % 2 ? '#ff9b7d' : '#c96a8a';
      smear(4, W * .1, function (dx) { ctx.beginPath(); ctx.ellipse(x + dx, y, 6 + o.s * 6, 3, .4, 0, Math.PI * 2); ctx.fill(); });
    });
  }
  function bokeh(t) {                                  // 城市的燈全部失焦成圓圈
    grad([[0, '#140f22'], [1, '#2b1631']]);
    farTowers.forEach(function (o, i) {
      var x = wrap(o.x + Math.sin(t * .6 + i) * .02 - t * .03) * W, y = (.2 + o.h * 2.4) * H;
      var r = H * (.05 + o.w * 1.2), c = i % 3 === 0 ? '255,120,180' : i % 3 === 1 ? '255,200,130' : '140,220,240';
      glow(x, y, r, 'rgba(' + c + ',.55)', 'rgba(' + c + ',.08)');
    });
  }
  function flare(t) {                                  // 抬頭看太陽：逆光、光斑
    grad([[0, '#ffb79a'], [.5, '#f28aa0'], [1, '#6a4a86']]);
    var sx = W * (.55 + Math.sin(t * .5) * .05), sy = H * .32;
    glow(sx, sy, H * .7, 'rgba(255,245,225,.95)', 'rgba(255,200,170,0)');
    for (var i = 1; i < 5; i++) {
      var k = i / 5, x = sx + (W * .5 - sx) * k * 2.2, y = sy + (H * .6 - sy) * k * 2.2;
      ctx.strokeStyle = 'rgba(255,255,255,' + (.35 - k * .05) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, H * (.04 + k * .06), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,18,40,.7)';               // 樹梢的剪影擦過畫面
    midTrees.slice(0, 4).forEach(function (o, i) {
      var x = wrap(o.x - t * .3) * W * 1.4 - W * .2;
      ctx.beginPath(); ctx.moveTo(x - W * .12, 0); ctx.lineTo(x, H * (.18 + o.h * .3)); ctx.lineTo(x + W * .12, 0); ctx.fill();
    });
  }

  // ---- 蒙太奇：一顆一顆鏡頭，長短不一，同一場景裡跳剪 ----
  var SC = { forest: forest, city: city, sky: sky, rush: rush, bokeh: bokeh, flare: flare };
  var TINT = [null, 'rgba(255,120,170,.22)', 'rgba(110,200,230,.2)', 'rgba(255,190,120,.22)'];
  // [場景, 秒數, 鏡頭放大, 左右偏移, 傾斜, 速度, 特效]  特效：jump＝跟上一顆同場景跳剪、freeze＝定格、ramp＝慢動作轉快
  // 跟背景音樂對拍：120 BPM，一拍 0.5 秒，一輪 8 小節＝16 秒。剪接點都落在拍子或半拍上。
  var SHOTS = [
    // 第 1–2 小節：前奏，只有大鼓跟和弦
    ['forest', 2, 1.1, 0, 0, 1, ''],
    ['rush', .5, 1.3, 0, -.05, 1.6, ''],
    ['forest', .5, 1.6, .18, .04, 1.2, 'jump'],
    ['forest', .5, 1.25, -.2, -.03, 1.4, 'jump'],
    ['flare', .5, 1.2, 0, .08, .6, ''],
    // 第 3–4 小節：鼓組進來
    ['forest', 1, 1.05, .05, 0, .35, 'ramp'],
    ['city', 1, 1.15, 0, 0, 1, ''],
    ['bokeh', .5, 1, 0, 0, .8, ''],
    ['city', .5, 1.7, .25, .05, 1.5, 'jump'],
    ['city', .5, 1.4, -.15, -.06, 1.5, 'jump'],
    ['rush', .5, 1.4, 0, .06, 2, ''],
    // 第 5–6 小節：定格一下，再飛起來
    ['city', 1, 1.1, 0, 0, 0, 'freeze'],
    ['bokeh', .5, 1.3, .1, 0, 1, ''],
    ['sky', 1.5, 1.05, 0, 0, .8, ''],
    ['flare', .5, 1.4, .1, -.06, 1, ''],
    ['sky', .5, 1.5, -.2, .1, 1.2, 'jump'],
    // 第 7 小節：鼓點變密，半拍一剪
    ['sky', .5, 1.2, .2, -.08, 1.2, 'jump'],
    ['rush', .25, 1.2, 0, 0, 2.2, ''],
    ['forest', .25, 1.5, .1, .05, 2, ''],
    ['city', .25, 1.5, -.1, -.05, 2, ''],
    ['bokeh', .25, 1.4, 0, 0, 1.5, ''],
    ['forest', .25, 1.6, -.15, .06, 2, ''],
    ['flare', .25, 1.3, .1, 0, 1.5, ''],
    // 第 8 小節：鼓停，雲上慢鏡頭喘口氣
    ['sky', 2, 1.1, 0, 0, .45, 'ramp']
  ];
  var START = [], TOTAL = 0;
  SHOTS.forEach(function (s) { START.push(TOTAL); TOTAL += s[1]; });

  function frame(t) {
    var tt = t % TOTAL, k = 0;
    while (k < SHOTS.length - 1 && tt >= START[k + 1]) k++;
    var s = SHOTS[k], local = tt - START[k], fx = s[6];
    var sp = fx === 'freeze' ? 0 : fx === 'ramp' ? s[5] + (local / s[1]) * 1.6 : s[5];
    var st = START[k] * 1.7 + 3 + (fx === 'freeze' ? 0 : local * sp);   // 每顆鏡頭從不同的時間點拍起
    var fly = s[0] === 'sky' || s[0] === 'flare';
    var bob = sp === 0 ? 0 : fly ? Math.sin(st * 1.6) * H * .02 : Math.abs(Math.sin(st * 7)) * H * .025;
    var roll = s[4] + (fly ? Math.sin(st * .8) * .04 : Math.sin(st * 3.5) * .012);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + s[3] * W, H / 2); ctx.rotate(roll); ctx.scale(s[2], s[2]); ctx.translate(-W / 2, -H / 2 + bob);
    SC[s[0]](st);
    ctx.restore();
    var tint = TINT[k % TINT.length];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }

    // 剪接點：前兩格閃白或黑（跳剪不閃），定格時加一點抖動的掃描線
    var f = Math.floor(local * 12);
    if (f < 2 && fx !== 'jump') {
      ctx.fillStyle = k % 3 === 0 ? 'rgba(0,0,0,' + (f ? .35 : .8) + ')' : 'rgba(255,240,232,' + (f ? .3 : .75) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (fx === 'freeze') {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (var i = 0; i < 6; i++) ctx.fillRect(0, (i * 41 + f * 13) % H, W, 2);
    }
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,14,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (grains.length) {
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .24;
      ctx.drawImage(grains[Math.floor(t * 12) % grains.length], 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }

  size();
  var rt;
  addEventListener('resize', function () {   // iOS 捲動時網址列伸縮也會觸發 resize：等停下來、尺寸真的變了才重畫
    clearTimeout(rt);
    rt = setTimeout(function () {
      var r = cvs.getBoundingClientRect(), s = Math.min(1, 420 / Math.max(r.width, 1));
      if (Math.round(r.width * s) === W && Math.abs(Math.round(r.height * s) - H) < 4) return;
      size(); if (reduce) frame(2.4);
    }, 200);
  });
  if (reduce) { frame(2.4); return; }

  var running = true, start = performance.now(), last = -1;
  window.SG_FILM = { restart: function () { start = performance.now(); last = -1; }, LOOP: TOTAL };   // 開音樂時從頭對拍
  function loop(now) {
    if (!running) return;
    var t = (now - start) / 1000, step = Math.floor(t * 12);   // 一秒 12 格：逐格動畫的手感
    if (step !== last) { last = step; frame(step / 12); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // 滑到別頁或切到背景就停，省電
  var inView = true;
  function setRun(v) { if (v && !running) { running = true; requestAnimationFrame(loop); } else if (!v) running = false; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; setRun(inView && !document.hidden); }).observe(cvs);
  document.addEventListener('visibilitychange', function () { setRun(inView && !document.hidden); });
})();
