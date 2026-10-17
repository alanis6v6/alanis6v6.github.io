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
    // 影片在字裡統一調成三色（梅紫→葡萄柚粉→蜜桃，深色模式整組調亮）：照亮度查表換色，播到很亮或很暗的鏡頭字都看得清楚。
    // 影片本身只有約 420px 寬，先把要用的那一小塊縮在小畫布上換色，再放大填進字裡，所以每格的計算量很小。
    // （Safari 的畫布不支援 filter，所以不用 filter 調色）
    var STOPS = { day: [[58, 20, 66], [168, 70, 124], [239, 138, 140]], night: [[168, 79, 134], [241, 154, 160], [255, 225, 207]] };
    var LUT = {};
    function lut(night) {
      var key = night ? 'night' : 'day';
      if (LUT[key]) return LUT[key];
      var S = STOPS[key], t = new Uint8ClampedArray(256 * 3);
      for (var i = 0; i < 256; i++) {
        var l = Math.min(1, Math.max(0, (i / 255 - .12) / .6)), k = l < .5 ? 0 : 1, f = l < .5 ? l * 2 : (l - .5) * 2;
        for (var j = 0; j < 3; j++) t[i * 3 + j] = S[k][j] + (S[k + 1][j] - S[k][j]) * f;
      }
      return (LUT[key] = t);
    }
    var tc = document.createElement('canvas'), tx = tc.getContext('2d', { willReadFrequently: true });
    function tone(f, sx, sy, sw, sh, night) {
      sw = Math.min(sw, f.width - sx); sh = Math.min(sh, f.height - sy);
      var tw = Math.max(1, Math.ceil(sw)), th = Math.max(1, Math.ceil(sh));
      if (tc.width < tw || tc.height < th) { tc.width = Math.max(tc.width, tw); tc.height = Math.max(tc.height, th); }
      tx.drawImage(f, sx, sy, sw, sh, 0, 0, tw, th);
      var d = tx.getImageData(0, 0, tw, th), a = d.data, L = lut(night);
      for (var i = 0; i < a.length; i += 4) {
        var k = ((a[i] * 77 + a[i + 1] * 151 + a[i + 2] * 28) >> 8) * 3;
        a[i] = L[k]; a[i + 1] = L[k + 1]; a[i + 2] = L[k + 2];
      }
      tx.putImageData(d, 0, 0);
      return [tw, th];
    }
    function draw(it) {
      var el = it.el, c = it.c, x = it.x, r = c.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
      if (!r.width || !w) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), txt = el.textContent, padX = fs * .1, padY = fs * .12;
      var ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      x.fillStyle = '#000';
      if (cs.writingMode.indexOf('vertical') === 0) {
        // 直書：一個字一個字往下排，每個字置中在那一欄
        if ('letterSpacing' in x) x.letterSpacing = '0px';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        var cx = padX + el.offsetWidth / 2, y = padY;
        Array.from(txt).forEach(function (chr) { x.fillText(chr, cx, y + fs / 2); y += fs + ls; });
      } else {
        if ('letterSpacing' in x) x.letterSpacing = ls + 'px';
        x.textAlign = 'left'; x.textBaseline = 'alphabetic';
        // 字的基線位置照 CSS 的行高算，畫出來才會跟原本的字疊得剛好
        var m = x.measureText(txt), asc = m.fontBoundingBoxAscent || fs * .88, desc = m.fontBoundingBoxDescent || fs * .12;
        var lh = parseFloat(cs.lineHeight) || fs * 1.2;
        x.fillText(txt, padX, padY + (lh - asc - desc) / 2 + asc);
      }
      // 把影片「在這個位置」的那一塊換好顏色，填進字裡
      // 標題一部分在畫面外（橫向滑到一半）時，只取畫面內那段（Safari 的 drawImage 超出來源範圍會整個不畫）
      var f = film.canvas, vw = innerWidth, vh = innerHeight, night = root.dataset.theme === 'night';
      var l = Math.max(r.left, 0), t = Math.max(r.top, 0), rr = Math.min(r.right, vw), bb = Math.min(r.bottom, vh);
      if (rr > l && bb > t) {
        var sz = tone(f, l / vw * f.width, t / vh * f.height, (rr - l) / vw * f.width, (bb - t) / vh * f.height, night);
        x.globalCompositeOperation = 'source-in';
        x.drawImage(tc, 0, 0, sz[0], sz[1], (l - r.left) / r.width * w, (t - r.top) / r.height * h, (rr - l) / r.width * w, (bb - t) / r.height * h);
      }
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
    var y = topOf(target), smooth = !reduceMotion, from = markedId, to = target.closest('.page').id;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    var done = false;
    function restore() { if (done) return; done = true; window.scrollTo({ top: y }); html.style.scrollSnapType = ''; jumping = false; if (to !== from) cut(pageAt(to) - pageAt(from), to); mark(to); }
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

  // ---------- 換頁的蒙太奇 ----------
  // 換頁那一瞬間，畫面上開出幾扇「窗」（方格、橫帶、直縫、角落），每扇窗裡是第一頁影片的某一顆鏡頭，
  // 窗跟鏡頭一個接一個硬切，像剪接；新的一頁大部分時間都看得到。往哪一頁，就用那一頁的地方：
  // 脆排版工具＝夜裡的建築、Katsuji＝失焦的燈、角色＝樹林、作品＝天空與陽光。
  // 有些換頁前面先有東西從鏡頭前掠過（車燈、樹幹、一群鳥），掠過的那一下就換了場。
  // 音樂開著時，每一格的長短對齊配樂的八分音符；排版工具左右換格不算換頁，不會出現。
  var cutCvs = document.querySelector('.cut'), cutX = cutCvs && cutCvs.getContext && cutCvs.getContext('2d');
  var cutRun = 0, lastCut = 0, lastShape = '';
  var FRAME = 1000 / 24;                                  // 一格一格跳，跟影片的逐格手感一樣
  var PLACES = {
    hello: { wipe: '', shots: ['sky', 'flare', 'sky'], objs: ['✦'] },
    threads: { wipe: '', shots: ['city', 'bokeh', 'city'], objs: ['⋆˖ ┈┈ ˖⋆', '( ˶ᵔ ᵕ ᵔ˶ )', '✦'] },
    katsuji: { wipe: 'lights', shots: ['bokeh', 'city', 'bokeh'], objs: ['key', '✦'] },
    cards: { wipe: 'trunk', shots: ['forest', 'rush', 'forest'], objs: ['fly', '✦'] },
    works: { wipe: 'birds', shots: ['sky', 'flare', 'sky'], objs: ['fruit', '( ˶ᵔ ᵕ ᵔ˶ )'] }
  };
  function musicOn() { var b = document.querySelector('.sound'); return b && b.getAttribute('aria-pressed') === 'true'; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // 一扇窗：回傳要畫影片的區塊（螢幕座標的長方形清單）跟窗的中心
  function windowShape(kind, vw, vh) {
    var r = [], size = Math.max(40, Math.round(Math.min(vw, vh) / 10)), cols = Math.ceil(vw / size), rows = Math.ceil(vh / size);
    if (kind === 'squares') {
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (Math.random() < .3) r.push([x * size, y * size, size, size]);
      return { rects: r, cx: vw / 2, cy: vh / 2, s: Math.min(vw, vh) * .5 };
    }
    if (kind === 'band') {
      var h = vh * (.18 + Math.random() * .12), top = (vh - h) * (.15 + Math.random() * .7);
      return { rects: [[0, top, vw, h]], cx: vw * (.3 + Math.random() * .4), cy: top + h / 2, s: h };
    }
    if (kind === 'slit') {
      var w = vw * (.08 + Math.random() * .06), left = (vw - w) * (.1 + Math.random() * .8);
      return { rects: [[left, 0, w, vh]], cx: left + w / 2, cy: vh * (.3 + Math.random() * .4), s: w };
    }
    var cw = vw * (.28 + Math.random() * .12), ch = vh * (.28 + Math.random() * .12), cx0 = Math.random() < .5 ? 0 : vw - cw, cy0 = Math.random() < .5 ? 0 : vh - ch;
    return { rects: [[cx0, cy0, cw, ch]], cx: cx0 + cw / 2, cy: cy0 + ch / 2, s: Math.min(cw, ch) };
  }
  // 窗裡疊莉亞的一個東西：顏文字、分隔線、星星、鍵帽、螢火蟲、葡萄柚
  function drawObject(x, obj, cx, cy, s) {
    x.save();
    x.fillStyle = 'rgba(255,244,236,.92)'; x.strokeStyle = 'rgba(255,244,236,.92)';
    x.shadowColor = 'rgba(20,8,24,.45)'; x.shadowBlur = 6;
    if (obj === 'key') {
      var k = Math.max(26, s * .32); x.lineWidth = 2;
      x.beginPath(); x.roundRect ? x.roundRect(cx - k / 2, cy - k / 2, k, k, k * .22) : x.rect(cx - k / 2, cy - k / 2, k, k); x.stroke();
    } else if (obj === 'fly') {
      x.shadowColor = 'rgba(255,230,150,.9)'; x.shadowBlur = 14; x.fillStyle = 'rgba(255,240,170,.95)';
      x.beginPath(); x.arc(cx, cy, Math.max(3, s * .025), 0, Math.PI * 2); x.fill();
    } else if (obj === 'fruit') {
      var rr = Math.max(14, s * .16);
      x.fillStyle = 'rgba(255,155,125,.95)'; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,236,226,.9)'; x.beginPath(); x.arc(cx, cy, rr * .78, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,155,125,.95)'; x.beginPath(); x.arc(cx, cy, rr * .62, 0, Math.PI * 2); x.fill();
    } else {
      var fs = Math.max(16, Math.min(56, s * (obj.length > 3 ? .16 : .3)));
      x.font = '400 ' + fs + 'px ' + getComputedStyle(document.body).fontFamily;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(obj, cx, cy);
    }
    x.restore();
  }
  // 從鏡頭前掠過的東西：車燈（左→右）、樹幹（右→左）、一群鳥（左下→右上）
  function drawWipe(x, kind, k, vw, vh) {
    x.save();
    if (kind === 'lights') {
      var lx = -vw * .6 + k * vw * 1.9, y = vh * .62;
      x.globalCompositeOperation = 'lighter';
      [[.16, 'rgba(255,190,120,.35)'], [.05, 'rgba(255,230,190,.8)'], [.012, 'rgba(255,255,240,1)']].forEach(function (b) {
        var g = x.createLinearGradient(lx, 0, lx + vw * .6, 0);
        g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(1, b[1]);
        x.fillStyle = g; x.fillRect(lx, y - vh * b[0] / 2, vw * .6, vh * b[0]);
      });
    } else if (kind === 'trunk') {
      var w = vw * .2, tx = vw * 1.05 - k * (vw * 1.1 + w);
      var g2 = x.createLinearGradient(tx, 0, tx + w, 0);
      g2.addColorStop(0, 'rgba(18,12,24,0)'); g2.addColorStop(.18, 'rgba(18,12,24,.94)'); g2.addColorStop(.82, 'rgba(26,18,30,.94)'); g2.addColorStop(1, 'rgba(18,12,24,0)');
      x.fillStyle = g2; x.fillRect(tx, 0, w, vh);
    } else if (kind === 'birds') {
      x.strokeStyle = 'rgba(40,24,52,.85)'; x.lineCap = 'round'; x.lineWidth = Math.max(2, Math.min(vw, vh) * .006);
      for (var i = 0; i < 7; i++) {
        var bx = -vw * .2 + (k * 1.4 - i * .05) * vw, by = vh * (.95 - k * .9) + Math.sin(i * 2.1) * vh * .08, s = Math.min(vw, vh) * (.03 + (i % 3) * .008);
        var f = Math.sin(k * 40 + i) * s * .6;
        x.beginPath(); x.moveTo(bx - s, by - f); x.quadraticCurveTo(bx - s * .4, by - s * .2, bx, by); x.quadraticCurveTo(bx + s * .4, by - s * .2, bx + s, by - f); x.stroke();
      }
    }
    x.restore();
  }
  function cut(dir, toId) {
    var film = window.SG_FILM;
    if (reduceMotion || !cutX || !film || !film.still || jumping) return;
    var now0 = performance.now();
    if (now0 - lastCut < 250) return;
    lastCut = now0;
    var place = PLACES[toId] || PLACES.hello;
    var vw = innerWidth, vh = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cutCvs.width = Math.round(vw * dpr); cutCvs.height = Math.round(vh * dpr);
    // 每一格：哪一種窗、哪一顆鏡頭（先畫好在小畫布上）、疊什麼東西、多長
    var beat = musicOn() ? 60 / 172 / 2 * 1000 : 0, t = place.wipe ? 120 : 0, frags = [], n = 4 + Math.floor(Math.random() * 3);
    var kinds = ['squares', 'band', 'slit', 'corner'];
    for (var i = 0; i < n; i++) {
      var kind; do { kind = pick(kinds); } while (kind === lastShape);
      lastShape = kind;
      var c = document.createElement('canvas');
      c.width = 240; c.height = Math.max(120, Math.round(240 * vh / vw));
      film.still(place.shots[i % place.shots.length], 2 + Math.random() * 40, c);
      var len = beat ? beat * (Math.random() < .5 ? 1 : 2) : FRAME * 2 * (2 + Math.floor(Math.random() * 2));
      frags.push({ from: t, to: t + len, win: windowShape(kind, vw, vh), img: c, obj: Math.random() < .6 ? pick(place.objs) : '' });
      t += len;
    }
    var end = t, wipeLen = place.wipe ? 340 : 0;
    var run = ++cutRun, shown = -1;
    film.hold = true; film.wake();                        // 窗開著的時候，影片要繼續播
    function step(now) {
      if (run !== cutRun) return;
      var el = now - now0, f = Math.floor(el / FRAME);
      if (f !== shown) {
        shown = f;
        var tf = f * FRAME;
        cutX.setTransform(dpr, 0, 0, dpr, 0, 0);
        cutX.clearRect(0, 0, vw, vh);
        frags.forEach(function (g) {
          if (tf < g.from || tf >= g.to) return;
          var sx = g.img.width / vw, sy = g.img.height / vh;
          g.win.rects.forEach(function (r) {
            var w = Math.min(r[2], vw - r[0]), h = Math.min(r[3], vh - r[1]);
            if (w > 0 && h > 0) cutX.drawImage(g.img, r[0] * sx, r[1] * sy, w * sx, h * sy, r[0], r[1], w, h);
          });
          if (g.obj) drawObject(cutX, g.obj, g.win.cx, g.win.cy, g.win.s);
        });
        if (wipeLen && tf < wipeLen) drawWipe(cutX, place.wipe, tf / wipeLen, vw, vh);
      }
      if (el < Math.max(end, wipeLen) + FRAME) requestAnimationFrame(step);
      else { cutCvs.width = cutCvs.height = 0; film.hold = false; film.wake(); }
    }
    requestAnimationFrame(step);
  }
  function pageAt(id) { return pages.indexOf(document.getElementById(id)); }

  // ---------- 彩蛋 ----------
  // 不寫在任何看得到的地方。聲音在 music.js（配樂每一圈播一次），每一頁各藏一顆小光，用同一個時鐘一起閃。
  // 一個單位＝配樂的八分音符；點 1、劃 3、點劃之間 1、字母之間 3、單字之間 7。offset 讓它避開第 8 小節的全靜音斷點。
  var MORSE = window.SG_MORSE = (function () {
    var on = [], u = 0;
    '-.-- --- ..- / .... . .- .-. ... / .. -'.split(' ').forEach(function (g, i, all) {
      if (g === '/') { u += 4; return; }                   // 單字之間：字母間的 3 再加 4
      g.split('').forEach(function (s, si) { var n = s === '.' ? 1 : 3; on.push([u, n]); u += n; if (si < g.length - 1) u += 1; });
      if (i < all.length - 1) u += 3;
    });
    return { unit: 60 / 172 / 2, offset: 6, on: on, loop: 60 / 172 * 4 * 16 };
  })();
  (function morseLights() {
    var dots = Array.prototype.slice.call(document.querySelectorAll('.morse'));
    if (!dots.length || reduceMotion) return;
    var lit = false, t0 = performance.now();
    function tick() {
      var now = performance.now(), film = window.SG_FILM, t = musicOn() && film && film.time ? film.time() : (now - t0) / 1000;
      var pos = (t % MORSE.loop) / MORSE.unit - MORSE.offset, on = false;
      for (var i = 0; i < MORSE.on.length; i++) { var o = MORSE.on[i]; if (pos >= o[0] && pos < o[0] + o[1]) { on = true; break; } }
      if (on !== lit) { lit = on; dots.forEach(function (d) { d.classList.toggle('on', on); }); }
      setTimeout(tick, document.hidden ? 1000 : 40);   // 一個單位約 174ms，40ms 看一次就夠；切到背景就慢下來
    }
    tick();
  })();

  // ---------- 第二頁的地方：夜裡的建築 ----------
  // 橫向片後面一整排很淡的大樓，跟著片一起往左走，像沿著街走過去。
  // 亮著的窗戶數＝排版預覽裡現在有幾行字：打越多行，街上越亮。其中一扇窗藏著彩蛋的小光。
  (function placeCity() {
    var c = document.querySelector('.place-city');
    if (!c || !c.getContext) return;
    var reel = c.parentNode, ta = document.getElementById('r-in'), dot = reel.querySelector('.morse'), x = c.getContext('2d');
    var blds = [], seed = 11, queued = false;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function build(w, h) {
      blds = []; seed = 11;
      for (var px = rnd() * 40; px < w; ) { var bw = 70 + rnd() * 130; blds.push([px, bw, h * (.22 + rnd() * .5)]); px += bw + 4 + rnd() * 24; }
    }
    function draw() {
      queued = false;
      var w = reel.offsetWidth, h = Math.round(c.offsetHeight);
      if (!w || !h) return;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; build(w, h); }
      var night = root.dataset.theme === 'night', wins = [];
      x.clearRect(0, 0, w, h);
      x.fillStyle = night ? 'rgba(255,236,228,.03)' : 'rgba(58,20,66,.035)';
      blds.forEach(function (b) {
        x.fillRect(b[0], h - b[2], b[1], b[2]);
        for (var yy = h - b[2] + 12; yy < h - 10; yy += 15) for (var xx = b[0] + 9; xx < b[0] + b[1] - 12; xx += 15) wins.push([xx, yy]);
      });
      var lines = ta ? ta.value.split('\n').length : 8, lit = Math.min(wins.length, lines * 4);
      x.fillStyle = night ? 'rgba(255,200,150,.26)' : 'rgba(194,87,127,.16)';
      for (var i = 0; i < lit; i++) { var wn = wins[(i * 7919) % wins.length]; x.fillRect(wn[0], wn[1], 4, 6); }
      if (dot && wins.length) { var m = wins[Math.floor(wins.length * .37)]; dot.style.left = (m[0] + 1) + 'px'; dot.style.top = 'calc(100% - ' + (h - m[1] - 1) + 'px)'; }
    }
    function later() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
    if (ta) ta.addEventListener('input', later);
    document.addEventListener('click', function (e) { if (e.target.closest('.panel-side, .ruler')) later(); });   // 置中、靠左這些按鈕是程式改字，不會觸發 input
    addEventListener('resize', later);
    new MutationObserver(later).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    later();
  })();

  // ---------- 第四頁：角色的心理測驗 ----------
  // 每次從題庫隨機抽 5 題、選項順序也打亂；每個選項幫一到兩個角色加分，最高分的就是結果，同分隨機。
  // 題目跟結果文案都是暫定的：之後換成 Lia 的題庫跟她改過的文案（只放不露骨的介紹，想認識角色的人去 Discord）。
  var QUIZ = {
    results: {
      chen: { name: '陳勁', line: '白天開物流車、晚上縮在客廳沙發的年下。笑起來像討糖吃的弟弟，但他最懂怎麼丈量距離。', link: '' },
      song: { name: '宋承安', line: '三十二歲的字體設計師，會把傘整把傾向你那邊。字距可以精準對齊，對你的心動卻排不好。', link: '' },
      lin: { name: '藺如生', line: '照顧你照顧得無微不至、精準得有點可怕的人。他在學怎麼當一個人，也在學怎麼愛你。', link: '' },
      li: { name: '李懿', line: '搬回台南老宅之後，你的運氣好得不像話。那不是巧合，是有人在悄悄下聘。', link: '' },
      hiiragi: { name: '柊 蒼介', line: '架空的幕府時代，一個被買進府裡的伴讀。眼神冷得像清晨的雨，手裡總拿著一把竹戒尺。', link: '' },
      jiang: { name: '江啓銘', line: '一九五〇年代的街頭，他是寸步不讓的那個人；門一關上，他只想被你接住。', link: '' },
      zulkura: { name: 'The Lost of Zul’Kura', line: '飛機殘骸、被遺棄的島，三雙眼睛已經聞到你的氣味。你要逃，還是反過來成為獵人？', link: '' }
    },
    pool: [
      { q: '週末早上，你最想做什麼？', a: [{ t: '睡到自然醒', w: { chen: 2, lin: 1 } }, { t: '去老街吃一碗鹹粥', w: { li: 2, song: 1 } }, { t: '把房間整理到發光', w: { lin: 2, hiiragi: 1 } }, { t: '說走就走，去沒去過的地方', w: { zulkura: 2, jiang: 1 } }] },
      { q: '你的手機桌布是？', a: [{ t: '自己拍的天空', w: { song: 2, lin: 1 } }, { t: '推的照片', w: { chen: 2 } }, { t: '古畫或和風插畫', w: { hiiragi: 2, li: 1 } }, { t: '從來沒換過', w: { jiang: 2, zulkura: 1 } }] },
      { q: '朋友傳來一句「在嗎」，你會？', a: [{ t: '秒回「在！」', w: { chen: 2, lin: 1 } }, { t: '想好措辭再回', w: { song: 2, hiiragi: 1 } }, { t: '等他把話說完', w: { li: 2 } }, { t: '直接打電話過去', w: { jiang: 2, zulkura: 1 } }] },
      { q: '哪一種味道最讓你放鬆？', a: [{ t: '剛洗好的衣服', w: { chen: 2 } }, { t: '木頭跟一點點皂香', w: { song: 2 } }, { t: '下過雨的空氣', w: { lin: 2, zulkura: 1 } }, { t: '廟裡的線香', w: { li: 2, hiiragi: 1 } }] },
      { q: '突然多了一週假，你去哪？', a: [{ t: '海島，越遠越好', w: { zulkura: 2 } }, { t: '待在家追劇', w: { chen: 1, lin: 2 } }, { t: '京都那種有老街的地方', w: { hiiragi: 2, li: 1 } }, { t: '看展、逛舊書店', w: { song: 1, jiang: 2 } }] },
      { q: '朋友說你最像哪種動物？', a: [{ t: '小狗', w: { chen: 2 } }, { t: '貓', w: { hiiragi: 2, song: 1 } }, { t: '鳥', w: { jiang: 2, lin: 1 } }, { t: '狐狸', w: { li: 2, zulkura: 1 } }] },
      { q: '吵架的時候，你通常會？', a: [{ t: '先冷靜下來再說', w: { song: 2, hiiragi: 1 } }, { t: '當場講清楚', w: { jiang: 2, chen: 1 } }, { t: '默默記在小本本上', w: { chen: 2, li: 1 } }, { t: '先走開，晚點再回來', w: { zulkura: 2, lin: 1 } }] },
      { q: '最想住在哪裡？', a: [{ t: '頂樓加蓋，看得到夜景', w: { chen: 2 } }, { t: '有一隻老狗的小公寓', w: { song: 2 } }, { t: '海邊', w: { lin: 1, zulkura: 2 } }, { t: '有院子的老房子', w: { li: 2, hiiragi: 1 } }] },
      { q: '雨下得很大，你沒帶傘。', a: [{ t: '等雨停', w: { hiiragi: 2, lin: 1 } }, { t: '衝了再說', w: { zulkura: 2, chen: 1 } }, { t: '傳訊息給會來接我的人', w: { song: 2 } }, { t: '躲進最近的咖啡店看書', w: { jiang: 2, li: 1 } }] }
    ]
  };
  (function quiz() {
    var box = document.querySelector('.quiz');
    if (!box) return;
    var vStart = box.querySelector('.quiz-start'), vQ = box.querySelector('.quiz-q'), vR = box.querySelector('.quiz-result');
    var qn = vQ.querySelector('.quiz-n'), qt = vQ.querySelector('.quiz-text'), qo = vQ.querySelector('.quiz-opts');
    var list = [], at = 0, score = {}, byKey = false;
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function show(v, step) {
      [vStart, vQ, vR].forEach(function (x) { x.hidden = x !== v; });
      box.dataset.step = step;
      v.classList.remove('in'); void v.offsetWidth; v.classList.add('in');   // 每次換畫面都重播一次進場
    }
    function begin() { score = {}; list = shuffle(QUIZ.pool.slice()).slice(0, 5); at = 0; ask(); }
    function ask() {
      var q = list[at];
      qn.textContent = (at + 1) + ' / ' + list.length;
      qt.textContent = q.q;
      qo.innerHTML = '';
      shuffle(q.a.slice()).forEach(function (o) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.className = 'quiz-opt'; b.textContent = o.t;
        b.addEventListener('click', function (e) {
          byKey = e.detail === 0;                          // detail 0＝鍵盤按 Enter／空白鍵
          for (var k in o.w) score[k] = (score[k] || 0) + o.w[k];
          at++;
          if (at < list.length) ask(); else finish();
        });
        li.appendChild(b); qo.appendChild(li);
      });
      show(vQ, 'q');
      if (byKey) qo.querySelector('button').focus();
    }
    function finish() {
      var best = [], top = -1;
      Object.keys(QUIZ.results).forEach(function (k) {
        var v = score[k] || 0;
        if (v > top) { top = v; best = [k]; } else if (v === top) best.push(k);
      });
      var key = best[Math.floor(Math.random() * best.length)], r = QUIZ.results[key];
      vR.querySelector('.quiz-name').textContent = r.name;
      vR.querySelector('.quiz-line').textContent = r.line;
      var img = vR.querySelector('.quiz-img');
      img.setAttribute('aria-label', r.name);
      img.dataset.initial = r.name.charAt(0);
      img.style.backgroundImage = r.img ? 'url("' + r.img + '")' : '';
      var a = vR.querySelector('.quiz-link');
      a.hidden = !r.link; if (r.link) a.href = r.link;
      show(vR, 'result');
      var nm = vR.querySelector('.quiz-name');
      nm.setAttribute('tabindex', '-1');
      if (byKey) nm.focus();
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-quiz]');
      if (b) { byKey = e.detail === 0; begin(); }
    });
  })();

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
    if (markedId && markedId !== id) cut(pageAt(id) - pageAt(markedId), id);
    markedId = id;
    var sec = document.getElementById(id);
    if (sec) sec.classList.add('seen');   // 這頁第一次出現（作品頁的名單從右邊排進來）
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
