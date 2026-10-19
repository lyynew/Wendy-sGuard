/* ============================================================
   main.js — 播放控制、音频同步、UI 交互
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('stage');
  St.init(canvas);

  const audio = document.getElementById('bgm');
  const intro = document.getElementById('intro');
  const startBtn = document.getElementById('startBtn');
  const playBtn = document.getElementById('playBtn');
  const muteBtn = document.getElementById('muteBtn');
  const fsBtn = document.getElementById('fsBtn');
  const hud = document.getElementById('hud');
  const seekBar = document.getElementById('seekBar');
  const seekFill = document.getElementById('seekFill');
  const seekKnob = document.getElementById('seekKnob');
  const seekMarks = document.getElementById('seekMarks');
  const timeLabel = document.getElementById('timeLabel');
  const frame = document.getElementById('frame');
  const toast = document.getElementById('toast');

  let DURATION = 257.88;
  let audioOK = true;        // 音频是否可用（加载失败会置 false）
  let clockStart = 0;        // 时钟基准（无音频时用于推进时间）
  let clockStartT = 0;
  audio.addEventListener('loadedmetadata', () => {
    if (isFinite(audio.duration) && audio.duration > 5) DURATION = audio.duration;
    timeLabel.textContent = '0:00 / ' + fmtTime(DURATION);
    rebuildMarks();
  });
  audio.addEventListener('error', () => {
    audioOK = false;
    toastMsg('音频加载失败，已切换为无声演示');
  });
  let started = false;
  let paused = true;
  let manualTime = null;        // 截图/调试用的强制时间
  let lastAudioT = 0;
  let raf = 0;
  let dragSeek = false;
  let muted = false;
  let idleTimer = 0;
  let toastTimer = 0;

  /* 章节刻度（时长确定后重建） */
  function rebuildMarks() {
    seekMarks.textContent = '';
    for (const s of Director.SHOTS) {
      const i = document.createElement('i');
      i.style.left = (s.t0 / DURATION * 100) + '%';
      seekMarks.appendChild(i);
    }
  }
  rebuildMarks();

  function toastMsg(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  /* ---------------- 渲染循环 ---------------- */
  function now() {
    if (manualTime !== null) return manualTime;
    if (audioOK && started) {
      const at = audio.currentTime;
      if (typeof at === 'number' && isFinite(at)) return at;
    }
    /* 无音频 / 尚未开始：用单调时钟推进 */
    const t = (performance.now() - clockStart) / 1000;
    return paused ? clockStartT : Math.min(DURATION, clockStartT + t);
  }

  function render(t) {
    const ctx = St.ctx();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    St.setView(160, 90, 1);
    Director.drawFrame(ctx, t);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (manualTime !== null) {
      render(manualTime);
      return;
    }
    const t = now();
    render(t);
    if (!dragSeek) {
      const k = clamp(t / DURATION, 0, 1);
      seekFill.style.width = (k * 100) + '%';
      seekKnob.style.left = (k * 100) + '%';
    }
    timeLabel.textContent = fmtTime(t) + ' / ' + fmtTime(DURATION);
    if (audio.ended) {
      paused = true;
      playBtn.textContent = '▶';
      hud.classList.add('show');
    }
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* ---------------- 控制 ---------------- */
  function start() {
    started = true;
    intro.classList.add('hide');
    clockStart = performance.now();
    clockStartT = 0;
    if (audioOK) {
      audio.volume = 0;
      const pr = audio.play();
      if (pr && pr.catch) pr.catch(() => { audioOK = false; clockStart = performance.now(); clockStartT = 0; });
      let v = 0;
      const fade = setInterval(() => {
        v = Math.min(1, v + 0.06);
        audio.volume = v;
        if (v >= 1) clearInterval(fade);
      }, 45);
    }
    paused = false;
    playBtn.textContent = '❚❚';
    hud.classList.add('show');
    scheduleIdle();
    kick();
  }

  function togglePlay() {
    if (!started) { start(); return; }
    if (paused) {
      if (audioOK) audio.play().catch(() => {});
      else { clockStart = performance.now(); clockStartT = now(); }
      paused = false;
      playBtn.textContent = '❚❚';
    } else {
      clockStartT = now();
      if (audioOK) audio.pause();
      paused = true;
      playBtn.textContent = '▶';
    }
    hud.classList.add('show');
    scheduleIdle();
  }

  function seekTo(t) {
    t = clamp(t, 0, DURATION - 0.05);
    if (audioOK) { try { audio.currentTime = t; } catch (e) {} }
    clockStartT = t;
    clockStart = performance.now();
    lastAudioT = t;
    if (!paused) { /* 继续播放 */ }
    render(t);
    const k = t / DURATION;
    seekFill.style.width = (k * 100) + '%';
    seekKnob.style.left = (k * 100) + '%';
    timeLabel.textContent = fmtTime(t) + ' / ' + fmtTime(DURATION);
  }

  /* ---------------- 事件 ---------------- */
  startBtn.addEventListener('click', start);
  playBtn.addEventListener('click', togglePlay);

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    audio.muted = muted;
    muteBtn.textContent = muted ? '✕' : '♪';
    muteBtn.style.opacity = muted ? 0.55 : 1;
    toastMsg(muted ? '已静音' : '已取消静音');
  });

  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      (frame.requestFullscreen ? frame.requestFullscreen() : Promise.reject()).catch(() => toastMsg('当前浏览器不支持全屏'));
    } else {
      document.exitFullscreen();
    }
  });

  /* 进度条拖动 */
  function seekFromEvent(e) {
    const rect = seekBar.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const k = clamp(x / rect.width, 0, 1);
    seekTo(k * DURATION);
  }
  seekBar.addEventListener('pointerdown', (e) => {
    dragSeek = true;
    seekBar.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  seekBar.addEventListener('pointermove', (e) => { if (dragSeek) seekFromEvent(e); });
  seekBar.addEventListener('pointerup', (e) => {
    if (!dragSeek) return;
    dragSeek = false;
    try { seekBar.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  seekBar.addEventListener('pointercancel', () => { dragSeek = false; });

  /* 键盘 */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': e.preventDefault(); seekTo(now() - 5); break;
      case 'ArrowRight': e.preventDefault(); seekTo(now() + 5); break;
      case 'ArrowUp': e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.1); toastMsg('音量 ' + Math.round(audio.volume * 100) + '%'); break;
      case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.1); toastMsg('音量 ' + Math.round(audio.volume * 100) + '%'); break;
      case 'KeyM': muteBtn.click(); break;
      case 'KeyF': fsBtn.click(); break;
      case 'Home': seekTo(0); break;
    }
    scheduleIdle();
  });

  /* 鼠标静止后隐藏 HUD */
  function scheduleIdle() {
    frame.classList.remove('idle');
    hud.classList.add('show');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!paused && started) {
        hud.classList.remove('show');
        frame.classList.add('idle');
      }
    }, 2600);
  }
  frame.addEventListener('mousemove', scheduleIdle);
  frame.addEventListener('touchstart', scheduleIdle, { passive: true });

  /* 全屏时隐藏鼠标 */
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) toastMsg('按 F 或 Esc 退出全屏');
  });

  audio.addEventListener('ended', () => {
    paused = true;
    playBtn.textContent = '▶';
    hud.classList.add('show');
    frame.classList.remove('idle');
  });
  audio.addEventListener('play', () => { paused = false; playBtn.textContent = '❚❚'; });
  audio.addEventListener('pause', () => { paused = true; playBtn.textContent = '▶'; });

  /* ---------------- 调试/截图接口 ---------------- */
  window.__renderAt = function (t) {
    manualTime = t;
    render(t);
    if (hud) hud.classList.remove('show');
    if (frame) frame.classList.add('idle');
    intro.classList.add('hide');
    paused = true;
  };
  window.__setAuto = function (v) { manualTime = v ? null : manualTime; };
  window.__t = () => now();

  /* 启动 */
  (async function boot() {
    // 等字体就绪，避免首帧文字回退
    try { await Txt.ready(); } catch (e) {}
    render(2.0);
    window.__mvReady = true;
    kick();
  })();
})();
