// 第一頁影片的背景音樂：用瀏覽器內建的合成器現場演奏，不用音檔。
// 120 BPM、8 小節一輪（16 秒），跟 hero.js 的蒙太奇剪接點對拍：
// 1–2 小節前奏（大鼓＋和弦）→ 3–6 小節鼓組、貝斯、琶音 → 7 小節鼓點變密＋上升的風聲 → 8 小節鼓停、只剩和弦喘口氣。
// 和弦是 Fmaj7 – Em7 – Dm7 – Cmaj7，帶一點 lo-fi 的磁帶沙沙聲。
(function () {
  var btn = document.querySelector('.sound');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, LOOP = BAR * 8;
  var ctx, master, verb, noiseBuf, playing = false, nextLoop = 0, timer;
  var out, padBus, send;   // 每次按播放都換一組新的匯流排：暫停時把舊的拔掉，已經排好的音符就不會疊到下一次

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // 每小節的和弦（MIDI 音高）跟貝斯根音
  var CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59],
                [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  var ROOTS = [41, 40, 38, 36, 41, 40, 38, 36];

  function setup() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    // 簡單的殘響：一段漸弱的雜訊當脈衝響應
    verb = ctx.createConvolver();
    var len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    var verbGain = ctx.createGain(); verbGain.gain.value = .32; verb.connect(verbGain); verbGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    // 磁帶沙沙聲
    var hiss = ctx.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
    var hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 3000; hf.Q.value = .4;
    var hg = ctx.createGain(); hg.gain.value = .012;
    hiss.connect(hf); hf.connect(hg); hg.connect(master); hiss.start();
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function kick(t, v) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    env(g, t, .004, v || .9, .32); o.connect(g); g.connect(out); o.start(t); o.stop(t + .4);
    // 和弦跟著大鼓縮一下（sidechain 的感覺）
    padBus.gain.setValueAtTime(.2, t); padBus.gain.linearRampToValueAtTime(.5, t + .32);
  }
  function noise(t, dur, type, freq, q, v, dest) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, .002, v, dur); s.connect(f); f.connect(g); g.connect(dest || out);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  function snare(t) { noise(t, .16, 'bandpass', 1900, .8, .5); noise(t, .22, 'bandpass', 1900, .8, .18, send); }
  function hat(t, open) { noise(t, open ? .14 : .035, 'highpass', 7500, .7, open ? .16 : .12); }
  function bass(t, m, dur) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.value = 500;
    env(g, t, .01, .5, dur); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .1);
  }
  function pad(t, notes, dur) {
    notes.forEach(function (m) {
      [-7, 7].forEach(function (det) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = hz(m + 12); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1500, t + dur * .6);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.045, t + .35);
        g.gain.setValueAtTime(.045, t + dur - .2); g.gain.linearRampToValueAtTime(0.0001, t + dur + .5);
        o.connect(f); f.connect(g); g.connect(padBus); o.start(t); o.stop(t + dur + .6);
      });
    });
  }
  function pluck(t, m, v) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = hz(m + 24);
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + .18);
    env(g, t, .003, v || .07, .2); o.connect(f); f.connect(g); g.connect(out); g.connect(send); o.start(t); o.stop(t + .3);
  }
  function riser(t, dur) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + .05);
    s.connect(f); f.connect(g); g.connect(out); g.connect(send); s.start(t); s.stop(t + dur + .1);
  }

  function scheduleLoop(L) {
    for (var b = 0; b < 8; b++) {
      var t0 = L + b * BAR, ch = CHORDS[b];
      pad(t0, ch, BAR);
      for (var q = 0; q < 4; q++) {
        var tb = t0 + q * BEAT;
        if (b < 2) { if (q === 0) kick(tb, .8); if (q === 2) hat(tb, true); continue; }
        if (b === 7) { if (q === 0) kick(tb, .6); continue; }              // 最後一小節只剩和弦
        kick(tb);
        if (q === 1 || q === 3) snare(tb);
        for (var e = 0; e < (b === 6 ? 4 : 2); e++) hat(tb + e * BEAT / (b === 6 ? 4 : 2), e === 1 && b !== 6);
        if (q % 2 === 0) bass(tb, ROOTS[b], BEAT * 1.6);
        // 琶音：第 3–6 小節八分音符，第 7 小節十六分音符
        var steps = b === 6 ? 4 : 2;
        for (var k = 0; k < steps; k++) pluck(tb + k * BEAT / steps, ch[(q * steps + k) % 4], b === 6 ? .055 : .07);
      }
      if (b === 6) { riser(t0, BAR); snare(t0 + BAR - BEAT / 4); snare(t0 + BAR - BEAT / 8); }
    }
  }
  function tick() {
    while (nextLoop < ctx.currentTime + 1.5) { scheduleLoop(nextLoop); nextLoop += LOOP; }
  }

  function play() {
    if (!ctx) setup();
    ctx.resume();
    [out, padBus, send].forEach(function (n) { if (n) n.disconnect(); });
    out = ctx.createGain(); out.connect(master);
    send = ctx.createGain(); send.connect(verb);
    padBus = ctx.createGain(); padBus.gain.value = .5; padBus.connect(out); padBus.connect(send);
    nextLoop = ctx.currentTime + .08;
    if (window.SG_FILM) window.SG_FILM.restart();        // 影片從頭跟著拍子剪
    tick(); timer = setInterval(tick, 400);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(.55, ctx.currentTime + .6);
    playing = true; btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', '關掉背景音樂');
  }
  function pause() {
    if (!ctx || !playing) return;
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + .4);
    setTimeout(function () { if (!playing) ctx.suspend(); }, 500);
    playing = false; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', '播放背景音樂');
  }
  btn.addEventListener('click', function () { playing ? pause() : play(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.SG_MUSIC = { pause: pause };
})();
