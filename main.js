// space.grapefruit 首頁：主題切換、點一下複製、特殊字體試玩、目前看到哪一段
(function () {
  var root = document.documentElement;

  // ---------- 深色／淺色 ----------
  document.querySelector('.theme').addEventListener('click', function () {
    var next = root.dataset.theme === 'day' ? 'night' : 'day';
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
  function copy(text) {
    var done = function () { say('已複製　' + (text.length > 18 ? text.slice(0, 18) + '…' : text)); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text) ? done() : say('複製失敗，長按文字自己複製'); });
    } else {
      fallback(text) ? done() : say('複製失敗，長按文字自己複製');
    }
  }
  function fallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.fontSize = '16px';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) copy(b.dataset.copyText || b.textContent.trim());
  });

  // ---------- 特殊字體（Unicode 數學字母，跟排版尺用的是同一種） ----------
  var styles = [
    ['粗體', 0x1D400, 0x1D41A, {}],
    ['斜體', 0x1D434, 0x1D44E, { h: 0x210E }],
    ['草寫', 0x1D4D0, 0x1D4EA, {}],
    ['哥德', 0x1D504, 0x1D51E, { C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C, Z: 0x2128 }],
    ['空心', 0x1D538, 0x1D552, { C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119, Q: 0x211A, R: 0x211D, Z: 0x2124 }],
    ['打字機', 0x1D670, 0x1D68A, {}],
    ['圓圈', 0x24B6, 0x24D0, {}]
  ];
  function restyle(text, s) {
    var out = '';
    for (var ch of text) {
      var c = ch.charCodeAt(0);
      if (s[3][ch]) out += String.fromCodePoint(s[3][ch]);
      else if (c >= 65 && c <= 90) out += String.fromCodePoint(s[1] + c - 65);
      else if (c >= 97 && c <= 122) out += String.fromCodePoint(s[2] + c - 97);
      else out += ch;
    }
    return out;
  }
  var input = document.getElementById('type-in'), list = document.getElementById('type-out');
  function render() {
    var text = input.value.trim() || 'space grapefruit';
    list.innerHTML = '';
    styles.forEach(function (s) {
      var li = document.createElement('li'), b = document.createElement('button'), small = document.createElement('small');
      var out = restyle(text, s);
      b.type = 'button'; b.dataset.copy = ''; b.dataset.copyText = out;
      b.textContent = out; small.textContent = s[0];
      b.appendChild(small); li.appendChild(b); list.appendChild(li);
    });
  }
  input.addEventListener('input', render);
  render();

  // ---------- 目前看到哪一段：右側目錄＋手機分頁列一起亮 ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.rail a, .tabbar a'));
  var ids = ['top', 'ruler', 'kaomoji', 'fonts', 'dividers', 'katsuji', 'works', 'faq'];
  var seen = {};
  function mark(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting; });
      for (var i = ids.length - 1; i >= 0; i--) if (seen[ids[i]]) { mark(ids[i]); break; }
    }, { rootMargin: '-45% 0px -45% 0px' });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
