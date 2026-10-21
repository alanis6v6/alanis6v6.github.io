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
  var cur = null;   // 目前這個顏文字拆開的樣子 {start,end,l,o,inner,c,r}
  // 跟排版尺一樣：只換括號跟手勢那一段，前後的東西（╯︵ ┻━┻、♪、凹）原樣留著
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
      var next = { l: cur.l, o: cur.o, inner: cur.inner, c: cur.c, r: cur.r };
      if (b.dataset.swap === 'face') {
        next.inner = pick(TR.ALL_FACES.filter(function (f) { return f !== cur.inner.trim(); }));
      } else {
        var body = pick(TR.BODIES.filter(function (x) { return !(x.l === cur.l && x.r === cur.r && x.o === cur.o); }));
        next.l = body.l; next.o = body.o; next.c = body.c; next.r = body.r;
      }
      var raw = now.textContent, str = TR.kaoString(next);
      now.textContent = raw.slice(0, cur.start) + str + raw.slice(cur.end);
      next.start = cur.start; next.end = cur.start + str.length; cur = next;   // 直接記住換好的這組，不重新拆（拆的結果可能跟前後的字黏在一起）
    });
  });
  now.addEventListener('click', function () { copy(now.textContent); });
  document.querySelector('[data-copy-now]').addEventListener('click', function () { copy(now.textContent); });
  setKao(now.textContent.trim());
  if (list[0]) list[0].setAttribute('aria-pressed', 'true');

  // ---------- 顏文字、分隔線的分類：按一個分類，下面換那一組 ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cat]');
    if (!t) return;
    var box = t.closest('.panel-main');
    box.querySelectorAll('[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); });
    box.querySelectorAll('.cat-group').forEach(function (g) { g.hidden = g.id !== t.dataset.cat; });
    var list = document.getElementById(t.dataset.cat).parentNode;
    list.scrollTop = 0;
    // 手機上整格一起捲：換了分類以後，分類那一排要還看得到
    var d = t.closest('.cat-tabs').getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (d < 0) box.scrollTop += d - 8;
  });

  // 顏文字、分隔線的清單：放得下、不用捲的時候，滑鼠在上面上下滑就是換頁（不要被清單攔住）
  function fitLists() {
    document.querySelectorAll('.kao-list, .lines-list').forEach(function (l) { l.classList.toggle('fits', l.scrollHeight <= l.clientHeight + 1); });
  }
  addEventListener('resize', fitLists);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-cat]')) requestAnimationFrame(fitLists); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLists);
  fitLists();

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
  // 量字寬用預覽實際的字（電腦版預覽的字比較大，寬度照「幾個字」算，換行的位置跟手機一樣）
  var mctx = document.createElement('canvas').getContext('2d');
  function measure(t) { var cs = getComputedStyle(rOut); mctx.font = cs.fontSize + ' ' + cs.fontFamily; return mctx.measureText(t).width; }
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
  // 手機：一次只看一個欄位。[預覽]／[編輯] 切換；預覽下面的按鈕複製後直接開脆的發文畫面
  var rBox = document.querySelector('.panel-main.ruler'), rView = rBox.querySelector('.r-view');
  rView.addEventListener('click', function () {
    var pv = rBox.dataset.view !== 'preview';
    rBox.dataset.view = pv ? 'preview' : 'edit';
    rView.textContent = pv ? '編輯' : '預覽';
    if (pv) preview();
  });
  rBox.querySelector('.r-copy2').addEventListener('click', function () { document.getElementById('r-copy').click(); });
  rBox.querySelector('.r-send').addEventListener('click', function () {
    var t = rIn.value;
    if (TR) t = TR.fillBlankLines(TR.convertSpaces(t, 'smart'));
    copy(t);
    window.open('https://www.threads.com/intent/post?text=' + encodeURIComponent(t), '_blank', 'noopener');
  });
  document.querySelectorAll('.note-toggle').forEach(function (b) {
    var n = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      n.classList.toggle('open', open);
    });
  });
  rIn.addEventListener('input', preview);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(preview);
  addEventListener('resize', preview);   // 跨過手機／電腦的寬度時預覽字級會變
  preview();

  // ---------- 排版預覽裡的小面板：點兩下顏文字換臉、換手勢；＋顏文字；＋分隔線 ----------
  // 跟完整的翠排版尺一樣：新加的顏文字會直接打開換臉的面板。面板掛在 body 上（橫向片有 transform，fixed 會跟著跑）
  var pop = document.createElement('div');
  pop.className = 'r-pop frame'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '顏文字');
  document.body.appendChild(pop);
  var popAt = -1;   // 現在面板在改的那個顏文字從第幾個字開始（換臉後長度會變，但開頭不變）
  var editing = false;   // 自己改 textarea 的時候（換臉、插入）不算使用者打字
  function kaoAtPop() { var r = null; if (TR) TR.parseKao(rIn.value).forEach(function (m) { if (m.start === popAt) r = m; }); return r; }
  // 改 textarea 裡的一段字：用 insertText，Cmd+Z 還能復原；不支援的瀏覽器才直接改 value
  function replaceRange(a, b, text) {
    editing = true;
    rIn.focus();
    rIn.setSelectionRange(a, b);
    var ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) {}
    if (!ok || rIn.value.slice(a, a + text.length) !== text) rIn.value = rIn.value.slice(0, a) + text + rIn.value.slice(b);
    rIn.setSelectionRange(a + text.length, a + text.length);
    editing = false;
    preview();
  }
  function closePop() {
    pop.hidden = true; popAt = -1;
    document.querySelectorAll('[data-add]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  // 面板開著時自己在框裡打字，顏文字的位置可能跑掉，先把面板收起來
  rIn.addEventListener('input', function () { if (!editing && !pop.hidden) closePop(); });
  addEventListener('resize', function () { if (!pop.hidden) closePop(); });
  function place(x, y) {
    pop.hidden = false;
    var w = pop.offsetWidth, h = pop.offsetHeight;
    if (innerWidth < 640) { pop.classList.add('sheet'); pop.style.left = pop.style.top = ''; return; }
    pop.classList.remove('sheet');
    pop.style.left = Math.max(12, Math.min(x, innerWidth - w - 12)) + 'px';
    pop.style.top = (y + h + 12 > innerHeight ? Math.max(12, y - h - 16) : y + 12) + 'px';
  }
  function chip(label, on, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'p-chip'; b.textContent = label;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.addEventListener('click', fn);
    return b;
  }
  function head(title, tabs) {
    var h = document.createElement('div'); h.className = 'p-head';
    var t = document.createElement('b'); t.textContent = title; h.appendChild(t);
    (tabs || []).forEach(function (x) { h.appendChild(x); });
    var c = document.createElement('button'); c.type = 'button'; c.className = 'chip p-close'; c.textContent = '關閉';
    c.addEventListener('click', function () { closePop(); rIn.focus(); });
    h.appendChild(c);
    return h;
  }
  var kaoTab = 'face';
  function renderKaoPop() {
    var m = kaoAtPop();
    if (!m) { closePop(); return; }
    pop.innerHTML = '';
    var tabs = [['face', '換臉'], ['body', '換手勢']].map(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t[1];
      b.setAttribute('aria-pressed', kaoTab === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () { kaoTab = t[0]; renderKaoPop(); });
      return b;
    });
    var rnd = document.createElement('button'); rnd.type = 'button'; rnd.className = 'chip'; rnd.textContent = '隨機';
    rnd.addEventListener('click', function () {
      if (kaoTab === 'face') swap({ inner: pick(TR.ALL_FACES.filter(function (f) { return f !== m.inner.trim(); })) });
      else { var b = pick(TR.BODIES.filter(function (x) { return !(x.l === m.l && x.r === m.r && x.o === m.o); })); swap({ l: b.l, o: b.o, c: b.c, r: b.r }); }
    });
    tabs.push(rnd);
    pop.appendChild(head(TR.kaoString(m), tabs));
    var body = document.createElement('div'); body.className = 'p-body';
    function grid(items) { var g = document.createElement('div'); g.className = 'p-grid'; g.lang = 'und'; items.forEach(function (x) { g.appendChild(x); }); return g; }
    function label(t) { var l = document.createElement('p'); l.className = 'p-label'; l.textContent = t; return l; }
    if (kaoTab === 'face') {
      TR.FACES.forEach(function (g) {
        body.appendChild(label(g[0]));
        body.appendChild(grid(g[1].map(function (f) {
          return chip(TR.kaoString({ l: m.l, o: m.o, inner: f, c: m.c, r: m.r }), m.inner.trim() === f, function () { swap({ inner: f }); });
        })));
      });
    } else {
      body.appendChild(label('手勢（臉不變）'));
      body.appendChild(grid(TR.BODIES.map(function (b) {
        return chip(TR.kaoString({ l: b.l, o: b.o, inner: m.inner, c: b.c, r: b.r }), b.l === m.l && b.r === m.r && b.o === m.o, function () { swap({ l: b.l, o: b.o, c: b.c, r: b.r }); });
      })));
    }
    pop.appendChild(body);
  }
  function swap(change) {
    var m = kaoAtPop();
    if (!m) { closePop(); return; }
    var next = { l: m.l, o: m.o, inner: m.inner, c: m.c, r: m.r };
    Object.keys(change).forEach(function (k) { next[k] = change[k]; });
    var keep = pop.querySelector('.p-body'), top = keep ? keep.scrollTop : 0;
    var focusIdx = Array.prototype.indexOf.call(pop.querySelectorAll('button'), document.activeElement);
    replaceRange(m.start, m.end, TR.kaoString(next));
    renderKaoPop();
    if (pop.hidden) return;
    pop.querySelector('.p-body').scrollTop = top;
    var again = pop.querySelectorAll('button')[focusIdx];   // 用鍵盤換的話，焦點留在剛剛按的那顆
    if (focusIdx > -1 && again) again.focus({ preventScroll: true });
  }
  function openKao(at, x, y, focusPop) {
    var hit = null;
    TR.parseKao(rIn.value).forEach(function (m) { if (!hit && m.start <= at && at <= m.end) hit = m; });
    if (!hit) return false;
    popAt = hit.start; pop.dataset.kind = 'kao';
    renderKaoPop(); place(x, y);
    if (focusPop) { var on = pop.querySelector('.p-chip[aria-pressed="true"]') || pop.querySelector('.p-chip'); if (on) on.focus({ preventScroll: true }); }
    return true;
  }
  if (TR) {
    rIn.addEventListener('dblclick', function (e) {
      if (openKao(rIn.selectionStart, e.clientX, e.clientY)) {
        var m = kaoAtPop();
        rIn.setSelectionRange(m.end, m.end);   // 點兩下會選到半個字，改成游標停在顏文字後面
      }
    });
    // 鍵盤：游標停在顏文字上按 Alt＋Enter，一樣打開換臉的面板（焦點移進面板，Esc 回到框裡）
    rIn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.altKey) return;
      var r = rIn.getBoundingClientRect();
      if (openKao(rIn.selectionStart, r.left + 24, r.top + 60, true)) e.preventDefault();
    });
  } else document.querySelectorAll('[data-add], .r-hint').forEach(function (b) { b.hidden = true; });
  // 新的一段（顏文字、分隔線）插在游標的位置；分隔線自己佔一行
  function insertAt(text, ownLine) {
    var v = rIn.value, a = document.activeElement === rIn || rIn.dataset.at == null ? rIn.selectionEnd : Math.min(Number(rIn.dataset.at), v.length);
    if (ownLine) {
      if (a > 0 && v[a - 1] !== '\n') text = '\n' + text;
      if (a < v.length && v[a] !== '\n') text += '\n';
    }
    replaceRange(a, a, text);
    return a + (ownLine && text[0] === '\n' ? 1 : 0);
  }
  rIn.addEventListener('blur', function () { rIn.dataset.at = rIn.selectionEnd; });
  var divGroups = Array.prototype.map.call(document.querySelectorAll('.lines-list .cat-group'), function (g) {
    return [g.getAttribute('aria-label'), Array.prototype.map.call(g.querySelectorAll('button'), function (b) { return b.textContent.trim(); })];
  });
  var divTab = 0;
  function renderDivPop() {
    pop.innerHTML = '';
    var tabs = divGroups.map(function (g, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = g[0];
      b.setAttribute('aria-pressed', i === divTab ? 'true' : 'false');
      b.addEventListener('click', function () { divTab = i; renderDivPop(); });
      return b;
    });
    pop.appendChild(head('分隔線', []));
    var t = document.createElement('div'); t.className = 'p-tabs'; tabs.forEach(function (x) { t.appendChild(x); }); pop.appendChild(t);
    var body = document.createElement('div'); body.className = 'p-body p-lines'; body.lang = 'und';
    (divGroups[divTab] || ['', []])[1].forEach(function (d) {
      body.appendChild(chip(d, false, function () { insertAt(d, true); closePop(); }));
    });
    pop.appendChild(body);
  }
  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 按鈕不要搶走游標，才知道要插在哪裡
    b.addEventListener('click', function (e) {
      var r = b.getBoundingClientRect();
      if (b.dataset.add === 'kao') {
        var at = insertAt(TR.DDI + '(' + pick(TR.ALL_FACES) + ')', false);
        kaoTab = 'face';
        if (openKao(at, r.left, r.bottom, e.detail === 0)) b.setAttribute('aria-expanded', 'true');
      } else {
        if (!pop.hidden && pop.dataset.kind === 'div') { closePop(); return; }
        pop.dataset.kind = 'div'; popAt = -1;
        renderDivPop(); place(r.left, r.bottom);
        b.setAttribute('aria-expanded', 'true');
        var first = pop.querySelector('.p-tabs .chip[aria-pressed="true"]'); if (first && e.detail === 0) first.focus({ preventScroll: true });   // 用鍵盤按的才把焦點移進去
      }
    });
  });
  document.addEventListener('pointerdown', function (e) {
    if (!pop.hidden && !e.target.closest('.r-pop, [data-add]') && e.target !== rIn) closePop();
  });
  document.addEventListener('keydown', function (e) {
    var fb = document.getElementById('feedback');
    if (e.key === 'Escape' && !pop.hidden && (!fb || fb.hidden)) { closePop(); rIn.focus(); }
  });
  addEventListener('scroll', function () { if (!pop.hidden && !pop.classList.contains('sheet')) closePop(); }, { passive: true });

  // ---------- 意見回饋：站內的卡片 ----------
  // 送進 Lia 的 Google 表單（跟 /threads-ruler/feedback/ 同一份）。Google 表單不放行 CORS，
  // 所以用一個隱藏的 <form> 送到隱藏 iframe；iframe 載入就當作送到了（讀不到真正的成功或失敗）。
  (function feedback() {
    var box = document.getElementById('feedback');
    if (!box) return;
    var GFORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd_Ui4vzMzKY3KZe3sRTwWWUUw1TxBK2NpzRmB3UfbF82mWVQ/formResponse';
    var ENTRY = { nick: 'entry.561309518', kind: 'entry.1780542497', device: 'entry.2066103744', bugText: 'entry.945527014', otherText: 'entry.1684751049', contact: 'entry.623276364' };
    var BUG = { 'Bug回報': 1, '建議': 1 };   // 這兩種會多問在哪個裝置遇到的，內容填在表單的另一題
    var form = box.querySelector('form'), status = box.querySelector('.fb-status'), devs = box.querySelector('.fb-devices');
    var sendBtn = box.querySelector('.fb-send'), frame = document.querySelector('iframe[name="fb-google-frame"]');
    var back = null, sending = false, hideTimer = 0;
    function say(t, bad) { status.textContent = t; status.classList.toggle('bad', !!bad); }
    function open() {
      clearTimeout(hideTimer);
      if (!pop.hidden) closePop();
      back = document.activeElement;
      box.hidden = false;
      document.documentElement.classList.add('fb-open');
      requestAnimationFrame(function () { box.classList.add('on'); box.querySelector('.fb-title').focus({ preventScroll: true }); });
    }
    function close() {
      box.classList.remove('on');
      document.documentElement.classList.remove('fb-open');
      hideTimer = setTimeout(function () { box.hidden = true; }, reduceMotion ? 0 : 280);
      if (location.hash === '#feedback') window.history.replaceState(null, '', location.pathname + location.search);
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-feedback]')) { e.preventDefault(); open(); }
    });
    box.querySelector('.fb-close').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });   // 點卡片外面也關
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {   // 焦點留在卡片裡
        var f = Array.prototype.filter.call(box.querySelectorAll('button, a[href], input:not(.fb-trap), textarea'), function (x) { return !x.disabled && x.getClientRects().length; });
        var first = f[0], last = f[f.length - 1], at = f.indexOf(document.activeElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); last.focus(); }   // 剛打開時焦點在標題上，也算在最前面
        else if (!e.shiftKey && (at === f.length - 1 || at < 0)) { e.preventDefault(); first.focus(); }
      }
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'kind') devs.hidden = !BUG[e.target.value];
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var kind = (form.querySelector('input[name="kind"]:checked') || {}).value;
      var body = form.body.value.trim();
      var chosen = Array.prototype.filter.call(form.querySelectorAll('input[name="device"]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!kind) { say('先選一個想說的是什麼 ˊ_>ˋ', true); return; }
      if (BUG[kind] && !chosen.length) { say('選一下你在哪裡遇到的 ˊ_>ˋ', true); return; }
      if (body.length < 4) { say('再多寫一點點，我才知道怎麼幫你', true); form.body.focus(); return; }
      if (form.website.value) { say('謝謝你，我收到了！'); form.reset(); devs.hidden = true; return; }   // 機器人：安靜丟掉
      var last = 0;
      try { last = +localStorage.getItem('threads-ruler-fb') || 0; } catch (err) {}
      if (Date.now() - last < 30000) { say('剛剛才送出過，等一下下再試 ˊ_>ˋ', true); return; }
      sending = true; sendBtn.disabled = true; say('送出中…');
      var g = document.createElement('form');
      g.action = GFORM; g.method = 'POST'; g.target = 'fb-google-frame'; g.hidden = true;
      function add(n, v) { var i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; g.appendChild(i); }
      add(ENTRY.nick, form.nick.value.trim()); add(ENTRY.kind, kind);
      if (BUG[kind]) { chosen.forEach(function (d) { add(ENTRY.device, d); }); add(ENTRY.bugText, body); }
      else add(ENTRY.otherText, body);
      add(ENTRY.contact, form.contact.value.trim());
      document.body.appendChild(g);
      var done = false;
      function finish() {
        if (done) return;
        done = true; sending = false; sendBtn.disabled = false;
        try { localStorage.setItem('threads-ruler-fb', Date.now()); } catch (err) {}
        if (window.gtag) window.gtag('event', 'feedback_submit', { kind: kind, from: 'home' });
        g.remove(); form.reset(); devs.hidden = true;
        say('收到了，謝謝你 ♡ 我會一則一則看。');
      }
      frame.addEventListener('load', finish, { once: true });
      setTimeout(finish, 4000);   // 保險：iframe 沒觸發 load 也要讓人知道送完了
      g.submit();
    });
    if (location.hash === '#feedback') open();
  })();


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
  function syncSound(on) {
    if (on === undefined) on = !kv.muted;
    kvSound.setAttribute('aria-pressed', on ? 'true' : 'false'); kvSound.textContent = on ? '關聲音' : '開聲音';
  }
  function playBoth() {
    // 有聲音的影片被瀏覽器擋自動播放時（例如滑走再滑回來），改成靜音再播
    kv.play().catch(function () { giveBack(.3); kv.muted = true; syncSound(); kv.play().catch(function () {}); });
  }
  // 背景音樂開著的時候滑到這頁（或按「開聲音」）：配樂淡出、影片原本的音樂淡入；影片停了或離開這頁再換回來。
  // 影片的聲音接進配樂的 AudioContext，用 GainNode 調大小（iPhone 改不了 video.volume）。
  var FADE = 1.5, kvG = null, handoff = false, kvVis = false, userMuted = false, unmutedAt = 0, ourPauseAt = 0, backTimer, leaveTimer;
  function music() { return window.SG_MUSIC; }
  function stopKv() { ourPauseAt = Date.now(); kv.pause(); }   // 自己停的，跟「瀏覽器擋掉才停」分開
  function kvGain(from, to, secs) {
    if (!kvG) return;
    var t = music().ctx().currentTime, g = kvG.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(from === null ? g.value : from, t); g.linearRampToValueAtTime(to, t + secs);
  }
  function takeOver() {
    var M = music();
    if (handoff || !M || !M.on()) return false;
    if (!kvG) {
      try {
        var ctx = M.ctx(), g = ctx.createGain();
        ctx.createMediaElementSource(kv).connect(g); g.connect(ctx.destination);
        kvG = g; M.keep = true;
      } catch (e) { return false; }
    }
    clearTimeout(backTimer);
    handoff = true; userMuted = false;
    M.ctx().resume();
    kvGain(0, 1, FADE);
    kv.muted = false; unmutedAt = Date.now(); syncSound();
    M.makeWay(true, FADE);
    return true;
  }
  function giveBack(secs) {
    if (!handoff) return;
    handoff = false;
    kvGain(null, 0, secs);
    music().makeWay(false, secs);
    syncSound(false);
    clearTimeout(backTimer);
    backTimer = setTimeout(function () { if (!handoff) { kv.muted = true; kvGain(1, 1, .01); } }, secs * 1000 + 60);   // 淡完才真的靜音
  }
  document.addEventListener('sg-music', function (e) {
    if (e.detail && kvVis && !kv.paused && !userMuted && kat.dataset.state === 'full') takeOver();
    if (!e.detail) giveBack(.4);
  });
  kv.addEventListener('pause', function () {
    // iPhone 不讓沒有點擊就把影片打開聲音，會直接停掉：換回配樂，影片靜音繼續播
    var blocked = handoff && kvVis && !kv.ended && Date.now() - unmutedAt < 600 && Date.now() - ourPauseAt > 1000;
    giveBack(blocked ? .2 : FADE);
    if (blocked) { clearTimeout(backTimer); kv.muted = true; kvGain(1, 1, .01); kv.play().catch(function () {}); }
  });
  kv.addEventListener('ended', function () { giveBack(FADE); if (kat.dataset.state === 'full') setState('popup'); });
  kv.addEventListener('click', function () {
    if (!kv.paused) { stopKv(); return; }
    playBoth(); if (!userMuted) takeOver();
  });
  kvSkip.addEventListener('click', function () { stopKv(); setState('popup'); });
  kvReplay.addEventListener('click', function () { kv.currentTime = 0; kv.play().catch(function () {}); if (!userMuted) takeOver(); });
  kvSound.addEventListener('click', function () {
    if (handoff) { userMuted = true; giveBack(FADE); return; }   // 關聲音：影片的音樂淡掉、配樂淡回來
    if (kv.muted && takeOver()) { if (kv.paused) playBoth(); return; }
    clearTimeout(backTimer);
    kv.muted = !kv.muted;
    userMuted = kv.muted;
    syncSound();
    if (!kv.muted) {
      if (music() && music().on()) music().pause();   // 接不上淡入淡出時照舊：開影片聲音就關掉配樂
      if (kvG) { music().ctx().resume(); kvGain(1, 1, .01); }
      if (kv.paused) playBoth();
    }
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
    if (pull > 90) { pull = 0; stopKv(); setState('docked'); lockUntil = Date.now() + 700; }
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
    if (d > 40) { touchY = null; stopKv(); setState('docked'); lockUntil = Date.now() + 700; }
  }, { passive: false });
  if (reduceMotion) setState('docked');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var vis = kvVis = en[0].isIntersecting;
      if (vis) clearTimeout(leaveTimer);
      if (vis && kat.dataset.state === 'full') { playBoth(); if (!userMuted) takeOver(); }
      if (!vis) {
        clearTimeout(leaveTimer);
        if (!handoff) { stopKv(); return; }
        giveBack(1);                                   // 滑走時影片的音樂淡掉、配樂淡回來，淡完才停
        leaveTimer = setTimeout(function () { if (!kvVis) stopKv(); }, 1100);
      }
    }, { threshold: .6 }).observe(kat);
  }
  addEventListener('resize', function () { if (kat.dataset.state === 'docked') measureCopy(); });

  // ---------- 影片標題 ----------
  // 想像第一頁的影片鋪在整個網站最底下：第二頁之後的大標題是字形的窗，看到的是影片「在這個位置」的那一塊。
  // 做法：標題上疊一張畫布，先畫字形，再用 source-in 把影片對應位置的畫面填進字裡；真的文字留著（透明），給搜尋引擎跟讀螢幕軟體。
  function filmTitles() {
    var film = window.SG_FILM;
    if (!film || !film.canvas) return;
    // 標題的字一個一個畫，所以每個字可以自己動（學 sweet-tape.com）：
    //   進場：照隨機順序從自己那格的下緣升上來（initReveal：.6 秒、power3.out、每字錯開 .045 秒）
    //   滑鼠靠近：以字的底部為軸浮起、往滑鼠反方向歪、放大（initPoke：半徑 .8 個字高、最多 11°、1.08 倍），離開時像彈簧一樣彈回去
    //   離場（只有角色頁的大過場用）：一個一個往上散掉
    var animate = !reduceMotion && 'IntersectionObserver' in window;
    var items = Array.prototype.slice.call(document.querySelectorAll('.ft')).map(function (el) {
      var c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      el.appendChild(c);
      var n = Array.from(el.textContent).length;
      var tilt = (el.dataset.tilt || '').split(',').map(Number), lift = (el.dataset.lift || '').split(',').map(Number);
      var st = [];
      for (var i = 0; i < n; i++) st.push({ rv: animate ? 0 : 1, out: 0, t0: 0, d: 0, br: tilt[i] || 0, by: (lift[i] || 0) / 100, py: 0, pr: 0, ps: 1, vy: 0, vr: 0, vs: 0, ty: 0, tr: 0, ts: 1, cx: 0, cy: 0 });
      return { el: el, c: c, x: c.getContext('2d'), vis: false, st: st, mode: '', leaving: 0, hold: el.hasAttribute('data-hold') };
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
    function ease3(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); }
    // 畫一個字：(cx, cy) 是這個字那一格的中心、cw × chh 是格子大小（都在目前畫布座標裡）；fn 在字的底部中心畫字
    function glyph(x, s, cx, cy, cw, chh, fs, fn) {
      var off = (1 - ease3(s.rv)) * chh * 1.3 - ease3(s.out) * chh * 1.3;   // 還沒升上來的在格子下面，散掉的往上跑
      x.save();
      if (s.rv < 1 || s.out > 0) { x.beginPath(); x.rect(cx - cw / 2 - fs * .15, cy - chh / 2 - fs * .25, cw + fs * .3, chh + fs * .5); x.clip(); }
      x.translate(cx, cy + chh / 2 + off + (s.by + s.py) * fs);
      x.rotate((s.br + s.pr) * Math.PI / 180);
      x.scale(s.ps, s.ps);
      fn();
      x.restore();
    }
    // 每個字的開頭在瀏覽器裡實際排在哪（相對畫布左緣；直書橫倒的英文是相對字的上緣），用 Range 量；字級、寬度沒變就沿用上次量的
    var fontGen = 0;
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { fontGen++; });   // 字型晚到時寬高不一定變，位置要重量
    function places(it, r, n, side, padY) {               // side：直書裡橫倒的英文，量的是往下的距離
      var node = it.el.firstChild, key = r.width + 'x' + r.height + '#' + fontGen;
      if (it.atKey === key) return it.at;
      if (!node || node.nodeType !== 3 || !document.createRange || Array.from(node.data).length !== n) return null;
      var rg = document.createRange(), at = [], o = 0, txt = node.data, k = side ? it.c.offsetHeight / r.height : it.c.offsetWidth / r.width;   // k：被 CSS 縮放時換回畫布座標
      for (var i = 0; i < n; i++) {
        var len = txt.codePointAt(o) > 0xffff ? 2 : 1;
        rg.setStart(node, o); rg.setEnd(node, o + len);
        var b = rg.getBoundingClientRect();
        at.push(side ? (b.top - r.top) * k - padY : (b.left - r.left) * k);
        o += len;
      }
      it.atKey = key; it.at = at;
      return at;
    }
    function draw(it) {
      var el = it.el, c = it.c, x = it.x, r = c.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
      if (!r.width || !w) return;
      var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, 6144 / w)), cw = Math.round(w * dpr), ch = Math.round(h * dpr);   // 超寬的字（角色段的四行）解析度設上限，但至少 1 倍
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), chars = Array.from(el.textContent), padX = -c.offsetLeft, padY = -c.offsetTop;
      var ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0, st = it.st;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      x.fillStyle = '#000';
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      var vertical = cs.writingMode.indexOf('vertical') === 0, sideways = vertical && /sideways/.test(cs.textOrientation);
      it.mode = sideways ? 'side' : vertical ? 'v' : 'h';
      if (vertical && !sideways) {
        // 直書：一個字一個字往下排，每個字置中在那一欄
        x.textAlign = 'center'; x.textBaseline = 'middle';
        var colX = padX + el.offsetWidth / 2, y = padY;
        chars.forEach(function (chr, i) {
          var s0 = st[i] || st[0];
          s0.cx = r.left + colX; s0.cy = r.top + y + fs / 2;
          glyph(x, s0, colX, y + fs / 2, fs, fs, fs, function () { x.fillText(chr, 0, -fs / 2); });
          y += fs + ls;
        });
      } else {
        // 橫書（或直書裡橫倒的英文）：照每個字的寬度排；基線照 CSS 的行高算，畫出來才會跟原本的字疊得剛好
        var m = x.measureText(el.textContent), asc = m.fontBoundingBoxAscent || fs * .88, desc = m.fontBoundingBoxDescent || fs * .12;
        var lh = parseFloat(cs.lineHeight) || fs * 1.2, lineH = asc + desc;
        x.textAlign = 'left'; x.textBaseline = 'alphabetic';
        x.save();
        var base;
        if (sideways) {
          // 直書裡的英文是整串往右轉 90°：畫布也轉過去，在轉過去的座標裡橫著排
          x.translate(padX + el.offsetWidth / 2, padY); x.rotate(Math.PI / 2);
          base = (asc - desc) / 2;                       // 這一行的中心在 y = 0
        } else {
          x.translate(0, padY); base = (lh - lineH) / 2 + asc;
        }
        var px0 = sideways ? 0 : padX, at = places(it, r, chars.length, sideways, padY);
        chars.forEach(function (chr, i) {
          var s0 = st[i] || st[0], gw = x.measureText(chr).width, top = base - asc;
          if (at) px0 = at[i];      // 照瀏覽器排出來的位置放，不靠畫布自己量（兩邊量的寬度會差一點，累積到最後一個字就超出畫布被切掉）
          var mid = px0 + gw / 2;
          // 字的中心在螢幕上的位置（滑鼠戳的時候用）
          if (sideways) { s0.cx = r.left + padX + el.offsetWidth / 2 - (top + lineH / 2); s0.cy = r.top + padY + mid; }
          else { s0.cx = r.left + mid; s0.cy = r.top + padY + top + lineH / 2; }
          glyph(x, s0, mid, top + lineH / 2, gw, lineH, fs, function () { x.fillText(chr, -gw / 2, -(top + lineH) + base); });
          px0 += gw + ls;
        });
        x.restore();
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

    // ---------- 字的動畫：有東西在動的時候才每幀重畫，停下來就交回給影片的節奏 ----------
    var REVEAL = { DUR: 600, STAGGER: 45 }, POKE = { R: .8, LIFT: .08, ROT: 11, SCALE: .08 };
    var running = false, last = 0, mx = -1e5, my = -1e5, poking = matchMedia('(hover: hover) and (pointer: fine)').matches && animate;
    function busy(it) {
      return it.st.some(function (s) {
        return s.rv < 1 && s.t0 || s.leaving || Math.abs(s.py - s.ty) > .0005 || Math.abs(s.pr - s.tr) > .05 || Math.abs(s.ps - s.ts) > .0005 ||
          Math.abs(s.vy) > .001 || Math.abs(s.vr) > .05 || Math.abs(s.vs) > .001;
      }) || it.leaving;
    }
    function tick(now) {
      var dt = Math.min(now - (last || now), 40) / 1000; last = now;
      var any = false;
      items.forEach(function (it) {
        if (!it.vis && !it.leaving) return;
        var fsz = parseFloat(getComputedStyle(it.el).fontSize) || 16, R = POKE.R * fsz;
        it.st.forEach(function (s) {
          if (s.t0 && s.rv < 1) s.rv = Math.min(1, (now - s.t0 - s.d) / REVEAL.DUR < 0 ? 0 : (now - s.t0 - s.d) / REVEAL.DUR);
          if (s.leaving) { s.out = Math.max(0, (now - s.leaving - s.d) / REVEAL.DUR); if (s.out >= 1) { s.out = 1; s.leaving = 0; } }
          // 滑鼠戳：目標值照距離算（smoothstep），再用彈簧追上去，離開時就會晃一下彈回來
          var a = 0, side = 0;
          if (poking && s.rv >= 1 && !s.out) {
            var tt = Math.min(1, Math.max(0, 1 - Math.hypot(mx - s.cx, my - s.cy) / R));
            a = tt * tt * (3 - 2 * tt);
            side = Math.max(-1, Math.min(1, (it.mode === 'side' ? my - s.cy : mx - s.cx) / (.5 * R)));
            if (a > .45 && !s.hot) { s.hot = true; if (window.SG_SFX) { var pn = Math.max(-1, Math.min(1, s.cx / innerWidth * 2 - 1)); SG_SFX.whoosh(.32, .12, 2400, 800, pn - .25, pn + .25); } }
            if (a < .15) s.hot = false;
          }
          s.ty = -POKE.LIFT * a; s.tr = -POKE.ROT * a * side; s.ts = 1 + POKE.SCALE * a;
          var K = 170, D = 13;
          s.vy += ((s.ty - s.py) * K - s.vy * D) * dt; s.py += s.vy * dt;
          s.vr += ((s.tr - s.pr) * K - s.vr * D) * dt; s.pr += s.vr * dt;
          s.vs += ((s.ts - s.ps) * K - s.vs * D) * dt; s.ps += s.vs * dt;
        });
        if (it.leaving && it.st.every(function (s) { return !s.leaving; })) { var cb = it.onLeft; it.leaving = 0; it.onLeft = null; if (cb) cb(); }
        draw(it);
        if (busy(it)) any = true;
      });
      if (any) requestAnimationFrame(tick); else { running = false; last = 0; }
    }
    function run() { if (!running) { running = true; requestAnimationFrame(tick); } }
    function order(n) { var o = []; for (var i = 0; i < n; i++) o.push(i); for (var j = n - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), t = o[j]; o[j] = o[k]; o[k] = t; } return o; }
    function reveal(it, delay, ltr) {                       // ltr：從左到右，不然照隨機順序
      if (!animate) return;
      var now = performance.now(), o = order(it.st.length);
      it.leaving = 0; it.onLeft = null;
      it.st.forEach(function (s, i) { s.rv = 0; s.out = 0; s.leaving = 0; s.t0 = now + (delay || 0); s.d = ltr ? i * 85 : o[i] * REVEAL.STAGGER; });
      run();
    }
    function leave(it, cb) {
      if (!animate) { if (cb) cb(); return; }
      var now = performance.now(), o = order(it.st.length);
      it.st.forEach(function (s, i) { s.leaving = now; s.d = o[i] * REVEAL.STAGGER * .6; });
      it.leaving = now; it.onLeft = cb || null;
      run();
    }
    function byEl(el) { return items.filter(function (i) { return i.el === el; })[0]; }
    window.SG_TITLES = {
      reveal: function (el, delay, ltr) { var it = byEl(el); if (it) reveal(it, delay, ltr); },
      leave: function (el, cb) { var it = byEl(el); if (it) leave(it, cb); else if (cb) cb(); },
      draw: function (el) { var it = byEl(el); if (it) { it.vis = true; draw(it); } }
    };
    if (poking) addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      // 只有滑鼠在某個看得到的標題附近時才動起來
      if (items.some(function (it) {
        if (!it.vis) return false;
        var b = it.el.getBoundingClientRect(), pad = (parseFloat(getComputedStyle(it.el).fontSize) || 16) * 1.2;
        return mx > b.left - pad && mx < b.right + pad && my > b.top - pad && my < b.bottom + pad;
      }) || items.some(function (it) { return it.vis && (busy(it) || poked(it)); })) run();
    }, { passive: true });
    function poked(it) { return it.st.some(function (s) { return Math.abs(s.pr) > .05 || Math.abs(s.py) > .0005 || Math.abs(s.ps - 1) > .0005; }); }
    function rest(it) { it.st.forEach(function (s) { s.py = s.pr = s.vy = s.vr = s.vs = s.ty = s.tr = 0; s.ps = s.ts = 1; }); }
    function drawVisible() { items.forEach(function (it) { if (it.vis) draw(it); }); }
    film.listeners.push(drawVisible);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          var it = items.find(function (i) { return i.el === e.target; });
          it.vis = e.isIntersecting;
          if (!it.vis) rest(it);
          if (it.vis) {
            draw(it);
            // 保險：標題在畫面裡卻一直露不到六成（很矮的螢幕），一秒多之後還是讓它升上來
            if (animate && !it.hold) setTimeout(function () { var b = it.el.getBoundingClientRect(); if (it.vis && b.top < innerHeight && b.bottom > 0 && b.left < innerWidth && b.right > 0 && it.st.every(function (s) { return !s.t0; })) reveal(it, 0); }, 1300);
          }
        });
        film.keep = items.filter(function (i) { return i.vis; }).length;   // 有影片標題在畫面上，影片就繼續播
        film.wake();
      });
      items.forEach(function (it) { io.observe(it.el); });
      if (animate) {
        var seenIO = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            var it = items.find(function (i) { return i.el === e.target; });
            if (!it) return;
            var enough = e.intersectionRatio >= .6 || (e.intersectionRect.width >= innerWidth * .5 && e.intersectionRect.height >= e.boundingClientRect.height * .6);
            if (enough && !it.inView) { it.inView = true; if (!it.hold) reveal(it, 80); }
            if (!e.isIntersecting && e.intersectionRatio === 0) it.inView = false;   // 整個離開畫面才算，下次進來再升一次
          });
        }, { threshold: Array.from({ length: 31 }, function (_, i) { return i / 50; }) });   // 很寬的字露出的比例很小，門檻要切細才接得到
        items.forEach(function (it) { seenIO.observe(it.el); });
      }
    } else items.forEach(function (it) { it.vis = true; });
    window.SG_TITLES.hold = function (el, on) { var it = byEl(el); if (it) it.hold = on; };
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
    var y = topOf(target), smooth = !reduceMotion, from = markedId, to = target.closest('.page, .cast-track').id;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    var done = false;
    function restore() { if (done) return; done = true; window.scrollTo({ top: y }); html.style.scrollSnapType = ''; jumping = false; if (to !== from) cutTo(pageAt(to) - pageAt(from), to); mark(to); }
    if ('onscrollend' in window) addEventListener('scrollend', restore, { once: true });
    setTimeout(restore, Math.min(4000, 1200 + Math.abs(y - scrollY) / innerHeight * 120));   // 跨過很長的角色段要久一點，不然還沒到就被中途吸住
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target || !(target.classList.contains('page') || target.classList.contains('cast-track') || target.classList.contains('reel-snap'))) return;
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
    works: { wipe: 'birds', shots: ['sky', 'flare', 'sky'], objs: ['fruit', '( ˶ᵔ ᵕ ᵔ˶ )'] },
    contact: { wipe: '', shots: ['flare', 'sky', 'flare'], objs: ['✦', '( ˶ᵔ ᵕ ᵔ˶ )'] }
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
  // 點 1、劃 3、點劃之間 1、字母之間 3、單字之間 7；offset 讓它在第 8 小節的全靜音斷點之前就播完。
  var MORSE = window.SG_MORSE = (function () {
    var on = [], u = 0;
    '-.-- --- ..- / .... . .- .-. -.. / .. -'.split(' ').forEach(function (g, i, all) {
      if (g === '/') { u += 4; return; }                   // 單字之間：字母間的 3 再加 4
      g.split('').forEach(function (s, si) { var n = s === '.' ? 1 : 3; on.push([u, n]); u += n; if (si < g.length - 1) u += 1; });
      if (i < all.length - 1) u += 3;
    });
    return { unit: 60 / 172 / 4, offset: 4, on: on, loop: 60 / 172 * 4 * 16 };   // 十六分音符一個單位，整句在前奏跟 build 裡（鼓還沒全進來）播完
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
      setTimeout(tick, document.hidden ? 1000 : 20);   // 一個單位約 87ms，20ms 看一次；切到背景就慢下來
    }
    tick();
  })();

  // ---------- 潮點框 ----------
  // 顏文字、分隔線的清單不畫外框，只在格子跟格子「之間」排一道細細的點（像表格的內框線：四格就是一個十字）。
  // 點的大小、形狀都不太一樣，顏色取網站色票，照位置跟時間像海浪一樣慢慢流過去；
  // 游標（或手指）經過的地方，只有附近一小段的點變深，像沙子被推過，離開後再慢慢淡回去。
  // 用鍵盤移到某一格、還有選中的那個顏文字，圍著那格的點整圈變深（滑鼠滑過去不會整圈變）。特殊字體的清單也一樣。
  // 整頁共用一張固定的畫布，只在那三格工具出現在畫面上時才動。
  (function tideFrame() {
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel-main.kao, .panel-main.lines, .type-out')).map(function (el) { return el.closest('.panel-main'); });
    if (!panels.length) return;
    var cvs = document.createElement('canvas'), x = cvs.getContext('2d');
    cvs.className = 'tide'; cvs.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cvs);
    var SEL = '.kao-list .cat-group:not([hidden]), .lines-list .cat-group:not([hidden]), .type-out';
    var seen = new Set(), lineOf = new WeakMap(), pal = [], deep = [], running = false, last = 0, px = -9999, py = -9999, dpr = 1, W = 0, H = 0, hot = null, focusCell = null;
    var GAP = 6, REACH = 110, PUSH = 5, STEPS = 20, PRESS = 6;

    // 色票：葡萄柚紅粉、果肉、果皮、黃昏紫、深金。CSS 用的是 oklch，先畫一個點讀回 RGB 再拿來混
    function readPalette() {
      var cs = getComputedStyle(root), t = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      function rgb(v) {
        t.clearRect(0, 0, 1, 1); t.fillStyle = '#7b4a6e'; t.fillStyle = v || '#7b4a6e';
        t.fillRect(0, 0, 1, 1); var d = t.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
      }
      pal = ['--pink', '--fruit', '--rind', '--gold', '--pink'].map(function (v) { return rgb(cs.getPropertyValue(v).trim()); });
      pal.splice(3, 0, [123, 74, 110]);
      deep = rgb(cs.getPropertyValue('--ink').trim());
    }
    // 顏色表：橫的是浪（色票裡的位置），直的是被推過幾次（越深越往墨色靠）；深色模式的墨是淺的，改成往濃的粉紅靠
    var shades = [];
    function makeShades() {
      var night = root.dataset.theme === 'night', toward = night ? pal[0] : deep;
      shades = [];
      for (var p = 0; p < PRESS; p++) {
        var row = [], m = p / (PRESS - 1) * (night ? .55 : .78);
        for (var i = 0; i < STEPS; i++) {
          var f = i / (STEPS - 1) * (pal.length - 1), j = Math.min(pal.length - 2, Math.floor(f)), k = f - j, a = pal[j], b = pal[j + 1];
          var c = [0, 1, 2].map(function (n) { var v = a[n] + (b[n] - a[n]) * k; return Math.round(v + (toward[n] - v) * m); });
          row.push('rgb(' + c.join(',') + ')');
        }
        shades.push(row);
      }
    }
    // 一組清單的內框線：同一列相鄰兩格中間一條直線，相鄰兩列中間一條橫線；最外圈不畫
    function segments(g) {
      var cells = Array.prototype.slice.call(g.children).map(function (c) { return c.getBoundingClientRect(); }).filter(function (r) { return r.width && r.height; });
      if (cells.length < 2) return [];
      var rows = [];
      cells.forEach(function (r) {
        var row = rows.find(function (w) { return Math.abs(w[0].top - r.top) < 4; });
        if (row) row.push(r); else rows.push([r]);
      });
      rows.forEach(function (w) { w.sort(function (a, b) { return a.left - b.left; }); });
      var segs = [];
      rows.forEach(function (w, ri) {
        var top = ri ? (rows[ri - 1][0].bottom + w[0].top) / 2 : w[0].top, next = rows[ri + 1];
        var bot = next ? (w[0].bottom + next[0].top) / 2 : w[0].bottom;
        for (var i = 0; i < w.length - 1; i++) { var vx = (w[i].right + w[i + 1].left) / 2; segs.push([vx, top, vx, bot]); }
        if (next) {
          var hy = (w[0].bottom + next[0].top) / 2, l = Math.max(w[0].left, next[0].left), r = Math.min(w[w.length - 1].right, next[next.length - 1].right);   // 最後一列不滿時，只畫到下面有格子的地方（上面那格底下沒東西就不是內框線）
          segs.push([l, hy, r, hy]);
        }
      });
      return segs;
    }
    // 每一條線自己的一串點：位置用「沿線的比例」記；大小、扁圓、角度、左右偏一點都是亂數，被推過的深淺（press）記在點上
    function dotsFor(g, i, len) {
      var all = lineOf.get(g); if (!all) { all = []; lineOf.set(g, all); }
      var n = Math.max(4, Math.round(len / GAP)), d = all[i];
      if (d && d.length === n) return d;
      d = [];
      for (var j = 0; j < n; j++) d.push({
        t: (j + .5 + (Math.random() - .5) * .6) / n, r: Math.random() < .07 ? 1.5 + Math.random() * .5 : .45 + Math.random() * .85,
        e: .55 + Math.random() * .75, a: Math.random() * Math.PI, o: (Math.random() - .5) * 2.2, s: Math.random(), p: 0
      });
      all[i] = d;
      return d;
    }
    function clipOf(el) {
      var r = { l: 0, t: 0, r: innerWidth, b: innerHeight };
      ['.kao-list', '.lines-list', '.type-out', '.panel-main'].forEach(function (s) {
        var c = el.closest(s); if (!c) return;
        var b = c.getBoundingClientRect();
        r.l = Math.max(r.l, b.left - 2); r.t = Math.max(r.t, b.top - 2); r.r = Math.min(r.r, b.right + 2); r.b = Math.min(r.b, b.bottom + 2);
      });
      return r;
    }
    function frame(now) {
      running = false;
      if (!seen.size) { x.clearRect(0, 0, W, H); return; }
      if (!reduceMotion) { running = true; requestAnimationFrame(frame); }   // 減少動態：不連續播，只在捲動、換分類時重畫
      if (!reduceMotion && now - last < 33) return;                    // 一秒 30 格就夠了
      last = now;
      // iOS 捲動時網址列伸縮會改變高度：畫布只在變寬、或需要更高時才重新配置
      if (W !== innerWidth || innerHeight > H) {
        var turned = W !== innerWidth;
        dpr = Math.min(window.devicePixelRatio || 1, 2); H = turned ? innerHeight : Math.max(innerHeight, H); W = innerWidth;
        cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      }
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      var time = reduceMotion ? 0 : now / 1000, buckets = [];
      for (var i = 0; i < STEPS * PRESS; i++) buckets.push([]);
      document.querySelectorAll(SEL).forEach(function (g) {
        var p = g.closest('.panel-main');
        if (!p || !seen.has(p)) return;
        var c = clipOf(g), rings = [];
        [hot, g.querySelector('[aria-pressed="true"]')].forEach(function (el) {   // 滑到的那格、選中的那格
          if (!el || el.parentNode !== g) return;
          var r = el.getBoundingClientRect();
          rings.push({ l: r.left - 18, t: r.top - 18, r: r.right + 18, b: r.bottom + 18 });   // 格子間距的一半再多一點，剛好圈到四周的內框線
        });
        segments(g).forEach(function (sg, si) {
          var dx = sg[2] - sg[0], dy = sg[3] - sg[1], len = Math.sqrt(dx * dx + dy * dy);
          if (len < 4) return;
          var nx = -dy / len, ny = dx / len;                       // 垂直線的方向，點往兩邊偏一點，不排成死板的一直線
          dotsFor(g, si, len).forEach(function (d) {
            var gx = sg[0] + dx * d.t + nx * d.o, gy = sg[1] + dy * d.t + ny * d.o;
            if (gx < c.l || gx > c.r || gy < c.t || gy > c.b) return;
            var bx = gx, by = gy;   // 判斷遠近、浪的位置都用原本的位置，推開只是畫的時候偏過去
            // 被推過：游標附近的點一下子變深，離開以後慢慢淡回去，像沙上留下的痕跡；選中的那格、鍵盤移到的那格四周整圈都深
            var on = rings.some(function (hr) { return gx > hr.l && gx < hr.r && gy > hr.t && gy < hr.b; }) ? 1 : 0;
            if (!reduceMotion) {
              // 離游標越近越深，用平滑的曲線收掉邊緣，才不會一圈硬硬的
              var vx = gx - px, vy = gy - py, dist = Math.sqrt(vx * vx + vy * vy), f = dist < REACH ? 1 - dist / REACH : 0;
              f = f * f * (3 - 2 * f);
              var k = Math.max(on, f);
              d.p = k > d.p ? d.p + (k - d.p) * .3 : d.p * .95;
              // 游標附近的點往外推開一點（像手指劃過水面），越近推越多；離開以後跟著淡回原位
              if (f > 0 && dist > .5) { d.ux = vx / dist; d.uy = vy / dist; }   // 方向記在點上：游標離開視窗（px 變 -9999）時照原方向淡回去，不會一起歪向同一邊
              d.q = (d.q || 0) + ((f * PUSH) - (d.q || 0)) * .2;
              if (d.ux !== undefined) { gx = Math.min(c.r, Math.max(c.l, gx + d.ux * d.q)); gy = Math.min(c.b, Math.max(c.t, gy + d.uy * d.q)); }
            } else d.p = on;
            var wave = (Math.sin((bx * .9 + by * .5) * .011 - time * .55 + d.s * .8) + 1) / 2;
            var wi = Math.min(STEPS - 1, Math.floor(wave * STEPS)), pi = Math.min(PRESS - 1, Math.round(d.p * (PRESS - 1)));
            buckets[pi * STEPS + wi].push(gx, gy, d.r * (1 + d.p * .4), d.e, d.a + time * .2 * (d.s - .5));
          });
        });
      });
      buckets.forEach(function (q, i) {
        if (!q.length) return;
        var pi = Math.floor(i / STEPS), wi = i % STEPS;
        x.fillStyle = shades[pi][wi]; x.globalAlpha = Math.min(1, .5 + wi / (STEPS - 1) * .35 + pi * .12);
        x.beginPath();
        for (var j = 0; j < q.length; j += 5) { x.moveTo(q[j] + q[j + 2], q[j + 1]); x.ellipse(q[j], q[j + 1], q[j + 2], q[j + 2] * q[j + 3], q[j + 4], 0, Math.PI * 2); }
        x.fill();
      });
      x.globalAlpha = 1;
    }
    function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }
    readPalette(); makeShades();
    new MutationObserver(function () { readPalette(); makeShades(); wake(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
        wake();
      });
      panels.forEach(function (p) { io.observe(p); });
    } else panels.forEach(function (p) { seen.add(p); });
    addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    addEventListener('pointerleave', function () { px = py = -9999; });
    document.addEventListener('pointerout', function (e) { if (!e.relatedTarget) px = py = -9999; });   // 滑鼠直接移出視窗：那一段的點也要淡回去
    addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') px = py = -9999; });
    addEventListener('scroll', wake, { passive: true, capture: true });   // 清單自己捲動的 scroll 不會冒泡，要用 capture 才收得到
    addEventListener('resize', wake);
    document.addEventListener('click', function (e) { if (e.target.closest('[data-cat], [data-kao]')) requestAnimationFrame(wake); });
    // 現在滑到（或鍵盤移到）哪一格：清單裡的按鈕本身就是一格，特殊字體是外面那層 li
    function cellOf(el) {
      var b = el && el.closest && el.closest('.kao-list .cat-group > button, .lines-list .cat-group > button, .type-out button');
      return b ? b.closest('.type-out > li') || b : null;
    }
    // 鍵盤移到的那格整圈變深（滑鼠就只有游標附近變深）
    function setHot() { hot = focusCell; wake(); }

    document.addEventListener('focusin', function (e) { var c = cellOf(e.target); focusCell = c && e.target.matches(':focus-visible') ? c : null; setHot(); });
    document.addEventListener('focusout', function (e) { if (focusCell && focusCell.contains(e.target)) { focusCell = null; setHot(); } });
    var typeIn = document.getElementById('type-in');
    if (typeIn) typeIn.addEventListener('input', function () { requestAnimationFrame(wake); });   // 特殊字體依輸入重排，減少動態時也要重畫
    wake();
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
    // 往右一格／往左一格。左右滑只在這條片裡換格：第一格再往左、最後一格再往右就停在那裡，
    // 不換到上一頁／下一頁（觸控板的慣性很容易一路衝過頭）；要離開這條片用上下捲
    var lock = 0;
    function go(dir) {   // 回傳 false＝還在上一次換格的冷卻時間裡，這一下不算數
      if (Date.now() < lock) return false;
      var k = Math.round(pos) + dir;
      if (k < 0 || k >= n) return true;
      lock = Date.now() + 450;
      jump(k === 0 ? sec : snaps[k]);
      return true;
    }
    // 一次手勢（中間停不到 200 毫秒的一串 wheel）一開始就判定是「左右」還是「上下」：
    // 判定成左右的，整串（包含慣性尾巴裡夾著的上下量）都不讓頁面上下捲，才不會被吸附帶到別頁
    var acc = 0, used = false, gesture = '', accTimer;
    addEventListener('wheel', function (e) {
      if (!inside()) return;
      var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
      if (!gesture) {
        if (ax < 2 && ay < 2) return;
        gesture = ax > ay * 1.2 ? 'x' : 'y';
      } else if (gesture === 'y' && ax > 4 && ax > ay * 3) gesture = 'x';   // 上下捲的慣性還沒停就馬上左右滑：明顯是左右的就改判
      clearTimeout(accTimer); accTimer = setTimeout(function () { acc = 0; used = false; gesture = ''; }, 200);
      if (gesture !== 'x') return;
      var own = e.target.closest && e.target.closest('textarea, .r-preview, .cat-tabs, .p-tabs');
      if (own && own.scrollWidth > own.clientWidth + 2) return;   // 真的能左右捲的（太寬的預覽、分類列）是捲它自己
      if (e.cancelable) e.preventDefault();                                        // 也擋掉 Chrome 往右滑＝上一頁
      if (used) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 30) { used = go(acc > 0 ? 1 : -1); if (!used) acc = 0; }   // 同一次手勢只換一格
    }, { passive: false });
    addEventListener('keydown', function (e) {
      if (!inside() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    });
    var sx = null, sy = 0;
    sec.addEventListener('touchstart', function (e) {
      var pv = e.target.closest('.r-preview, .cat-tabs'), own = e.target.closest('textarea, input') || (pv && pv.scrollWidth > pv.clientWidth + 2);
      sx = own ? null : e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    sec.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // ---------- 最後一頁：跟我聯絡（sweet-tape.com 最末頁的做法） ----------
  // 下面那堆貼紙交給 Matter.js 物理（assets/matter.min.js，快捲到這頁才載入）：一拍一顆（172 BPM）從左右射進來、往各自的落點攤開，
  // 滑鼠划過依「多近、多快」推開，可以抓起來甩（甩完放開不算點擊），撞到會被壓扁一下，背景音樂開著時還會「咚」。
  // 物理參數照 sweet-tape 的 footer balls：restitution .32、friction .16、frictionAir .004、拖曳 stiffness .06／damping .08、速度上限 85vw/秒。
  (function contactPit() {
    var sec = document.getElementById('contact'), pit = sec && sec.querySelector('.pit');
    if (!pit) return;
    var els = Array.prototype.slice.call(pit.querySelectorAll('.sticker'));
    var NS = 'http://www.w3.org/2000/svg';
    // 貼紙外形：圓的，或波浪邊（Katsuji、咖啡）；白色模切邊＋光澤＋邊上一圈小字
    function scallop(R, n, bump) {
      var d = '', pts = [];
      for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2 - Math.PI / 2; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
      d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
      for (var j = 1; j <= n; j++) { var q = pts[j % n]; d += ' A' + bump + ' ' + bump + ' 0 0 1 ' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }
      return d + 'Z';
    }
    els.forEach(function (el, i) {
      var svg = document.createElementNS(NS, 'svg'), id = 'st-ring-' + i, wavy = el.dataset.shape === 'scallop';
      svg.setAttribute('class', 'st-shape'); svg.setAttribute('viewBox', '-50 -50 100 100'); svg.setAttribute('aria-hidden', 'true');
      var ring = (el.dataset.ring || '').repeat(3);
      svg.innerHTML = (wavy ? '<path class="st-bg" d="' + scallop(40, 12, 7.4) + '"/>' : '<circle class="st-bg" r="45"/>') +
        '<ellipse class="st-gloss" cx="-15" cy="-22" rx="17" ry="8" transform="rotate(-32 -15 -22)"/>' +
        '<path id="' + id + '" d="M0 -37 A37 37 0 1 1 -0.01 -37" fill="none"/>' +
        '<text class="st-ring"><textPath href="#' + id + '" textLength="230" lengthAdjust="spacing"></textPath></text>';
      svg.querySelector('textPath').textContent = ring.slice(0, Math.max(10, Math.round(230 / 3.9)));
      el.querySelector('.st-body').insertBefore(svg, el.querySelector('.st-in'));
    });

    function vw(n) { return n * innerWidth / 100; }
    function sizes() {
      var W = pit.clientWidth, H = pit.clientHeight;
      var base = Math.min(W * (innerWidth < 720 ? .36 : .165), H * .8, 300);
      els.forEach(function (el) { el.style.setProperty('--sz', Math.round(base * +el.dataset.d) + 'px'); });
    }
    function place(el, x, y, ang) { var r = el.offsetWidth / 2; el.style.transform = 'translate3d(' + (x - r).toFixed(1) + 'px,' + (y - r).toFixed(1) + 'px,0) rotate(' + ang.toFixed(3) + 'rad)'; }
    var ORDER = [0, 5, 1, 4, 2, 3];                         // 第 i 張落在第 ORDER[i] 格：左右交錯進來，落點攤開
    function homeX(i) { return pit.clientWidth * (ORDER[i] + .5) / els.length; }
    function staticLayout() {                               // 減少動態、或物理載不到：排成一排靠在地上
      sizes();
      var H = pit.clientHeight;
      els.forEach(function (el, i) { el.classList.add('in'); place(el, homeX(i), H - el.offsetWidth / 2 - 6, (i % 2 ? 1 : -1) * .08); });
    }
    if (reduceMotion) { staticLayout(); addEventListener('resize', staticLayout); return; }

    // 被撞、被滑過：壓扁一下、晃一下（只動裡面那層，外層的位置角度是物理的）
    function squash(el, k) {
      var b = el.querySelector('.st-body'); if (!b.animate) return;
      var a = 1 + .12 * k, c = 1 - .1 * k;
      b.animate([{ transform: 'scale(' + a + ',' + c + ')' }, { transform: 'scale(' + (2 - a * .98) + ',' + (2 - c * 1.02) + ')' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    function wiggle(el) {
      var b = el.querySelector('.st-body'); if (!b.animate) return;
      b.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-7deg) scale(1.05)' }, { transform: 'rotate(5deg) scale(1.05)' }, { transform: 'rotate(-2deg) scale(1.02)' }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
    }
    if (matchMedia('(hover: hover)').matches) els.forEach(function (el) { el.addEventListener('pointerenter', function () { if (!drag) wiggle(el); }); });

    // 撞到的「咚」、推的「咻」：sfx.js 現場合成（sweet-tape：撞擊速度 10 以上才響、70 最大聲、最大 .5、間隔 90ms）
    var lastHit = 0, lastPush = 0;
    function boop(vol, r) { if (window.SG_SFX) SG_SFX.boop(vol, r); }

    var M, eng, balls = [], drag = null, dragFrom = null, dragged = false, mx = -1e4, my = -1e4, mvx = 0, mvy = 0, inside = false, t0 = 0, last = 0, raf = 0, visible = false;
    function build(drop) {
      sizes();
      var W = pit.clientWidth, H = pit.clientHeight, B = M.Bodies, T = 300;
      if (!W || !H) return;
      eng = M.Engine.create({ enableSleeping: true });
      eng.gravity.y = 1; eng.gravity.scale = 60 * vw(1) / 1e6;
      var wall = function (x, y, w, h, f) { return B.rectangle(x, y, w, h, { isStatic: true, friction: f || 0, restitution: .32 }); };
      M.Composite.add(eng.world, [wall(W / 2, -H - T / 2, W + 4 * T, T), wall(W / 2, H + T / 2 - 2, W + 4 * T, T, .16), wall(-T / 2, 0, T, 6 * H), wall(W + T / 2, 0, T, 6 * H)]);
      balls = els.map(function (el, i) {
        var r = el.offsetWidth / 2, side = i % 2 ? 1 : -1, hx = homeX(i);
        var body = B.circle(drop ? (side < 0 ? r + 4 : W - r - 4) : hx, drop ? r + 4 : H - r - 4, r, { restitution: .32, friction: .16, frictionAir: .004, density: .001 });
        M.Body.setAngle(body, (Math.random() - .5) * 1.2);
        var b = { el: el, body: body, side: side, hx: hx, at: 160 + i * 60 / 172 * 1000, released: !drop, relAt: 0 };
        if (!drop) { M.Composite.add(eng.world, body); el.classList.add('in'); place(el, body.position.x, body.position.y, body.angle); }
        else el.classList.remove('in');
        return b;
      });
      M.Events.on(eng, 'collisionStart', function (ev) {
        var hit = 0, size = 0, now = performance.now();
        ev.pairs.forEach(function (pr) {
          var a = pr.bodyA, b = pr.bodyB, n = pr.collision.normal;
          var v = 60 * Math.abs((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y) / vw(1);
          if (v > 6) balls.forEach(function (x) { if (x.body === a || x.body === b) squash(x.el, Math.min(1, v / 50)); });
          if (v > hit) { hit = v; size = Math.max(a.circleRadius || 0, b.circleRadius || 0); }
        });
        if (hit > 10 && now - lastHit >= 90) { lastHit = now; boop(Math.min((hit - 10) / 60, 1) * .5, size); }
      });
      t0 = performance.now();
    }
    function step(now) {
      raf = 0;
      if (!eng || !visible) return;
      raf = requestAnimationFrame(step);
      var dt = Math.min(now - (last || now), 20); last = now;
      balls.forEach(function (b) {
        if (b.released || now - t0 < b.at) return;
        b.released = true; b.relAt = now; b.el.classList.add('in');
        M.Composite.add(eng.world, b.body);
        M.Body.setVelocity(b.body, { x: (b.hx - b.body.position.x) / 38, y: vw(6) / 60 });   // 朝自己的落點飛過去
        M.Body.setAngularVelocity(b.body, -b.side * .08);
      });
      balls.forEach(function (b) {                          // 剛進來的兩秒多往落點拉，之後完全交給物理
        if (!b.relAt || now - b.relAt > 2200 || (drag && b.body === drag.bodyB)) return;
        var k = (1 - (now - b.relAt) / 2200) * 6e-7;
        M.Body.applyForce(b.body, b.body.position, { x: (b.hx - b.body.position.x) * k * b.body.mass * vw(1), y: 0 });
      });
      if (inside && fine) {
        var sp = Math.min(Math.hypot(mvx, mvy), 60);
        if (sp > .5) balls.forEach(function (b) {
          if (!b.released || (drag && b.body === drag.bodyB)) return;
          var p = b.body.position, r = b.body.circleRadius, dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy) || 1e-4, gap = d - r;
          if (gap > vw(5)) return;
          var f = Math.min(1 - gap / vw(5), 1) * sp / 60 * b.body.mass * vw(1) / 1e4;
          M.Sleeping.set(b.body, false);
          M.Body.applyForce(b.body, { x: p.x - dx / d * r, y: p.y - dy / d * r }, { x: dx / d * f * .6 + mvx / sp * f, y: dy / d * f * .6 + mvy / sp * f });
          var hard = (1 - gap / vw(5)) * sp / 60;
          if (hard > .35 && now - lastPush > 160 && window.SG_SFX) { lastPush = now; SG_SFX.whoosh(.26, Math.min(.28, hard * .3), 900, 2600, mvx < 0 ? .4 : -.4, mvx < 0 ? -.4 : .4); }
        });
        mvx = mvy = 0;
      }
      M.Engine.update(eng, dt);
      var cap = vw(85) / 60;
      balls.forEach(function (b) {
        var v = b.body.velocity, sp2 = Math.hypot(v.x, v.y);
        if (sp2 > cap) M.Body.setVelocity(b.body, { x: v.x * cap / sp2, y: v.y * cap / sp2 });
        if (b.released) place(b.el, b.body.position.x, b.body.position.y, b.body.angle);
      });
    }
    function go() { if (!raf && visible && eng) { last = 0; raf = requestAnimationFrame(step); } }
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    function local(e) { var r = pit.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    addEventListener('pointermove', function (e) {
      if (!visible) return;
      var p = local(e);
      if (mx > -1e4) { mvx += p.x - mx; mvy += p.y - my; }
      mx = p.x; my = p.y;
      inside = p.y > -vw(6) && p.y < pit.clientHeight + vw(2);
      if (!inside) mvx = mvy = 0;
      if (drag) { drag.pointA = { x: mx, y: my }; M.Sleeping.set(drag.bodyB, false); if (Math.hypot(mx - dragFrom.x, my - dragFrom.y) > 6) dragged = true; }
    }, { passive: true });
    pit.addEventListener('pointerdown', function (e) {
      if (!eng || e.button !== 0) return;
      var p = local(e), hit = balls.filter(function (b) { return b.released && Math.hypot(b.body.position.x - p.x, b.body.position.y - p.y) <= b.body.circleRadius; })[0];
      if (!hit) return;
      mx = p.x; my = p.y; dragFrom = p; dragged = false;
      M.Sleeping.set(hit.body, false);
      var off = M.Vector.mult(M.Vector.rotate(M.Vector.sub(p, hit.body.position), -hit.body.angle), .34);
      drag = M.Constraint.create({ pointA: p, bodyB: hit.body, pointB: off, length: 0, stiffness: .06, damping: .08 });
      M.Composite.add(eng.world, drag);
      e.preventDefault();
    });
    function drop() {
      if (drag && eng) { M.Sleeping.set(drag.bodyB, false); M.Composite.remove(eng.world, drag); }
      if (drag) setTimeout(function () { dragged = false; }, 0);
      drag = null;
    }
    addEventListener('pointerup', drop); addEventListener('pointercancel', drop);
    pit.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; return; }   // 甩完放開不算點擊
      var a = e.target.closest('[data-katsuji]');
      if (a) {   // 直接跳到 Katsuji 的訂閱表單（影片先收起來）
        kv.pause(); setState('docked');
        setTimeout(function () { var inp = kat.querySelector('.notify input[type="email"]'); if (inp) inp.focus({ preventScroll: true }); }, 1100);
      }
    }, true);

    var started = false, loading = false, pausedAt = 0;
    function start() {
      if (started || !window.Matter) return;
      started = true; M = window.Matter; build(true); go();
    }
    function load() {
      if (loading || window.Matter) return;
      loading = true;
      var sc = document.createElement('script');
      sc.src = 'assets/matter.min.js'; sc.async = true;
      sc.onload = function () { if (visible) start(); };
      sc.onerror = staticLayout;
      document.head.appendChild(sc);
    }
    if (!('IntersectionObserver' in window)) { staticLayout(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) load(); }, { rootMargin: '100% 0px' }).observe(sec);
    new IntersectionObserver(function (en) {
      var was = visible;
      visible = en[0].isIntersecting;
      if (!visible && was) pausedAt = performance.now();
      if (visible && !was && pausedAt) { t0 += performance.now() - pausedAt; balls.forEach(function (b) { if (b.relAt) b.relAt += performance.now() - pausedAt; }); pausedAt = 0; }
      if (visible) { if (!started) start(); else go(); }
    }, { threshold: .35 }).observe(sec);
    // 換尺寸就直接排在地上，不再掉一次；手機捲動時網址列收合也會觸發 resize，所以只看寬度、或高度變很多才重排
    var rt, lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!started || (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120)) return;
        lastW = innerWidth; lastH = innerHeight;
        drop(); build(false); go();
      }, 200);
    });
  })();

  function cutTo(dir, id) {
    if (id === 'cards' || id === 'walkin') return;             // 角色段有自己的彗星開場，走進樹林頁是它的下一頁
    cut(dir, id);
  }

  // ---------- 目前在哪一頁：右側目錄、手機分頁列、頂列字色 ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"], .tabbar a'));
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page, .cast-track'));   // 角色段是一段很高的軌道，不是一頁
  var markedId = null;
  function mark(id) {
    if (markedId && markedId !== id) cutTo(pageAt(id) - pageAt(markedId), id);
    markedId = id;
    var sec = document.getElementById(id);
    if (sec) sec.classList.add('seen');   // 這頁第一次出現（作品頁的名單從右邊排進來）
    var hl = id === 'walkin' ? 'cards' : id;                  // 走進樹林頁算在「角色」裡
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + hl;
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
