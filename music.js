// 第一頁影片的背景音樂：用瀏覽器內建的合成器現場演奏，不用音檔。
// 風格：dream pop 的質感（殘響吉他、鐵琴、空氣感和弦）＋ liquid DnB 的骨架，172 BPM，16 小節一輪（約 22.3 秒）。
//   1–4 小節  前奏：沒有鼓，只有溫暖的和弦、撥弦吉他琶音、鐵琴
//   5–8 小節  build-up：鈸跟大鼓進來、小鼓越滾越密、往上衝的風聲，最後一拍全靜音（斷點）
//   9–16 小節 drop：DnB 兩步鼓、次低音＋reese 低音、跟著大鼓起伏的寬和弦、鐵琴主旋律；第 12 小節抽掉低音一小節
// 和弦（D 大調）：Gmaj7 – A6 – F#m7 – Bm9，每個兩小節。蒙太奇（hero.js）的剪接點照這個拍子排。
(function () {
  var btn = document.querySelector('.sound');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var VOL = .6, BPM = 172, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 16, LOOP = BAR * BARS;
  var ctx, master, verb, delay, noiseBuf, playing = false, nextLoop = 0, timer;
  var out, padBus, bassBus, send, dsend;   // 每次按播放都換一組新的匯流排：暫停時拔掉舊的，排好的音符不會疊到下一次

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var CH = [[55, 59, 62, 66], [57, 61, 64, 66], [54, 57, 61, 64], [59, 62, 66, 73]];   // Gmaj7 A6 F#m7 Bm9
  var ROOT = [31, 33, 30, 35];
  function chordAt(bar) { return (bar >> 1) % 4; }
  // 鐵琴主旋律（D 大調五聲音階，八分音符，-1 是休止）
  var MEL = [78, -1, 81, 78, 76, -1, 74, 76,  78, -1, 83, 81, 78, -1, 76, -1,
             81, -1, 78, 76, 74, -1, 71, 74,  76, -1, 78, 74, 71, -1, 69, -1];

  function setup() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .15;
    master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver();
    var len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
    verb.buffer = ir;
    var vg = ctx.createGain(); vg.gain.value = .38; verb.connect(vg); vg.connect(master);
    // 附點八分的回音，吉他跟鐵琴用（dream pop 那種一圈一圈的感覺）
    delay = ctx.createDelay(1); delay.delayTime.value = BEAT * .75;
    var fb = ctx.createGain(); fb.gain.value = .38; var dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 3200;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); var dg = ctx.createGain(); dg.gain.value = .3; dl.connect(dg); dg.connect(master); dl.connect(verb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    var hiss = ctx.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
    var hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 2600; hf.Q.value = .4;
    var hg = ctx.createGain(); hg.gain.value = .01;
    hiss.connect(hf); hf.connect(hg); hg.connect(master); hiss.start();
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function duck(t, depth) {   // 大鼓一下，和弦跟低音縮一下（sidechain 的抽吸感）
    padBus.gain.setValueAtTime(.55 * depth, t); padBus.gain.linearRampToValueAtTime(.55, t + BEAT * .9);
    bassBus.gain.setValueAtTime(.35, t); bassBus.gain.linearRampToValueAtTime(1, t + BEAT * .5);
  }
  function kick(t, v) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(45, t + .09);
    env(g, t, .002, v || 1, .26); o.connect(g); g.connect(out); o.start(t); o.stop(t + .32);
    noise(t, .012, 'highpass', 3000, .7, .25);   // 鼓皮的「喀」
    duck(t, .25);
  }
  function noise(t, dur, type, freq, q, v, dest) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, .002, v, dur); s.connect(f); f.connect(g); g.connect(dest || out);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  function snare(t, v) {
    v = v || 1;
    noise(t, .18, 'bandpass', 2200, .7, .55 * v); noise(t, .3, 'highpass', 5000, .5, .14 * v, send);
    var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(170, t + .06);
    env(g, t, .002, .35 * v, .09); o.connect(g); g.connect(out); o.start(t); o.stop(t + .12);
  }
  function hat(t, v) { noise(t, .03, 'highpass', 8500, .7, v || .1); }
  function ride(t) { noise(t, .25, 'bandpass', 9000, 3, .05, send); }
  function sub(t, m, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.42, t + .02); g.gain.setValueAtTime(.42, t + dur - .05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bassBus); o.start(t); o.stop(t + dur + .05);
  }
  function reese(t, m, dur) {   // 兩條微微走音的鋸齒波＋慢慢晃的濾波器
    var f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 6; lfo.frequency.value = BPM / 60 / 2; lg.gain.value = 320;
    lfo.connect(lg); lg.connect(f.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.11, t + .03); g.gain.setValueAtTime(.11, t + dur - .05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    [-14, 14].forEach(function (det) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m + 12); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + .05); });
    f.connect(g); g.connect(bassBus); lfo.start(t); lfo.stop(t + dur + .05);
  }
  function pad(t, notes, dur, bright) {
    notes.forEach(function (m) {
      [-9, 0, 9].forEach(function (det) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.setValueAtTime(bright ? 2400 : 900, t); f.frequency.linearRampToValueAtTime(bright ? 3600 : 1400, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(bright ? .026 : .06, t + .25);
        g.gain.setValueAtTime(bright ? .026 : .06, t + dur - .15); g.gain.linearRampToValueAtTime(0.0001, t + dur + .4);
        o.connect(f); f.connect(g); g.connect(padBus); o.start(t); o.stop(t + dur + .5);
      });
    });
  }
  function guitar(t, m, v) {   // 撥弦：三角波＋快速收的濾波器，送進回音跟殘響
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m); o2.detune.value = 6;
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(600, t + .35);
    env(g, t, .004, v || .09, .6); o.connect(f); o2.connect(f); f.connect(g); g.connect(out); g.connect(dsend); g.connect(send);
    o.start(t); o2.start(t); o.stop(t + .7); o2.stop(t + .7);
  }
  function glock(t, m, v) {    // 鐵琴：基音＋2.76 倍的泛音，叮一聲
    [[1, 1], [2.76, .35], [5.4, .12]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m) * p[0];
      env(g, t, .002, (v || .06) * p[1], p[0] === 1 ? .8 : .3); o.connect(g); g.connect(out); g.connect(dsend); g.connect(send);
      o.start(t); o.stop(t + .9);
    });
  }
  function riser(t, dur) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.22, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + .02);
    s.connect(f); f.connect(g); g.connect(out); g.connect(send); s.start(t); s.stop(t + dur + .05);
  }
  function crash(t) { noise(t, 1.6, 'highpass', 4500, .5, .16, send); noise(t, .5, 'highpass', 6000, .5, .1); }
  function silence(t, dur) {   // 斷點：連殘響、回音一起，整個混音瞬間歸零再回來
    master.gain.setValueAtTime(VOL, t - .006); master.gain.linearRampToValueAtTime(0, t);
    master.gain.setValueAtTime(0, t + dur - .006); master.gain.linearRampToValueAtTime(VOL, t + dur);
  }

  function scheduleLoop(L) {
    for (var b = 0; b < BARS; b++) {
      var t0 = L + b * BAR, ci = chordAt(b), ch = CH[ci];
      var drop = b >= 8, build = b >= 4 && b < 8;
      if (b % 2 === 0) pad(t0, ch, BAR * 2, drop);
      // 吉他琶音：前奏跟 build 用八分音符，drop 時退到後面當點綴
      for (var e = 0; e < 8; e++) {
        var te = t0 + e * BEAT / 2, note = ch[[0, 2, 1, 3, 2, 1, 3, 2][e]] + 12;
        if (!drop || e % 2 === 0) guitar(te, note, drop ? .05 : .14);
      }
      if (!drop && (b === 1 || b === 3 || b === 5 || b === 7)) { glock(t0 + BEAT * 2, ch[3] + 24, .09); glock(t0 + BEAT * 3.5, ch[2] + 24, .07); }
      if (build) {
        if (b >= 5) for (var h = 0; h < 8; h++) hat(t0 + h * BEAT / 2, h % 2 ? .06 : .1);
        kick(t0, .7);
        if (b === 6 || b === 7) {   // 小鼓越滾越密：八分 → 十六分 → 三十二分
          var div = b === 6 ? 2 : 4, n = 4 * div;
          for (var r = 0; r < n; r++) {
            var tr = t0 + r * BEAT / div;
            if (b === 7 && r >= n - div) break;          // 最後一拍留給靜音斷點
            snare(tr, .25 + .6 * ((b - 6) * n + r) / (2 * n));
          }
        }
        if (b === 6) riser(t0, BAR * 2 - BEAT);
        if (b === 7) silence(t0 + BAR - BEAT, BEAT);
      }
      if (drop) {
        var bassOut = b === 11;                          // 第 12 小節抽掉低音
        if (b === 8) crash(t0);
        // DnB 兩步：大鼓在 1 跟 3 的後半拍，小鼓在 2、4
        kick(t0, .85); kick(t0 + BEAT * 2.5, .7);
        if (b % 4 === 3) kick(t0 + BEAT * 3.75, .5);
        snare(t0 + BEAT); snare(t0 + BEAT * 3);
        snare(t0 + BEAT * 1.75, .18); snare(t0 + BEAT * 3.5, .15);   // 鬼音
        for (var k = 0; k < 8; k++) hat(t0 + k * BEAT / 2 + (k % 2 ? BEAT * .06 : 0), k % 2 ? .07 : .11);   // 有一點搖擺的鈸
        ride(t0 + BEAT * 0.5); ride(t0 + BEAT * 2.5);
        if (!bassOut) {
          sub(t0, ROOT[ci], BEAT * 2.4); sub(t0 + BEAT * 2.5, ROOT[ci], BEAT * 1.4);
          reese(t0, ROOT[ci] + 12, BAR - .02);
        }
        for (var q = 0; q < 8; q++) {
          var m = MEL[((b - 8) % 4) * 8 + q];
          if (m > 0) glock(t0 + q * BEAT / 2, m, .055);
        }
        if (b === 15) { riser(t0 + BAR - BEAT * 2, BEAT * 2); }
      }
    }
  }
  function tick() {
    while (nextLoop < ctx.currentTime + 2) { scheduleLoop(nextLoop); nextLoop += LOOP; }
  }

  function play() {
    if (!ctx) setup();
    ctx.resume();
    [out, padBus, bassBus, send, dsend].forEach(function (n) { if (n) n.disconnect(); });
    out = ctx.createGain(); out.connect(master);
    send = ctx.createGain(); send.connect(verb);
    dsend = ctx.createGain(); dsend.connect(delay);
    padBus = ctx.createGain(); padBus.gain.value = .55; padBus.connect(out); padBus.connect(send);
    var bassLp = ctx.createBiquadFilter(); bassLp.type = 'lowpass'; bassLp.frequency.value = 900;
    bassBus = ctx.createGain(); bassBus.connect(bassLp); bassLp.connect(out);
    nextLoop = ctx.currentTime + .08;
    if (window.SG_FILM) window.SG_FILM.restart();        // 影片從頭跟著拍子剪
    master.gain.cancelScheduledValues(ctx.currentTime);       // 先淡入，再排音符（斷點的靜音也排在 master 上，不能被這行取消）
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOL, ctx.currentTime + .06);
    tick(); timer = setInterval(tick, 400);
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
  window.SG_MUSIC = { pause: pause, BEAT: BEAT, LOOP: LOOP };
})();
