// space.grapefruit：主題切換、複製、顏文字換臉、特殊字體、工具卡片左右滑、目前在哪一頁
(function () {
  var root = document.documentElement;
  var TR = window.TRCore || null;   // 跟排版尺共用的核心（/threads-ruler/core.js）：臉、手勢、14 種字體

  // ---------- 深色／淺色 ----------
  document.querySelector('.theme').addEventListener('click', function () {
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
    var done = function () { say('已複製　' + text); };
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
    var text = input.value.trim() || 'space grapefruit';
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

  // ---------- 工具卡片：左右箭頭 ----------
  var track = document.querySelector('.track');
  document.querySelectorAll('.arrow').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = track.querySelector('.card');
      var step = card ? card.getBoundingClientRect().width + 16 : 300;
      track.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
    });
  });

  // ---------- 目前在哪一頁：右側目錄、手機分頁列、頂列字色 ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.rail a, .tabbar a'));
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  function mark(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('on-film', id === 'hello');
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    pages.forEach(function (p) { io.observe(p); });
  }
  mark('hello');
})();
