/* ==========================================================================
   首页：封面舞台 + 竖排目录的联动
   桌面端 → 悬停预览、点击进入
   触屏端 → 轻点预览，再点"进入项目"或再次轻点进入
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var toc = document.getElementById('toc');
  var items = Array.prototype.slice.call(document.querySelectorAll('.toc__item'));

  var front = document.getElementById('stageFront');
  var back = document.getElementById('stageBack');
  var elIdx = document.getElementById('stageIdx');
  var elCap = document.getElementById('stageCap');
  var elGo = document.getElementById('stageGo');

  if (!toc || !front || !back || !items.length) return;

  var DEFAULT = {
    cover: front.getAttribute('src'),
    no: elIdx.textContent,
    title: '全部作品',
    meta: 'SELECTED WORKS',
    href: elGo.getAttribute('href')
  };

  var current = null;      // 当前预览的目录项
  var shown = null;        // 舞台当前显示的图片地址
  var resetTimer = null;
  var preloaded = false;

  function isTouch() {
    return window.matchMedia('(hover: none)').matches;
  }

  /* 首次悬停时再预载，避免一进页面就拉走近 2MB 图片 */
  function preload() {
    if (preloaded) return;
    preloaded = true;
    items.forEach(function (i) {
      var im = new Image();
      im.src = i.dataset.cover;
    });
  }

  /* 先在内存里解码完成，确认可用后再换到可见图层，
     这样快速划过时不会出现"半张图闪一下" */
  function show(src, alt, srcset) {
    if (!src || src === shown) return;
    shown = src;

    var probe = new Image();
    probe.onload = function () {
      if (shown !== src) return;      // 期间又换了别的图，丢弃这次结果
      back.src = src;
      back.srcset = srcset || '';
      back.alt = alt || '';
      back.classList.add('is-front');
      front.classList.remove('is-front');
      var t = front;
      front = back;
      back = t;
    };
    probe.onerror = function () {
      if (shown === src) shown = null;
    };
    probe.src = src;
  }

  function setCaption(no, text, href) {
    elIdx.textContent = no;
    elCap.textContent = text;
    elGo.href = href;
  }

  function preview(item) {
    clearTimeout(resetTimer);
    if (current === item) return;
    current = item;
    preload();

    var d = item.dataset;
    var set = d.coverFull
      ? d.cover + ' 800w, ' +
        d.cover.replace('-800.webp', '-1100.webp') + ' 1100w, ' +
        d.coverFull + ' 1600w'
      : '';
    show(d.cover, d.title, set);
    setCaption(d.no, d.title + ' · ' + d.meta, item.getAttribute('href'));

    items.forEach(function (i) {
      i.classList.toggle('is-active', i === item);
    });
    body.classList.add('is-peeking');
  }

  function reset() {
    if (!current) return;
    current = null;

    show(DEFAULT.cover, '作品集封面', '');
    setCaption(DEFAULT.no, DEFAULT.title + ' · ' + DEFAULT.meta, DEFAULT.href);

    items.forEach(function (i) { i.classList.remove('is-active'); });
    body.classList.remove('is-peeking');
  }

  /* 移开时留一点缓冲：划过条目之间的缝隙不会立刻复位 */
  function scheduleReset() {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(reset, 120);
  }

  items.forEach(function (item) {
    item.addEventListener('mouseenter', function () {
      if (isTouch()) return;
      preload();
      preview(item);
    });

    item.addEventListener('focus', function () {
      preview(item);
    });

    item.addEventListener('blur', function () {
      if (!item.classList.contains('is-active')) return;
      scheduleReset();
    });

    /* 触屏：第一次点先看封面，第二次点才进页面 */
    item.addEventListener('click', function (e) {
      if (isTouch() && !item.classList.contains('is-active')) {
        e.preventDefault();
        preview(item);
        return;
      }
      enter(item, e);
    });
  });

  toc.addEventListener('mouseenter', function () {
    clearTimeout(resetTimer);
  });

  toc.addEventListener('mouseleave', function () {
    if (isTouch()) return;
    scheduleReset();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      clearTimeout(resetTimer);
      reset();
    }
  });

  /* 鼠标移出整个页面时也复位，避免回来时停在某个预览上 */
  document.addEventListener('mouseleave', function () {
    if (isTouch()) return;
    scheduleReset();
  });

  /* 页面空闲时把图片补齐，第二次悬停就不用等 */
  window.addEventListener('load', function () {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 4000 });
    } else {
      setTimeout(preload, 2500);
    }
  });

  /* ---------- 进作品页：图先铺满，再交给下一个页面 ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enter(item, e) {
    var href = item.getAttribute('href');
    var no = item.getAttribute('data-no');
    var src = item.getAttribute('data-cover-full') || item.getAttribute('data-cover');

    function go() {
      try {
        sessionStorage.setItem('dsh-enter', '1');
        var abs = (function () { try { return new URL(src, location.href).href; } catch (e) { return src; } })();
        sessionStorage.setItem('dsh-transit', JSON.stringify({ no: no, src: abs }));
      } catch (err) {}
      window.location.href = href;
    }

    if (reduce || !src) { go(); return; }

    e.preventDefault();

    /* 起点：被点中的那张便签现在所在的位置 */
    var r = item.getBoundingClientRect();
    var veil = document.createElement('div');
    veil.className = 'transit transit--from';
    veil.innerHTML = '<img alt="" src="' + src + '">';
    veil.style.clipPath = 'inset(' + Math.round(r.top) + 'px ' +
                          Math.round(window.innerWidth - r.right) + 'px ' +
                          Math.round(window.innerHeight - r.bottom) + 'px ' +
                          Math.round(r.left) + 'px round 3px)';
    document.body.appendChild(veil);
    document.documentElement.classList.add('is-transit');

    /* 便签自己先让位，看起来是它长成了这一整页 */
    item.style.transition = 'opacity .16s linear';
    item.style.opacity = '0';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        veil.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
      });
    });
    window.setTimeout(go, 320);
  }
})();
