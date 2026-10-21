// 網站的小音效：全部用 Web Audio 現場合成，不用音檔（跟 music.js 的配樂同一個調，D 大調五聲音階）。
// 瀏覽器規定訪客點過頁面之前不能出聲，所以第一次點擊（或按鍵、碰螢幕）才建立 AudioContext；之前呼叫的都安靜略過。
// 用到的地方：角色段的彗星跟大樓、被滑鼠戳到的標題字、CONTACT 的貼紙。
(function () {
  var A = null, out = null, verb = null, noise = null;
  var PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7, 1318.5, 1480, 1760, 1975.5];
  function setup() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C || A) return;
    A = new C();
    out = A.createGain(); out.gain.value = .42;
    var comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    out.connect(comp); comp.connect(A.destination);
    verb = A.createConvolver();
    var len = A.sampleRate * 2.2, ir = A.createBuffer(2, len, A.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    var vg = A.createGain(); vg.gain.value = .3; verb.connect(vg); vg.connect(out);
    noise = A.createBuffer(1, A.sampleRate * 2, A.sampleRate);
    var nd = noise.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
  }
  ['pointerdown', 'keydown', 'touchstart', 'touchend', 'click'].forEach(function (ev) {   // iPhone 有時要等手指放開才算數
    addEventListener(ev, function () { setup(); if (A && A.state !== 'running') A.resume(); }, { passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', function () { if (A && document.hidden) A.suspend(); else if (A && !document.hidden) A.resume(); });
  function live() { if (A && A.state === 'interrupted') A.resume(); return A && A.state === 'running'; }   // iPhone 來電、切 App 回來會變 interrupted
  function bus(g, wet) { g.connect(out); if (wet) { var s = A.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); } }

  // 「咻」：帶通的雜訊，頻率跟左右位置一起掃（彗星、被戳到的字、推貼紙）
  function whoosh(dur, vol, f0, f1, p0, p1) {
    if (!live()) return;
    var t = A.currentTime, n = A.createBufferSource(), bp = A.createBiquadFilter(), g = A.createGain(), pan = A.createStereoPanner ? A.createStereoPanner() : null;
    n.buffer = noise; bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(f0 || 3200, t); bp.frequency.exponentialRampToValueAtTime(f1 || 700, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(bp); bp.connect(g);
    if (pan) { pan.pan.setValueAtTime(p0 == null ? -.85 : p0, t); pan.pan.linearRampToValueAtTime(p1 == null ? .5 : p1, t + dur); g.connect(pan); bus(pan, .45); } else bus(g, .45);
    n.start(t, Math.random()); n.stop(t + dur + .05);
  }
  // 像鐘琴的「叮」：主音＋兩個泛音，帶一點殘響
  function tink(f, vol, decay) {
    if (!live()) return;
    var t = A.currentTime, g = A.createGain(); g.gain.value = vol; bus(g, .55);
    [[1, 1], [2.76, .32], [5.4, .1]].forEach(function (p) {
      var o = A.createOscillator(), e = A.createGain();
      o.type = 'sine'; o.frequency.value = f * p[0];
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(p[1], t + .003); e.gain.exponentialRampToValueAtTime(.0001, t + (decay || 1.4) / p[0] * 1.6);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + 2.4);
    });
  }
  // 落地、撞到的「咚」
  function thump(vol, f) {
    if (!live()) return;
    var t = A.currentTime, o = A.createOscillator(), g = A.createGain();
    o.frequency.setValueAtTime(f || 120, t); o.frequency.exponentialRampToValueAtTime((f || 120) * .4, t + .14);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.connect(g); bus(g, .08); o.start(t); o.stop(t + .22);
  }
  // 燈亮起來：很輕的「滋」＋一顆小高音
  function spark(vol) {
    if (!live()) return;
    var t = A.currentTime, n = A.createBufferSource(), hp = A.createBiquadFilter(), g = A.createGain();
    n.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 5200;
    g.gain.setValueAtTime(vol * .5, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    n.connect(hp); hp.connect(g); bus(g, .2); n.start(t, Math.random()); n.stop(t + .06);
    var o = A.createOscillator(), e = A.createGain();
    o.type = 'triangle'; o.frequency.value = 2200 + Math.random() * 900;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol * .35, t + .004); e.gain.exponentialRampToValueAtTime(.0001, t + .12);
    o.connect(e); bus(e, .35); o.start(t); o.stop(t + .14);
  }
  // 撞擊：低音的「咚」＋一點點高頻（貼紙互撞），大張的比較低
  function boop(vol, r) {
    if (!live() || vol <= 0) return;
    var t = A.currentTime, f = 560 - Math.min(r || 60, 170) * 1.9, o = A.createOscillator(), g = A.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .55, t + .09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.connect(g); bus(g, .1); o.start(t); o.stop(t + .22);
  }
  window.SG_SFX = { whoosh: whoosh, tink: tink, thump: thump, spark: spark, boop: boop, PENTA: PENTA, live: live };
})();
