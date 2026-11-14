/* ==========================================================================
   全站共用交互：页头滚动态 / 滚动淡入 / 图片灯箱
   没有第三方依赖，可离线运行。
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 页头滚动态 ---------- */
  var head = document.getElementById('siteHead');
  function onScroll() {
    if (!head) return;
    head.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 2. 滚动淡入 ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '120px 0px -8% 0px', threshold: 0 });

      revealEls.forEach(function (el) { io.observe(el); });
    }
  }
  window.__revealReady = true;

  /* ---------- 2.5 超宽长图：拖动横向观看 ---------- */
  var dragRelease = 0;

  Array.prototype.forEach.call(document.querySelectorAll('.fig__pan'), function (pan) {
    var down = false, moved = false;
    var startX = 0, startLeft = 0;

    pan.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;   // 触屏交给原生滑动
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = pan.scrollLeft;
      pan.classList.add('is-dragging');
    });

    pan.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) moved = true;
      if (!moved) return;
      e.preventDefault();
      pan.scrollLeft = startLeft - dx;
    });

    function end() {
      if (!down) return;
      down = false;
      pan.classList.remove('is-dragging');
      if (moved) dragRelease = Date.now();
    }
    pan.addEventListener('pointerup', end);
    pan.addEventListener('pointercancel', end);
    pan.addEventListener('pointerleave', end);
  });

  /* ---------- 3. 灯箱 ---------- */
  var box = document.getElementById('lightbox');
  if (!box) return;

  var boxImg = document.getElementById('lightboxImg');
  var boxCap = document.getElementById('lightboxCap');
  var btnClose = box.querySelector('.lightbox__close');
  var btnPrev = box.querySelector('.lightbox__prev');
  var btnNext = box.querySelector('.lightbox__next');

  var groups = {};
  var current = { key: null, index: 0 };
  var lastFocus = null;

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  Array.prototype.forEach.call(document.querySelectorAll('[data-fig]'), function (fig) {
    var img = fig.querySelector('img');
    if (!img) return;

    var key = fig.getAttribute('data-fig') || 'all';
    var cap = fig.querySelector('figcaption');
    var item = {
      src: img.currentSrc || img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      caption: norm(cap ? cap.textContent : '')
    };

    (groups[key] = groups[key] || []).push(item);

    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', '放大查看：' + item.alt);

    img.addEventListener('click', function () {
      if (Date.now() - dragRelease < 250) return;   // 刚拖过，不当作点击
      open(key, item);
    });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(key, item);
      }
    });
  });

  function open(key, item) {
    var list = groups[key] || [];
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].src === item.src) { idx = i; break; }
    }
    current = { key: key, index: idx };
    lastFocus = document.activeElement;

    render();
    box.hidden = false;
    document.documentElement.classList.add('is-locked');
    document.body.classList.add('is-locked');
    if (btnClose) btnClose.focus();

    var single = list.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;
  }

  function render() {
    var list = groups[current.key] || [];
    var item = list[current.index];
    if (!item) return;

    boxImg.src = item.src;
    boxImg.alt = item.alt;
    boxCap.textContent = item.caption;

    [current.index - 1, current.index + 1].forEach(function (i) {
      var n = list[(i + list.length) % list.length];
      if (n) { var im = new Image(); im.src = n.src; }
    });
  }

  function step(dir) {
    var list = groups[current.key] || [];
    if (list.length < 2) return;
    current.index = (current.index + dir + list.length) % list.length;
    render();
  }

  function close() {
    box.hidden = true;
    boxImg.src = '';
    document.documentElement.classList.remove('is-locked');
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { step(-1); });
  btnNext.addEventListener('click', function () { step(1); });

  box.addEventListener('click', function (e) {
    if (e.target === box || e.target === boxImg.parentNode) close();
  });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  var startX = null;
  box.addEventListener('touchstart', function (e) {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1);
    startX = null;
  }, { passive: true });
})();

/* ---------- 4. 观看模式：叠层（连续纸卷）/ 阅读 ---------- */
(function () {
  var btn = document.getElementById('viewSwitch');
  var body = document.body;
  if (!btn) return;

  var label = btn.querySelector('.viewswitch__t');
  var KEY = 'dsh-view';
  var main = document.getElementById('main');

  var clip = null;    // 剪影容器
  var plane = null;   // 舞台里的斜面
  var track = null;   // 纸卷
  var spacer = null;  // 撑出滚动条
  var art = main ? main.querySelector('.work') : null;
  var ro = null;
  var lastY = 0;

  /* ---- 搭建舞台：把 .work 从 #main 里搬到斜面轨道上 ---- */
  /* 弯曲：用位移贴图把"已经透视过的画面"再沿弧线掰弯，
     直的竖线会弯成弧、横线会随远离中线而下垂——像一张被压弯的纸 */
  function warp() {
    if (document.getElementById('deck-warp')) return;

    var W = 480, H = 300;      // 贴图分辨率，够平滑又不贵
    var KX = 148, KY = 0;      // 只做横向：侧面弯成弧，纸面保持平整
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var img = g.createImageData(W, H);
    var d = img.data;

    for (var y = 0; y < H; y++) {
      var ty = 1 - y / (H - 1);            // 1 = 顶（远），0 = 底（近）
      for (var x = 0; x < W; x++) {
        var nx = (x / (W - 1)) * 2 - 1;    // -1 = 左，1 = 右
        var dx = -KX * nx * ty * ty;       // 越靠上、越靠边，向内收得越多
        var dy = 0;                // 纵向不动，横线保持水平
        var i = (y * W + x) * 4;
        d[i] = 128 + (dx / KX) * 127;
        d[i + 1] = 128;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('id', 'deck-warp-svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';

    var defs = document.createElementNS(ns, 'defs');
    var f = document.createElementNS(ns, 'filter');
    f.setAttribute('id', 'deck-warp');
    f.setAttribute('x', '-12%'); f.setAttribute('y', '-12%');
    f.setAttribute('width', '124%'); f.setAttribute('height', '124%');
    f.setAttribute('color-interpolation-filters', 'sRGB');

    var feImg = document.createElementNS(ns, 'feImage');
    feImg.setAttribute('href', cv.toDataURL());
    feImg.setAttribute('preserveAspectRatio', 'none');
    feImg.setAttribute('x', '0'); feImg.setAttribute('y', '0');
    feImg.setAttribute('width', '100%'); feImg.setAttribute('height', '100%');
    feImg.setAttribute('result', 'map');

    var dm = document.createElementNS(ns, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic');
    dm.setAttribute('in2', 'map');
    dm.setAttribute('scale', String(KX * 2));
    dm.setAttribute('xChannelSelector', 'R');
    dm.setAttribute('yChannelSelector', 'G');

    f.appendChild(feImg); f.appendChild(dm);
    defs.appendChild(f);
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }

  function build() {
    if (track || !art) return;
    warp();
    clip = document.createElement('div');
    clip.className = 'deck-clip';
    plane = document.createElement('div');
    plane.className = 'deck-plane';
    track = document.createElement('div');
    track.className = 'deck-track';
    track.appendChild(art);
    plane.appendChild(track);
    clip.appendChild(plane);
    main.appendChild(clip);

    spacer = document.createElement('div');
    spacer.className = 'deck-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    main.parentNode.insertBefore(spacer, main.nextSibling);

    ro = ('ResizeObserver' in window) ? new ResizeObserver(sync) : null;
    if (ro) ro.observe(art);
    window.addEventListener('resize', sync);
    sync();
    paintTrack();
  }

  function destroy() {
    if (!track) return;
    if (ro) { ro.disconnect(); ro = null; }
    window.removeEventListener('resize', sync);
    if (spacer) { spacer.parentNode.removeChild(spacer); spacer = null; }
    if (clip && clip.parentNode) {
      main.appendChild(art);
      clip.parentNode.removeChild(clip);
    }
    plane = null; clip = null;
    if (track) track.style.transform = '';
    track = null;
    window.scrollTo(0, lastY);
  }

  /* 纸卷多高，占位就多高，滚动条长度才不会跳 */
  function sync() {
    if (!track || !spacer) return;
    spacer.style.height = track.offsetHeight + 'px';
    paintTrack();
  }

  function paintTrack() {
    if (!track) return;
    track.style.transform = 'translateY(' + (-window.scrollY) + 'px)';
    warm();
  }

  /* 叠层里图片被 transform 挪过，浏览器对 lazy 的距离判断会偏保守，
     偶尔出现"滚到跟前还没加载"的空白。这里把进入视口的章节图片直接放行。 */
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    var vh = window.innerHeight;
    [].slice.call(document.querySelectorAll('.chapter')).forEach(function (ch) {
      var r = ch.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      [].slice.call(ch.querySelectorAll('img')).forEach(function (img) {
        if (img.loading !== 'eager') img.loading = 'eager';
        if (!img.complete) { var s = img.currentSrc || img.src; img.src = s; }
      });
    });
    warmed = false;
  }

  /* ---- 开关 ---- */
  function paint() {
    var deck = body.classList.contains('mode-deck');
    btn.setAttribute('aria-pressed', deck ? 'true' : 'false');
    if (label) label.textContent = deck ? '阅读' : '叠层';
  }

  function set(mode, remember) {
    var deck = mode === 'deck';
    if (deck) {
      body.classList.remove('mode-read');
      body.classList.add('mode-deck');
      lastY = window.scrollY;
      build();
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      body.classList.remove('mode-deck');
      body.classList.add('mode-read');
      destroy();
    }
    paint();
    if (remember) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
  }

  var fromIndex = false;
  try { fromIndex = sessionStorage.getItem('dsh-enter') === '1'; sessionStorage.removeItem('dsh-enter'); } catch (e) {}
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}

  var forced = null;
  try { forced = new URLSearchParams(window.location.search).get('view'); } catch (e) {}

  if (forced === 'read' || forced === 'deck') set(forced, false);
  else set(fromIndex ? 'read' : (saved === 'read' ? 'read' : 'deck'), false);

  btn.addEventListener('click', function () {
    set(body.classList.contains('mode-deck') ? 'read' : 'deck', true);
  });
})();

/* ---------- 5. 纸卷跟随滚动、索引高亮、背景视差 ---------- */
(function () {
  var body = document.body;
  var nav = document.querySelector('.decknav');
  var track = null;

  function getTrack() {
    if (!track) track = document.querySelector('.deck-track');
    return track;
  }

  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  var ticking = false;
  function frame() {
    ticking = false;
    var deck = body.classList.contains('mode-deck');
    if (!deck) return;

    var tr = getTrack();
    if (tr) tr.style.transform = 'translateY(' + (-window.scrollY) + 'px)';

    document.documentElement.style.setProperty('--sy', String(window.scrollY));

    var heroH = (document.querySelector('.work__hero') || {}).offsetHeight || 0;
    body.classList.toggle('is-past', window.scrollY > heroH * 0.5);

    var mid = window.innerHeight * 0.45;
    var best = 0;
    for (var i = 0; i < sections.length; i++) {
      var el = sections[i];
      if (el && el.getBoundingClientRect().top <= mid) best = i;
    }
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: Math.max(0, el.offsetTop - 30), behavior: 'smooth' });
    });
  });
})();

/* ---------- 6. 落地遮罩已挪到页面 <head> 里内联执行，见 build_work_pages.py ---------- */

