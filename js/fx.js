/* ============================================================
   fx.js — 程序化粒子与光效
   所有粒子都用「时间参数方程」计算，不含状态，
   因此拖动进度条任意跳转都能得到完全一致的画面。
   ============================================================ */
(function () {
  'use strict';
  const { R, RA, P, Ellipse, EllipseA, Line, glowAdd } = St;

  /* 樱花 / 花瓣 */
  function petals(n, o) {
    o = o || {};
    n = Math.round(n * (0.85 + (St.energy ? St.energy().mid : 0.5) * 0.4));
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? -30 : o.x0;
    const x1 = o.x1 === undefined ? 350 : o.x1;
    const y0 = o.y0 === undefined ? -20 : o.y0;
    const y1 = o.y1 === undefined ? 150 : o.y1;
    const cols = o.colors || PAL.blossom;
    const wind = o.wind === undefined ? 6 : o.wind;
    const speed = o.speed === undefined ? 7 : o.speed;
    const span = y1 - y0;
    for (let i = 0; i < n; i++) {
      const seed = i * 7.31 + (o.seed || 0);
      const ph = hash1(seed) * span;
      const py = y0 + ((ph + t * (speed * (0.6 + hash1(seed + 1) * 0.8))) % span + span) % span;
      const drift = Math.sin(t * (0.5 + hash1(seed + 2) * 0.7) + i * 1.9) * (4 + hash1(seed + 3) * 6);
      const px = x0 + ((hash1(seed + 4) * (x1 - x0) + t * wind * (0.4 + hash1(seed + 5) * 0.9) + drift) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      const sz = hash1(seed + 6) < 0.25 ? 2 : 1;
      const c = cols[(i * 3) % cols.length];
      const flip = Math.sin(t * (2 + hash1(seed + 7) * 2) + i) > 0;
      RA(px, py, sz + (flip ? 0 : 1), 1, c, 0.85);
      if (sz > 1) {
        RA(px + 1, py + 1, 1, 1, shade(c, -0.15), 0.6);
      }
      if (o.glow && i % 5 === 0) glowAdd(px, py, 3, c, 0.1);
    }
  }

  /* 秋天的落叶 */
  function leaves(n, o) {
    o = o || {};
    const t = o.t || 0;
    const cols = o.colors || ['#c9762f', '#e0a140', '#a85a2c', '#d98b3a', '#8a4a2a'];
    const x0 = o.x0 === undefined ? -30 : o.x0;
    const x1 = o.x1 === undefined ? 350 : o.x1;
    const y0 = o.y0 === undefined ? -24 : o.y0;
    const y1 = o.y1 === undefined ? 160 : o.y1;
    const span = y1 - y0;
    for (let i = 0; i < n; i++) {
      const seed = i * 5.77 + (o.seed || 0);
      const py = y0 + ((hash1(seed) * span + t * (9 + hash1(seed + 1) * 8)) % span + span) % span;
      const px = x0 + ((hash1(seed + 2) * (x1 - x0) + t * 5 + Math.sin(t * 1.4 + i * 2.3) * 9) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      const c = cols[i % cols.length];
      const rot = Math.sin(t * 2.2 + i * 1.7);
      RA(px, py, 2, 1, c, 0.9);
      if (rot > 0) RA(px + 1, py + 1, 1, 1, shade(c, -0.2), 0.75);
      else RA(px, py - 1, 1, 1, shade(c, 0.15), 0.7);
    }
  }

  /* 雪 */
  function snow(n, o) {
    o = o || {};
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? -30 : o.x0;
    const x1 = o.x1 === undefined ? 350 : o.x1;
    const y0 = o.y0 === undefined ? -20 : o.y0;
    const y1 = o.y1 === undefined ? 170 : o.y1;
    const span = y1 - y0;
    for (let i = 0; i < n; i++) {
      const seed = i * 3.39 + (o.seed || 0);
      const sz = hash1(seed + 9) < 0.2 ? 2 : 1;
      const py = y0 + ((hash1(seed) * span + t * (7 + hash1(seed + 1) * 10)) % span + span) % span;
      const px = x0 + ((hash1(seed + 2) * (x1 - x0) + Math.sin(t * 0.8 + i * 2.7) * 10) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      RA(px, py, sz, sz, '#f2f6ff', 0.55 + hash1(seed + 5) * 0.35);
    }
  }

  /* 上升的光尘（暖色） */
  function dust(n, o) {
    o = o || {};
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? -10 : o.x0;
    const x1 = o.x1 === undefined ? 330 : o.x1;
    const y0 = o.y0 === undefined ? 20 : o.y0;
    const y1 = o.y1 === undefined ? 175 : o.y1;
    const span = Math.abs(y1 - y0) || 1;
    const rise = o.rise === undefined ? 5 : o.rise;
    for (let i = 0; i < n; i++) {
      const seed = i * 4.13 + (o.seed || 0);
      const py = y1 - (((hash1(seed) * span) + t * rise * (0.5 + hash1(seed + 1))) % span + span) % span;
      const px = x0 + (hash1(seed + 2) * (x1 - x0) + Math.sin(t * 0.6 + i * 1.3) * 5);
      const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * (0.9 + hash1(seed + 3)) + i * 2.1));
      P(px, py, mix(o.color || PAL.glow[1], '#fff6dc', a * 0.8));
      if (i % 4 === 0) glowAdd(px, py, 4.5, o.color || PAL.glow[1], a * 0.4);
    }
  }

  /* 萤火虫（带光晕） */
  function fireflies(n, o) {
    o = o || {};
    n = Math.round(n * (0.8 + (St.energy ? St.energy().mid : 0.5) * 0.5));
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? -10 : o.x0;
    const x1 = o.x1 === undefined ? 330 : o.x1;
    const y0 = o.y0 === undefined ? 60 : o.y0;
    const y1 = o.y1 === undefined ? 160 : o.y1;
    for (let i = 0; i < n; i++) {
      const seed = i * 6.17 + (o.seed || 0);
      const px = x0 + hash1(seed) * (x1 - x0) + Math.sin(t * (0.32 + hash1(seed + 1) * 0.5) + i * 2.3) * (5 + hash1(seed + 4) * 9);
      const py = y0 + hash1(seed + 2) * (y1 - y0) + Math.sin(t * (0.26 + hash1(seed + 3) * 0.4) + i * 1.7) * 4;
      const bl = Math.max(0, Math.sin(t * (1.0 + hash1(seed + 5) * 1.9) + i * 2.9));
      const a = bl * bl;
      if (a < 0.05) continue;
      const c = mix(PAL.glow[2], '#fffce4', a);
      P(px, py, c);
      if (a > 0.45) {
        RA(px - 1, py, 1, 1, c, a * 0.35);
        RA(px + 1, py, 1, 1, c, a * 0.35);
        RA(px, py - 1, 1, 1, c, a * 0.35);
        RA(px, py + 1, 1, 1, c, a * 0.35);
      }
      glowAdd(px, py, 5.5, PAL.glow[1], a * 0.55);
    }
  }

  /* 星尘 / 上升光点（记忆感） */
  function sparkles(n, o) {
    o = o || {};
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? 0 : o.x0;
    const x1 = o.x1 === undefined ? 320 : o.x1;
    const y0 = o.y0 === undefined ? 40 : o.y0;
    const y1 = o.y1 === undefined ? 160 : o.y1;
    const col = o.color || '#ffe6b0';
    for (let i = 0; i < n; i++) {
      const seed = i * 9.13 + (o.seed || 0);
      const life = (t * (0.18 + hash1(seed + 1) * 0.22) + hash1(seed)) % 1;
      const px = x0 + hash1(seed + 2) * (x1 - x0) + Math.sin(life * TAU * 1.5 + i) * 3;
      const py = y1 - life * (y1 - y0) + Math.sin(life * TAU + i * 2) * 2;
      const a = Math.sin(life * Math.PI) * (0.55 + hash1(seed + 3) * 0.45);
      if (a < 0.05) continue;
      const big = hash1(seed + 4) > 0.7;
      RA(px, py, 1, 1, col, a);
      if (big) {
        RA(px - 1, py, 1, 1, col, a * 0.5);
        RA(px + 1, py, 1, 1, col, a * 0.5);
        RA(px, py - 1, 1, 1, col, a * 0.5);
        RA(px, py + 1, 1, 1, col, a * 0.5);
      }
      if (big) glowAdd(px, py, 4, col, a * 0.4);
    }
  }

  /* 音符（飘浮） */
  function notes(n, o) {
    o = o || {};
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? 60 : o.x0;
    const x1 = o.x1 === undefined ? 260 : o.x1;
    const y0 = o.y0 === undefined ? 60 : o.y0;
    const y1 = o.y1 === undefined ? 150 : o.y1;
    const col = o.color || '#ffe3ab';
    for (let i = 0; i < n; i++) {
      const seed = i * 3.91 + (o.seed || 0);
      const life = (t * (0.12 + hash1(seed + 1) * 0.1) + hash1(seed)) % 1;
      const px = x0 + hash1(seed + 2) * (x1 - x0) + Math.sin(life * 5 + i * 2) * 8;
      const py = y1 - life * (y1 - y0);
      const a = Math.sin(life * Math.PI) * 0.85;
      if (a < 0.06) continue;
      const kind = i % 3;
      RA(px, py, 2, 2, col, a * 0.75);
      if (kind === 0) {
        RA(px + 2, py - 3, 1, 4, col, a * 0.8);
        RA(px + 2, py - 3, 3, 1, col, a * 0.8);
      } else if (kind === 1) {
        RA(px + 2, py - 4, 1, 5, col, a * 0.75);
        RA(px + 1, py - 4, 2, 1, col, a * 0.75);
      } else {
        RA(px - 1, py - 2, 1, 1, col, a * 0.6);
        RA(px + 3, py - 2, 1, 1, col, a * 0.6);
      }
      if (i % 3 === 0) glowAdd(px, py, 5, col, a * 0.35);
    }
  }

  /* 风痕 / 流动的光带 */
  function windLines(n, o) {
    o = o || {};
    const t = o.t || 0;
    const col = o.color || '#ffe9c4';
    const y0 = o.y0 === undefined ? 40 : o.y0;
    const y1 = o.y1 === undefined ? 150 : o.y1;
    const dir = o.dir === undefined ? -1 : o.dir;
    for (let i = 0; i < n; i++) {
      const seed = i * 7.77 + (o.seed || 0);
      const life = (t * (0.12 + hash1(seed) * 0.1) + hash1(seed + 1)) % 1;
      const py = y0 + hash1(seed + 2) * (y1 - y0) + Math.sin(life * TAU + i) * 6;
      const len = 10 + hash1(seed + 3) * 26;
      let px = 340 - life * 400 * (dir > 0 ? -1 : 1) * 0.5;
      const a = Math.sin(life * Math.PI) * 0.35;
      if (a < 0.04) continue;
      for (let j = 0; j < len; j++) {
        const aa = a * (1 - j / len) * (j < 3 ? 1 : 0.7);
        if (j % 2 === 0) RA(px + j, py + Math.sin(j * 0.25 + t) * 0.8, 1, 1, col, aa);
      }
    }
  }

  /* 泪光 / 亮点 */
  function twinkle(x, y, r, t, color, a) {
    const k = Math.abs(Math.sin(t * 3.4));
    const c = color || '#fff8e0';
    RA(x - 1, y, 1, 1, c, a * k);
    RA(x + 1, y, 1, 1, c, a * k);
    RA(x, y - 1, 1, 1, c, a * k);
    RA(x, y + 1, 1, 1, c, a * k);
    RA(x, y, 1, 1, mix(c, '#fff', 0.5), a * (0.4 + k * 0.6));
    glowAdd(x, y, r, c, a * k * 0.6);
  }

  /* 流星 */
  function shootingStar(t, seed, c) {
    const period = 11 + hash1(seed) * 9;
    const ph = ((t + seed * 3.7) % period) / period;
    if (ph > 0.08) return;
    const k = ph / 0.08;
    const x0 = 40 + hash1(seed + 1) * 240;
    const y0 = 18 + hash1(seed + 2) * 40;
    const len = 26 * Math.sin(k * Math.PI);
    for (let i = 0; i < len; i++) {
      const a = (1 - i / len) * Math.sin(k * Math.PI) * 0.9;
      R(x0 + i * 1.2, y0 + i * 0.55, 1, 1, withAlpha(c || '#fff4d8', a));
    }
  }

  /* 光斑（镜头散景） */
  function bokeh(n, o) {
    o = o || {};
    const t = o.t || 0;
    const col = o.color || '#ffd9a0';
    const x0 = o.x0 === undefined ? 0 : o.x0;
    const x1 = o.x1 === undefined ? 320 : o.x1;
    const y0 = o.y0 === undefined ? 20 : o.y0;
    const y1 = o.y1 === undefined ? 140 : o.y1;
    for (let i = 0; i < n; i++) {
      const seed = i * 11.3 + (o.seed || 0);
      const r = 2 + hash1(seed) * 5;
      const px = x0 + ((hash1(seed + 1) * (x1 - x0) + t * (1.5 + hash1(seed + 2) * 2)) % (x1 - x0));
      const py = y0 + hash1(seed + 3) * (y1 - y0) + Math.sin(t * 0.4 + i) * 3;
      const a = 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 2));
      EllipseA(px, py, r, r * 0.9, col, a);
    }
  }

  window.FX = { petals, leaves, snow, dust, fireflies, sparkles, notes, windLines, twinkle, shootingStar, bokeh };
})();
