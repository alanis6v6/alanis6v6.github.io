// 右下角的咖啡（Buy Me a Coffee）：不能關，這兩種時候跳出來——
//   ① 在脆排版工具那一段（#threads）的時候；離開就收回去。
//   ② 廣告被擋住（AdBlock 之類）的時候：整站一直顯示。
// 在 Katsuji（右下角有影片的「略過」）跟聯絡頁（本來就有咖啡貼紙）先收起來，不疊在一起。
// 第一次跳出來時旁邊的小字「請我喝一杯咖啡」露 4 秒再收起來；滑鼠移上去會再出現。
(function () {
  var btn = document.getElementById('bmc-float');
  if (!btn) return;
  var inTools = false, blocked = false, quiet = false, shown = false, tipped = false;
  function update() {
    var on = (inTools || blocked) && !quiet;
    if (on === shown) return;
    shown = on;
    btn.classList.toggle('show', on);
    btn.tabIndex = on ? 0 : -1;
    btn.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on && !tipped) { tipped = true; btn.classList.add('tip'); setTimeout(function () { btn.classList.remove('tip'); }, 4000); }
  }
  btn.setAttribute('aria-hidden', 'true');
  if (!('IntersectionObserver' in window)) return;
  var tools = document.getElementById('threads');
  if (tools) new IntersectionObserver(function (en) { inTools = en[en.length - 1].isIntersecting; update(); }, { rootMargin: '-45% 0px -45% 0px' }).observe(tools);   // 這一段有好幾個螢幕高：畫面中間那條落在裡面就算
  var hush = [document.getElementById('katsuji'), document.getElementById('contact')].filter(Boolean), hushOn = new Set();
  var ho = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) hushOn.add(e.target); else hushOn.delete(e.target); });
    quiet = hushOn.size > 0; update();
  }, { rootMargin: '-45% 0px -45% 0px' });
  hush.forEach(function (el) { ho.observe(el); });

  // 廣告有沒有被擋：①放一個長得像廣告的小格子，被擋的話會被藏起來；②AdSense 的程式有沒有真的載到
  function checkAds() {
    var bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-slot pub_300x250 textads';
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;pointer-events:none';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    setTimeout(function () {
      var cs = getComputedStyle(bait), hidden = !bait.offsetHeight || cs.display === 'none' || cs.visibility === 'hidden';
      bait.remove();
      var tag = document.querySelector('script[src*="adsbygoogle.js"]'), loaded = true;
      var R = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
      if (tag && R.length && R.length < 240) loaded = R.some(function (r) { return r.name.indexOf('adsbygoogle.js') > -1; });   // 紀錄滿了（預設 250 筆）就不看這項，免得誤判
      blocked = hidden || !loaded;
      update();
    }, 600);
  }
  if (document.readyState === 'complete') setTimeout(checkAds, 1500); else addEventListener('load', function () { setTimeout(checkAds, 1500); });
})();
