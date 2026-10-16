// 第一頁的背景短片：一格一格畫（每秒 12 格），像手持相機邊跑邊拍。
// 森林裡奔跑 → 城市夜路 → 飛到雲上追著飛鳥，一輪約 18 秒。低解析度畫再放大，加上顆粒跟動態模糊。
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

  var SCENES = [forest, city, sky], LEN = 6;            // 每段 6 秒
  function frame(t) {
    var n = Math.floor(t / LEN) % SCENES.length, local = t % LEN;
    var fly = n === 2;
    var bob = fly ? Math.sin(t * 1.6) * H * .02 : Math.abs(Math.sin(t * 7)) * H * .025;   // 跑步上下晃／飛行慢慢起伏
    var roll = fly ? Math.sin(t * .8) * .06 : Math.sin(t * 3.5) * .012;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(roll); ctx.scale(1.08, 1.08); ctx.translate(-W / 2, -H / 2 + bob);
    SCENES[n](t);
    ctx.restore();

    // 換場：快速甩鏡＋一閃
    var edge = Math.min(local, LEN - local);
    if (edge < .35) {
      var a = 1 - edge / .35;
      ctx.fillStyle = 'rgba(255,236,228,' + (a * .55) + ')'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 14; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (a * .12) + ')';
        ctx.fillRect(0, (i * 53 % H), W, 1 + (i % 3));
      }
    }
    // 暗角
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,14,.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // 底片顆粒
    if (grains.length) {
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .22;
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
