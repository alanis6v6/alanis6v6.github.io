// 左上角的葡萄柚星球：看得到網頁時先播一次，之後每隔 3～5 分鐘（隨機）再播一次。
// 分頁在背景時不播、也不算時間；回到這個分頁才繼續倒數。有開「減少動態效果」的人只看靜止的最後一格（CSS 沒加 anim 時就是最後一格）。
(function () {
  var logo = document.querySelector('.mark-logo');
  if (!logo) return;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var MIN = 3 * 60 * 1000, MAX = 5 * 60 * 1000;
  var left = -1, startedAt = 0, timer = null, running = false;   // left = -1：還沒播過第一次
  function next() { return MIN + Math.random() * (MAX - MIN); }

  function play() {
    if (still.matches) { logo.classList.remove('anim'); return; }   // 開著網頁才打開「減少動態效果」也照樣停
    logo.classList.remove('anim');
    void logo.getBoundingClientRect();   // 讓瀏覽器先吃下「沒有動畫」，再加回去才會重頭播
    logo.classList.add('anim');
  }
  function arm(ms) {
    clearTimeout(timer);
    left = ms; startedAt = Date.now(); running = true;
    timer = setTimeout(function () { play(); arm(next()); }, ms);
  }
  function pause() {
    if (!running) return;   // 已經停了就不再扣一次時間
    clearTimeout(timer); running = false;
    left = Math.max(0, left - (Date.now() - startedAt));
  }
  function resume() {
    if (running) return;
    if (left < 0) { play(); arm(next()); }   // 背景開的分頁：第一次看到才播
    else arm(left);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
  if (!document.hidden) resume();
})();
