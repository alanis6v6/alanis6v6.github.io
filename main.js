// space.grapefruit：主題切換、複製、顏文字換臉、特殊字體、脆排版工具的橫向片、翻頁閃格、目前在哪一頁
(function () {
  var root = document.documentElement;
  var TR = window.TRCore || null;   // 跟排版尺共用的核心（/threads-ruler/core.js）：臉、手勢、14 種字體

  // ---------- 深色／淺色 ----------
  document.querySelector('.icon-btn.theme').addEventListener('click', function () {
    var next = root.dataset.theme === 'night' ? 'day' : 'night';
    root.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').content = next === 'day' ? '#fff6f1' : '#1d1718';
    try { localStorage.setItem('sg-theme', next); } catch (e) {}
  });

  // ---------- 複製 ----------
  var toast = document.querySelector('.toast'), toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.fontSize = '16px';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);   // iOS 要明確設選取範圍
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copy(text) {
    var done = function () { say('已複製　' + (text.split('\n').filter(function (l) { return l.trim() && l.trim() !== '\u2800'; })[0] || '')); };
    var fail = function () { say('複製失敗，長按文字自己複製'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text) ? done() : fail(); });
    } else {
      fallback(text) ? done() : fail();
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) copy(b.dataset.copyText || b.textContent.trim());
  });

  // ---------- 顏文字：點一個 → 換臉、換手勢 → 複製 ----------
  var now = document.getElementById('kao-now');
  var list = document.querySelectorAll('[data-kao]');
  var cur = null;   // 目前這個顏文字拆開的樣子 {l,o,inner,c,r}
  function setKao(text) {
    now.textContent = text;
    cur = TR ? (TR.parseKao(text)[0] || null) : null;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  list.forEach(function (b) {
    b.addEventListener('click', function () {
      list.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      setKao(b.textContent.trim());
    });
  });
  document.querySelectorAll('[data-swap]').forEach(function (b) {
    if (!TR) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      if (!cur) return;
      if (b.dataset.swap === 'face') {
        var faces = TR.ALL_FACES.filter(function (f) { return f !== cur.inner.trim(); });
        cur.inner = pick(faces);
      } else {
        var bodies = TR.BODIES.filter(function (x) { return x.l + x.r !== cur.l + cur.r || x.o !== cur.o; });
        var body = pick(bodies);
        cur.l = body.l; cur.o = body.o; cur.c = body.c; cur.r = body.r;
      }
      now.textContent = TR.kaoString(cur);
    });
  });
  now.addEventListener('click', function () { copy(now.textContent); });
  document.querySelector('[data-copy-now]').addEventListener('click', function () { copy(now.textContent); });
  setKao(now.textContent.trim());
  if (list[0]) list[0].setAttribute('aria-pressed', 'true');

  // ---------- 特殊字體 ----------
  var LOCAL = [   // 排版尺的核心沒載到的時候（例如本機預覽）先用這幾種
    { id: 'bold', name: '粗體', U: 0x1D400, L: 0x1D41A },
    { id: 'italic', name: '斜體', U: 0x1D434, L: 0x1D44E, ex: { h: 0x210E } },
    { id: 'script', name: '草寫', U: 0x1D4D0, L: 0x1D4EA },
    { id: 'fraktur', name: '哥德', U: 0x1D504, L: 0x1D51E, ex: { C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C, Z: 0x2128 } },
    { id: 'double', name: '空心', U: 0x1D538, L: 0x1D552, ex: { C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119, Q: 0x211A, R: 0x211D, Z: 0x2124 } },
    { id: 'mono', name: '打字機', U: 0x1D670, L: 0x1D68A },
    { id: 'circled', name: '圓圈', U: 0x24B6, L: 0x24D0 }
  ];
  function localStyle(text, s) {
    var out = '';
    for (var ch of text) {
      var c = ch.charCodeAt(0);
      if (s.ex && s.ex[ch]) out += String.fromCodePoint(s.ex[ch]);
      else if (c >= 65 && c <= 90) out += String.fromCodePoint(s.U + c - 65);
      else if (c >= 97 && c <= 122) out += String.fromCodePoint(s.L + c - 97);
      else out += ch;
    }
    return out;
  }
  var styles = TR ? TR.STYLES.filter(function (s) { return s.id !== 'plain'; }) : LOCAL;
  var input = document.getElementById('type-in'), out = document.getElementById('type-out');
  function render() {
    var text = input.value.trim() || 'type here';
    out.innerHTML = '';
    styles.forEach(function (s) {
      var li = document.createElement('li'), b = document.createElement('button');
      var span = document.createElement('span'), small = document.createElement('small');
      var styled = TR ? TR.stylize(text, s.id) : localStyle(text, s);
      b.type = 'button'; b.dataset.copy = ''; b.dataset.copyText = styled;
      span.textContent = styled; small.textContent = s.name;
      b.append(span, small); li.appendChild(b); out.appendChild(li);
    });
  }
  input.addEventListener('input', render);
  render();

  // ---------- 排版預覽：照脆 iPhone App 的寬度排，置中、複製 ----------
  var rIn = document.getElementById('r-in'), rOut = document.getElementById('r-out');
  var rFont = '15px -apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif';
  var mctx = document.createElement('canvas').getContext('2d');
  function measure(t) { mctx.font = rFont; return mctx.measureText(t).width; }
  var chars = 21;
  function lineW() { return Math.round(measure('一') * chars); }
  function preview() {
    rOut.style.setProperty('--rw', lineW() + 'px');
    rOut.textContent = rIn.value || ' ';
  }
  document.querySelectorAll('[data-w]').forEach(function (b) {
    b.addEventListener('click', function () {
      chars = Number(b.dataset.w);
      document.querySelectorAll('[data-w]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      preview();
    });
  });
  document.querySelectorAll('[data-align]').forEach(function (b) {
    if (!TR) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      var raw = rIn.value, s0 = rIn.selectionStart, s1 = rIn.selectionEnd;
      if (s0 === s1) { s0 = 0; s1 = raw.length; }          // 沒選取就整篇
      var r = TR.alignBlock(raw, s0, s1, b.dataset.align, lineW(), measure);
      // 用 insertText 換掉那幾行，Cmd+Z 還能復原；不支援的瀏覽器才直接改 value
      rIn.focus();
      rIn.setSelectionRange(r.start, r.end);
      var ok = false;
      try { ok = document.execCommand('insertText', false, r.text); } catch (e) {}
      if (!ok || rIn.value.slice(r.start, r.start + r.text.length) !== r.text) rIn.value = raw.slice(0, r.start) + r.text + raw.slice(r.end);
      rIn.setSelectionRange(r.start, r.start + r.text.length);
      preview();
      if (r.tooLong) say(r.tooLong + ' 行比一行還長，沒辦法置中');
    });
  });
  document.getElementById('r-copy').addEventListener('click', function () {
    var t = rIn.value;
    if (TR) t = TR.fillBlankLines(TR.convertSpaces(t, 'smart'));   // 空行換點字空白、半形空白換全形，貼到脆才不會被吃掉
    copy(t);
  });
  rIn.addEventListener('input', preview);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(preview);
  preview();


  // ---------- 漢堡選單 ----------
  var menu = document.getElementById('menu'), menuBtn = document.querySelector('.menu-btn'), scrim = document.querySelector('.menu-scrim');
  function setMenu(open) {
    menu.classList.toggle('open', open); scrim.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? '關閉選單' : '打開選單');
    if (open) { menu.removeAttribute('inert'); menu.querySelector('a').focus({ preventScroll: true }); }
    else menu.setAttribute('inert', '');
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  scrim.addEventListener('click', function () { setMenu(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

  // ---------- Katsuji：全螢幕播宣傳片 → 播完跳出訂閱 → 3 秒後或往下滑，縮到兩邊 ----------
  var kat = document.getElementById('katsuji');
  var kv = kat.querySelector('.kv');
  // 手機（直的畫面）放 9:16，桌機放 16:9；載入時決定一次，影片播到一半不換
  var tallMQ = window.matchMedia('(max-width: 719px), (max-aspect-ratio: 4/5)');
  function pickVideo() {
    var tall = tallMQ.matches, want = kv.dataset[tall ? 'tall' : 'wide'];
    if (kv.getAttribute('src') === want) return;
    if (kv.getAttribute('src') && !kv.paused) return;
    kv.poster = kv.dataset[tall ? 'tallPoster' : 'widePoster'];
    kv.src = want;
    kat.classList.toggle('kv-tall', tall);
  }
  pickVideo();
  if (tallMQ.addEventListener) tallMQ.addEventListener('change', pickVideo); else if (tallMQ.addListener) tallMQ.addListener(pickVideo);   // 舊版 Safari
  var kvSound = kat.querySelector('.kv-sound'), kvSkip = kat.querySelector('.kv-skip'), kvReplay = kat.querySelector('.kv-replay');
  var copyBox = kat.querySelector('.katsuji-copy');
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dockTimer;
  function measureCopy() { kat.style.setProperty('--copy-h', Math.ceil(copyBox.getBoundingClientRect().height + 24) + 'px'); }
  function setState(st) {
    kat.dataset.state = st;
    clearTimeout(dockTimer);
    if (st === 'popup') dockTimer = setTimeout(function () { setState('docked'); }, 3000);
    if (st === 'docked') measureCopy();
    document.body.classList.toggle('kv-full', st !== 'docked' && Math.abs(kat.getBoundingClientRect().top) < innerHeight / 2);
  }
  function syncSound() { kvSound.setAttribute('aria-pressed', kv.muted ? 'false' : 'true'); kvSound.textContent = kv.muted ? '開聲音' : '關聲音'; }
  function playBoth() {
    // 有聲音的影片被瀏覽器擋自動播放時（例如滑走再滑回來），改成靜音再播
    kv.play().catch(function () { kv.muted = true; syncSound(); kv.play().catch(function () {}); });
  }
  kv.addEventListener('ended', function () { if (kat.dataset.state === 'full') setState('popup'); });
  kv.addEventListener('click', function () { if (kv.paused) playBoth(); else kv.pause(); });
  kvSkip.addEventListener('click', function () { kv.pause(); setState('popup'); });
  kvReplay.addEventListener('click', function () { kv.currentTime = 0; kv.play().catch(function () {}); });
  kvSound.addEventListener('click', function () {
    kv.muted = !kv.muted;
    syncSound();
    if (!kv.muted) { if (window.SG_MUSIC) window.SG_MUSIC.pause(); if (kv.paused) playBoth(); }
  });
  // 還在全螢幕或剛跳出訂閱時往下滑：先擋住捲動（不然觸控板輕輕一碰就翻到下一頁），
  // 往下滑的量累積夠了才把畫面縮到兩欄；縮好之後才讓下一次滑動翻頁
  var pull = 0, pullTimer;
  function inFull() {
    if (kat.dataset.state === 'docked') return false;
    var r = kat.getBoundingClientRect();
    return Math.abs(r.top) < 8;                       // 整頁已經吸附對齊才攔，還在吸附途中的捲動不要打斷
  }
  function pullBy(d, e) {
    if (e.cancelable) e.preventDefault();
    pull += d; clearTimeout(pullTimer); pullTimer = setTimeout(function () { pull = 0; }, 900);
    if (pull > 90) { pull = 0; kv.pause(); setState('docked'); lockUntil = Date.now() + 700; }
  }
  var lockUntil = 0;   // 剛縮好時，同一下滑動的慣性不要直接把頁面帶走
  addEventListener('wheel', function (e) {
    if (Date.now() < lockUntil && Math.abs(kat.getBoundingClientRect().top) < 40) { if (e.cancelable) e.preventDefault(); return; }
    if (!inFull() || e.deltaY <= 0) return;
    pullBy(e.deltaY, e);
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (!inFull() || ['ArrowDown', 'PageDown', ' '].indexOf(e.key) < 0) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button')) return;   // 在輸入框裡打空白、按方向鍵不要被攔
    pullBy(200, e);
  });
  var touchY = null;
  addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (touchY === null) return;
    var d = touchY - e.touches[0].clientY;
    if (Date.now() < lockUntil && Math.abs(kat.getBoundingClientRect().top) < 40) { if (e.cancelable) e.preventDefault(); return; }
    if (!inFull() || d <= 0) return;
    if (e.cancelable) e.preventDefault();
    if (d > 40) { touchY = null; kv.pause(); setState('docked'); lockUntil = Date.now() + 700; }
  }, { passive: false });
  if (reduceMotion) setState('docked');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && kat.dataset.state === 'full') playBoth();
      if (!vis) kv.pause();
    }, { threshold: .6 }).observe(kat);
  }
  addEventListener('resize', function () { if (kat.dataset.state === 'docked') measureCopy(); });

  // ---------- 影片標題 ----------
  // 想像第一頁的影片鋪在整個網站最底下：第二頁之後的大標題是字形的窗，看到的是影片「在這個位置」的那一塊。
  // 做法：標題上疊一張畫布，先畫字形，再用 source-in 把影片對應位置的畫面填進字裡；真的文字留著（透明），給搜尋引擎跟讀螢幕軟體。
  function filmTitles() {
    var film = window.SG_FILM;
    if (!film || !film.canvas) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.ft')).map(function (el) {
      var c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      el.appendChild(c);
      return { el: el, c: c, x: c.getContext('2d'), vis: false };
    });
    function draw(it) {
      // 標題有壓扁（scaleY）：字照排版的尺寸畫，影片照畫面上看到的位置取，兩者才會對上
      var el = it.el, c = it.c, x = it.x, r = c.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
      if (!r.width || !w) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      x.textBaseline = 'alphabetic'; x.fillStyle = '#000';
      // 字的基線位置照 CSS 的行高算，畫出來才會跟原本的字疊得剛好
      var m = x.measureText(el.textContent), asc = m.fontBoundingBoxAscent || fs * .88, desc = m.fontBoundingBoxDescent || fs * .12;
      var lh = parseFloat(cs.lineHeight) || fs * 1.2, padX = fs * .1, padY = fs * .12;
      x.fillText(el.textContent, padX, padY + (lh - asc - desc) / 2 + asc);
      // 把影片「在這個位置」的那一塊填進字裡
      var f = film.canvas, vw = innerWidth, vh = innerHeight;
      x.globalCompositeOperation = 'source-in';
      // 影片在字裡調亮、加飽和，一看就知道字裡在播東西
      var night = root.dataset.theme === 'night';
      if ('filter' in x) x.filter = night ? 'saturate(1.7) brightness(1.55) contrast(1.1)' : 'saturate(1.8) brightness(1.12) contrast(1.2)';
      // 標題一部分在畫面外（橫向滑到一半）時，只取畫面內那段，對應畫到字的那一段（Safari 的 drawImage 超出來源範圍會整個不畫）
      var l = Math.max(r.left, 0), t = Math.max(r.top, 0), rr = Math.min(r.right, vw), bb = Math.min(r.bottom, vh);
      if (rr > l && bb > t) x.drawImage(f, l / vw * f.width, t / vh * f.height, (rr - l) / vw * f.width, (bb - t) / vh * f.height,
        (l - r.left) / r.width * w, (t - r.top) / r.height * h, (rr - l) / r.width * w, (bb - t) / r.height * h);
      if ('filter' in x) x.filter = 'none';
      // 深色模式再提亮一點，不然暗暗的字會吃進背景
      if (night) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,236,228,.18)'; x.fillRect(0, 0, w, h); }
      // 字後面墊一層錯開一點點的影子（像印刷套色沒對準），影片剛好播到很亮的鏡頭時，字也不會融進淺色背景
      x.globalCompositeOperation = 'destination-over';
      x.fillStyle = night ? 'rgba(0,0,0,.45)' : 'rgba(74,28,66,.22)';
      x.fillText(el.textContent, padX + fs * .035, padY + (lh - asc - desc) / 2 + asc + fs * .035);
      el.classList.add('live');
    }
    function drawVisible() { items.forEach(function (it) { if (it.vis) draw(it); }); }
    film.listeners.push(drawVisible);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { var it = items.find(function (i) { return i.el === e.target; }); it.vis = e.isIntersecting; if (it.vis) draw(it); });
        film.keep = items.filter(function (i) { return i.vis; }).length;   // 有影片標題在畫面上，影片就繼續播
        film.wake();
      });
      items.forEach(function (it) { io.observe(it.el); });
    } else items.forEach(function (it) { it.vis = true; });
    addEventListener('resize', drawVisible);
    addEventListener('scroll', drawVisible, { passive: true });   // 捲動時位置在變，看到的那一塊也跟著變
    document.querySelector('.icon-btn.theme').addEventListener('click', function () { setTimeout(drawVisible, 0); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawVisible);
    items.forEach(draw);
  }
  // hero.js 在 main.js 後面才載入，等全部腳本跑完再接上
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', filmTitles); else setTimeout(filmTitles, 0);

  // ---------- 點選單、分頁列、第一頁的目錄跳頁 ----------
  // 每頁都設了 scroll-snap-stop: always（快速一滑不會跳過頁），但它也會讓「從第一頁跳到第四頁」停在中間某頁；
  // 所以跳頁時先暫時關掉吸附，捲到定位再打開。
  var html = document.documentElement, jumping = false;
  function topOf(el) { return Math.round(el.getBoundingClientRect().top + scrollY); }
  function jump(target) {
    html.style.scrollSnapType = 'none';
    jumping = true;
    var y = topOf(target), smooth = !reduceMotion;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    var done = false;
    function restore() { if (done) return; done = true; window.scrollTo({ top: y }); html.style.scrollSnapType = ''; jumping = false; cut(); }
    if ('onscrollend' in window) addEventListener('scrollend', restore, { once: true });
    setTimeout(restore, 1200);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target || !(target.classList.contains('page') || target.classList.contains('reel-snap'))) return;
    e.preventDefault();
    jump(target);
  });

  // ---------- 翻頁閃一格 ----------
  // 跟第一頁影片的剪接點同一套：換頁、換工具的那一瞬間，先閃一格濃的、再一格淡的（一格＝1/12 秒），白黑輪流
  var cutEl = document.querySelector('.cut'), cutN = 0, lastCut = 0;
  function cut() {
    if (reduceMotion || !cutEl || jumping) return;
    var t = Date.now();
    if (t - lastCut < 250) return;
    lastCut = t; cutN++;
    var dark = cutN % 3 === 0;
    cutEl.className = 'cut ' + (dark ? 'k' : 'w');
    cutEl.style.opacity = dark ? .8 : .75;
    setTimeout(function () { cutEl.style.opacity = dark ? .35 : .3; }, 83);
    setTimeout(function () { cutEl.style.opacity = 0; }, 166);
  }

  // ---------- 脆排版工具：橫向的片 ----------
  // 區塊有 n 個螢幕高、舞台黏在畫面上：往下捲一個螢幕高，片就往左拉一格。觸控板往右滑、手指左右滑、方向鍵左右，也是換一格。
  (function toolReel() {
    var sec = document.getElementById('threads');
    var stage = sec.querySelector('.reel-stage'), reel = sec.querySelector('.reel');
    var panels = Array.prototype.slice.call(sec.querySelectorAll('.panel'));
    var snaps = Array.prototype.slice.call(sec.querySelectorAll('.reel-snap'));
    var tabs = Array.prototype.slice.call(sec.querySelectorAll('.reel-bar a'));
    var n = panels.length, at = -1, ticking = false, pos = 0;
    function update() {
      ticking = false;
      var hgt = (snaps[1] && snaps[1].offsetTop) || innerHeight;   // 一格＝吸附點的間距（100svh）
      pos = Math.max(0, Math.min(n - 1, -sec.getBoundingClientRect().top / hgt));
      reel.style.setProperty('--p', pos.toFixed(4));
      panels.forEach(function (pn, k) {
        var d = k - pos;
        pn.style.setProperty('--d', d.toFixed(4));
        pn.style.setProperty('--a', Math.min(1, Math.abs(d)).toFixed(4));
        // 不在畫面上的格子不給 Tab 走進去
        if (Math.abs(d) > .5) pn.setAttribute('inert', ''); else pn.removeAttribute('inert');
      });
      var k = Math.round(pos);
      if (k !== at) {
        if (at >= 0 && inside()) cut();
        at = k;
        tabs.forEach(function (a, i) { if (i === k) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
    function inside() { var r = sec.getBoundingClientRect(); return r.top <= 40 && r.bottom >= innerHeight - 40; }
    // 往右一格／往左一格；第一格再往左＝回上一頁，最後一格再往右＝下一頁
    var lock = 0;
    function go(dir) {
      if (Date.now() < lock) return;
      lock = Date.now() + 450;
      var k = Math.round(pos) + dir;
      var target = k < 0 ? sec.previousElementSibling : k >= n ? sec.nextElementSibling : k === 0 ? sec : snaps[k];
      if (target) jump(target);
    }
    var acc = 0, used = false, accTimer;
    addEventListener('wheel', function (e) {
      if (!inside() || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 2) return;
      if (e.target.closest && e.target.closest('textarea, .r-preview')) return;   // 在輸入框、預覽裡左右捲是捲它自己
      if (e.cancelable) e.preventDefault();                                        // 也擋掉 Chrome 往右滑＝上一頁
      // 觸控板放開後還會送好幾百毫秒的慣性：同一次手勢只換一格，停 200 毫秒才算下一次
      clearTimeout(accTimer); accTimer = setTimeout(function () { acc = 0; used = false; }, 200);
      if (used) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 30) { go(acc > 0 ? 1 : -1); used = true; }
    }, { passive: false });
    addEventListener('keydown', function (e) {
      if (!inside() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    });
    var sx = null, sy = 0;
    sec.addEventListener('touchstart', function (e) {
      var pv = e.target.closest('.r-preview'), own = e.target.closest('textarea, input') || (pv && pv.scrollWidth > pv.clientWidth + 2);
      sx = own ? null : e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    sec.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // ---------- 目前在哪一頁：右側目錄、手機分頁列、頂列字色 ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"], .tabbar a'));
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var markedId = null;
  function mark(id) {
    if (markedId && markedId !== id) cut();
    markedId = id;
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('on-film', id === 'hello');
    document.body.classList.toggle('kv-full', id === 'katsuji' && kat.dataset.state !== 'docked');
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    pages.forEach(function (p) { io.observe(p); });
  }
  mark('hello');
})();
