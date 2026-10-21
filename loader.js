// 手機版的載入動畫（寬度 720 以下、這個分頁第一次打開才播）：
//   ① 潮點聚集：散在畫面上的小點像潮水一樣聚成一圈，顏色在圈上流動，中間是百分比；
//      百分比跟著真的載入走（字型、圖片都到了才到 100），最多等 4 秒，最少 1.4 秒（太快會看不清楚）。
//   ② 到 100% 小點往外散開、淡掉，接著左上角那顆葡萄柚星球在中間落地、切開（跟 logo 同一支動畫），停在剖半的那一格。
//   ③ 整片往上滑走，露出網站；開場的逐格動畫從頭播。
// 開了「減少動態效果」的人：只看靜止的剖半葡萄柚，載好就淡出。
(function () {
  var L = document.getElementById('loader');
  if (!L) return;
  var seen = false;
  try { seen = sessionStorage.getItem('sg-loaded') === '1'; } catch (e) {}
  if (innerWidth >= 720 || seen || !document.documentElement.classList.contains('is-loading')) { L.remove(); document.documentElement.classList.remove('is-loading'); return; }
  try { sessionStorage.setItem('sg-loaded', '1'); } catch (e) {}
  var root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-loading');

  // 星球：複製左上角的 logo（不帶 mark-logo，logo.js 才不會管到它）
  var src = document.querySelector('.mark-logo'), box = L.querySelector('.ld-logo');
  if (src && box) { var g = src.cloneNode(true); g.setAttribute('class', 'gf'); box.insertBefore(g, box.firstChild); }
  var planet = box && box.querySelector('.gf');

  // 真的載入進度：字型＋整頁（圖片）都好了才算好；最多 4 秒
  var ready = false, t0 = performance.now();
  var waits = [new Promise(function (r) { if (document.readyState === 'complete') r(); else addEventListener('load', r); })];
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
  Promise.all(waits).then(function () { ready = true; }, function () { ready = true; });
  setTimeout(function () { ready = true; }, 4000);

  var done = false;
  addEventListener('pageshow', function (e) { if (e.persisted) finish(); });   // 從上一頁快取回來：不要卡在半路
  addEventListener('resize', function () { if (innerWidth >= 720) finish(); else size(); });   // 轉成橫的寬螢幕就直接放行
  var cv = L.querySelector('canvas'), x = cv.getContext('2d'), num = L.querySelector('.ld-num span'), numBox = L.querySelector('.ld-num');
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dots = [];
  var COLS = [[219, 62, 120], [236, 141, 96], [120, 64, 140]];   // 粉紅、蜜桃、梅紫
  function size() {
    var d = Math.min(2, window.devicePixelRatio || 1);
    W = L.clientWidth; H = L.clientHeight; cv.width = W * d; cv.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
    R = Math.min(W, H) * .27; cx = W / 2; cy = H / 2;
  }
  size();
  for (var i = 0; i < 240; i++) dots.push({ a: i / 240 * Math.PI * 2, x: Math.random() * W, y: Math.random() * H, s: .6 + Math.random() * 1.5, j: Math.random() * 6.28, ord: Math.random() });
  function mix(u) { u = (u % 1 + 1) % 1; var k = u * 3, i = Math.floor(k), f = k - i, A = COLS[i % 3], B = COLS[(i + 1) % 3]; return 'rgb(' + A.map(function (v, j) { return Math.round(v + (B[j] - v) * f); }) + ')'; }

  var p = 0, burstAt = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    // 還沒好：慢慢爬到 90%；好了而且過了 1.4 秒：衝到 100%
    var goal = ready && now - t0 > 1400 ? 1 : .9;
    p += (goal - p) * (goal === 1 ? .12 : .025);
    if (goal === 1 && p > .995) p = 1;
    num.textContent = Math.round(p * 100);
    x.clearRect(0, 0, W, H);
    var k = burstAt ? Math.min(1, (now - burstAt) / 700) : 0;
    dots.forEach(function (o) {
      var wob = Math.sin(t * 1.6 + o.j) * 3;
      if (burstAt) { o.x += (cx + Math.cos(o.a) * R * 2.4 - o.x) * .08; o.y += (cy + Math.sin(o.a) * R * 2.4 - o.y) * .08; x.globalAlpha = 1 - k; }
      else if (o.ord < p) { o.x += (cx + Math.cos(o.a) * (R + wob) - o.x) * .07; o.y += (cy + Math.sin(o.a) * (R + wob) - o.y) * .07; x.globalAlpha = .95; }
      else { o.x += Math.sin(t * .7 + o.j) * .25; o.y += Math.cos(t * .6 + o.j) * .25; x.globalAlpha = .35; }
      x.fillStyle = mix(o.a / 6.283 + t * .12); x.fillRect(o.x, o.y, o.s, o.s);
    });
    x.globalAlpha = 1;
    if (p === 1 && !burstAt) { burstAt = now; numBox.classList.add('gone'); setTimeout(split, 450); }
    if (done) cancelAnimationFrame(raf);
    if (k >= 1) { cancelAnimationFrame(raf); x.clearRect(0, 0, W, H); }
  }
  // 星球落地、切開；停在剖半那一格，再整片往上滑走
  function split() {
    L.classList.add('logo');
    if (planet) { void planet.getBoundingClientRect(); planet.classList.add('anim'); }
    setTimeout(finish, 2900);
  }
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    L.classList.add('out');
    root.classList.remove('is-loading');
    if (window.SG_FILM && SG_FILM.restart) SG_FILM.restart();   // 開場的逐格動畫從頭播
    setTimeout(function () { L.remove(); }, 900);
  }
  if (reduce) {                                            // 不動：直接顯示剖半的葡萄柚，載好就淡出
    L.classList.add('logo', 'still');
    var wait = function () { if (ready) finish(); else setTimeout(wait, 150); };
    wait();
    return;
  }
  raf = requestAnimationFrame(frame);
})();
