/* ============================================================
   props.js — 像素道具与建筑模块
   城堡、塔楼、阳台、拱窗、檐廊、喷泉、玫瑰、树、云、灯笼……
   全部基于世界坐标，可在不同场景中复用，保证世界观统一。
   ============================================================ */
(function () {
  'use strict';
  const { R, RA, P, HLine, VLine, Line, Ellipse, EllipseA, Poly, Dither, VGrad, glowAdd, ctx: _ctx } = St;

  const INK = '#231528';

  /* 远景大气透视：越远越靠近天色 */
  function air(color, horizon, k) { return mix(color, horizon, clamp(k, 0, 0.9)); }

  /* ---------------- 云 ----------------
     积云结构：底部平、云脚压暗、团块层叠、顶部高光。
     整朵云随风缓慢起伏（不是整体平移，避免“贴图感”）。 */
  function cloud(x, y, w, t, ramp, o) {
    o = o || {};
    ramp = ramp || PAL.cloud;
    const a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.01) return;
    const seed = o.seed || 1;
    const drift = o.drift || 0;
    const n = Math.max(4, Math.round(w / 9));
    const dark = ramp[ramp.length - 1];
    const mid = ramp[Math.min(2, ramp.length - 1)];
    const body = ramp[Math.min(3, ramp.length - 1)];
    const hi = ramp[0];
    const baseY = y + Math.sin(t * 0.09 + seed * 1.7) * 1.4;
    const squish = o.squish === undefined ? 1 : o.squish;
    /* 循环漂移：给了 wrapW 就把云在 [wrapX0−w, wrapX0+wrapW] 区间里循环，
       这样云不会漂出画外「消失」，天空里始终有云 */
    let bx = x + drift;
    if (o.wrapW) {
      const wx0 = o.wrapX0 === undefined ? 0 : o.wrapX0;
      const min = wx0 - w;
      const span = o.wrapW + w;
      bx = min + (((bx - min) % span) + span) % span;
    }
    const n2 = n;

    /* 云脚：一整条柔和的底边，把云稳稳压在天上（很淡的云省略这一层） */
    if (a > 0.34) {
      for (let i = 0; i < n2; i++) {
        const fx = bx + ((i + 0.5) / n2) * w;
        const rw = (w / n2) * 0.95 + w * 0.07;
        const rh = (3.0 + hash1(i * 2.3 + seed) * 2.0) * squish;
        EllipseA(fx, baseY + 2.6 * squish, rw, rh * 0.72, mix(body, dark, 0.5), a * 0.55);
        EllipseA(fx, baseY + 1.4 * squish, rw * 0.92, rh * 0.8, body, a * 0.8);
      }
    }
    /* 云体：三层叠加，越靠上越亮 */
    for (let i = 0; i < n2; i++) {
      const fx = bx + (i / n2) * w;
      const fy = baseY + Math.sin(t * 0.25 + i * 1.7 + seed) * 1.1 * squish;
      const rw = 5 + hash1(i * 3.1 + seed) * w * 0.11;
      const rh = (2.7 + hash1(i * 7.7 + seed) * 2.4) * squish;
      EllipseA(fx, fy + 0.8 * squish, rw, rh * 0.9, mid, a);
      EllipseA(fx - rw * 0.16, fy - 1.3 * squish, rw * 0.78, rh * 0.76, ramp[1], a);
      EllipseA(fx - rw * 0.28, fy - 2.4 * squish, rw * 0.48, rh * 0.48, hi, a * 0.95);
    }
    /* 顶部受光的小团 */
    if (w > 40) {
      for (let i = 0; i < n2; i++) {
        const fx = bx + ((i + 0.4) / n2) * w;
        const fy = baseY - (3.6 + hash1(i * 4.7 + seed) * 1.8) * squish;
        const rw = 2.2 + hash1(i * 5.9 + seed) * 3.4;
        EllipseA(fx, fy, rw, 1.2 * squish, mix(hi, ramp[1], 0.35), a * 0.85);
      }
    }
    /* 云底一道更暗的收边（只在云脚厚度够时画） */
    if (squish > 0.8) {
      HLine(bx + 2, bx + w - 2, Math.round(baseY + 4.2), mix(body, dark, 0.62));
    }
  }
  function ctxAlpha(fn) { fn(); }

  /* ---------------- 草叶 / 花丛 ----------------
     单株草：3~5 片带弧度的叶，风从根部往上传递（相位随高度增加）。 */
  function blade(x, rootY, h, lean, t, cLow, cHigh, seed) {
    const ph = seed * 2.7;
    const amp = 0.7 + hash1(seed * 1.3) * 1.1;
    const fr = 1.15 + hash1(seed * 2.1) * 0.8;
    for (let j = 1; j <= h; j++) {
      const k = j / h;
      const sway = Math.sin(t * fr + ph) * amp * (0.18 + k * k * 1.5);
      const px = x + lean * k * k + sway;
      P(px, rootY - j, k > 0.66 ? cHigh : cLow);
    }
    return { x: x + lean + Math.sin(t * fr + ph) * amp * 1.5, y: rootY - h };
  }

  /* 一丛草：可选花/穗 */
  function grassTuft(x, rootY, h, t, pal, seed, o) {
    o = o || {};
    const sway = o.soft;
    const nB = o.blades === undefined ? 3 : o.blades;
    const cLow = pal && pal[1] ? pal[1] : '#5f9146';
    const cHigh = pal && pal[3] ? pal[3] : '#9ec878';
    let top = null;
    for (let i = 0; i < nB; i++) {
      const s2 = seed * 3.3 + i * 1.7;
      const hh = h * (0.62 + hash1(s2) * 0.5);
      const lean = (hash1(s2 + 1.1) - 0.5) * h * 0.55;
      const tp = blade(x + (hash1(s2 + 2.2) - 0.5) * h * 0.42, rootY - i * 0.35, Math.max(2, Math.round(hh)),
        lean, t, i % 2 ? cLow : shade(cLow, -0.12), i % 2 ? cHigh : shade(cHigh, 0.08), s2);
      if (!top || tp.y < top.y) top = tp;
    }
    /* 花 / 穗 */
    const kind = o.flower === undefined ? hash1(seed * 4.9) : o.flower;
    if (kind !== false && kind > 0.38 && top) {
      const cols = o.flowerColors || (PAL.blossom || ['#f7c5c6', '#ffddd4', '#fff2e8']);
      const c = cols[Math.floor(hash1(seed * 7.7) * cols.length) % cols.length];
      const big = o.flower === true;
      P(top.x, top.y, c);
      P(top.x + 1, top.y, shade(c, -0.12));
      P(top.x, top.y - 1, shade(c, 0.18));
      if (big) { P(top.x - 1, top.y, shade(c, 0.1)); P(top.x, top.y - 2, mix(c, '#ffffff', 0.4)); }
      P(top.x + 0.5, top.y + 1, '#6a8a4a');
    }
    return top;
  }

  /* 一片草地：按深度分层，越靠前越高、摆动越大 */
  function grassPatch(t, o) {
    o = o || {};
    const count = o.count === undefined ? 46 : o.count;
    const x0 = o.x0 === undefined ? -30 : o.x0;
    const x1 = o.x1 === undefined ? 350 : o.x1;
    const y0 = o.y0 === undefined ? 150 : o.y0;
    const y1 = o.y1 === undefined ? 178 : o.y1;
    const pal = o.palette || PAL.grassDay;
    const seed = o.seed || 1;
    const flower = o.flower === undefined ? 0.3 : o.flower;
    for (let i = 0; i < count; i++) {
      const s2 = seed * 7.1 + i * 3.7;
      const k = hash1(s2);
      const x = x0 + hash1(s2 + 0.7) * (x1 - x0);
      const y = y0 + k * k * (y1 - y0);
      const hh = (2.2 + k * 7) * (o.scale || 1);
      grassTuft(x, y, hh, t, pal, s2, {
        blades: hh > 5 ? 4 : 3,
        flower: hash1(s2 + 3.1) < flower,
        flowerColors: o.flowerColors,
        flowerScale: 1
      });
      /* 根部的暗色压笔，让草丛「贴地」 */
      if (i % 2 === 0) P(x, y, shade(pal[0] || '#3f5a32', 0.05));
    }
  }

  /* ---------------- 山丘 ---------------- */
  function hills(y, colorNear, colorFar, horizon, t, o) {
    o = o || {};
    const step = o.step || 8;
    for (let x = -40; x < 380; x += step) {
      const h1 = 8 + Math.sin(x * 0.013 + 1.2) * 7 + Math.sin(x * 0.031 + 3.1) * 3;
      const h2 = 5 + Math.sin(x * 0.021 + 4.3) * 4;
      if (colorFar) R(x, y + h2 - 4, step + 1, 40, colorFar);
      R(x, y - h1, step + 1, 40 + h1, colorNear);
    }
    // 顶部受光边
    for (let x = -40; x < 380; x += step) {
      const h1 = 8 + Math.sin(x * 0.013 + 1.2) * 7 + Math.sin(x * 0.031 + 3.1) * 3;
      R(x, y - h1, step + 1, 1, shade(colorNear, 0.14));
    }
  }

  /* ---------------- 树 ---------------- */
  function tree(x, baseY, h, t, palette, o) {
    o = o || {};
    const sway = Math.sin(t * 0.8 + x * 0.1) * (o.sway === undefined ? 0.5 : o.sway);
    const pal = palette || PAL.grassNight;
    const trunk = o.trunk || '#3a2b2c';
    const w = Math.round(h * 0.55);
    // 树干
    // 树干（下粗上细，带根部外扩）
    const tw = Math.max(2, Math.round(w * 0.11));
    for (let j = 0; j < h * 0.5; j++) {
      const k = j / (h * 0.5);
      const ww = Math.max(1, Math.round(tw * (1.25 - k * 0.55)));
      P(x - (ww - 1) / 2, baseY - j, trunk);
      if (ww > 1) P(x + (ww - 1) / 2, baseY - j, shade(trunk, -0.3));
    }
    P(x - tw / 2 - 1, baseY - 1, shade(trunk, -0.2));
    P(x + tw / 2, baseY - 1, shade(trunk, -0.2));
    // 树冠：三层椭圆 + 边缘碎团，轮廓更“毛”
    const cy = baseY - h * 0.62;
    const s1 = Math.sin(t * 0.62 + x * 0.1) * (o.sway === undefined ? 0.5 : o.sway);
    const s2 = Math.sin(t * 0.78 + x * 0.1 + 1.3) * (o.sway === undefined ? 0.5 : o.sway);
    Ellipse(x + s1 * 0.4, cy + 2, w * 0.62, h * 0.30, pal[1]);
    Ellipse(x - w * 0.14 + s1, cy - 1, w * 0.5, h * 0.26, pal[2]);
    Ellipse(x + w * 0.18 + s1, cy + 1, w * 0.42, h * 0.24, pal[2]);
    Ellipse(x - w * 0.05 + s2, cy - 3, w * 0.4, h * 0.2, pal[3]);
    Ellipse(x - w * 0.18 + s2, cy - 4, w * 0.22, h * 0.13, pal[4]);
    // 碎团：让树冠边缘不再是光滑椭圆
    for (let i = 0; i < 9; i++) {
      const a = hash1(i * 5.7 + x) * TAU;
      const rr = 0.3 + hash1(i * 3.1 + x) * 0.34;
      const bx2 = x + Math.cos(a) * w * rr + (i % 3 === 0 ? s2 : s1);
      const by2 = cy + Math.sin(a) * h * rr * 0.62 - 1;
      EllipseA(bx2, by2, w * 0.13, h * 0.075, i % 2 ? pal[2] : pal[3], 0.9);
    }
    // 受光侧高光
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.26;
      P(x + Math.cos(a) * w * 0.42 + s2 * 0.6, cy - 4 + Math.sin(a) * h * 0.14, shade(pal[4], 0.16));
    }
    if (o.blossom) {
      for (let i = 0; i < 14; i++) {
        const a = hash1(i * 3.3 + x) * TAU;
        const r = hash1(i * 7.1 + x) * w * 0.5;
        P(x + Math.cos(a) * r + sway, cy + Math.sin(a) * r * 0.55 - 2, PAL.blossom[i % 4]);
      }
    }
    // 底部阴影：用树冠最暗色压暗，带抖动衰减（不用纯黑，避免“黑椭圆”）
    const shadowC = shade(pal[0], -0.35);
    EllipseA(x, baseY, w * 0.46, 1.7, shadowC, 0.30);
    EllipseA(x, baseY, w * 0.30, 1.3, shadowC, 0.22);
  }

  /* ---------------- 灌木 ---------------- */
  function bush(x, baseY, w, pal, seed) {
    pal = pal || PAL.grassNight;
    const h = w * 0.55;
    Ellipse(x, baseY - h * 0.4, w * 0.5, h * 0.5, pal[1]);
    Ellipse(x - w * 0.2, baseY - h * 0.55, w * 0.3, h * 0.42, pal[2]);
    Ellipse(x + w * 0.18, baseY - h * 0.45, w * 0.26, h * 0.36, pal[2]);
    Ellipse(x - w * 0.05, baseY - h * 0.75, w * 0.22, h * 0.24, pal[3]);
    for (let i = 0; i < 5; i++) {
      const px = x + (hash1(i * 2.7 + seed) - 0.5) * w * 0.8;
      const py = baseY - h * (0.25 + hash1(i * 5.1 + seed) * 0.6);
      P(px, py, pal[4]);
    }
  }

  /* ---------------- 玫瑰丛 ---------------- */
  function roseBush(x, baseY, w, t, seed, pal) {
    pal = pal || PAL.ivy;
    const h = w * 0.6;
    Ellipse(x, baseY - h * 0.45, w * 0.5, h * 0.5, pal[1]);
    Ellipse(x - w * 0.16, baseY - h * 0.6, w * 0.3, h * 0.4, pal[2]);
    Ellipse(x + w * 0.14, baseY - h * 0.5, w * 0.28, h * 0.36, pal[3]);
    const bloomPal = [PAL.rose[1], PAL.rose[2], PAL.rose[3]];
    const n = 5 + Math.round(w / 6);
    for (let i = 0; i < n; i++) {
      const bx = x + (hash1(i * 4.7 + seed) - 0.5) * w * 0.85;
      const by = baseY - h * (0.3 + hash1(i * 8.3 + seed) * 0.6);
      const bob = Math.sin(t * 1.4 + i) * 0.4;
      P(bx, by + bob, bloomPal[i % 3]);
      P(bx + 1, by + bob, bloomPal[(i + 1) % 3]);
      if (i % 2 === 0) P(bx, by - 1 + bob, PAL.blossom[2]);
    }
  }

  /* ---------------- 灯笼 ---------------- */
  function lantern(x, y, t, o) {
    o = o || {};
    const s = o.scale || 1;
    const lit = o.lit === undefined ? 1 : o.lit;
    const flick = 0.82 + Math.sin(t * 9 + x * 3) * 0.06 + noise1(t * 5, x) * 0.12;
    const glowCol = o.glowColor || PAL.glow[1];
    if (lit > 0) {
      glowAdd(x, y, (o.glowR || 16) * s, glowCol, (o.glowA === undefined ? 0.5 : o.glowA) * lit * flick);
    }
    // 挂杆/提手
    if (o.post) {
      R(x - 0.5, y - 10 * s, 1, 10 * s, '#3a2a2a');
      R(x - 0.5, y - 10 * s, 1, 1, '#5a4438');
    }
    // 灯笼本体
    const w = 5 * s, h = 6 * s;
    R(x - w / 2, y - h / 2, w, h, '#5a3a2e');
    R(x - w / 2 + 0.5, y - h / 2 + 0.5, w - 1, h - 1, lit > 0.1 ? mix('#a86438', PAL.lantern[0], 0.55 * flick) : '#4a3a38');
    if (lit > 0.1) {
      R(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, mix(PAL.lantern[1], '#fff4d0', 0.55 * flick));
      R(x - w / 2 + 1.5, y - 1, w - 3, 2, PAL.lantern[2]);
      P(x, y - 1, '#fff8e0');
    }
    // 顶盖底盖
    R(x - w / 2 - 1, y - h / 2 - 1, w + 2, 1, '#3e2a26');
    R(x - w / 2 - 1, y + h / 2, w + 2, 1, '#3e2a26');
    // 挂钩
    R(x - 0.5, y - h / 2 - 3, 1, 2, '#3e2a26');
    if (o.tassel) R(x - 0.5, y + h / 2 + 1, 1, 2, '#a8503c');
  }

  /* ---------------- 星空/灯光串 ---------------- */
  function lightString(x0, y0, x1, y1, t, o) {
    o = o || {};
    const n = o.count || 12;
    const sag = o.sag === undefined ? 6 : o.sag;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const x = lerp(x0, x1, k);
      const y = lerp(y0, y1, k) + Math.sin(k * Math.PI) * sag;
      P(x, y, '#3a2a2a');
      if (i > 0 && i < n) {
        const fl = 0.7 + 0.3 * Math.sin(t * 3 + i * 1.7);
        P(x, y + 1, mix(PAL.glow[2], PAL.glow[0], fl));
        if (i % 2 === 0) glowAdd(x, y + 1, 5, PAL.glow[1], 0.20 * fl);
      }
    }
  }

  /* ---------------- 城堡 ---------------- */
  /* 城垛：垛墙 + 顶面受光 + 右侧背光 + 垛口内侧阴影 */
  function crenel(x, y, w, color, step) {
    step = step || 3;
    const mh = Math.max(2, Math.round(step * 0.72));
    for (let i = 0; i < w - 1; i += step * 2) {
      const mw = Math.min(step, w - i);
      if (mw <= 0) break;
      R(x + i, y - mh, mw, mh, color);
      R(x + i, y - mh, mw, 1, shade(color, 0.25));
      R(x + i + mw - 1, y - mh, 1, mh, shade(color, -0.25));
      P(x + i, y - 1, shade(color, -0.35));
    }
  }

  /* 塔楼：基座 + 砌石 + 托臂 + 瓦垄锥顶 + 拱窗 + 燕尾旗 */
  function tower(x, baseY, w, h, o) {
    o = o || {};
    const stone = o.stone || PAL.wallNight;
    const roof = o.roof || PAL.roofNight;
    const win = o.window || PAL.windowLight;
    const lit = o.lit === undefined ? 0.6 : o.lit;
    const tm = o.time || 0;
    const top = baseY - h;
    const hw = w / 2;
    const bY = baseY - 2.5;                       // 塔身底（下面留基座）

    /* 基座：外扩石台，把塔「坐」在地上 */
    R(x - hw - 1.5, bY, w + 3, 2.5, stone[1]);
    R(x - hw - 1.5, bY, w + 3, 0.8, stone[3]);
    R(x - hw - 2, baseY - 0.6, w + 4, 0.6, stone[0]);

    /* 塔身 */
    R(x - hw, top, w, bY - top, stone[2]);
    R(x - hw, top, 1, bY - top, stone[4]);
    R(x - hw + 1, top, 1, bY - top, stone[3]);
    R(x + hw - 1, top, 1, bY - top, stone[1]);
    R(x + hw - 1.6, top, 0.6, bY - top, stone[0]);
    /* 下部受潮压暗 */
    R(x - hw + 1, bY - 2, w - 2, 2, mix(stone[2], stone[0], 0.45));

    /* 砌石：错缝 + 每块明暗微差 */
    const bh = 4, bw = Math.max(4, Math.round(w * 0.62));
    for (let yy = top + 2; yy < bY - 1; yy += bh) {
      const row = Math.round((yy - top) / bh);
      HLine(x - hw + 1, x + hw - 2, yy, mix(stone[2], stone[0], 0.36));
      const off = (row % 2) * (bw / 2);
      for (let bx2 = x - hw + off; bx2 < x + hw - 1; bx2 += bw) {
        VLine(bx2, yy, Math.min(bY - 1, yy + bh - 1), mix(stone[2], stone[0], 0.26));
        if (hash2(bx2 * 0.7, yy * 1.3) > 0.68) R(bx2 + 1, yy + 1, bw - 2, bh - 1, mix(stone[2], stone[3], 0.2));
      }
    }

    /* 托臂环：锥顶出挑的支撑 */
    R(x - hw - 1, top - 2, w + 2, 2, stone[1]);
    R(x - hw - 1, top - 2, w + 2, 0.7, stone[4]);
    const corbels = Math.max(3, Math.round(w / 3));
    for (let i = 0; i < corbels; i++) {
      const cxp = x - hw + (i + 0.5) * (w / corbels);
      R(cxp - 0.5, top - 1, 1, 1.4, stone[3]);
    }

    /* 锥形屋顶：收分 + 瓦垄 + 檐口亮边 */
    const roofH = o.roofH || Math.round(w * 1.45);
    const eaveW = w + 2;
    for (let i = 0; i < roofH; i++) {
      const k = i / roofH;
      const ww = Math.max(1, Math.round(eaveW * (1 - k) + 0.5));
      const c = i < roofH * 0.18 ? roof[3] : i < roofH * 0.62 ? roof[2] : roof[1];
      R(x - ww / 2, top - 3 - roofH + i, ww, 1, c);
      if (i % 3 === 1 && ww > 4) {
        R(x - ww / 2 + 1, top - 3 - roofH + i, ww - 2, 1, mix(c, roof[0], 0.45));
        for (let gx = x - ww / 2 + 2; gx < x + ww / 2 - 1; gx += 3) {
          P(gx, top - 3 - roofH + i, mix(c, roof[1], 0.65));
        }
      }
    }
    R(x - eaveW / 2, top - 3.6, eaveW, 0.8, roof[3]);
    /* 塔尖 + 宝顶 */
    R(x - 0.5, top - 3 - roofH - 3, 1, 4, roof[2]);
    P(x - 1.5, top - 3 - roofH - 1, roof[3]);
    P(x + 1, top - 3 - roofH - 1, roof[3]);
    P(x - 0.5, top - 3 - roofH - 4, mix(roof[3], '#ffe6b8', 0.45));

    if (o.flag) {
      const fy0 = top - 3 - roofH - 6;
      const fw = 5 + Math.sin(tm * 2.2 + x) * 1.3;
      R(x + 0.5, fy0, 1, 5, '#4a3a3a');
      R(x + 1.5, fy0, fw, 3, o.flag);
      R(x + 1.5, fy0, fw, 1, shade(o.flag, 0.25));
      /* 燕尾缺口 */
      P(x + 1.5 + fw, fy0, o.flag === '#c4553f' ? mix(o.flag, '#2a1c22', 0.4) : shade(o.flag, -0.28));
    }

    /* 拱窗：凹进窗洞 + 石窗台 + 暖光斑 */
    const wins = o.windows === undefined ? 2 : o.windows;
    for (let i = 0; i < wins; i++) {
      const wy = top + 4 + i * Math.max(7, (bY - top - 9) / Math.max(1, wins - 1));
      if (wy + 6 > bY - 1) continue;
      const ww = 2, wh = 4;
      const flick = 0.7 + 0.3 * Math.sin(tm * 1.7 + i * 2.1 + x);
      const on = hash1(i * 3.1 + x) < lit;
      R(x - ww / 2 - 1, wy - 1, ww + 2, wh + 1, stone[1]);
      P(x - ww / 2 - 0.5, wy - 2, stone[1]);
      P(x + ww / 2 - 0.5, wy - 2, stone[1]);
      if (on) {
        R(x - ww / 2, wy, ww, wh, mix(win[2], win[1], 0.55));
        R(x - ww / 2, wy, ww, 1, win[0]);
        R(x - ww / 2, wy, 1, wh, mix(win[1], win[0], flick * 0.6));
        glowAdd(x, wy + wh * 0.5, 7, win[0], 0.2 * flick);
        EllipseA(x, wy + wh + 2, 2.2, 2.6, win[1], 0.09 * flick);
      } else {
        R(x - ww / 2, wy, ww, wh, stone[0]);
      }
      R(x - ww / 2 - 1, wy + wh, ww + 2, 0.8, stone[4]);
      R(x - ww / 2 - 0.5, wy + wh + 1, ww + 1, 1.6, mix(stone[2], stone[0], 0.42));
    }

    /* 底层拱门 */
    if (o.door) {
      const dw = Math.max(3, Math.round(w * 0.42)), dh = Math.min(9, h * 0.42);
      R(x - dw / 2, bY - dh, dw, dh, stone[0]);
      R(x - dw / 2 + 1, bY - dh + 1, dw - 2, dh - 1, '#2a1c22');
      for (let i = 1; i <= 2; i++) R(x - dw / 2 + i * 0.5, bY - dh - i * 0.5, dw - i, 0.6, stone[0]);
      if (o.doorLight) {
        R(x - dw / 2 + 1.5, bY - dh + 2, Math.max(1, dw - 3), dh - 2, mix('#b06a38', '#ffdca0', 0.55));
        glowAdd(x, bY - dh * 0.4, 10, '#ffcf8a', 0.24);
      }
      R(x - dw / 2 - 1, bY - dh, 0.8, dh, stone[3]);
      R(x + dw / 2, bY - dh, 0.8, dh, stone[1]);
    }
  }

  /* 主城堡：中央门楼 + 两侧塔楼 + 城墙 */
  function castle(cx, baseY, s, t, o) {
    o = o || {};
    const stone = o.stone || PAL.wallNight;
    const roof = o.roof || PAL.roofNight;
    const lit = o.lit === undefined ? 0.55 : o.lit;
    const win = o.window || PAL.windowLight;
    const fcol = o.flag || '#c4553f';
    const fine = s > 0.62;                       // 太小时省略细部，避免糊成一团
    const bodyW = 74 * s, bodyH = 34 * s;
    const x = cx - bodyW / 2, x2 = cx + bodyW / 2;
    const topY = baseY - bodyH;
    const wallB = baseY - 2.5;                   // 墙脚

    /* ---------- 基座：比墙宽一圈的石台 ---------- */
    R(x - 3 * s, wallB, bodyW + 6 * s, 2.5, stone[1]);
    R(x - 3 * s, wallB, bodyW + 6 * s, 0.8, stone[3]);
    R(x - 3.5 * s, baseY - 0.7, bodyW + 7 * s, 0.7, stone[0]);

    /* ---------- 主体墙 ---------- */
    R(x, topY, bodyW, bodyH - 2.5, stone[2]);
    /* 上亮下暗，墙面有体积 */
    for (let yy = 0; yy < bodyH - 2.5; yy += 2) {
      const k = yy / Math.max(1, bodyH - 2.5);
      if (k > 0.52) {
        R(x + 1, topY + yy, bodyW - 2, Math.min(2, bodyH - 2.5 - yy),
          mix(stone[2], stone[1], (k - 0.52) * 1.5));
      }
    }
    /* 墙角：左受光、右背光 */
    R(x, topY, 2, bodyH - 2.5, stone[4]);
    R(x + 2, topY, 0.9, bodyH - 2.5, stone[3]);
    R(x2 - 2, topY, 2, bodyH - 2.5, stone[1]);
    R(x2 - 1, topY, 1, bodyH - 2.5, stone[0]);

    /* ---------- 砌石：错缝、每块微差 ---------- */
    const bh = 4.5 * s, bw = 9 * s;
    for (let yy = topY + 2; yy < wallB - 1; yy += bh) {
      const row = Math.round((yy - topY) / bh);
      HLine(x + 1, x2 - 2, yy, mix(stone[2], stone[0], 0.3));
      const off = (row % 2) * bw * 0.5;
      for (let bx2 = x + off; bx2 < x2 - 1; bx2 += bw) {
        VLine(bx2, yy, Math.min(wallB - 1, yy + bh - 1), mix(stone[2], stone[0], 0.22));
        if (fine && hash2(bx2, yy) > 0.68) {
          R(bx2 + 1, yy + 1, Math.max(1, bw - 2), Math.max(1, bh - 1), mix(stone[2], stone[3], 0.2));
        }
      }
    }

    /* ---------- 扶壁：把平墙切成有节奏的竖段 ---------- */
    for (const bx of [x + 4.5 * s, x2 - 4.5 * s]) {
      R(bx - 2 * s, topY + 2.5, 4 * s, wallB - topY - 2.5, stone[3]);
      R(bx - 2 * s, topY + 2.5, 0.9, wallB - topY - 2.5, stone[4]);
      R(bx + 2 * s - 0.9, topY + 2.5, 0.9, wallB - topY - 2.5, stone[1]);
      /* 扶壁收头斜面 */
      R(bx - 2 * s, topY, 4 * s, 1.2, stone[4]);
      P(bx - 2 * s - 0.6, topY + 1.2, stone[2]);
      P(bx + 2 * s - 0.4, topY + 1.2, stone[1]);
    }

    /* ---------- 雉堞：托臂 + 垛口 ---------- */
    R(x - 1, topY - 1.8, bodyW + 2, 1.8, stone[1]);
    R(x - 1, topY - 1.8, bodyW + 2, 0.7, stone[4]);
    for (let i = 2; i < bodyW - 2; i += 8) P(x + i, topY - 0.15, stone[0]);
    crenel(x + 1, topY - 1.8, bodyW - 2, stone[4], Math.max(3, Math.round(4 * s)));

    /* ---------- 窗户：拱顶、石窗台、墙面暖斑、滴水痕 ---------- */
    const cols = Math.max(3, Math.round(bodyW / 12));
    const rowsY = [topY + 6.5 * s, topY + 6.5 * s + 12.5 * s];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rowsY.length; r++) {
        const wx = x + 9 * s + c * ((bodyW - 18 * s) / Math.max(1, cols - 1));
        const wy = rowsY[r];
        if (Math.abs(wx - cx) < 12 * s) continue;
        if (wy + 5.5 > wallB - 1) continue;
        const ww = 3, wh = 4.4 * s;
        const on = hash1(c * 5.3 + r * 2.7) < lit;
        const flick = 0.7 + 0.3 * Math.sin(t * 1.3 + c * 2 + r * 3);
        /* 窗洞（凹进去的暗框） */
        R(wx - ww / 2 - 0.8, wy - 1, ww + 1.6, wh + 1, stone[1]);
        P(wx - ww / 2 - 0.4, wy - 1.8, stone[1]);
        P(wx + ww / 2 - 0.4, wy - 1.8, stone[1]);
        if (on) {
          R(wx - ww / 2, wy, ww, wh, mix(win[2], win[1], 0.45));
          R(wx - ww / 2, wy, ww, 0.8, win[0]);
          R(wx - ww / 2, wy, 1, wh, mix(win[1], win[0], flick * 0.5));
          glowAdd(wx, wy + wh * 0.5, 9, win[0], 0.16 * flick);
          if (fine) EllipseA(wx, wy + wh + 1.6, 2.6, 2.2, win[1], 0.08 * flick);
        } else {
          R(wx - ww / 2, wy, ww, wh, stone[0]);
        }
        /* 石窗台 + 下面的雨渍 */
        R(wx - ww / 2 - 1, wy + wh, ww + 2, 0.8, stone[4]);
        if (fine) R(wx - ww / 2 - 0.4, wy + wh + 0.8, ww + 0.8, 2.6 * s, mix(stone[2], stone[0], 0.4));
      }
    }

    /* ---------- 中央门楼（向前凸出） ---------- */
    const gw = 24 * s, gh = 46 * s;
    const gTop = baseY - gh;
    /* 门楼在墙体上的投影 */
    R(cx - gw / 2 - 1.6, gTop, 1.6, gh, mix(stone[1], stone[0], 0.35));
    R(cx + gw / 2, gTop, 1.4, gh, mix(stone[1], stone[0], 0.25));
    R(cx - gw / 2, gTop, gw, gh, stone[3]);
    R(cx - gw / 2, gTop, 1.2, gh, stone[4]);
    R(cx - gw / 2 + 1.2, gTop, 0.8, gh, stone[3]);
    R(cx + gw / 2 - 1.2, gTop, 1.2, gh, stone[1]);
    R(cx + gw / 2 - 2, gTop, 0.8, gh, mix(stone[3], stone[1], 0.5));
    /* 门楼砌石 */
    for (let yy = gTop + 3; yy < baseY - 2; yy += 5 * s) {
      HLine(cx - gw / 2 + 1, cx + gw / 2 - 2, yy, mix(stone[3], stone[0], 0.26));
    }
    /* 门楼两侧的小壁柱 */
    R(cx - gw / 2 + 0.6, gTop + 2, 2, gh - 3, stone[4]);
    R(cx + gw / 2 - 2.6, gTop + 2, 2, gh - 3, stone[2]);

    /* 门楼屋顶：檐口 + 瓦垄 */
    const rh = 13 * s;
    for (let i = 0; i < rh; i++) {
      const k = i / rh;
      const ww = Math.round((gw + 3 * s) * (1 - k) + 1);
      const c = i < rh * 0.3 ? roof[3] : i < rh * 0.65 ? roof[2] : roof[1];
      R(cx - ww / 2, gTop - rh + i, ww, 1, c);
      if (i % 3 === 1 && ww > 5) {
        R(cx - ww / 2 + 1, gTop - rh + i, ww - 2, 0.8, mix(c, roof[0], 0.42));
      }
    }
    /* 檐口出挑 */
    R(cx - (gw + 3 * s) / 2, gTop - rh - 0.6, gw + 3 * s, 0.9, roof[3]);
    P(cx - (gw + 3 * s) / 2 - 0.5, gTop - rh - 0.4, roof[1]);
    P(cx + (gw + 3 * s) / 2 - 0.2, gTop - rh - 0.4, roof[1]);
    /* 宝顶 + 燕尾旗 */
    R(cx - 0.5, gTop - rh - 4 * s, 1, 4 * s, roof[2]);
    P(cx - 0.5, gTop - rh - 4 * s - 0.6, mix(roof[3], '#ffe6b8', 0.45));
    const fw = (6 + Math.sin(t * 1.6) * 1.5) * s;
    const fy0 = gTop - rh - 8 * s;
    R(cx + 0.5, fy0, 1, 5 * s, '#4a3a3a');
    R(cx + 1.5, fy0, fw, 4 * s, fcol);
    R(cx + 1.5, fy0, fw, 0.9, shade(fcol, 0.25));
    P(cx + 1.5 + fw, fy0, shade(fcol, -0.28));
    P(cx + 1.5 + fw, fy0 + 4 * s - 0.6, shade(fcol, -0.28));

    /* 门楼大拱窗（暖光） */
    const gwy = gTop + 7 * s;
    const gww = 7 * s, gwh = 7 * s;
    R(cx - gww / 2 - 1, gwy - 1, gww + 2, gwh + 2, stone[1]);
    P(cx - gww / 2 - 0.5, gwy - 2, stone[1]);
    P(cx + gww / 2 - 0.5, gwy - 2, stone[1]);
    R(cx - gww / 2, gwy, gww, gwh, mix(win[2], win[1], 0.4));
    R(cx - gww / 2, gwy, gww, 1, win[0]);
    R(cx - gww / 2, gwy, 1.2, gwh, mix(win[1], win[0], 0.45));
    /* 窗棂 */
    VLine(cx, gwy, gwy + gwh, mix(stone[1], '#2a1a20', 0.4));
    HLine(cx - gww / 2, cx + gww / 2 - 1, gwy + gwh * 0.48, mix(stone[1], '#2a1a20', 0.4));
    glowAdd(cx, gwy + gwh * 0.5, 12, win[0], 0.26);
    R(cx - gww / 2 - 1, gwy + gwh + 1, gww + 2, 0.8, stone[4]);

    /* ---------- 大门：半圆拱 + 券石 + 闸门 + 铁钉 ---------- */
    const dw = 13 * s, dh = 17 * s;
    const dx0 = cx - dw / 2;
    /* 门洞（下半矩形 + 上半个半圆） */
    R(dx0, baseY - dh + dw / 2, dw, dh - dw / 2, '#241620');
    for (let i = 0; i < Math.round(dw / 2); i++) {
      const yy = baseY - dh + i;
      const hw = Math.sqrt(Math.max(0, (dw / 2) * (dw / 2) - (i - dw / 2) * (i - dw / 2)));
      R(cx - hw, yy, hw * 2, 1, '#241620');
    }
    /* 券石（拱圈）：亮暗交替，向内收 */
    for (let i = 0; i < Math.round(dw / 2) + 1; i++) {
      const yy = baseY - dh + i;
      const hw = Math.sqrt(Math.max(0, (dw / 2 + 1) * (dw / 2 + 1) - (i - dw / 2) * (i - dw / 2)));
      if (hw <= 0) continue;
      const c = i % 2 ? stone[4] : stone[2];
      P(cx - hw, yy, c); P(cx + hw - 0.6, yy, shade(c, -0.12));
    }
    /* 木门 + 铁钉 + 竖木纹 */
    R(dx0 + 1, baseY - dh + dw / 2 + 1, dw - 2, dh - dw / 2 - 1, '#3c2624');
    for (let i = 1; i < 4; i++) VLine(dx0 + i * (dw / 4), baseY - dh + dw / 2 + 1, baseY - 2, '#5a3a30');
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        P(dx0 + 1.6 + i * (dw - 3) / 3, baseY - dh + dw / 2 + 1.8 + j * 3.2, '#7a5a44');
      }
    }
    HLine(dx0 + 1, dx0 + dw - 2, baseY - dh + dw / 2 + 3, '#2a1a20');
    /* 闸门格栅（半掩） */
    for (let i = 0; i < 3; i++) VLine(dx0 + 2.2 + i * (dw - 4) / 2, baseY - dh + dw / 2 + 1, baseY - dh * 0.42, '#1e1418');
    /* 门内暖光 */
    R(dx0 + 2, baseY - 7 * s, dw - 4, 7 * s - 1, mix('#a86438', '#ffcf8a', 0.5));
    R(dx0 + 2, baseY - 7 * s, dw - 4, 1.2, mix('#ffe0a8', '#ffcf8a', 0.4));
    glowAdd(cx, baseY - 3 * s, 16, '#ffcf8a', 0.32);
    /* 门口石阶 */
    R(cx - dw / 2 - 2.5, baseY - 2, dw + 5, 2, stone[2]);
    R(cx - dw / 2 - 2.5, baseY - 2, dw + 5, 0.7, stone[4]);
    R(cx - dw / 2 - 1.5, baseY - 0.6, dw + 3, 0.6, stone[1]);
    /* 门两侧壁灯 */
    for (const sxn of [-1, 1]) {
      const lx = cx + sxn * (dw / 2 + 2.2);
      R(lx - 0.5, baseY - dh * 0.72, 1, 0.8, '#4a3a3a');
      R(lx - 1, baseY - dh * 0.72 - 1.6, 2, 1.6, mix('#a86438', '#ffdc9e', 0.6));
      glowAdd(lx, baseY - dh * 0.72 - 0.8, 8, '#ffcf8a', 0.22);
    }

    /* ---------- 侧塔 ---------- */
    tower(cx - bodyW / 2 - 3.4 * s, baseY, 15 * s, 48 * s, {
      stone, roof, window: win, lit, windows: 3, roofH: 18 * s, time: t, flag: fcol
    });
    tower(cx + bodyW / 2 + 3.4 * s, baseY, 15 * s, 52 * s, {
      stone, roof, window: win, lit, windows: 3, roofH: 20 * s, time: t, flag: fcol
    });

    /* ---------- 城墙延伸 ---------- */
    for (const wx of [x - 26 * s, x2]) {
      R(wx, baseY - 14 * s, 26 * s, 14 * s, stone[2]);
      R(wx, baseY - 14 * s, 26 * s, 0.9, stone[4]);
      R(wx, baseY - 14 * s, 0.8, 14 * s, wx < cx ? stone[4] : stone[2]);
      for (let yy = baseY - 13 * s; yy < baseY - 1; yy += 4.5 * s) {
        HLine(wx + 1, wx + 26 * s - 1, yy, mix(stone[2], stone[0], 0.28));
      }
      /* 城墙上的走道口 + 垛口 */
      crenel(wx + 0.5, baseY - 14 * s, 25 * s, stone[3], Math.max(3, Math.round(4 * s)));
      /* 墙面上的排水口 */
      P(wx + 8 * s, baseY - 3, stone[0]);
      P(wx + 17 * s, baseY - 3, stone[0]);
    }
    /* 墙脚苔痕 */
    if (fine) {
      const mossC = mix(stone[1], '#3f5a3a', 0.4);
      for (let i = 0; i < Math.round(bodyW / 5); i++) {
        const mx2 = x + 2 + i * 5 + hash1(i * 3.1) * 3;
        P(mx2, baseY - 1.2, mossC);
        if (hash1(i * 5.7) > 0.5) P(mx2 + 1, baseY - 1.8, mossC);
      }
    }

    if (o.dark) {
      St.ctx().save();
      St.ctx().globalAlpha = o.dark;
      R(x - 30 * s, baseY - 60 * s, bodyW + 60 * s, 60 * s, '#1a1224');
      St.ctx().restore();
    }
  }

  /* ---------------- 阳台 ---------------- */
  function balcony(x, y, w, t, o) {
    o = o || {};
    const stone = o.stone || PAL.stoneWarm;
    // 墙体（阳台背后的立面）
    R(x - w / 2 - 8, y - 34, w + 16, 44, stone[2]);
    for (let yy = y - 30; yy < y + 8; yy += 6) {
      HLine(x - w / 2 - 8, x + w / 2 + 7, yy, mix(stone[2], stone[0], 0.28));
    }
    // 拱窗
    const ww = w * 0.62, wh = 26;
    R(x - ww / 2, y - wh - 2, ww, wh, '#2a1c28');
    R(x - ww / 2 + 1, y - wh - 1, ww - 2, wh - 1, o.windowGlow || '#e8a860');
    // 窗内暖光层
    R(x - ww / 2 + 1, y - wh - 1, ww - 2, 6, mix(o.windowGlow || '#e8a860', '#ffe6b0', 0.55));
    glowAdd(x, y - wh * 0.6, 26, o.windowGlow || '#e8a860', 0.32);
    // 拱顶
    for (let i = 0; i < 5; i++) {
      const w2 = ww * (1 - i / 5);
      R(x - w2 / 2, y - wh - 2 - i, w2, 1, '#2a1c28');
    }
    // 窗帘
    const sway = Math.sin(t * 0.9) * 0.8;
    R(x - ww / 2 + 1, y - wh - 1, 3, wh - 1, '#7d3f4c');
    R(x + ww / 2 - 4, y - wh - 1, 3, wh - 1, '#6b3442');
    R(x - ww / 2 + 1 + sway, y - wh - 1, 1, wh - 2, '#a25763');
    // 窗棂
    VLine(x, y - wh - 1, y - 3, '#4a2f36');
    HLine(x - ww / 2 + 1, x + ww / 2 - 2, y - wh * 0.55, '#4a2f36');
    // 阳台底板
    R(x - w / 2 - 2, y, w + 4, 3, stone[4]);
    R(x - w / 2 - 2, y + 3, w + 4, 2, stone[2]);
    R(x - w / 2 - 2, y + 5, w + 4, 1, stone[1]);
    // 栏杆
    for (let i = 0; i < w; i += 4) {
      R(x - w / 2 + i, y - 6, 2, 6, stone[3]);
      R(x - w / 2 + i, y - 6, 1, 6, stone[4]);
    }
    R(x - w / 2 - 1, y - 7, w + 2, 2, stone[4]);
    R(x - w / 2 - 1, y - 7, w + 2, 1, stone[5]);
    // 立柱
    R(x - w / 2 - 2, y + 5, 4, 14, stone[3]);
    R(x + w / 2 - 2, y + 5, 4, 14, stone[3]);
    // 栏杆上的花
    for (let i = 2; i < w - 2; i += 7) {
      P(x - w / 2 + i, y - 8, PAL.rose[2]);
      P(x - w / 2 + i + 1, y - 8, PAL.rose[3]);
      P(x - w / 2 + i, y - 9, PAL.ivy[3]);
    }
    // 垂落的常春藤
    for (let i = 0; i < 6; i++) {
      const ix = x - w / 2 - 1 + i * (w / 5);
      const len = 4 + hash1(i * 4.1 + x) * 10;
      for (let j = 0; j < len; j++) {
        P(ix + Math.sin(j * 0.6 + t * 0.5) * 0.8, y + 6 + j, PAL.ivy[(j + i) % PAL.ivy.length]);
      }
    }
  }

  /* ---------------- 拱形大窗（舞厅外墙） ---------------- */
  function archWindow(x, y, w, h, t, o) {
    o = o || {};
    const frame = o.frame || '#3a2a30';
    R(x - w / 2 - 1, y - h, w + 2, h, frame);
    R(x - w / 2, y - h + 1, w, h - 1, o.color || '#e7a860');
    // 拱顶
    for (let i = 0; i < 6; i++) {
      const w2 = w * (1 - i / 6);
      R(x - w2 / 2 - 1, y - h - i, w2 + 2, 1, frame);
      R(x - w2 / 2, y - h - i + 1, w2, 1, o.color || '#e7a860');
    }
    // 窗棂
    VLine(x, y - h - 3, y - 1, frame);
    HLine(x - w / 2, x + w / 2 - 1, y - h * 0.55, frame);
    HLine(x - w / 2, x + w / 2 - 1, y - h * 0.25, frame);
    glowAdd(x, y - h * 0.45, w * 0.85, o.glowColor || '#ffbf72', (o.glowA === undefined ? 0.3 : o.glowA) * 0.55);
  }

  /* ---------------- 石阶 ---------------- */
  function stairs(x, y, w, steps, h, pal) {
    pal = pal || PAL.stoneWarm;
    for (let i = 0; i < steps; i++) {
      const ww = w + i * 6;
      const yy = y + i * h;
      R(x - ww / 2, yy, ww, h, pal[3]);
      R(x - ww / 2, yy, ww, 1, pal[4]);
      R(x - ww / 2, yy + h - 1, ww, 1, pal[2]);
    }
  }

  /* ---------------- 喷泉 ---------------- */
  function fountain(x, y, s, t, o) {
    o = o || {};
    const pal = o.stone || PAL.stoneWarm;
    const water = o.water || PAL.waterNight;
    // 水池
    Ellipse(x, y, 22 * s, 7 * s, pal[2]);
    Ellipse(x, y - 1, 21 * s, 6.4 * s, water[2]);
    Ellipse(x, y - 1.6, 19 * s, 5.2 * s, water[3]);
    // 水面波光
    for (let i = 0; i < 14; i++) {
      const a = hash1(i * 3.3) * TAU;
      const r = hash1(i * 7.9) * 16 * s;
      const px = x + Math.cos(a) * r;
      const py = y - 1.4 + Math.sin(a) * r * 0.3;
      const shine = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
      if (shine > 0.45) P(px, py, mix(water[3], '#dff0ff', shine * 0.7));
    }
    // 池壁
    Ellipse(x, y + 1.5, 22 * s, 4 * s, pal[3]);
    Ellipse(x, y + 1, 21 * s, 3.2 * s, water[1]);
    // 中央柱
    R(x - 1.5 * s, y - 14 * s, 3 * s, 13 * s, pal[3]);
    R(x - 1.5 * s, y - 14 * s, 1 * s, 13 * s, pal[4]);
    Ellipse(x, y - 14 * s, 5 * s, 2 * s, pal[4]);
    Ellipse(x, y - 15 * s, 4 * s, 1.6 * s, pal[5]);
    // 水柱
    for (let i = 0; i < 8 * s; i++) {
      const k = i / (8 * s);
      const px = x + Math.sin(i * 0.9 + t * 3) * 0.6;
      const py = y - 15 * s - k * 4 * s + (k * k) * 3 * s;
      P(px, py, mix(water[3], '#e6f4ff', 0.6 - k * 0.3));
    }
    // 落水
    for (let i = 0; i < 10; i++) {
      const a = t * 1.6 + i * 0.7;
      const rx = x + Math.cos(a) * (3 + (i % 3)) * s;
      const ry = y - 15 * s + Math.sin(a) * 1.5 * s + (i % 4) * s;
      if (hash1(i * 4 + Math.floor(t * 4)) > 0.3) P(rx, ry, water[3]);
    }
    glowAdd(x, y - 12 * s, 10 * s, '#8fc4e8', 0.15);
  }

  /* ---------------- 路灯 ---------------- */
  function streetLamp(x, y, t, o) {
    o = o || {};
    const h = 26;
    R(x - 0.5, y - h, 1, h, '#2e2430');
    R(x - 1.5, y - h - 3, 3, 3, '#3a2f3a');
    R(x - 1, y - h - 2, 2, 2, mix(PAL.lantern[1], '#fff2cc', 0.6));
    glowAdd(x, y - h - 2, 20, PAL.glow[1], 0.35);
    R(x - 2.5, y - 1, 5, 1, '#2e2430');
    R(x - 1.5, y - 2, 3, 1, '#3a2f3a');
  }

  /* ---------------- 地面 ---------------- */
  function lawn(y, ramp, t, o) {
    o = o || {};
    VGrad(-40, y, 400, 190, ramp, 10);
    // 低频色斑：草地上的明暗块（用确定性噪声，静态稳定）
    for (let yy = y; yy < y + 70; yy += 2) {
      const kk = (yy - y) / 70;
      for (let xx = -40; xx < 360; xx += 2) {
        const n = noise2(xx * 0.045, yy * 0.08, 3);
        if (n > 0.62) P(xx, yy, shade(rampAt(ramp, kk), -0.06 - n * 0.05));
        else if (n < 0.34) P(xx, yy, shade(rampAt(ramp, kk), 0.05 + (0.34 - n) * 0.12));
      }
    }
    // 草叶细节：随风同向摆动（风从左向右传播），越靠前越长
    for (let i = 0; i < 140; i++) {
      const x = hash1(i * 5.1) * 360 - 20;
      const yy = y + 3 + hash1(i * 9.7) * 62;
      const k = (yy - y) / 62;
      const c = ramp[clamp(Math.floor((yy - y) / 16) + 1, 0, ramp.length - 1)];
      const len = 1 + Math.round(hash1(i * 2.7) * 1.4 + k * 2.2);
      /* 风：一条从左向右传播的波 + 每株自己的小抖动 */
      const wind = Math.sin(t * 1.15 - x * 0.032) * (0.3 + k * 0.85)
        + Math.sin(t * 2.4 + i * 1.7) * 0.22;
      for (let j = 0; j < len; j++) {
        const lift = (j + 1) * 0.42;
        P(x + wind * lift, yy - j, j === len - 1 ? shade(c, 0.28) : shade(c, 0.12));
      }
      if (i % 6 === 0) P(x + wind * (len + 1) * 0.42, yy - len, shade(c, 0.4));
    }
    // 近景草丛：几簇带花的草，让地面有前后层次
    if (o.tufts !== false) {
      for (let i = 0; i < 10; i++) {
        const gx = hash1(i * 7.3 + 2.1) * 340 - 10;
        const gy = y + 46 + hash1(i * 3.7 + 5.5) * 22;
        grassTuft(gx, gy, 4 + hash1(i * 9.1) * 4, t, ramp, i * 3.7 + 11, {
          blades: 4, flower: i % 3 === 0,
          flowerColors: o.flowerColors
        });
      }
    }
  }

  function path(x0, x1, y0, y1, pal, t) {
    pal = pal || PAL.stoneWarm;
    // 透视梯形小径
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / (y1 - y0);
      const xa = lerp(x0, x1, k) - (2 + k * 10);
      const xb = lerp(x0, x1, k) + (2 + k * 10);
      R(xa, y, xb - xa, 1, pal[2]);
      if ((y - y0) % 4 === 0) {
        HLine(xa, xb, y, pal[1]);
        P(xa + (y % 7), y, pal[3]);
      }
    }
    // 边缘
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / (y1 - y0);
      const xa = lerp(x0, x1, k) - (2 + k * 10);
      const xb = lerp(x0, x1, k) + (2 + k * 10);
      P(xa - 1, y, pal[4]);
      P(xb, y, pal[1]);
    }
  }

  /* ---------------- 篱笆 ---------------- */
  function fence(x0, x1, y, t, pal) {
    pal = pal || PAL.ivy;
    R(x0, y - 6, x1 - x0, 1, '#5a4438');
    R(x0, y - 3, x1 - x0, 1, '#4a372f');
    for (let x = x0; x < x1; x += 7) {
      R(x, y - 9, 2, 9, '#5a4438');
      R(x, y - 9, 1, 9, '#6b5344');
    }
    // 藤蔓
    for (let x = x0; x < x1; x += 2) {
      if (hash1(x * 1.7) > 0.55) {
        const hh = 2 + hash1(x * 3.1) * 5;
        for (let j = 0; j < hh; j++) P(x + Math.sin(j + t * 0.6) * 0.6, y - 8 + j, pal[(j + x) % pal.length]);
      }
    }
    for (let i = 0; i < (x1 - x0) / 12; i++) {
      const bx = x0 + hash1(i * 7.7) * (x1 - x0);
      P(bx, y - 7, PAL.rose[2]);
      P(bx + 1, y - 7, PAL.rose[3]);
    }
  }

  /* ---------------- 秋千 ---------------- */
  function swing(x, y, t) {
    const sway = Math.sin(t * 1.1) * 3;
    R(x - 8, y - 22, 1, 22, '#4a3a2e');
    R(x + 8, y - 22, 1, 22, '#4a3a2e');
    R(x - 9, y - 23, 19, 2, '#5a4636');
    const bx = x + sway;
    Line(x - 6, y - 22, bx - 5, y - 6, '#6b5344');
    Line(x + 6, y - 22, bx + 5, y - 6, '#6b5344');
    R(bx - 6, y - 6, 12, 2, '#7a5a3e');
    R(bx - 6, y - 6, 12, 1, '#8f6a48');
    // 座位上的花
    P(bx + 3, y - 7, PAL.rose[2]);
    P(bx + 4, y - 7, PAL.rose[3]);
  }

  /* ---------------- 渡船 ---------------- */
  function boat(x, y, t, o) {
    o = o || {};
    const bob = Math.sin(t * 1.3) * 0.8;
    const yy = y + bob;
    // 船体
    for (let i = 0; i < 16; i++) {
      const k = i / 16;
      const h = 2 + Math.round(Math.sin(k * Math.PI) * 2);
      R(x - 8 + i, yy - h, 1, h, i % 3 === 0 ? '#4a3228' : '#6b4632');
    }
    R(x - 8, yy - 3, 16, 1, '#8a5a3c');
    // 船头灯
    R(x + 7, yy - 5, 1, 2, '#3a2a26');
    P(x + 7, yy - 6, PAL.glow[0]);
    glowAdd(x + 7, yy - 6, 12, PAL.glow[1], 0.4);
    // 倒影
    for (let i = 0; i < 8; i++) {
      const sx = x - 6 + i * 2;
      R(sx, yy + 1 + (i % 2), 2, 1, o.water || PAL.waterNight[3]);
    }
  }

  /* ---------------- 水面 ---------------- */
  function water(y, ramp, t, o) {
    o = o || {};
    VGrad(-40, y, 400, 190, ramp, 8);
    for (let i = 0; i < 70; i++) {
      const x = hash1(i * 3.7) * 360 - 20;
      const yy = y + 2 + hash1(i * 8.1) * 70;
      const w = 2 + hash1(i * 2.3) * 6;
      const a = 0.25 + 0.35 * Math.sin(t * 1.7 + i);
      if (a > 0.2) RA(x, yy, w, 1, mix(ramp[2], '#dff2ff', 0.45), a);
    }
  }

  /* ---------------- 萤火 / 光尘 ---------------- */
  function fireflies(n, x0, x1, y0, y1, t, seed) {
    seed = seed || 0;
    for (let i = 0; i < n; i++) {
      const px = x0 + hash1(i * 3.3 + seed) * (x1 - x0) +
        Math.sin(t * (0.35 + hash1(i * 2.1 + seed) * 0.5) + i * 2.1) * 7;
      const py = y0 + hash1(i * 5.7 + seed) * (y1 - y0) +
        Math.sin(t * (0.28 + hash1(i * 7.3 + seed) * 0.4) + i * 1.3) * 4;
      const blink = Math.max(0, Math.sin(t * (1.1 + hash1(i * 9.1) * 1.8) + i * 3.1));
      const a = blink * blink;
      if (a < 0.06) continue;
      P(px, py, mix(PAL.glow[2], '#fffbe0', a));
      glowAdd(px, py, 4.5, PAL.glow[1], a * 0.5);
    }
  }

  /* ---------------- 月 ---------------- */
  function moon(x, y, r, t, o) {
    o = o || {};
    const pal = o.pal || PAL.moon;
    glowAdd(x, y, r * 4.2, o.glow || PAL.moonHalo, 0.18);
    glowAdd(x, y, r * 2.2, o.glow || PAL.moonHalo, 0.22);
    Ellipse(x, y, r, r, pal[2]);
    Ellipse(x - r * 0.12, y - r * 0.12, r * 0.9, r * 0.9, pal[1]);
    Ellipse(x - r * 0.2, y - r * 0.22, r * 0.66, r * 0.66, pal[0]);
    // 环形山
    const craters = [[-0.35, -0.2, 0.16], [0.22, 0.28, 0.2], [0.05, -0.45, 0.12], [-0.1, 0.42, 0.1], [0.4, -0.1, 0.09]];
    for (const c of craters) {
      EllipseA(x + c[0] * r, y + c[1] * r, c[2] * r, c[2] * r, pal[2], 0.55);
      EllipseA(x + c[0] * r - 0.2, y + c[1] * r - 0.2, c[2] * r * 0.7, c[2] * r * 0.7, pal[3], 0.35);
    }
    // 月晕环
    if (o.ring) {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        P(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, mix(pal[1], '#ffffff', 0.3));
      }
    }
  }

  /* ---------------- 太阳（圆形夕阳） ---------------- */
  function sunDisc(x, y, r, t, o) {
    o = o || {};
    const core = o.core || '#fff3c8';
    const edge = o.edge || '#ff9a5a';
    glowAdd(x, y, r * 2.1, o.glow || '#ffb070', 0.26);
    for (let yy = -r; yy <= r; yy++) {
      const hw = Math.sqrt(Math.max(0, r * r - yy * yy));
      const k = (yy + r) / (2 * r);
      const c = mix(core, edge, sat(k * 1.15));
      R(x - hw, y + yy, hw * 2, 1, c);
    }
    // 内圈暖环
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const rr = r * (0.72 + 0.03 * Math.sin(t * 0.8 + i));
      P(x + Math.cos(a) * rr, y + Math.sin(a) * rr, mix(core, '#fff', 0.4));
    }
    // 横向光带
    for (let i = 0; i < 4; i++) {
      const yy = -r * 0.5 + i * r * 0.34;
      RA(x - r * 1.6, y + yy, r * 3.2, 1, o.glow || '#ffc080', 0.18);
    }
  }

  /* ---------------- 光柱（从窗口斜射） ---------------- */
  function lightShaft(x, y, w, len, angle, color, a) {
    const ctx2 = St.ctx();
    const p0 = { x: x, y: y };
    const dx = Math.cos(angle) * len, dy = Math.sin(angle) * len;
    ctx2.save();
    ctx2.globalCompositeOperation = 'screen';
    ctx2.globalAlpha = a;
    ctx2.fillStyle = color;
    ctx2.beginPath();
    const X0 = St.toX(x), Y0 = St.toY(y);
    const X1 = St.toX(x + dx), Y1 = St.toY(y + dy);
    const W = St.toS(w / 2);
    ctx2.moveTo(X0 - W, Y0);
    ctx2.lineTo(X0 + W, Y0);
    ctx2.lineTo(X1 + W * 2.4, Y1);
    ctx2.lineTo(X1 - W * 2.4, Y1);
    ctx2.closePath();
    ctx2.fill();
    ctx2.restore();
  }

  window.Props = {
    air, cloud, hills, tree, bush, roseBush, lantern, lightString,
    castle, tower, crenel, balcony, archWindow, stairs, fountain, streetLamp,
    lawn, path, fence, swing, boat, water, fireflies, moon, sunDisc, lightShaft,
    blade, grassTuft, grassPatch
  };
})();
