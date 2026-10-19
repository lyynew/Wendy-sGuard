/* ============================================================
   scenes.js — 分镜场景
   每个场景 = 天空 + 远景 + 中景 + 前景 + 角色表演 + 粒子
   取景统一用 camOnFeet：把角色脚底放在屏幕固定高度（字幕之上），
   保证任何镜头下人物都不被字幕遮挡，且头部不会出画。
   ============================================================ */
(function () {
  'use strict';
  const { R, RA, P, HLine, VLine, Line, Ellipse, EllipseA, Poly, sky, stars,
    glowAdd, setView, wchar, gchar } = St;
  const PR = Props;
  const C = Chars;
  const FXa = FX;

  /* 共享夜景色阶 */
  const NIGHT = {
    lawn: ['#3b4c4e', '#475c58', '#566e60', '#677f6a', '#7a9374', '#8fa67f'],
    lawnDeep: ['#2f3f44', '#3a4c4a', '#475c52', '#556c58', '#657d64'],
    stone: ['#3f334e', '#4e3e5c', '#5f4b6a', '#71597a', '#866c8a', '#9d8198'],
    roof: ['#33263f', '#412f4d', '#513a5b', '#634768'],
    tree: ['#2f3f44', '#3b4e4a', '#475e50', '#567058', '#6b8763'],
    treeDark: ['#293842', '#33464a', '#3d534e', '#4a6353', '#5a755c']
  };

  /**
   * 以「角色脚底的世界坐标」取景：
   * screenFeet 默认 144，正好在字幕带（156+）之上
   */
  function camOnFeet(feetY, cx, z, screenFeet, smooth) {
    const sf = screenFeet === undefined ? 122 : screenFeet;
    setView(cx, feetY - (sf - 90) / z, z, smooth ? { smooth: true } : null);
  }

  function blinkAt(t, period, dur) {
    const x = (t + 0.13) % period;
    if (x > dur) return 0;
    return Math.sin((x / dur) * Math.PI);
  }

  /* ---------------- 夜景天空 ---------------- */
  function nightSky(t, o) {
    o = o || {};
    const EN = St.energy();
    const mx = o.moonX === undefined ? 252 : o.moonX;
    const my = o.moonY === undefined ? 36 : o.moonY;
    const moonR = o.moonR === undefined ? 11 : o.moonR;
    const ms = St.w2s(mx, my);
    sky(o.ramp || PAL.nightSky, {
      horizon: o.horizon || '#7a5a80',
      horizonY: o.horizonY === undefined ? 128 : o.horizonY,
      horizonI: o.horizonI === undefined ? 0.32 : o.horizonI,
      sunX: ms.x, sunY: ms.y, sunColor: '#a294c8', sunR: moonR * VIEWZ() * 1.7,
      sunI: o.moonI === undefined ? 0.38 : o.moonI
    });
    stars(t, { count: o.stars === undefined ? 96 : o.stars, alpha: (o.starAlpha === undefined ? 1 : o.starAlpha) * (0.85 + EN.mid * 0.3), yMax: 128 });
    if (o.shooting !== false) {
      FXa.shootingStar(t, 1.7, '#fff6dc');
      FXa.shootingStar(t, 5.3, '#ffe8c0');
    }
    PR.moon(mx, my, moonR, t, { ring: true, glow: '#f2e6cc' });
    const cw = ((t * 1.5) % 460) - 80;
    PR.cloud(cw, my - 6, 70, t, PAL.cloud, { alpha: 0.10, seed: 3 });
  }
  function VIEWZ() { return St.VIEW.z; }

  /* 远山与远城 */
  function distantLands(y, t) {
    PR.hills(y, '#33405c', '#41506c', '#6a5478', t, { step: 6 });
    PR.hills(y + 8, '#3b4c5c', null, null, t, { step: 5 });
    const ctx = St.ctx();
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 10; i++) {
      const x = 12 + i * 32 + hash1(i * 3.3) * 12;
      const h = 7 + hash1(i * 7.1) * 13;
      R(x, y + 4 - h, 11, h + 8, '#3e4762');
      R(x + 3, y + 4 - h - 4, 5, 5, '#485270');
      for (let j = 0; j < 3; j++) {
        if (hash1(i * 5.5 + j) > 0.5) P(x + 2 + j * 3, y + 6 - h + (j % 2), PAL.windowLight[0]);
      }
    }
    ctx.restore();
  }

  function castle(t, o) {
    o = o || {};
    PR.castle(o.x === undefined ? 160 : o.x, o.y === undefined ? 134 : o.y, o.s || 1, t, {
      stone: o.stone || NIGHT.stone, roof: o.roof || NIGHT.roof,
      lit: o.lit === undefined ? 0.55 : o.lit,
      flag: o.flag || '#c4553f',
      window: o.window || ['#ffe6b6', '#f9c882', '#e09b5c']
    });
  }

  function warmPools(t, list) {
    for (const p of list) {
      const fl = 0.8 + 0.2 * Math.sin(t * 2.1 + p[0]);
      EllipseA(p[0], p[1], p[2], Math.max(1, p[2] * 0.3), p[3] || '#d99a5a', 0.12 * fl);
    }
  }

  /* 石板小径 */
  function stonePath(x0, x1, y0, y1, t) {
    PR.path(x0, x1, y0, y1, ['#4a3f52', '#5c4d60', '#6d5c6c', '#7d6a78', '#5c4d60'], t);
  }

  /* ============================================================
     1. 月下王国（开场全景）
     ============================================================ */
  function kingdomWide(t, s) {
    const p = s.p;
    setView(lerp(150, 164, easeInOut(p)), lerp(96, 102, easeInOut(p)), lerp(0.95, 1.1, easeInOut(p)));
    nightSky(t, { moonX: 250, moonY: 32, moonR: 12 });
    distantLands(122, t);
    PR.hills(132, '#2e3c46', '#38484e', '#6a5478', t, { step: 9 });
    castle(t, { x: 158, y: 136, s: 0.95, lit: 0.6 });
    PR.lawn(146, NIGHT.lawn, t);
    stonePath(160, 158, 148, 186, t);
    PR.tree(24, 158, 70, t, NIGHT.treeDark, { sway: 0.7 });
    PR.tree(300, 160, 62, t, NIGHT.treeDark, { sway: 0.7 });
    PR.bush(78, 156, 24, NIGHT.treeDark, 3);
    PR.bush(240, 158, 28, NIGHT.treeDark, 6);
    PR.roseBush(56, 158, 22, t, 2);
    PR.roseBush(268, 160, 24, t, 5);
    PR.lantern(104, 138, t, { post: true, scale: 0.9, tassel: true });
    PR.lantern(218, 139, t, { post: true, scale: 0.9, tassel: true });
    warmPools(t, [[104, 154, 16], [218, 155, 16], [160, 166, 20, '#c98a4a']]);
    // 侍卫剪影
    const gp = C.basePose();
    gp.x = 138; gp.y = 156; gp.facing = 1;
    gp.bob = Math.sin(t * 1.1) * 0.25;
    gp.headDy = -1;
    gp.blink = blinkAt(t, 4.2, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.7 }), t, { outlineAlpha: 0.7 });
    // 塔上公主
    if (t > 4.4) {
      const ap = smoothstep(4.4, 6.6, t);
      const wp = C.basePose();
      wp.x = 184; wp.y = 96; wp.facing = -1;
      wp.hold = 0.8; wp.headTilt = -1;
      wp.blink = blinkAt(t + 1, 4, 0.5);
      St.ctx().save();
      St.ctx().globalAlpha = ap;
      wchar(Object.assign({}, wp, { scale: 0.5 }), t, { shadow: false });
      St.ctx().restore();
      glowAdd(184, 88, 12, '#ffdca4', 0.3 * ap);
    }
    FXa.fireflies(14, { t, x0: 30, x1: 290, y0: 116, y1: 168, seed: 2 });
    FXa.dust(16, { t, x0: 40, x1: 280, y0: 98, y1: 170, rise: 3, color: '#ffcf8a' });
    FXa.bokeh(4, { t, x0: 60, x1: 260, y0: 118, y1: 158, color: '#ffcf8a', seed: 3 });
  }

  /* ============================================================
     2. 夜巡（跟拍）
     ============================================================ */
  function gardenApproach(t, s) {
    const p = s.p;
    const gx = lerp(40, 150, easeInOut(p));
    camOnFeet(156, gx + 10, 2.0, 126);
    nightSky(t, { moonX: gx + 110, moonY: 30, moonR: 9, shooting: false });
    distantLands(114, t);
    St.ctx().save(); St.ctx().globalAlpha = 0.75;
    castle(t, { x: gx + 76, y: 126, s: 0.64, lit: 0.5 });
    St.ctx().restore();
    PR.lawn(142, NIGHT.lawn, t);
    R(-160, 150, 560, 10, '#5b4f5e');
    R(-160, 150, 560, 1, '#6f6170');
    R(-160, 158, 560, 1, '#443a4a');
    for (let x = -160; x < 400; x += 8) {
      VLine(x, 151, 157, '#4e4354');
      if (hash1(x * 1.3) > 0.62) P(x + 3, 153 + (x % 3), '#6a5c6a');
    }
    PR.fence(-160, 400, 146, t, PAL.ivy);
    for (let i = 0; i < 14; i++) {
      const bx = -140 + i * 40 + hash1(i * 3.3) * 12;
      PR.bush(bx, 144, 16 + hash1(i * 7.1) * 12, NIGHT.tree, i);
    }
    PR.tree(-24, 154, 66, t, NIGHT.treeDark, { sway: 0.7, blossom: true });
    PR.tree(96, 150, 40, t, NIGHT.treeDark, { sway: 0.6 });
    PR.tree(302, 156, 60, t, NIGHT.treeDark, { sway: 0.7 });
    for (let i = 0; i < 8; i++) PR.roseBush(-30 + i * 52, 148, 13, t, i * 3 + 1);
    PR.lantern(24, 132, t, { post: true, scale: 0.9, tassel: true });
    PR.lantern(210, 133, t, { post: true, scale: 0.9, tassel: true });
    warmPools(t, [[24, 150, 16], [210, 151, 16]]);
    // 侍卫提灯
    const gp = C.basePose();
    gp.x = gx; gp.y = 156; gp.facing = 1;
    gp.walk = 0.85; gp.walkPhase = t * 5.6;
    gp.bob = Math.abs(Math.sin(t * 5.6)) * 1.1;
    gp.capeSwing = Math.sin(t * 5.6) * 1.0;
    gp.blink = blinkAt(t + 0.6, 4.4, 0.5);
    gchar(gp, t, {});
    const lx = gx + 9, ly = 156 - 22 + Math.sin(t * 2.2) * 0.9;
    PR.lantern(lx, ly, t, { scale: 0.5, glowR: 17, glowA: 0.72, tassel: true });
    EllipseA(lx, 157, 16, 4, '#ffcf8a', 0.12);
    glowAdd(gx + 76, 92, 9, '#ffdca4', 0.2);
    FXa.fireflies(14, { t, x0: gx - 110, x1: gx + 130, y0: 110, y1: 168, seed: 17 });
    FXa.petals(10, { t, x0: gx - 130, x1: gx + 150, y0: 88, y1: 172, speed: 4, wind: 4, seed: 3 });
    FXa.dust(12, { t, x0: gx - 120, x1: gx + 140, y0: 98, y1: 168, rise: 3 });
  }

  /* ============================================================
     3. 塔上塔下
     ============================================================ */
  function windowGaze(t, s) {
    const p = s.p;
    const z = lerp(1.42, 1.24, easeInOut(p));
    setView(160, lerp(116, 108, easeInOut(p)), z);
    nightSky(t, { moonX: 262, moonY: 28, moonR: 10, horizonY: 146, horizonI: 0.2 });
    R(-60, 26, 440, 152, '#4a3b58');
    for (let y = 30; y < 180; y += 7) {
      HLine(-60, 380, y, '#544363');
      for (let x = -60 + ((y / 7) % 2) * 11; x < 380; x += 22) VLine(x, y, y + 7, '#564465');
    }
    RA(-60, 26, 440, 40, '#6a5480', 0.34);
    RA(-60, 26, 440, 14, '#7d6390', 0.28);
    PR.balcony(160, 76, 44, t, { stone: NIGHT.stone, windowGlow: '#f6c07a' });
    for (let i = 0; i < 12; i++) {
      const ix = -40 + i * 34 + hash1(i * 3.1) * 14;
      const len = 14 + hash1(i * 7.7) * 30;
      for (let j = 0; j < len; j++) {
        P(ix + Math.sin(j * 0.45 + t * 0.5) * 1.3, 84 + j, PAL.ivy[(i + j) % PAL.ivy.length]);
      }
    }
    const wp = C.basePose();
    wp.x = 160; wp.y = 78; wp.facing = 1;
    wp.hold = 0.8; wp.headDy = -1; wp.headTilt = 1;
    wp.blush = 0.5; wp.smile = 0.55;
    wp.skirtSway = Math.sin(t * 1.0) * 0.4;
    wp.hairSway = Math.sin(t * 1.1) * 0.4;
    wp.bob = Math.sin(t * 1.2) * 0.2;
    wp.blink = blinkAt(t + 0.8, 3.8, 0.5);
    wchar(Object.assign({}, wp, { scale: 0.85 }), t, {
      light: { x: 0, y: -1, color: '#ffe0b0', alpha: 0.4 }, haloAlpha: 0.14
    });
    glowAdd(160, 64, 18, '#ffdca4', 0.2);
    PR.lawn(150, NIGHT.lawn, t);
    stonePath(160, 156, 150, 186, t);
    PR.tree(22, 158, 58, t, NIGHT.treeDark, { sway: 0.7 });
    PR.tree(298, 160, 52, t, NIGHT.treeDark, { sway: 0.7 });
    PR.roseBush(112, 156, 20, t, 21);
    PR.roseBush(208, 158, 20, t, 22);
    PR.lantern(96, 140, t, { post: true, scale: 0.8 });
    const gp = C.basePose();
    gp.x = 150; gp.y = 156; gp.facing = 1;
    gp.headDy = -2; gp.headTilt = -1;
    gp.hold = 0.5; gp.smile = 0.4; gp.blush = 0.3;
    gp.bob = Math.sin(t * 1.05) * 0.2;
    gp.capeSwing = Math.sin(t * 0.9) * 0.3;
    gp.blink = blinkAt(t + 2, 4.6, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.8 }), t, {});
    glowAdd(150, 134, 9, '#ffcf8a', 0.12);
    FXa.fireflies(12, { t, x0: 40, x1: 280, y0: 118, y1: 168, seed: 31 });
    FXa.petals(10, { t, x0: 40, x1: 280, y0: 88, y1: 172, speed: 4, wind: 4, seed: 8 });
    FXa.dust(10, { t, x0: 60, x1: 260, y0: 98, y1: 168, rise: 3 });
  }

  /* ============================================================
     4. 月光庭院
     ============================================================ */
  function moonlitGarden(t, s) {
    const p = s.p;
    camOnFeet(161, lerp(150, 156, easeInOut(p)), lerp(1.3, 1.42, easeInOut(p)), 122);
    nightSky(t, { moonX: 276, moonY: 28, moonR: 10, shooting: false });
    St.ctx().save(); St.ctx().globalAlpha = 0.65;
    castle(t, { x: 210, y: 130, s: 0.58, lit: 0.5 });
    St.ctx().restore();
    PR.lawn(142, NIGHT.lawn, t);
    // 花拱门
    for (let i = 0; i < 2; i++) {
      const ax = i === 0 ? 96 : 224;
      R(ax - 15, 96, 3, 52, '#5c4a44');
      R(ax + 13, 96, 3, 52, '#5c4a44');
      R(ax - 15, 96, 3, 1, '#70594e');
      for (let x = -15; x < 17; x += 2) {
        const yy = 96 - Math.round(Math.sin(((x + 15) / 32) * Math.PI) * 8);
        P(ax + x, yy - 1, PAL.ivy[(x + 40 + i) % PAL.ivy.length]);
        if (hash1(x * 3.3 + i) > 0.5) P(ax + x, yy - 2, PAL.rose[2]);
      }
    }
    R(150, 136, 32, 3, '#6b5344');
    R(150, 136, 32, 1, '#7d624f');
    R(152, 139, 3, 9, '#5c4a44');
    R(177, 139, 3, 9, '#5c4a44');
    PR.tree(28, 156, 72, t, NIGHT.treeDark, { sway: 0.7, blossom: true });
    PR.tree(294, 158, 62, t, NIGHT.treeDark, { sway: 0.7 });
    PR.roseBush(64, 154, 26, t, 11);
    PR.roseBush(252, 156, 24, t, 12);
    stonePath(160, 168, 146, 186, t);
    PR.lightString(70, 108, 250, 106, t, { count: 11, sag: 16 });
    PR.lantern(70, 116, t, { post: true, scale: 0.85, tassel: true });
    PR.lantern(250, 116, t, { post: true, scale: 0.85, tassel: true });
    warmPools(t, [[70, 150, 20], [250, 152, 20], [160, 172, 22, '#d99a55']]);
    // 两人走来
    const wIn = easeOut(sat((t - 26.4) / 4.4));
    const wp = C.basePose();
    wp.x = lerp(100, 146, wIn); wp.y = 158; wp.facing = 1;
    wp.walk = 0.9 - wIn * 0.6; wp.walkPhase = t * 5.2;
    wp.skirtSway = Math.sin(t * 5.2) * 1.2;
    wp.hairSway = Math.sin(t * 5.2 + 1) * 0.8;
    wp.smile = 0.7; wp.blush = 0.5;
    wp.bob = Math.abs(Math.sin(t * 5.2)) * 0.9;
    wp.blink = blinkAt(t + 0.5, 4, 0.5);
    wchar(wp, t, {});
    const gp = C.basePose();
    gp.x = wp.x - 15; gp.y = 160; gp.facing = 1;
    gp.walk = 0.9 - wIn * 0.6; gp.walkPhase = t * 5.2 + 0.7;
    gp.bob = Math.abs(Math.sin(t * 5.2)) * 0.9;
    gp.capeSwing = Math.sin(t * 5.2) * 0.8;
    gp.smile = 0.6; gp.blush = 0.35;
    gp.blink = blinkAt(t + 2.2, 4.4, 0.5);
    gchar(gp, t, {});
    FXa.fireflies(16, { t, x0: 30, x1: 290, y0: 108, y1: 170, seed: 41 });
    FXa.petals(14, { t, x0: 20, x1: 300, y0: 88, y1: 172, speed: 5, wind: 6, seed: 4 });
    FXa.dust(14, { t, x0: 40, x1: 280, y0: 108, y1: 170, rise: 3.5 });
    FXa.bokeh(6, { t, x0: 40, x1: 280, y0: 108, y1: 158, color: '#ffcf8a', seed: 5 });
  }

  /* ============================================================
     5. 告白
     ============================================================ */
  function gardenConfession(t, s) {
    const p = s.p;
    camOnFeet(158, lerp(152, 156, easeInOut(p)), lerp(1.8, 2.05, easeInOut(p)), 120);
    nightSky(t, { moonX: 296, moonY: 22, moonR: 8, shooting: false });
    // 背景花架
    R(70, 84, 3, 66, '#5c4a44');
    R(94, 84, 3, 66, '#5c4a44');
    for (let x = -2; x < 26; x += 2) {
      const yy = 84 - Math.round(Math.sin((x / 26) * Math.PI) * 7);
      P(70 + x, yy - 1, PAL.ivy[(x + 30) % PAL.ivy.length]);
      if (hash1(x * 2.7) > 0.5) P(70 + x, yy - 2, PAL.rose[2]);
    }
    St.ctx().save(); St.ctx().globalAlpha = 0.7;
    PR.tree(28, 150, 66, t, NIGHT.treeDark, { sway: 0.6 });
    PR.tree(286, 152, 60, t, NIGHT.treeDark, { sway: 0.6 });
    St.ctx().restore();
    PR.lawn(146, NIGHT.lawn, t);
    PR.roseBush(56, 152, 26, t, 15);
    PR.roseBush(268, 154, 24, t, 16);
    PR.lantern(244, 66, t, { scale: 1.25, glowR: 38, glowA: 0.7, tassel: true });
    PR.lantern(96, 80, t, { scale: 0.85, glowR: 24, glowA: 0.5 });
    warmPools(t, [[150, 172, 26, '#d99a55']]);
    const wp = C.basePose();
    wp.x = 172; wp.y = 158; wp.facing = -1;
    wp.hold = 0.85; wp.headTilt = 1;
    wp.blush = 0.55 + 0.15 * Math.sin(t * 0.9);
    wp.smile = 0.65;
    wp.skirtSway = Math.sin(t * 1.1) * 0.5;
    wp.hairSway = Math.sin(t * 1.3) * 0.4;
    wp.bob = Math.sin(t * 1.3) * 0.2;
    wp.blink = blinkAt(t + 0.3, 3.2, 0.55);
    wchar(wp, t, {});
    glowAdd(wp.x, wp.y - 22, 16, '#ffd9a0', 0.12);
    const gp = C.basePose();
    gp.x = 140; gp.y = 158; gp.facing = 1;
    gp.hold = 0.15;
    gp.lift = 0.6 + 0.12 * Math.sin(t * 1.2);
    gp.smile = 0.5; gp.blush = 0.4;
    gp.bob = Math.sin(t * 1.1 + 1) * 0.2;
    gp.blink = blinkAt(t + 1.4, 4.2, 0.55);
    gp.capeSwing = Math.sin(t * 1.2) * 0.25;
    gchar(gp, t, {});
    glowAdd(gp.x, gp.y - 24, 14, '#ffcf8a', 0.1);
    // 手中的小灯
    const hx = gp.x + 9, hy = gp.y - 21 + Math.sin(t * 1.2) * 0.7;
    PR.lantern(hx, hy, t, { scale: 0.4, glowR: 12, glowA: 0.8 });
    FXa.petals(14, { t, x0: 30, x1: 300, y0: 78, y1: 176, speed: 4.5, wind: 5, seed: 1 });
    FXa.fireflies(12, { t, x0: 40, x1: 290, y0: 108, y1: 166, seed: 6 });
    FXa.dust(12, { t, x0: 60, x1: 280, y0: 98, y1: 168, rise: 3.5 });
    FXa.bokeh(6, { t, x0: 100, x1: 260, y0: 88, y1: 148, color: '#ffcf8a', seed: 8 });
  }

  /* ============================================================
     6. 请看着我的眼睛（特写）
     ============================================================ */
  function closeEyes(t, s) {
    const p = s.p;
    setView(lerp(166, 168, easeInOut(p)), lerp(118, 116, easeInOut(p)), lerp(2.7, 2.95, easeInOut(p)));
    sky(PAL.nightSky, { horizon: '#7a5a80', horizonY: 120, horizonI: 0.4, sunX: 24, sunY: 26, sunColor: '#9d8fc4', sunR: 12, sunI: 0.3 });
    stars(t, { count: 50, alpha: 0.7, yMax: 110 });
    for (let i = 0; i < 16; i++) {
      const bx = hash1(i * 3.3) * 340 - 10 + Math.sin(t * 0.3 + i) * 3;
      const by = 40 + hash1(i * 7.7) * 96;
      const r = 4 + hash1(i * 5.1) * 11;
      EllipseA(bx, by, r, r * 0.92, ['#ffcf8a', '#e8a86a', '#b98ab0'][i % 3], 0.10);
      if (i % 4 === 0) glowAdd(bx, by, r * 1.6, '#ffcf8a', 0.1);
    }
    const wp = C.basePose();
    wp.x = 168; wp.y = 160; wp.facing = -1;
    wp.hold = 0.9;
    wp.blush = 0.75; wp.smile = 0.5;
    wp.hairSway = Math.sin(t * 0.9) * 0.3;
    wp.bob = Math.sin(t * 1.1) * 0.15;
    wp.blink = blinkAt(t, 4.6, 0.7);
    wchar(Object.assign({}, wp, { scale: 1.35 }), t, {});
    glowAdd(168, 96, 40, '#ffdca4', 0.14);
    FXa.twinkle(158, 106, 6, t, '#fff4d8', 0.5);
    FXa.twinkle(174, 104, 5, t + 1.2, '#fff4d8', 0.4);
    FXa.petals(10, { t, x0: 60, x1: 280, y0: 60, y1: 178, speed: 6, wind: 6, seed: 9 });
    FXa.dust(10, { t, x0: 60, x1: 280, y0: 60, y1: 168, rise: 4 });
  }

  /* ============================================================
     7. 窗外（舞厅）
     ============================================================ */
  function ballroomOutside(t, s) {
    const p = s.p;
    camOnFeet(166, lerp(154, 158, easeInOut(p)), lerp(1.3, 1.42, easeInOut(p)), 122);
    nightSky(t, { moonX: 292, moonY: 16, moonR: 7, stars: 44, shooting: false });

    /* ============ 舞厅外墙 ============ */
    const wallTop = 30;
    R(-60, wallTop, 440, 140, '#4a3a52');
    for (let y = wallTop; y < 172; y += 8) {
      HLine(-60, 380, y, '#554360');
      for (let x = -60 + ((y / 8) % 2) * 13; x < 380; x += 26) VLine(x, y, y + 8, '#574563');
    }
    // 壁柱
    for (const px0 of [70, 128, 184, 240]) {
      R(px0, wallTop + 8, 6, 112, '#5b4866');
      R(px0, wallTop + 8, 1, 112, '#775e82');
      R(px0 + 5, wallTop + 8, 1, 112, '#3f3048');
      R(px0 - 2, wallTop + 6, 10, 3, '#6b5576');
      R(px0 - 2, wallTop + 6, 10, 1, '#8a6f96');
    }
    // 檐口 + 女儿墙
    R(-60, wallTop, 440, 6, '#5f4b6a');
    R(-60, wallTop, 440, 1, '#826a90');
    R(-60, wallTop + 5, 440, 1, '#3a2c46');
    for (let x = -60; x < 380; x += 9) {
      R(x, wallTop - 5, 5, 5, '#5f4b6a');
      R(x, wallTop - 5, 5, 1, '#826a90');
    }
    RA(-60, wallTop, 440, 18, '#6a5480', 0.2);

    /* ============ 拱窗（底部 112） ============ */
    PR.archWindow(99, 112, 22, 44, t, { color: '#e8a860', frame: '#33283f', glowColor: '#ffb972', glowA: 0.45 });
    PR.archWindow(156, 112, 28, 54, t, { color: '#f8c47c', frame: '#33283f', glowColor: '#ffc078', glowA: 0.58 });
    PR.archWindow(213, 112, 22, 44, t, { color: '#e8a860', frame: '#33283f', glowColor: '#ffb972', glowA: 0.45 });
    // 窗台石雕
    for (const wx of [99, 156, 213]) {
      const w = wx === 156 ? 32 : 26;
      R(wx - w / 2, 112, w, 3, '#6b5576');
      R(wx - w / 2, 112, w, 1, '#8a6f96');
      R(wx - 3, 115, 6, 3, '#544463');
    }
    // 窗内舞者
    // 窗光微微呼吸（像是里面的舞会正在进行）
    const flick = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.9) * Math.sin(t * 0.7 + 1));
    for (const wx of [99, 156, 213]) {
      const wr = wx === 156 ? 30 : 24;
      EllipseA(wx, 128, wr, 14, '#ffd08a', 0.06 + flick * 0.05);
    }
    St.ctx().save();
    St.ctx().globalAlpha = 0.62;
    const dancers = [
      [156, 111, 26, 1.0], [140, 111, 20, 0.7], [172, 111, 22, 0.8],
      [99, 111, 18, 0.55], [213, 111, 18, 0.55]
    ];
    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i];
      const xx = d[0] + Math.sin(t * 0.62 + i * 1.3) * 3.4 * d[3];
      const bob = Math.abs(Math.sin(t * 1.6 + i * 0.8)) * 1.6 * d[3];
      C.drawSilhouette(St.ctx(), xx, d[1] - bob, d[2], '#5a2a34');
      // 舞伴
      if (i < 2) {
        const px2 = xx + 9 + Math.sin(t * 0.62 + i * 1.3 + 1.4) * 2.4;
        C.drawSilhouette(St.ctx(), px2, d[1] - bob * 0.7, Math.round(d[2] * 0.92), '#4c242e');
      }
    }
    St.ctx().restore();

    /* ============ 露台 ============ */
    // 露台地面
    R(-60, 118, 440, 5, '#544463');
    R(-60, 118, 440, 1, '#6f5a80');
    // 栏杆
    R(-60, 122, 440, 2, '#5f4b6a');
    R(-60, 122, 440, 1, '#826a90');
    for (let x = -30; x < 380; x += 9) {
      R(x, 124, 2, 12, '#463757');
      R(x, 124, 1, 12, '#5c4a6a');
    }
    R(-60, 136, 440, 2, '#5f4b6a');
    R(-60, 136, 440, 1, '#7a6488');
    // 花箱
    for (const bx of [52, 130, 186, 262]) {
      R(bx - 9, 128, 18, 6, '#5a4636');
      R(bx - 9, 128, 18, 1, '#6e5541');
      for (let i = 0; i < 8; i++) {
        P(bx - 8 + i * 2.2, 127, PAL.ivy[(i + 3) % PAL.ivy.length]);
        if (i % 2 === 0) P(bx - 8 + i * 2.2, 126, PAL.rose[2]);
      }
    }
    // 壁灯
    for (const lx of [70, 240]) {
      R(lx - 1, 84, 2, 10, '#3e3048');
      PR.lantern(lx, 96, t, { scale: 0.58, glowR: 18, glowA: 0.6 });
    }

    /* ============ 台阶与庭院 ============ */
    for (let i = 0; i < 4; i++) {
      const w = 132 + i * 14;
      R(160 - w / 2, 138 + i * 4, w, 4, ['#5f4b6a', '#544463', '#4b3b59'][i % 3]);
      R(160 - w / 2, 138 + i * 4, w, 1, '#7a6488');
    }
    PR.lawn(152, NIGHT.lawn, t);
    // 台阶下的石板
    for (let i = 0; i < 10; i++) {
      const sx0 = 92 + hash1(i * 3.3) * 130;
      R(sx0, 168 + hash1(i * 7.7) * 8, 10 + hash1(i * 5.1) * 8, 3, '#4a3f52');
      R(sx0, 168 + hash1(i * 7.7) * 8, 10 + hash1(i * 5.1) * 8, 1, '#5c4d60');
    }
    // 两侧树与花丛
    PR.tree(18, 160, 56, t, NIGHT.treeDark, { sway: 0.6 });
    PR.tree(304, 162, 52, t, NIGHT.treeDark, { sway: 0.6 });
    PR.roseBush(56, 158, 22, t, 71);
    PR.roseBush(268, 160, 24, t, 72);
    // 前景石瓮
    for (const ux of [26, 296]) {
      R(ux - 8, 174, 16, 3, '#241a30');
      R(ux - 6, 162, 12, 12, '#2b2038');
      R(ux - 8, 156, 16, 7, '#33263f');
      R(ux - 8, 156, 16, 1, '#3d2f4c');
      for (let i = 0; i < 5; i++) P(ux - 6 + i * 3, 154, PAL.ivy[(i + 2) % PAL.ivy.length]);
      for (let i = 0; i < 3; i++) P(ux - 4 + i * 4, 153, PAL.rose[2]);
    }

    /* ============ 侍卫：站在台阶前仰望窗内 ============ */
    const gp = C.basePose();
    gp.x = 70; gp.y = 168; gp.facing = 1;
    gp.headDy = 1; gp.headTilt = 1;
    gp.hold = 0.55;
    gp.capeSwing = Math.sin(t * 1.1) * 0.3;
    gp.bob = Math.sin(t * 1.05) * 0.2;
    gp.blink = blinkAt(t + 2, 4.4, 0.5);
    gchar(gp, t, {
      coat: '#3a4660', coatMid: '#2e3850', coatDark: '#242c40',
      trim: '#bc9260', trimDark: '#906a3c',
      light: { x: 1, y: -1, color: '#ffcf8a', alpha: 0.45 },
      haloAlpha: 0.14
    });
    // 藏在身后的花
    const fx0 = gp.x - 7, fy0 = gp.y - 17;
    P(fx0, fy0, PAL.rose[1]);
    P(fx0 + 1, fy0, PAL.rose[2]);
    P(fx0, fy0 + 1, PAL.ivy[2]);
    P(fx0 + 2, fy0 - 1, PAL.rose[3]);
    // 他身后压暗，让逆光轮廓把人物从墙面里分出来
    const c0 = St.ctx();
    c0.save();
    const gg = c0.createRadialGradient(St.toX(gp.x), St.toY(gp.y - 20), St.toS(2),
      St.toX(gp.x), St.toY(gp.y - 20), St.toS(26));
    gg.addColorStop(0, 'rgba(20,12,26,0.55)');
    gg.addColorStop(0.6, 'rgba(20,12,26,0.32)');
    gg.addColorStop(1, 'rgba(20,12,26,0)');
    c0.fillStyle = gg;
    c0.fillRect(St.toX(gp.x - 30), St.toY(gp.y - 50), St.toS(60), St.toS(56));
    c0.restore();

    FXa.fireflies(6, { t, x0: 20, x1: 300, y0: 120, y1: 172, seed: 8 });
    FXa.petals(9, { t, x0: 20, x1: 300, y0: 80, y1: 176, speed: 3.5, wind: 4, seed: 5, colors: ['#d99aa0', '#eeb0b2', '#f7ccc6'] });
    FXa.bokeh(7, { t, x0: 80, x1: 230, y0: 90, y1: 140, color: '#ffcf8a', seed: 6 });
  }

  /* ============================================================
     8. 耀眼
     ============================================================ */
  function ballroomFlare(t, s) {
    const p = s.p;
    setView(lerp(170, 176, easeInOut(p)), lerp(106, 104, easeInOut(p)), lerp(1.5, 1.62, easeInOut(p)));
    sky(['#2b2a58', '#3f3769', '#5b477d', '#7d5b8d', '#a06a86'], { horizon: '#e0a888', horizonY: 118, horizonI: 0.62 });
    const cxw = 248, cyw = 92;
    for (let i = 0; i < 5; i++) {
      const r = 24 + i * 15 + Math.sin(t * 2 + i) * 1.5;
      EllipseA(cxw, cyw, r, r * 1.2, ['#ffd08a', '#f7b56a', '#e89a5a', '#c97a52', '#a05f4e'][i], 0.13 + i * 0.02);
    }
    glowAdd(cxw, cyw, 84, '#ffcf8a', 0.34);
    St.ctx().save();
    St.ctx().globalAlpha = 0.7;
    R(cxw - 32, cyw - 52, 4, 104, '#3a2a3e');
    R(cxw + 28, cyw - 52, 4, 104, '#3a2a3e');
    R(cxw - 32, cyw - 52, 64, 4, '#3a2a3e');
    R(cxw - 32, cyw + 50, 64, 4, '#3a2a3e');
    VLine(cxw, cyw - 52, cyw + 50, '#4a3648');
    HLine(cxw - 32, cxw + 32, cyw - 6, '#4a3648');
    St.ctx().restore();
    FXa.dust(24, { t, x0: 200, x1: 300, y0: 58, y1: 158, rise: 5, color: '#ffdca4', seed: 2 });
    PR.lawn(156, NIGHT.lawnDeep, t);
    // 侍卫退在暗处
    const gp = C.basePose();
    gp.x = 104; gp.y = 158; gp.facing = 1;
    gp.headDy = 2; gp.headTilt = 2;
    gp.hold = 0.8;
    gp.capeSwing = Math.sin(t * 0.9) * 0.2;
    gp.bob = Math.sin(t * 0.9) * 0.16;
    gp.blink = blinkAt(t + 1, 5.2, 0.6);
    gp.smile = 0;
    gchar(gp, t, {
      coat: '#2e3a52', coatMid: '#242d42', coatDark: '#1b2232', trim: '#8a6a42', trimDark: '#6a4c30',
      outlineColor: '#100b16'
    });
    P(gp.x + 8, gp.y - 9, PAL.rose[1]);
    P(gp.x + 9, gp.y - 9, PAL.rose[2]);
    P(gp.x + 8, gp.y - 8, PAL.ivy[1]);
    P(gp.x + 6, gp.y - 8, PAL.rose[3]);
    FXa.petals(10, { t, x0: 0, x1: 340, y0: 78, y1: 176, speed: 5, wind: 6, seed: 11, colors: ['#e8b0a0', '#f7ccc0'] });
  }

  /* ============================================================
     9. 蓝天般的你
     ============================================================ */
  function skyMemory(t, s) {
    const echo = s.shot && s.shot.echo;
    const p = s.p;
    setView(lerp(158, 164, easeInOut(p)), lerp(96, 92, easeInOut(p)), lerp(1.14, 1.22, easeInOut(p)));
    sky(echo
      ? ['#4e86ad', '#6498bc', '#7fafcb', '#9bc5d8', '#bcdae4', '#dceef2']
      : ['#2f78b0', '#448fc4', '#5fa6d2', '#7fbce0', '#a3d3ea', '#cbeaf4'], {
      sunX: St.w2s(252, 26).x, sunY: St.w2s(252, 26).y, sunColor: '#fff6d8', sunR: 16 * St.VIEW.z,
      sunI: echo ? 0.35 : 0.55,
      horizon: '#f0e8c8', horizonY: 118, horizonI: 0.5
    });
    /* --- 云：高空卷云 + 远/中/近三层积云，全部循环漂移，天空不空 --- */
    for (let i = 0; i < 6; i++) {
      const cy0 = 16 + i * 6.5 + Math.sin(t * 0.18 + i) * 1.4;
      const cx0 = ((i * 91 - t * 2.6) % 380 + 380) % 380 - 50;
      RA(cx0, cy0, 54 + i * 13, 1, '#eaf7ff', 0.17 - i * 0.012);
      RA(cx0 + 16, cy0 + 2, 34 + i * 9, 1, '#e6f4ff', 0.1);
    }
    /* 云全部在世界 x 20~300 之间循环（这个镜头可见范围约 33~289） */
    PR.cloud(24, 46, 82, t, PAL.cloud, { drift: -t * 1.5, wrapX0: 20, wrapW: 300, alpha: 0.82, seed: 2 });
    PR.cloud(186, 26, 92, t, PAL.cloud, { drift: -t * 1.1, wrapX0: 20, wrapW: 300, alpha: 0.72, seed: 5 });
    PR.cloud(258, 62, 72, t, PAL.cloud, { drift: -t * 1.8, wrapX0: 20, wrapW: 300, alpha: 0.85, seed: 9 });
    PR.cloud(76, 86, 62, t, PAL.cloudWarm, { drift: -t * 2.2, wrapX0: 20, wrapW: 300, alpha: 0.55, seed: 12 });
    PR.cloud(6, 100, 56, t, PAL.cloud, { drift: -t * 2.6, wrapX0: 20, wrapW: 300, alpha: 0.5, seed: 15 });
    /* 远处高空的巨云（慢、淡）+ 低空薄云（快、薄） */
    PR.cloud(120, 10, 132, t, PAL.cloud, { drift: -t * 0.45, wrapX0: 10, wrapW: 310, alpha: 0.40, seed: 21 });
    PR.cloud(-30, 28, 104, t, PAL.cloud, { drift: -t * 0.7, wrapX0: 10, wrapW: 310, alpha: 0.34, seed: 23, squish: 0.82 });
    PR.cloud(300, 18, 88, t, PAL.cloud, { drift: -t * 0.6, wrapX0: 10, wrapW: 310, alpha: 0.38, seed: 27 });
    PR.cloud(40, 76, 74, t, PAL.cloud, { drift: -t * 2.0, wrapX0: 20, wrapW: 300, alpha: 0.62, seed: 33 });
    PR.cloud(200, 96, 64, t, PAL.cloudWarm, { drift: -t * 2.9, wrapX0: -10, wrapW: 330, alpha: 0.40, seed: 31 });
    PR.hills(124, '#6a96a8', '#7fa9bb', '#cfe6ee', t, { step: 10 });
    PR.hills(134, '#4f7d5e', '#639070', '#cfe6ee', t, { step: 8 });
    PR.lawn(146, ['#345a34', '#40683c', '#4d7a44', '#5d8b4e', '#6f9f5c', '#89b572'], t);
    /* 草坡上的野花：带茎、随风摆，远近有大小变化 */
    const flowerCols = ['#fff8e0', '#ffe2d2', '#ffeaa2', '#f7d8ec'];
    for (let i = 0; i < 64; i++) {
      const kd = hash1(i * 7.9 + 1.3);
      const fx = hash1(i * 3.3) * 360 - 20;
      const fy = 148 + kd * kd * 26;
      const h = 1 + Math.round(kd * 3);
      const wind = Math.sin(t * 1.25 - fx * 0.03 + i * 0.7) * (0.3 + kd * 0.8);
      const c = flowerCols[i % 4];
      for (let j = 1; j <= h; j++) P(fx + wind * j * 0.4, fy - j, '#4f7a46');
      const bxp = fx + wind * (h + 1) * 0.4, byp = fy - h - 1;
      P(bxp, byp, c);
      P(bxp + 1, byp, shade(c, -0.14));
      if (kd > 0.48) { P(bxp, byp - 1, shade(c, 0.16)); P(bxp - 1, byp, shade(c, 0.08)); }
      P(bxp, byp + 1, '#6a8a4a');
    }
    /* 前景草丛：随风摆动，给地面分出前后层次 */
    PR.grassPatch(t, {
      count: 48, y0: 150, y1: 176, seed: 3, scale: 1.15,
      palette: ['#2f5230', '#3d6838', '#4d7a44', '#6a9852', '#8cb96a'],
      flower: 0.34, flowerColors: flowerCols
    });
    PR.tree(272, 148, 66, t, ['#45704a', '#55834e', '#669657', '#7bab61', '#96c370'], { sway: 1.0, blossom: true });
    const runPh = t * 6.2;
    const wpx = 140 + Math.sin(t * 0.5) * 6;
    const gpx = wpx + 17;
    const wp = C.basePose();
    wp.x = wpx; wp.y = 158; wp.facing = 1;
    wp.walk = 0.9; wp.walkPhase = runPh;
    wp.skirtSway = Math.sin(runPh) * 1.6;
    wp.hairSway = Math.sin(runPh + 1) * 1.2;
    wp.smile = 1; wp.mouth = 0.7; wp.blush = 0.8;
    wp.bob = Math.abs(Math.sin(runPh)) * 1.2;
    wp.blink = 0;
    wchar(Object.assign({}, wp, { scale: 0.95 }), t, { light: { x: 0, y: -1, color: '#fff4d0', alpha: 0.32 }, haloAlpha: 0.12 });
    const gp = C.basePose();
    gp.x = gpx; gp.y = 158; gp.facing = -1;
    gp.walk = 0.95; gp.walkPhase = runPh + 0.7;
    gp.capeSwing = Math.sin(runPh) * 1.4;
    gp.smile = 1; gp.mouth = 0.6; gp.blush = 0.7;
    gp.bob = Math.abs(Math.sin(runPh + 0.7)) * 1.2;
    gp.blink = 0;
    gchar(Object.assign({}, gp, { scale: 0.95 }), t, {});
    // 风筝
    const kx = 216 + Math.sin(t * 0.7) * 9, ky = 50 + Math.sin(t * 0.9) * 5;
    Line(196, 128, kx, ky, '#9a8a78');
    Line(178, 146, 196, 128, '#9a8a78');
    Poly([[kx - 5, ky + 2], [kx, ky - 4], [kx + 5, ky + 2], [kx, ky + 1]], '#f2a24f');
    Poly([[kx, ky + 1], [kx - 4, ky + 8], [kx, ky + 6], [kx + 4, ky + 8]], '#f8e0b0');
    P(kx, ky + 9, '#c4553f');
    P(kx - 1, ky + 11, '#c4553f');
    P(kx + 1, ky + 13, '#c4553f');
    C.drawBirds(St.ctx(), 6, t, { y: 46, spread: 26, color: '#5a6a78' });
    // 逆光草叶
    for (let i = 0; i < 44; i++) {
      const gx3 = hash1(i * 5.3) * 360 - 20;
      const gy3 = 150 + hash1(i * 9.7) * 24;
      const wind3 = Math.sin(t * 1.3 - gx3 * 0.032 + i) * 0.9;
      VLine(gx3 + wind3, gy3 - 2 - Math.round(hash1(i * 3.1) * 2), gy3, '#8ec06a');
    }
    FXa.dust(20, { t, x0: 20, x1: 300, y0: 38, y1: 148, rise: 2, color: '#fff2c8' });
    FXa.petals(12, { t, x0: 20, x1: 300, y0: 18, y1: 152, speed: 5, wind: 8, colors: PAL.blossom, seed: 9 });
    if (echo) St.overlay('#bcd8ea', 0.16);
  }

  /* ============================================================
     10. 眼泪
     ============================================================ */
  function tearScene(t, s) {
    const p = s.p;
    camOnFeet(156, lerp(166, 169, easeInOut(p)), lerp(2.15, 2.4, easeInOut(p)), 116);
    nightSky(t, { moonX: 26, moonY: 24, moonR: 11, shooting: false, stars: 42 });
    for (let i = 0; i < 8; i++) {
      const bx = 20 + hash1(i * 3.3) * 300;
      const by = 66 + hash1(i * 7.7) * 78;
      EllipseA(bx, by, 6 + hash1(i * 5.1) * 8, 6 + hash1(i * 5.1) * 7, '#ffcf8a', 0.08);
    }
    PR.lawn(148, NIGHT.lawnDeep, t);
    PR.roseBush(102, 150, 28, t, 41);
    stonePath(168, 176, 148, 186, t);
    PR.lantern(232, 78, t, { scale: 1.0, glowR: 28, glowA: 0.6 });
    const wp = C.basePose();
    wp.x = 176; wp.y = 156; wp.facing = -1;
    wp.headTilt = 1; wp.headDy = 1;
    wp.hold = 0.9;
    wp.blush = 0.6; wp.smile = 0.15;
    wp.skirtSway = Math.sin(t * 0.9) * 0.4;
    wp.hairSway = Math.sin(t * 1.1) * 0.3;
    wp.bob = Math.sin(t * 1.2) * 0.2;
    wp.blink = blinkAt(t + 0.4, 3.4, 0.55);
    wchar(wp, t, {});
    glowAdd(wp.x, wp.y - 22, 18, '#ffd9a0', 0.13);
    const cycle = (t * 0.55) % 1;
    const ty = wp.y - 30 + cycle * 9;
    const ta = Math.sin(cycle * Math.PI) * 0.95;
    RA(wp.x - 4, ty, 1, 2, '#d6ecff', ta);
    glowAdd(wp.x - 4, ty, 4, '#d6ecff', ta * 0.5);
    const gp = C.basePose();
    gp.x = 146; gp.y = 156; gp.facing = 1;
    gp.lift = 0.9 + 0.08 * Math.sin(t * 0.9);
    gp.headTilt = 1; gp.headDy = 1;
    gp.smile = 0.4; gp.blush = 0.45;
    gp.bob = Math.sin(t * 1.15 + 1) * 0.2;
    gp.blink = blinkAt(t + 2.2, 4.6, 0.5);
    gchar(gp, t, {
      light: { x: 1, y: -1, color: '#ffd9a0', alpha: 0.42 },
      haloAlpha: 0.12
    });
    glowAdd(gp.x, gp.y - 24, 14, '#ffcf8a', 0.12);
    const hx = gp.x + 10, hy = gp.y - 21 + Math.sin(t * 0.9);
    P(hx, hy, '#f8eedc');
    P(hx + 1, hy, '#eadcc0');
    P(hx, hy + 1, '#f8eedc');
    glowAdd(hx, hy, 5, '#fff4dc', 0.3);
    FXa.petals(12, { t, x0: 60, x1: 290, y0: 78, y1: 176, speed: 4, wind: 4, seed: 7 });
    FXa.fireflies(8, { t, x0: 60, x1: 290, y0: 108, y1: 164, seed: 12 });
    FXa.dust(12, { t, x0: 80, x1: 280, y0: 98, y1: 168, rise: 4 });
  }

  /* ============================================================
     11. 送别
     ============================================================ */
  function farewell(t, s) {
    const p = s.p;
    camOnFeet(158, lerp(150, 168, easeInOut(p)), lerp(2.0, 1.66, easeInOut(p)), 128);
    nightSky(t, { moonX: 52, moonY: 30, moonR: 10 });
    distantLands(124, t);
    St.ctx().save(); St.ctx().globalAlpha = 0.8;
    castle(t, { x: 104, y: 132, s: 0.8, lit: 0.45 });
    St.ctx().restore();
    PR.lawn(146, NIGHT.lawn, t);
    stonePath(172, 260, 150, 190, t);
    PR.fence(-40, 400, 148, t, PAL.ivy);
    PR.tree(296, 156, 56, t, NIGHT.treeDark, { sway: 0.6 });
    PR.tree(178, 144, 30, t, NIGHT.treeDark, { sway: 0.5 });
    PR.roseBush(74, 154, 20, t, 51);
    PR.lantern(78, 116, t, { scale: 1.0, glowR: 24, glowA: 0.7 });
    PR.streetLamp(236, 158, t);
    // 门廊台阶
    for (let i = 0; i < 3; i++) {
      R(104 - i * 6, 160 + i * 4, 30 + i * 12, 4, ['#544463', '#4c3c5a', '#443352'][i]);
      R(104 - i * 6, 160 + i * 4, 30 + i * 12, 1, '#6f5a80');
    }
    warmPools(t, [[74, 148, 20], [214, 158, 18]]);
    const walkP = sat((t - 99.5) / 10.5);
    const gx = lerp(146, 212, easeInOut(walkP));
    const gs = lerp(0.98, 0.8, walkP);
    const gp = C.basePose();
    gp.x = gx; gp.y = 158; gp.facing = 1;
    gp.walk = 0.8; gp.walkPhase = t * 5.4;
    gp.capeSwing = Math.sin(t * 5.4) * 1.1;
    gp.bob = Math.abs(Math.sin(t * 5.4)) * 1.0;
    gp.headDy = 1;
    gp.blink = blinkAt(t + 1, 4.2, 0.5);
    gchar(Object.assign({}, gp, { scale: gs }), t, {});
    const lx = gx + 7 * gs, ly = 158 - 9 * gs + Math.sin(t * 2) * 0.6;
    PR.lantern(lx, ly, t, { scale: 0.46 * gs, glowR: 14 * gs, glowA: 0.62 });
    const wp = C.basePose();
    wp.x = 112; wp.y = 160; wp.facing = 1;
    wp.headTilt = 1; wp.headDy = 1;
    wp.hold = 0.9; wp.blush = 0.5; wp.smile = 0.2;
    wp.skirtSway = Math.sin(t * 0.8) * 0.3;
    wp.hairSway = Math.sin(t * 0.9) * 0.3;
    wp.bob = Math.sin(t * 1.1) * 0.2;
    wp.blink = blinkAt(t, 3.6, 0.6);
    wchar(wp, t, {});
    glowAdd(wp.x, wp.y - 20, 12, '#ffd9a0', 0.1);
    FXa.notes(8, { t, x0: 160, x1: 250, y0: 88, y1: 154, color: '#ffe3ab', seed: 3 });
    FXa.fireflies(14, { t, x0: 20, x1: 300, y0: 108, y1: 170, seed: 14 });
    FXa.dust(12, { t, x0: 40, x1: 280, y0: 108, y1: 172, rise: 3 });
  }

  /* ============================================================
     12. 夜歌（窗下）
     ============================================================ */
  function nightSong(t, s) {
    const p = s.p;
    const late = t > 226;
    /* 近景：侍卫站高一级台阶，阳台正好在头顶上方，形成上下对话 */
    camOnFeet(152, lerp(late ? 150 : 154, late ? 152 : 154, easeInOut(p)), lerp(1.72, 1.86, easeInOut(p)), 132);
    nightSky(t, { moonX: late ? 48 : 236, moonY: 20, moonR: 9, shooting: !late });

    /* ---- 城堡立面（只占画面上半） ---- */
    const wallTop = 8;
    R(-100, wallTop, 520, 110, '#4b3d57');
    for (let y = wallTop + 2; y < 120; y += 7) {
      HLine(-100, 420, y, '#564662');
      for (let x = -100 + ((y / 7) % 2) * 12; x < 420; x += 24) VLine(x, y, y + 7, '#584764');
    }
    // 风化斑 + 自上而下的月光
    for (let y = wallTop; y < 120; y += 2) {
      for (let x = -100; x < 420; x += 2) {
        const n = noise2(x * 0.055, y * 0.075, 7);
        if (n > 0.68) P(x, y, '#43354f');
        else if (n < 0.3) P(x, y, '#5b4c69');
      }
      RA(-100, y, 520, 1, '#6a5480', 0.22 * (1 - (y - wallTop) / 110));
    }
    // 檐口
    R(-100, wallTop, 520, 5, '#5f4b6a');
    R(-100, wallTop, 520, 1, '#826a90');
    for (let x = -100; x < 420; x += 9) {
      R(x, wallTop - 4, 5, 4, '#5f4b6a');
      R(x, wallTop - 4, 5, 1, '#826a90');
    }
    // 高处小窗（暖光）
    for (const wx of [40, 268]) {
      R(wx - 5, 26, 11, 14, '#33263f');
      R(wx - 4, 27, 9, 12, '#e8a860');
      R(wx - 4, 27, 9, 1, '#ffdca4');
      VLine(wx, 27, 38, '#33263f');
      HLine(wx - 4, wx + 4, 32, '#33263f');
      glowAdd(wx, 33, 12, '#ffcf8a', 0.22);
    }
    // 挂毯
    for (const bx of [72, 236]) {
      R(bx - 11, 42, 22, 34, '#5e3348');
      R(bx - 11, 42, 22, 1, '#7d4a5e');
      R(bx - 8, 45, 16, 28, '#743c52');
      for (let j = 0; j < 4; j++) R(bx - 6, 48 + j * 6, 12, 2, j % 2 ? '#8a4a60' : '#68384c');
      for (let k = 0; k < 7; k++) P(bx - 9 + k * 3, 76, '#c9a04e');
    }
    // 常春藤
    for (let i = 0; i < 20; i++) {
      const ix = -70 + i * 26 + hash1(i * 3.1) * 10;
      const len = 6 + hash1(i * 7.7) * 22;
      for (let j = 0; j < len; j++) {
        P(ix + Math.sin(j * 0.5 + t * 0.4) * 1.1, 12 + j, PAL.ivy[(i + j) % PAL.ivy.length]);
        if (j % 8 === 5) P(ix, 12 + j, PAL.rose[2]);
      }
    }

    /* ---- 阳台（公主的窗） ---- */
    PR.balcony(154, 86, 56, t, { stone: NIGHT.stone, windowGlow: t > 232 ? '#ffd08a' : '#e8a860' });
    // 阳台下的暖光洒落
    RA(154, 86, 60, 56, '#e8a860', 0.05);

    /* ---- 台阶（侍卫站的最上一级） ---- */
    for (let i = 0; i < 3; i++) {
      const w = 84 + i * 22;
      R(154 - w / 2, 140 + i * 5, w, 6, ['#544463', '#4c3c5a', '#443352'][i]);
      R(154 - w / 2, 140 + i * 5, w, 1, '#6f5a80');
    }
    // 台阶上的灯笼
    PR.lantern(176, 148, t, { scale: 0.72, glowR: 24 + Math.sin(t * 6.1) * 3, glowA: 0.82, tassel: true });
    EllipseA(176, 151, 24, 5, '#ffcf8a', 0.16);
    // 扶手 / 石栏
    for (let i = 0; i < 4; i++) {
      R(122 + i * 20, 132 - i * 3, 6, 10, '#4a3a56');
      R(122 + i * 20, 132 - i * 3, 6, 1, '#6a5480');
    }

    /* ---- 地面 / 庭院 ---- */
    PR.lawn(150, NIGHT.lawn, t);
    stonePath(154, 176, 150, 190, t);
    PR.tree(300, 160, 54, t, NIGHT.treeDark, { sway: 0.6 });
    PR.roseBush(96, 156, 22, t, 61);
    PR.streetLamp(60, 154, t);
    // 前景花丛（画面下缘形成框）
    PR.roseBush(30, 170, 30, t, 63);
    PR.roseBush(292, 172, 28, t, 64);

    /* ---- 侍卫：站在台阶上仰头唱歌 ---- */
    const gp = C.basePose();
    gp.x = 142; gp.y = 152; gp.facing = 1;
    gp.headDy = 1; gp.headTilt = -1;
    gp.hold = 0.85;
    gp.smile = 0.5;
    gp.mouth = 0.3 + 0.4 * Math.max(0, Math.sin(t * 3.0));
    gp.blink = blinkAt(t + 1.4, 4.8, 0.5);
    gp.bob = Math.sin(t * 0.9) * 0.3;
    gp.capeSwing = Math.sin(t * 0.7) * 0.4;
    gchar(gp, t, {
      coat: '#2f3b52', coatMid: '#263145', coatDark: '#1c2434', coatDeep: '#141a26',
      cape: '#5a3a50', capeMid: '#463047', capeDark: '#33223a',
      light: { x: 1, y: -1, color: '#ffd9a0', alpha: 0.5 },
      haloAlpha: 0.16
    });

    /* ---- 公主出现在阳台（尾段） ---- */
    if (late) {
      const ap = smoothstep(228.6, 231.4, t);
      const wp = C.basePose();
      wp.x = 154; wp.y = 90; wp.facing = 1;
      wp.headTilt = 1; wp.headDy = 1;
      wp.hold = 0.75; wp.blush = 0.55; wp.smile = 0.6;
      wp.skirtSway = Math.sin(t * 0.9) * 0.4;
      wp.hairSway = Math.sin(t * 1.0) * 0.4;
      wp.bob = Math.sin(t * 1.05) * 0.2;
      wp.blink = blinkAt(t + 0.9, 3.6, 0.55);
      St.ctx().save(); St.ctx().globalAlpha = ap;
      wchar(Object.assign({}, wp, { scale: 0.88 }), t, {
        shadow: false, light: { x: 0, y: -1, color: '#ffe0b0', alpha: 0.5 }, haloAlpha: 0.2
      });
      St.ctx().restore();
      glowAdd(154, 72, 20, '#ffd9a0', 0.22 * ap);
    }

    FXa.notes(12, { t, x0: 130, x1: 186, y0: 64, y1: 150, color: '#ffe3ab', seed: 5 });
    FXa.fireflies(14, { t, x0: 20, x1: 300, y0: 120, y1: 174, seed: 33 });
    FXa.petals(8, { t, x0: 20, x1: 300, y0: 78, y1: 178, speed: 3, wind: 3, seed: 12 });
    FXa.dust(10, { t, x0: 60, x1: 260, y0: 110, y1: 174, rise: 3 });
  }

  /* ============================================================
     13. 金色花田
     ============================================================ */
  function flowerField(t, s) {
    const p = s.p;
    camOnFeet(160, lerp(148, 154, easeInOut(p)), lerp(1.72, 1.9, easeInOut(p)), 128);
    /* 相机推到 1.7~1.9，可见世界坐标只有 x≈64~235 / y≈92~126 这一条天空，
       所以云必须放在这条带子里循环，否则会全部跑出画外 */
    sky(['#3d7cae', '#5690c0', '#74a8cc', '#96c2d8', '#d2c48e', '#f4dda2'], {
      sunX: St.w2s(206, 104).x, sunY: St.w2s(206, 104).y, sunColor: '#fff0b8',
      sunR: 22 * St.VIEW.z, sunI: 0.75,
      horizon: '#f6d694', horizonY: 122, horizonI: 0.7
    });
    for (let i = 0; i < 5; i++) {
      const cy0 = 93 + i * 6.5 + Math.sin(t * 0.2 + i * 1.3) * 1.2;
      const cx0 = ((i * 78 - t * 2.2) % 200 + 200) % 200 + 46;
      RA(cx0, cy0, 40 + i * 7, 1, '#eef8ff', 0.16 - i * 0.012);
    }
    PR.cloud(70, 96, 46, t, PAL.cloudWarm, { drift: -t * 1.6, wrapX0: 50, wrapW: 200, alpha: 0.72, seed: 3, squish: 0.8 });
    PR.cloud(160, 103, 40, t, PAL.cloudWarm, { drift: -t * 2.1, wrapX0: 50, wrapW: 200, alpha: 0.6, seed: 7, squish: 0.7 });
    PR.cloud(220, 111, 36, t, PAL.cloud, { drift: -t * 1.2, wrapX0: 50, wrapW: 200, alpha: 0.5, seed: 11, squish: 0.62 });
    /* 更多：高空巨云 + 低空小云，天空不再只剩一两朵 */
    PR.cloud(110, 92, 54, t, PAL.cloud, { drift: -t * 0.8, wrapX0: 50, wrapW: 200, alpha: 0.42, seed: 17, squish: 0.55 });
    PR.cloud(190, 117, 34, t, PAL.cloudWarm, { drift: -t * 2.6, wrapX0: 50, wrapW: 200, alpha: 0.46, seed: 23, squish: 0.5 });
    PR.cloud(30, 120, 30, t, PAL.cloudWarm, { drift: -t * 1.9, wrapX0: 50, wrapW: 200, alpha: 0.38, seed: 29, squish: 0.45 });
    PR.hills(126, '#7a8652', '#8e9a60', '#edd29a', t, { step: 10 });
    PR.hills(138, '#61703e', '#74834a', '#edd29a', t, { step: 8 });
    PR.lawn(146, ['#47632c', '#547234', '#62833c', '#729646', '#84a954', '#9cbc66'], t);
    /* 草叶：随风同向倒伏（风从左向右推），越靠前越长 */
    for (let i = 0; i < 170; i++) {
      const gx2 = hash1(i * 4.1) * 380 - 30;
      const kd = hash1(i * 9.3);
      const gy = 149 + kd * kd * 33;
      const h = 2 + Math.round(hash1(i * 6.7) * (2 + (gy - 146) * 0.24));
      const wind = Math.sin(t * 1.5 - gx2 * 0.03 + i * 0.5) * (0.5 + (gy - 146) * 0.06);
      const cLow = i % 3 === 0 ? '#7d9a4e' : '#688840';
      const cTop = i % 3 === 0 ? '#c3d88c' : '#a8c878';
      for (let j = 0; j < h; j++) {
        P(gx2 + wind * ((j + 1) / h) * 1.4, gy - j, j === h - 1 ? cTop : cLow);
      }
    }
    /* 花：成簇生长、带茎、随风点头 */
    const fcols = ['#fff6dc', '#ffd6c8', '#ffe89a', '#efc8e4', '#ffe0f2'];
    for (let c = 0; c < 16; c++) {
      const cx0 = 16 + hash1(c * 5.7 + 3) * 310;
      const cy0 = 151 + hash1(c * 8.1) * 24;
      const nm = 3 + Math.round(hash1(c * 3.3) * 3);
      for (let i = 0; i < nm; i++) {
        const fx = cx0 + (hash1(i * 4.3 + c) - 0.5) * 19;
        const fy = cy0 + (hash1(i * 9.7 + c) - 0.5) * 8;
        const hh = 2 + Math.round(hash1(i * 2.1 + c) * 3);
        const wind = Math.sin(t * 1.4 + i * 1.3 + c) * 0.9;
        for (let j = 1; j <= hh; j++) P(fx + wind * j * 0.5, fy - j, '#5a7a3e');
        const bxp = fx + wind * (hh + 0.6) * 0.5, byp = fy - hh - 1;
        const cc = fcols[(i + c) % fcols.length];
        P(bxp, byp, cc);
        P(bxp + 1, byp, shade(cc, -0.14));
        P(bxp, byp - 1, shade(cc, 0.18));
        P(bxp - 1, byp, shade(cc, 0.06));
        P(bxp, byp + 1, '#7fa04e');
      }
    }
    for (let i = 0; i < 9; i++) {
      const bx = 50 + hash1(i * 5.1) * 220 + Math.sin(t * 0.9 + i * 2) * 20;
      const by = 92 + hash1(i * 8.3) * 50 + Math.sin(t * 1.5 + i) * 7;
      C.drawButterfly(St.ctx(), bx, by, t + i, i % 2 ? '#f9dca8' : '#ffd0c6', '#fff6e0');
    }
    // 人物脚下的草地压暗：很淡，用草色而不是黑色，避免出现「黑圈」
    EllipseA(150, 160.5, 13, 3, '#3f5a2a', 0.22);
    EllipseA(120, 160.5, 11, 2.6, '#3f5a2a', 0.2);
    const wp = C.basePose();
    wp.x = 150; wp.y = 160; wp.facing = 1;
    wp.walk = 0.5; wp.walkPhase = t * 5.0;
    wp.skirtSway = Math.sin(t * 4.0) * 3.4;
    wp.hairSway = Math.sin(t * 4.0 + 1.2) * 2.4;
    wp.smile = 1; wp.mouth = 0.65; wp.blush = 0.85;
    wp.bob = Math.sin(t * 4.0) * 0.7;
    wp.lift = 0.4 + 0.3 * Math.sin(t * 2.0);
    wp.blink = blinkAt(t + 1.2, 3.4, 0.45);
    wchar(wp, t, { light: { x: 0, y: -1, color: '#fff2c8', alpha: 0.34 }, haloAlpha: 0.14 });
    EllipseA(wp.x, wp.y + 1, 8, 2.4, '#3f5a2a', 0.2);
    const gp = C.basePose();
    gp.x = 120; gp.y = 160; gp.facing = 1;
    gp.headTilt = 1;
    gp.hold = 0.45;
    gp.smile = 0.9; gp.blush = 0.6;
    gp.bob = Math.sin(t * 1.4) * 0.2;
    gp.capeSwing = Math.sin(t * 1.1) * 0.5;
    gp.blink = blinkAt(t + 2.4, 4.2, 0.5);
    gchar(gp, t, { light: { x: 0, y: -1, color: '#fff2c8', alpha: 0.34 }, haloAlpha: 0.12 });
    EllipseA(gp.x, gp.y + 1, 8, 2.4, '#3f5a2a', 0.2);
    FXa.dust(26, { t, x0: 20, x1: 300, y0: 58, y1: 170, rise: 2, color: '#fff2c8' });
    FXa.petals(18, { t, x0: 0, x1: 320, y0: 28, y1: 176, speed: 6, wind: 9, colors: PAL.blossom, seed: 31 });
    FXa.bokeh(10, { t, x0: 20, x1: 300, y0: 54, y1: 148, color: '#fff2c8', seed: 9 });
  }

  /* ============================================================
     14. 圆圈夕阳
     ============================================================ */
  function sunsetCircle(t, s, opt) {
    opt = opt || {};
    const p = s.p === undefined ? 0.5 : s.p;
    const sunY = lerp(opt.sunY0 === undefined ? 96 : opt.sunY0, opt.sunY1 === undefined ? 112 : opt.sunY1, easeInOut(p));
    const sunR = opt.sunR || 20;
    const z = lerp(opt.z0 === undefined ? 1.0 : opt.z0, opt.z1 === undefined ? 1.12 : opt.z1, easeInOut(p));
    camOnFeet(167, lerp(152, 157, easeInOut(p)), z, 138);

    /* --- 夕阳天空：上部紫、地平线金 --- */
    const ssun = St.w2s(158, sunY - 8);
    sky(PAL.sunsetSky, {
      sunX: ssun.x, sunY: ssun.y, sunColor: '#ffd9a0', sunR: sunR * 1.5 * St.VIEW.z, sunI: 0.5,
      horizon: '#ffb878', horizonY: 136, horizonI: 0.6
    });
    /* --- 大气：太阳下方的金色雾带（越近地平线越亮） --- */
    for (let i = 0; i < 7; i++) {
      RA(-30, sunY - 6 + i * 7, 380, 3.5, i < 3 ? '#ffcf96' : '#ffb478', 0.15 - i * 0.016);
    }
    glowAdd(158, sunY, sunR * 7.2, '#ffb070', 0.14);

    /* --- 云带：黄昏的云有明显的暖色镶边 --- */
    PR.cloud(6, 58, 90, t, PAL.cloudWarm, { drift: -t * 0.7, wrapX0: -10, wrapW: 330, alpha: 0.42, seed: 4 });
    PR.cloud(196, 44, 110, t, PAL.cloudWarm, { drift: -t * 0.55, wrapX0: -10, wrapW: 330, alpha: 0.38, seed: 6 });
    PR.cloud(96, 78, 70, t, PAL.cloudWarm, { drift: -t * 0.9, wrapX0: -10, wrapW: 330, alpha: 0.46, seed: 11 });
    /* 高空巨云 + 贴近太阳的薄云 + 低空小云 */
    PR.cloud(-40, 22, 140, t, ['#f8dcc0', '#f3c39a', '#e0a382', '#c07e6c'],
      { drift: -t * 0.35, wrapX0: -10, wrapW: 330, alpha: 0.30, seed: 41 });
    PR.cloud(240, 12, 110, t, ['#f8dcc0', '#f3c39a', '#e0a382', '#c07e6c'],
      { drift: -t * 0.45, wrapX0: -10, wrapW: 330, alpha: 0.26, seed: 43 });
    for (let i = 0; i < 5; i++) {
      const cy2 = 86 + i * 9.5 + Math.sin(t * 0.22 + i) * 1.1;
      const cx2 = ((i * 79 - t * 1.7) % 420 + 420) % 420 - 60;
      PR.cloud(cx2, cy2, 70 - i * 7, t, PAL.cloudWarm, { alpha: 0.2 + i * 0.05, seed: 50 + i, squish: 0.5 });
    }

    /* --- 光柱：从落日斜射下来的体积光 --- */
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI / 2 + (i - 3) * 0.2;
      const aa = 0.045 + 0.03 * Math.abs(Math.sin(t * 0.55 + i * 1.4));
      PR.lightShaft(158, sunY + 3, sunR * (0.9 + (i % 3) * 0.4), 152, ang, '#ffd0a0', aa);
    }

    /* --- 远山两层 --- */
    PR.hills(134, '#8a5060', '#96586a', '#ffbc84', t, { step: 8 });
    PR.hills(144, '#5f3450', '#6d3c58', '#ffbc84', t, { step: 6 });
    /* 地平线暖光带：贴着远山的一道亮带，夕阳最有气氛的一笔 */
    for (let i = 0; i < 6; i++) {
      const yy = 126 + i * 2.1;
      RA(-20, yy, 360, 2.1, i < 2 ? '#ffdcaa' : '#ffb480', 0.20 - i * 0.028);
    }
    // 远塔剪影
    for (const tx of [92, 226]) {
      R(tx - 2, 122, 5, 18, '#5a3050');
      R(tx - 3, 116, 7, 7, '#663a5a');
      R(tx - 4, 116, 9, 1, '#7a4a68');
      P(tx, 119, '#ffcf8a');
    }

    /* --- 落日 --- */
    PR.sunDisc(158, sunY, sunR, t, { core: '#fff8d8', edge: '#ec7a4c', glow: '#ffb478' });
    // 落日上的云影横纹
    for (let i = 0; i < 3; i++) {
      const cy2 = sunY - sunR * 0.45 + i * sunR * 0.5;
      const cw = sunR * (1.7 - i * 0.3);
      RA(158 - cw / 2 + Math.sin(t * 0.25 + i) * 2, cy2, cw, 1, '#d9704a', 0.3);
    }
    glowAdd(158, sunY, sunR * 3.2, '#ffcf8a', 0.2);

    /* --- 中景草坡（深色剪影） --- */
    PR.hills(158, '#3a2438', '#452b40', '#b0624a', t, { step: 12 });
    /* 山脊轮廓的暖色描边：明确「光从背后过来」 */
    for (let x = -20; x < 340; x += 2) {
      const h1 = 8 + Math.sin(x * 0.013 + 1.2) * 7 + Math.sin(x * 0.031 + 3.1) * 3;
      const ry = Math.round(158 - h1 - 1);
      RA(x, ry, 2, 1, '#ffb478', 0.42 + 0.12 * Math.sin(x * 0.3));
    }
    PR.lawn(156, ['#2e2036', '#36253c', '#3e2b42', '#472f47', '#52374d'], t);
    /* 草坡上的暖色光池与逆光草尖，让中景不只是一块深色 */
    for (let i = 0; i < 9; i++) {
      const lx = 20 + i * 36 + Math.sin(t * 0.3 + i) * 8;
      const ly = 158 + (i % 3) * 5;
      EllipseA(lx, ly, 20, 3.2, '#ff9a5e', 0.07 + 0.03 * Math.sin(t * 0.8 + i));
    }
    for (let i = 0; i < 90; i++) {
      const gx = hash1(i * 4.9) * 360 - 20;
      const gy = 156 + hash1(i * 8.7) * 14;
      const h = 1 + Math.round(hash1(i * 6.1) * 3);
      const wind = Math.sin(t * 1.2 - gx * 0.03 + i * 0.6) * 0.9;
      VLine(gx + wind, gy - h, gy, '#4a2f48');
      /* 逆光草尖被夕阳镶了金边 */
      if (i % 2 === 0) P(gx + wind, gy - h - 0.6, i % 4 === 0 ? '#ffb478' : '#d9744e');
    }
    /* 落日正下方的水面/湿润反光带 */
    for (let i = 0; i < 6; i++) {
      const yy = 140 + i * 3.4;
      const ww = 30 - i * 4.2 + Math.sin(t * 0.8 + i) * 2;
      RA(158 - ww / 2, yy, ww, 1, '#ffd0a0', 0.16 - i * 0.02);
    }

    /* --- 两人并肩坐在坡顶 --- */
    const wp = C.basePose();
    wp.x = 149; wp.y = 165; wp.facing = 1;
    wp.headTilt = -1; wp.headDy = -1;
    wp.skirtSway = Math.sin(t * 0.7) * 0.5;
    wp.hairSway = Math.sin(t * 0.8) * 0.6;
    wp.bob = Math.sin(t * 0.9) * 0.2;
    wp.smile = 0.7; wp.blush = 0.6;
    wp.blink = blinkAt(t + 0.4, 4.6, 0.5);
    wchar(Object.assign({}, wp, { scale: 0.95 }), t, {
      light: { x: 0, y: -1, color: '#ffce8a', alpha: 0.5 }
    });
    const gp = C.basePose();
    gp.x = 166; gp.y = 165; gp.facing = -1;
    gp.headTilt = -1; gp.headDy = -1;
    gp.capeSwing = Math.sin(t * 0.9) * 0.7;
    gp.bob = Math.sin(t * 0.85 + 1) * 0.2;
    gp.smile = 0.6; gp.blush = 0.4;
    gp.blink = blinkAt(t + 2.5, 4.2, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.95 }), t, {
      light: { x: 0, y: -1, color: '#ffce8a', alpha: 0.5 }
    });
    // 牵着的手
    RA(157, 151, 4, 1, '#f0c8a0', 0.9);
    // 逆光轮廓
    glowAdd(149, 148, 10, '#ffcf8a', 0.16);
    glowAdd(166, 147, 10, '#ffcf8a', 0.16);

    /* --- 前景：逆光草叶（随风倒伏，草尖被夕阳点亮） --- */
    for (let i = 0; i < 150; i++) {
      const gx = hash1(i * 3.7) * 360 - 20;
      const gy = 158 + hash1(i * 9.1) * 22;
      const h = 1 + Math.round(hash1(i * 5.3) * 5);
      const wind = Math.sin(t * 1.25 - gx * 0.035 + i * 0.5) * (0.7 + h * 0.13);
      const base = i % 5 === 0 ? '#8a5a4a' : i % 3 === 0 ? '#41293e' : '#33203a';
      for (let j = 0; j < h; j++) {
        P(gx + wind * ((j + 1) / h), gy - j, j === h - 1 ? '#c98a62' : base);
      }
      if (i % 13 === 0) P(gx + wind * 1.15, gy - h - 1, '#ffcf8a');
    }
    // 最前排草（几乎纯黑，形成景深）
    for (let i = 0; i < 40; i++) {
      const gx = hash1(i * 7.1) * 340 - 10;
      const gy = 174 + hash1(i * 3.3) * 8;
      const hh = 5 + Math.round(hash1(i * 9.7) * 6);
      const wind = Math.sin(t * 1.05 - gx * 0.03 + i) * 1.6;
      for (let j = 0; j < hh; j++) P(gx + wind * ((j + 1) / hh) * 0.9, gy - j, '#1e1226');
    }

    C.drawBirds(St.ctx(), 5, t * 0.8, { y: 76, spread: 22, color: '#4a2234' });

    if (opt.season === 'petal') FXa.petals(18, { t, x0: 0, x1: 320, y0: 38, y1: 176, speed: 5, wind: 10, colors: PAL.blossom, seed: 21 });
    if (opt.season === 'leaf') FXa.leaves(16, { t, x0: 0, x1: 320, y0: 38, y1: 176, seed: 22 });
    if (opt.season === 'snow') FXa.snow(34, { t, x0: 0, x1: 320, y0: 18, y1: 178, seed: 23 });
    if (opt.season === 'fire') FXa.fireflies(14, { t, x0: 20, x1: 300, y0: 108, y1: 170, seed: 24 });
    /* 空气里的金色微尘与镜头散景，夕阳才有「空气感」 */
    FXa.dust(26, { t, x0: 20, x1: 300, y0: 96, y1: 170, rise: 3.2, color: '#ffd9a0', seed: 25 });
    FXa.bokeh(6, { t, x0: 10, x1: 310, y0: 70, y1: 140, color: '#ffbe86', seed: 26 });
  }

  /* ============================================================
     15. 黎明王国
     ============================================================ */
  function dawnRise(t, s) {
    const p = s.p;
    setView(lerp(150, 164, easeInOut(p)), lerp(84, 94, easeInOut(p)), lerp(0.96, 1.14, easeInOut(p)));
    const dsun = St.w2s(206, 132);
    sky(PAL.dawnSky, {
      sunX: dsun.x, sunY: dsun.y, sunColor: '#ffdca8', sunR: 22 * St.VIEW.z, sunI: 0.9,
      horizon: '#fbd6a2', horizonY: 140, horizonI: 0.6
    });
    stars(t, { count: 26, alpha: 0.3, yMax: 74 });
    FXa.shootingStar(t, 3.1, '#fff0d0');
    /* 黎明的云：低空的暖云被朝霞从下方点亮 */
    PR.cloud(-30, 40, 120, t, ['#fff2e0', '#f7d9bc', '#d8a894', '#a8827e'], { drift: -t * 0.5, wrapX0: -10, wrapW: 330, alpha: 0.34, seed: 51 });
    PR.cloud(210, 28, 100, t, ['#fff2e0', '#f7d9bc', '#d8a894', '#a8827e'], { drift: -t * 0.7, wrapX0: -10, wrapW: 330, alpha: 0.3, seed: 53 });
    PR.cloud(90, 70, 80, t, ['#ffe6cc', '#f3c2a4', '#cf9488', '#9e7478'], { drift: -t * 1.3, wrapX0: -10, wrapW: 330, alpha: 0.26, seed: 55, squish: 0.6 });
    PR.hills(136, '#4a4560', '#565068', '#f0aa7a', t, { step: 8 });
    PR.hills(146, '#565260', '#635c68', '#f0aa7a', t, { step: 6 });
    for (let i = 0; i < 18; i++) {
      const bx = -30 + i * 24 + hash1(i * 3.1) * 12;
      if (Math.abs(bx - 152) < 66) continue;
      const bh = 8 + hash1(i * 7.7) * 13;
      R(bx, 150 - bh, 15, bh, ['#5a4250', '#664a56', '#72505c'][i % 3]);
      R(bx - 1, 150 - bh - 4, 17, 4, ['#7d4650', '#8d4e54', '#70404c'][i % 3]);
      if (hash1(i * 5.5) > 0.4) P(bx + 4, 150 - bh + 4, '#ffe0b0');
      if (hash1(i * 9.1) > 0.45) P(bx + 10, 150 - bh + 6, '#ffe0b0');
    }
    St.ctx().save(); St.ctx().globalAlpha = 0.97;
    PR.castle(160, 138, 1.0, t, {
      stone: ['#4a3a58', '#5a4564', '#6b5170', '#7d5f7c', '#917088', '#a58396'],
      roof: ['#3a2a4a', '#48345a', '#583f68', '#684a76'],
      lit: 0.4, flag: '#c4553f',
      window: ['#ffe6b6', '#f9c882', '#e09b5c']
    });
    St.ctx().restore();
    PR.hills(164, '#48524a', '#545e50', '#e8a87a', t, { step: 10 });
    PR.lawn(154, ['#3a4a40', '#46584a', '#526656', '#5f7462', '#6f8270', '#80907c'], t);
    R(118, 148, 92, 4, '#7d5f7c');
    R(118, 148, 92, 1, '#a58396');
    for (let i = 0; i < 92; i += 10) {
      R(118 + i, 143, 6, 6, '#7d5f7c');
      R(118 + i, 143, 6, 1, '#a58396');
    }
    const wp = C.basePose();
    wp.x = 152; wp.y = 148; wp.facing = 1;
    wp.headTilt = -1; wp.headDy = -1;
    wp.hold = 0.9; wp.smile = 0.75; wp.blush = 0.65;
    wp.skirtSway = Math.sin(t * 1.0) * 0.8;
    wp.hairSway = Math.sin(t * 1.2) * 0.7;
    wp.bob = Math.sin(t * 1.1) * 0.2;
    wp.blink = blinkAt(t + 0.7, 3.8, 0.55);
    wchar(Object.assign({}, wp, { scale: 0.84 }), t, {});
    const gp = C.basePose();
    gp.x = 164; gp.y = 148; gp.facing = -1;
    gp.headTilt = -1; gp.headDy = -1;
    gp.hold = 0.9; gp.smile = 0.65; gp.blush = 0.5;
    gp.capeSwing = Math.sin(t * 1.1) * 0.9;
    gp.bob = Math.sin(t * 1.05 + 1) * 0.2;
    gp.blink = blinkAt(t + 2.1, 4.4, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.84 }), t, {});
    glowAdd(208, 126, 48, '#ffcf8a', 0.22);
    glowAdd(158, 134, 20, '#ffdca4', 0.14);
    C.drawBirds(St.ctx(), 7, t, { y: 56, spread: 28, color: '#5a4452' });
    FXa.dust(16, { t, x0: 20, x1: 300, y0: 116, y1: 162, rise: 1.6, color: '#ffdcae' });
    FXa.petals(10, { t, x0: 20, x1: 300, y0: 38, y1: 173, speed: 4, wind: 6, colors: PAL.blossom, seed: 44 });
  }

  /* ============================================================
     16. 尾声
     ============================================================ */
  function outro(t, s) {
    const p = s.p;
    setView(160, lerp(100, 92, easeInOut(p)), lerp(1.16, 0.9, easeInOut(p)));
    const deep = smoothstep(246, 256, t);
    const ramp = PAL.nightSky.map((c, i) => mix(c, ['#0d0b1e', '#121026', '#181430', '#1e1938', '#251d40', '#2c2248', '#342650', '#3c2b58'][i] || c, deep * 0.8));
    sky(ramp, { horizon: mix('#7a5a80', '#2a1e38', deep), horizonY: 132, horizonI: 0.28, sunX: 250, sunY: 34, sunColor: '#9d8fc4', sunR: 14, sunI: 0.32 });
    stars(t, { count: 120, alpha: 1 - deep * 0.35, yMax: 130 });
    FXa.shootingStar(t, 2.4, '#fff6dc');
    PR.moon(250, 34, 12, t, { ring: true, glow: '#f0e2c6' });
    distantLands(122, t);
    castle(t, { x: 160, y: 134, s: 0.92, lit: 0.55 });
    PR.lawn(148, NIGHT.lawn, t);
    stonePath(160, 166, 148, 188, t);
    PR.tree(34, 158, 58, t, NIGHT.treeDark, { sway: 0.6 });
    PR.tree(292, 160, 54, t, NIGHT.treeDark, { sway: 0.6 });
    PR.lantern(112, 138, t, { post: true, scale: 0.8 });
    PR.lantern(210, 139, t, { post: true, scale: 0.8 });
    warmPools(t, [[112, 154, 16], [210, 155, 16]]);
    const gp = C.basePose();
    gp.x = 160; gp.y = 158; gp.facing = 1;
    gp.hold = 0.8; gp.headDy = -1;
    gp.bob = Math.sin(t * 1.0) * 0.2;
    gp.blink = blinkAt(t, 4.5, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.84 }), t, {});
    glowAdd(160, 136, 14, '#ffcf8a', 0.12);
    glowAdd(190, 86, 10, '#ffdca4', 0.26 * (1 - deep * 0.5));
    FXa.fireflies(18, { t, x0: 20, x1: 300, y0: 108, y1: 170, seed: 41 });
    FXa.dust(16, { t, x0: 20, x1: 300, y0: 98, y1: 170, rise: 2.5, color: '#ffcf8a' });
    FXa.petals(10, { t, x0: 20, x1: 300, y0: 78, y1: 176, speed: 3, wind: 3, seed: 15 });
  }

  /* ============================================================
     四季轮转（长间奏）：同一处山坡，四个季节
     构图、人物位置固定不变，只改变季节与天气 —— 让"时间流逝"成立
     ============================================================ */
  const SEASON = {
    spring: {
      sky: ['#5aa4dc', '#72b8e8', '#90cef0', '#b0e2f6', '#d0f2f8', '#f0fcf4'],
      sunColor: '#fff8dc', sunI: 0.5, sunR: 15,
      horizon: '#e8f4dc', horizonI: 0.5,
      hillFar: '#9cc48e', hillMid: '#7fb46a', hillNear: '#5f9146',
      grass: ['#5e9448', '#6ea650', '#7eb65a', '#90c468', '#a4d27c', '#bce096'],
      stone: ['#6b6270', '#7d7382', '#8f8392', '#a296a2', '#b6a9b4', '#cbbdc4'],
      window: ['#ffe6b6', '#f9c882', '#e09b5c'],
      canopy: ['#e89aa8', '#f4b8bd', '#ffd6d2', '#fff0e8'],
      canopy2: ['#7fae62', '#93c074', '#a8cf8a', '#c2de9e'],
      trunk: '#5a4433',
      wash: '#ffe8ee',
      cloud: 'cool'
    },
    summer: {
      sky: ['#2070b4', '#3486ca', '#4fa2da', '#71bfea', '#97d6f2', '#c8eef8'],
      sunColor: '#fffbe0', sunI: 0.72, sunR: 18,
      horizon: '#f4ecc0', horizonI: 0.5,
      hillFar: '#8aa85a', hillMid: '#6e9442', hillNear: '#4c7228',
      grass: ['#3d6a24', '#487a2c', '#558c34', '#66a03e', '#7cb64c', '#96cc60'],
      stone: ['#6b6270', '#7d7382', '#8f8392', '#a296a2', '#b6a9b4', '#cbbdc4'],
      window: ['#ffe6b6', '#f9c882', '#e09b5c'],
      canopy: ['#2f5c2a', '#3d7032', '#4f873c', '#629c48'],
      canopy2: ['#38682e', '#478038', '#589644', '#6cae54'],
      trunk: '#4a3628',
      wash: '#fff6d0',
      cloud: 'bold'
    },
    autumn: {
      sky: ['#54779e', '#6f92b4', '#93aec0', '#bcc4b0', '#e2cf9e', '#f8e6bc'],
      sunColor: '#ffe0a0', sunI: 0.55, sunR: 16,
      horizon: '#f6dba8', horizonI: 0.6,
      hillFar: '#a8945e', hillMid: '#8f7a44', hillNear: '#6e5c30',
      grass: ['#6a5c2c', '#7d6c34', '#907c3c', '#a48f48', '#b8a256', '#ccb86a'],
      stone: ['#70666c', '#84787a', '#988a88', '#ac9c96', '#c0b0a6', '#d4c4b6'],
      window: ['#ffdca4', '#f0b070', '#d08850'],
      canopy: ['#b8642c', '#d07c34', '#e69844', '#f2b45c'],
      canopy2: ['#8a4a26', '#a85c2c', '#c07034', '#d48840'],
      trunk: '#4e3a2a',
      wash: '#ffcf8a',
      cloud: 'warm'
    },
    winter: {
      sky: ['#5b80a8', '#7194b8', '#8caacb', '#aac3d8', '#cadbe6', '#e8f1f6'],
      sunColor: '#fff2dc', sunI: 0.42, sunR: 14,
      horizon: '#f2e6d6', horizonI: 0.55,
      hillFar: '#cbdae8', hillMid: '#b3c6d8', hillNear: '#96b0c4',
      grass: ['#b8cad8', '#c8d8e2', '#d8e6ec', '#e6f0f4', '#f2f9fb', '#ffffff'],
      stone: ['#5f6672', '#707884', '#828b98', '#959fac', '#a8b2be', '#bcc6d0'],
      window: ['#ffe0b8', '#f6b878', '#d08c50'],
      canopy: ['#4a4048', '#584c54', '#665a60', '#74666a'],
      canopy2: ['#3e363e', '#4a4048', '#584c54', '#665a60'],
      trunk: '#40343a',
      wash: '#f0f8ff',
      cloud: 'snow'
    }
  };

  /* 季节树：四种完全不同的轮廓 */
  function seasonTree(x, baseY, h, t, season, seed) {
    const S = SEASON[season];
    seed = seed || 0;
    const sway = Math.sin(t * 0.75 + seed * 1.7) * (season === 'winter' ? 0.3 : 0.7);
    const trunk = S.trunk;
    const tw = Math.max(2, Math.round(h * 0.1));
    const trunkTop = baseY - h * 0.46;
    // 主干
    R(x - Math.floor(tw / 2), trunkTop, tw, baseY - trunkTop, trunk);
    R(x - Math.floor(tw / 2), trunkTop, 1, baseY - trunkTop, shade(trunk, 0.18));
    R(x + Math.ceil(tw / 2) - 1, trunkTop, 1, baseY - trunkTop, shade(trunk, -0.3));
    // 主枝
    const bx1 = x - h * 0.2, by1 = baseY - h * 0.68;
    const bx2 = x + h * 0.22, by2 = baseY - h * 0.7;
    Line(x, trunkTop + 2, bx1 + sway, by1, trunk, 2);
    Line(x, trunkTop + 3, bx2 + sway, by2, trunk, 2);
    Line(x, trunkTop - 1, x + sway * 0.6, baseY - h * 0.86, trunk, 2);

    const cy = baseY - h * 0.7;
    const w = h * 0.62;
    if (season === 'winter') {
      // 光秃枝干 + 积雪
      for (let i = 0; i < 7; i++) {
        const a = (-2.6 + i * 0.62) + Math.sin(t * 0.6 + i) * 0.03;
        const len = w * (0.4 + hash1(i * 3.1 + seed) * 0.5);
        const ex = x + Math.cos(a) * len + sway;
        const ey = cy + Math.sin(a) * len * 0.8;
        Line(x, cy + 2, ex, ey, trunk, 1);
        // 枝头的雪
        R(ex - 1, ey - 1, 3, 2, '#eef6fa');
        R(ex - 1, ey - 1, 3, 1, '#ffffff');
        if (hash1(i * 7.3 + seed) > 0.55) R(ex - 2, ey, 5, 1, '#f6fbff');
      }
      // 树冠积雪团
      EllipseA(x + sway, cy - 3, w * 0.36, h * 0.1, '#e8f2f8', 0.9);
      EllipseA(x + sway - w * 0.18, cy - 1, w * 0.2, h * 0.07, '#f4faff', 0.85);
      // 树干积雪
      R(x - Math.floor(tw / 2) - 1, trunkTop - 1, tw + 2, 2, '#eef6fa');
      EllipseA(x, baseY + 1, w * 0.5, 2.4, '#c8d8e4', 0.55);
      return;
    }
    // 有叶子的树冠：三层椭圆
    const pal = SEASON[season].canopy;
    const pal2 = SEASON[season].canopy2;
    const droop = season === 'autumn' ? 1 : 0;
    Ellipse(x + sway * 0.5, cy + 2 + droop, w * 0.5, h * 0.18, pal[1]);
    Ellipse(x - w * 0.16 + sway, cy - 1, w * 0.42, h * 0.16, pal2[1]);
    Ellipse(x + w * 0.18 + sway, cy + 1, w * 0.36, h * 0.15, pal[2]);
    Ellipse(x - w * 0.05 + sway, cy - 4, w * 0.34, h * 0.13, pal[2]);
    Ellipse(x - w * 0.2 + sway, cy - 5, w * 0.2, h * 0.09, pal[3]);
    Ellipse(x + w * 0.24 + sway, cy - 3, w * 0.16, h * 0.08, pal[3]);
    // 叶簇细节
    const n = season === 'summer' ? 30 : 16;
    for (let i = 0; i < n; i++) {
      const a = hash1(i * 3.3 + seed) * TAU;
      const r = Math.sqrt(hash1(i * 7.1 + seed)) * w * 0.46;
      const px2 = x + Math.cos(a) * r + sway * 0.7;
      const py2 = cy + Math.sin(a) * r * 0.52 - 2;
      P(px2, py2, hash1(i * 2.7 + seed) > 0.5 ? pal[3] : pal2[2]);
    }
    if (season === 'spring') {
      for (let i = 0; i < 20; i++) {
        const a = hash1(i * 4.7 + seed) * TAU;
        const r = Math.sqrt(hash1(i * 9.3 + seed)) * w * 0.5;
        P(x + Math.cos(a) * r + sway, cy + Math.sin(a) * r * 0.55 - 2, PAL.blossom[i % 4]);
      }
    }
    if (season === 'autumn') {
      // 稀薄的叶子 + 透出的枝干
      for (let i = 0; i < 10; i++) {
        const a = hash1(i * 5.9 + seed) * TAU;
        const r = Math.sqrt(hash1(i * 8.1 + seed)) * w * 0.45;
        R(x + Math.cos(a) * r + sway, cy + Math.sin(a) * r * 0.5 - 2, 2, 1, '#5a4028');
      }
    }
    EllipseA(x, baseY + 1, w * 0.42, 2.0, shade(pal[0], -0.35), 0.26);
  }

  /* 季节地面：草叶 / 野花 / 落叶 / 积雪 */
  function seasonGround(season, y, t, cx) {
    const S = SEASON[season];
    if (season === 'spring') {
      for (let i = 0; i < 120; i++) {
        const gx = hash1(i * 4.1) * 380 - 30;
        const gy = y + 2 + hash1(i * 9.3) * 30;
        const hh = 1 + Math.round(hash1(i * 6.7) * (1 + (gy - y) * 0.14));
        const sway = Math.sin(t * 1.5 - gx * 0.03 + i * 0.6) * (0.5 + (gy - y) * 0.05);
        VLine(gx + sway, gy - hh, gy, i % 3 === 0 ? '#a8d17c' : '#7fb45a');
        if (i % 9 === 0) { P(gx + sway, gy - hh, '#fff2e0'); P(gx + sway + 1, gy - hh, '#ffd6d2'); }
      }
      // 落英地毯
      for (let i = 0; i < 70; i++) {
        const fx = hash1(i * 3.7 + 5) * 380 - 30;
        const fy = y + 3 + hash1(i * 8.9 + 2) * 32;
        P(fx, fy, i % 3 === 0 ? '#ffe6e0' : '#f7c4c0');
        if (i % 2 === 0) P(fx + 1, fy, '#fff0ea');
      }
    } else if (season === 'summer') {
      for (let i = 0; i < 150; i++) {
        const gx = hash1(i * 4.1) * 380 - 30;
        const gy = y + 2 + hash1(i * 9.3) * 32;
        const hh = 2 + Math.round(hash1(i * 6.7) * (2 + (gy - y) * 0.2));
        const sway = Math.sin(t * 1.7 - gx * 0.035 + i * 0.5) * (0.6 + (gy - y) * 0.06);
        VLine(gx + sway, gy - hh, gy, i % 4 === 0 ? '#9cc66e' : i % 3 === 0 ? '#3a6a2c' : '#528c3e');
      }
      // 野花
      for (let i = 0; i < 30; i++) {
        const fx = hash1(i * 3.3 + 9) * 380 - 30;
        const fy = y + 6 + hash1(i * 7.9 + 4) * 28;
        const c = ['#ffe86a', '#fff6d8', '#f7c4d8'][i % 3];
        const sway = Math.sin(t * 1.4 + i) * 0.8;
        P(fx + sway, fy, c);
        P(fx + sway + 1, fy, c);
        P(fx + sway, fy - 1, '#fffbe8');
      }
      // 干草斑（夏日曝晒）
      for (let i = 0; i < 40; i++) {
        const dx2 = hash1(i * 5.7 + 3) * 370 - 25;
        const dy2 = y + 8 + hash1(i * 9.1 + 7) * 26;
        R(dx2, dy2, 3 + hash1(i * 2.3) * 5, 1, '#b8a458');
        if (i % 3 === 0) R(dx2 + 1, dy2 + 1, 4, 1, '#cbb86a');
      }
      // 草尖逆光
      for (let i = 0; i < 60; i++) {
        const gx3 = hash1(i * 3.9) * 370 - 25;
        const gy3 = y + 3 + hash1(i * 8.7) * 28;
        if (Math.sin(t * 2.4 + i) > 0.35) P(gx3, gy3 - 1, '#d8e878');
      }
    } else if (season === 'autumn') {
      for (let i = 0; i < 90; i++) {
        const gx = hash1(i * 4.1) * 380 - 30;
        const gy = y + 2 + hash1(i * 9.3) * 32;
        const hh = 1 + Math.round(hash1(i * 6.7) * (1 + (gy - y) * 0.12));
        const sway = Math.sin(t * 1.2 - gx * 0.03 + i * 0.7) * (0.5 + (gy - y) * 0.04);
        VLine(gx + sway, gy - hh, gy, i % 3 === 0 ? '#ccb86a' : '#907c3c');
      }
      // 落叶
      for (let i = 0; i < 90; i++) {
        const fx = hash1(i * 3.7 + 11) * 380 - 30;
        const fy = y + 3 + hash1(i * 8.9 + 6) * 34;
        const c = ['#c9762f', '#e0a140', '#a85a2c', '#d98b3a'][i % 4];
        R(fx, fy, 2, 1, c);
        if (i % 3 === 0) P(fx + 1, fy + 1, shade(c, -0.2));
      }
    } else {
      // 冬：雪面 + 起伏 + 雪堆
      for (let i = 0; i < 150; i++) {
        const gx = hash1(i * 4.1) * 380 - 30;
        const gy = y + 2 + hash1(i * 9.3) * 34;
        const n = noise2(gx * 0.05, gy * 0.09, 5);
        if (n > 0.56) P(gx, gy, '#ffffff');
        else if (n < 0.36) P(gx, gy, '#c2d4e2');
        else if (n < 0.44) P(gx, gy, '#b0c4d6');
      }
      // 雪堆
      for (let i = 0; i < 14; i++) {
        const dx = hash1(i * 5.3 + 2) * 370 - 25;
        const dy = y + 6 + hash1(i * 8.1 + 3) * 26;
        EllipseA(dx, dy, 5 + hash1(i * 3.7) * 7, 2 + hash1(i * 9.1) * 2, '#eef6fa', 0.75);
        EllipseA(dx - 1, dy - 1, 3, 1.2, '#ffffff', 0.8);
      }
      // 枯草露出
      for (let i = 0; i < 40; i++) {
        const gx = hash1(i * 7.1) * 370 - 25;
        const gy = y + 4 + hash1(i * 3.3) * 26;
        const sway = Math.sin(t * 1.1 - gx * 0.03 + i) * 0.6;
        VLine(gx + sway, gy - 2, gy, '#9a8a6a');
      }
    }
  }

  /* 季节天气 */
  function seasonWeather(season, t, burst, pulse) {
    const b = 1 + burst * 1.4;
    pulse = pulse || 0;
    if (season === 'spring') {
      FXa.petals(Math.round(30 * b), { t, x0: -10, x1: 330, y0: 20, y1: 175, speed: 6, wind: 11 + pulse * 5, colors: PAL.blossom, seed: 61 });
      FXa.dust(Math.round(16 * b), { t, x0: 20, x1: 300, y0: 60, y1: 170, rise: 2, color: '#fff0f0', seed: 62 });
      // 蝴蝶
      for (let i = 0; i < 5; i++) {
        const bx = 40 + hash1(i * 5.1) * 240 + Math.sin(t * 0.9 + i * 2) * 22;
        const by = 96 + hash1(i * 8.3) * 50 + Math.sin(t * 1.6 + i) * 8;
        C.drawButterfly(St.ctx(), bx, by, t + i * 1.3, i % 2 ? '#fbe0a8' : '#ffd0d8', '#fff6e8');
      }
    } else if (season === 'summer') {
      FXa.dust(Math.round(26 * b), { t, x0: 10, x1: 310, y0: 40, y1: 172, rise: 2.4, color: '#fffbe0', seed: 63 });
      // 热浪（横向半透明波带）
      const ctx2 = St.ctx();
      ctx2.save();
      ctx2.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const yy = 118 + i * 9 + Math.sin(t * 1.1 + i) * 1.6;
        ctx2.globalAlpha = 0.05 + 0.03 * Math.sin(t * 2 + i);
        ctx2.fillStyle = '#fff8d0';
        ctx2.fillRect(0, St.toY(yy), ctx2.canvas.width, Math.max(1, St.toS(1.6)));
      }
      ctx2.restore();
      // 地平线薄雾（热空气）
      for (let i = 0; i < 3; i++) {
        RA(-20, 128 + i * 3, 360, 2, '#f8f4d8', 0.12 - i * 0.03);
      }
      // 蜻蜓
      for (let i = 0; i < 3; i++) {
        const dx = 70 + hash1(i * 6.1) * 190 + Math.sin(t * 0.7 + i * 2.3) * 26;
        const dy = 104 + hash1(i * 4.3) * 30 + Math.sin(t * 1.9 + i) * 6;
        const w = Math.sin(t * 16 + i) > 0 ? 2 : 1;
        R(dx, dy, 5, 1, '#2f5a5e');
        R(dx + 1, dy - 1, w, 1, '#bfe8ec');
        R(dx + 3, dy - 1, w, 1, '#bfe8ec');
        P(dx + 5, dy, '#8fd0d8');
      }
    } else if (season === 'autumn') {
      FXa.leaves(Math.round(30 * b), { t, x0: -10, x1: 330, y0: 20, y1: 176, seed: 64 });
      FXa.windLines(7 + Math.round(pulse * 5), { t, y0: 70, y1: 165, color: '#ffe0b0', seed: 65 });
      // 雁群
      C.drawBirds(St.ctx(), 9, t * 0.7, { y: 34, spread: 20, color: '#4a3a44' });
    } else {
      FXa.snow(Math.round(64 * b), { t, x0: -10 + pulse * 4, x1: 330, y0: 0, y1: 178, seed: 66 });
      FXa.dust(Math.round(14 * b), { t, x0: 20, x1: 300, y0: 60, y1: 172, rise: 1.4, color: '#ffffff', seed: 67 });
    }
  }

  /* 四季前景框景：近景枝叶 / 草穗 / 雪坡，制造景深 */
  function seasonForeground(season, t) {
    const S = SEASON[season];
    if (season === 'spring') {
      // 左上角垂落的樱枝
      for (let i = 0; i < 34; i++) {
        const k = i / 33;
        const x = -6 + k * 78 + Math.sin(k * 2.4 + t * 0.5) * 3;
        const y = -4 + k * 46 + Math.sin(k * 3.1) * 2;
        R(x, y, 3, 2, S.trunk);
        if (i % 2 === 0) {
          const bx2 = x + 3 + hash1(i * 3.3) * 7;
          const by2 = y - 2 - hash1(i * 7.1) * 5;
          R(bx2, by2, 2, 2, PAL.rose[1]);
          R(bx2, by2, 2, 1, PAL.rose[2]);
          P(bx2 + 1, by2 + 1, PAL.rose[3]);
          if (i % 4 === 0) { P(bx2 - 1, by2, PAL.blossom[2]); P(bx2 + 2, by2, PAL.blossom[3]); }
        }
      }
      // 右下角草叶
      for (let i = 0; i < 22; i++) {
        const gx = 268 + hash1(i * 3.1) * 60;
        const gy = 178 + hash1(i * 7.7) * 6;
        const h = 8 + hash1(i * 5.3) * 14;
        for (let j = 0; j < h; j++) {
          P(gx + Math.sin(j * 0.3 + i + t * 0.6) * 2.2, gy - j, j > h * 0.7 ? '#8fc06a' : '#5f9146');
        }
        if (i % 3 === 0) P(gx + Math.sin(h * 0.3 + i) * 2.2, gy - h, '#fff0e6');
      }
    } else if (season === 'summer') {
      // 左上角浓密树冠（逆光）：小团叠加 + 叶簇 + 顶部镶光，避免变成大黑团
      for (let i = 0; i < 11; i++) {
        const cx2 = -26 + i * 13 + Math.sin(t * 0.5 + i) * 1.2;
        const cy2 = 6 + (i % 3) * 7;
        EllipseA(cx2, cy2, 15, 9, i % 2 ? '#2f5c2a' : '#3a6a30', 0.9);
        /* 叶簇明暗 */
        for (let k = 0; k < 4; k++) {
          const a = hash1(i * 3.1 + k * 1.7) * TAU;
          const rr = hash1(i * 5.3 + k) * 11;
          P(cx2 + Math.cos(a) * rr, cy2 + Math.sin(a) * rr * 0.6,
            hash1(i * 7.1 + k) > 0.5 ? '#4f873c' : '#26491f');
        }
        /* 顶部被阳光打亮的边 */
        P(cx2 + Math.sin(t * 0.5 + i) * 1.2, cy2 - 8, '#7fae4e');
        P(cx2 + 4, cy2 - 6, '#6a9a44');
      }
      /* 垂下来的小枝与叶 */
      for (let i = 0; i < 9; i++) {
        const lx = -14 + i * 13 + Math.sin(t * 0.7 + i) * 1.6;
        const ly = 26 + Math.sin(t * 0.7 + i * 1.3) * 2.2;
        EllipseA(lx, ly, 7, 4, '#4f873c', 0.85);
        P(lx, ly - 3, '#79b056');
        P(lx + 3, ly + 2, '#3a6a30');
      }
      // 右下角高草与狗尾草
      for (let i = 0; i < 26; i++) {
        const gx = 262 + hash1(i * 3.1) * 66;
        const gy = 180 + hash1(i * 7.7) * 4;
        const h = 12 + hash1(i * 5.3) * 18;
        for (let j = 0; j < h; j++) {
          P(gx + Math.sin(j * 0.22 + i + t * 0.9) * 2.6, gy - j, j > h * 0.6 ? '#78b45a' : '#3f7030');
        }
        if (i % 3 === 0) {
          R(gx + Math.sin(h * 0.22 + i + t * 0.9) * 2.6 - 1, gy - h - 2, 3, 3, '#c9a45c');
        }
      }
    } else if (season === 'autumn') {
      // 左上角枯枝 + 稀疏红叶
      for (let i = 0; i < 30; i++) {
        const k = i / 29;
        const x = -8 + k * 86 + Math.sin(k * 2.1) * 4;
        const y = -2 + k * 40 + Math.sin(k * 3.3) * 3;
        R(x, y, 3, 2, '#4e3a2a');
        if (i % 2 === 0) {
          const bx2 = x + 2 + hash1(i * 3.3) * 9;
          const by2 = y - 2 - hash1(i * 7.1) * 6;
          const c = ['#c9762f', '#e0a140', '#a85a2c'][i % 3];
          R(bx2, by2, 3, 2, c);
          if (hash1(i * 5.5) > 0.5) P(bx2 + 1, by2 + 2, shade(c, -0.2));
        }
      }
      // 右下角枯草 + 落叶堆
      for (let i = 0; i < 20; i++) {
        const gx = 264 + hash1(i * 3.1) * 62;
        const gy = 178 + hash1(i * 7.7) * 6;
        const h = 8 + hash1(i * 5.3) * 12;
        for (let j = 0; j < h; j++) {
          P(gx + Math.sin(j * 0.25 + i + t * 0.7) * 2, gy - j, j > h * 0.6 ? '#ccb86a' : '#8a7440');
        }
      }
      for (let i = 0; i < 30; i++) {
        const fx = 258 + hash1(i * 4.3) * 64;
        const fy = 172 + hash1(i * 8.9) * 10;
        R(fx, fy, 2, 1, ['#c9762f', '#e0a140', '#a85a2c'][i % 3]);
      }
    } else {
      // 冬：右下角雪堆 + 枯枝；左侧结霜的草
      EllipseA(300, 176, 46, 16, '#e8f2f8', 0.95);
      EllipseA(292, 172, 34, 11, '#f6fbff', 0.95);
      EllipseA(310, 168, 22, 8, '#ffffff', 0.9);
      for (let i = 0; i < 16; i++) {
        const gx = 254 + hash1(i * 3.1) * 70;
        const gy = 176 + hash1(i * 7.7) * 6;
        const h = 6 + hash1(i * 5.3) * 10;
        for (let j = 0; j < h; j++) {
          P(gx + Math.sin(j * 0.3 + i + t * 0.4) * 1.6, gy - j, j > h * 0.6 ? '#eef6fa' : '#8a8478');
        }
        P(gx + Math.sin(h * 0.3 + i) * 1.6, gy - h, '#ffffff');
      }
      for (let i = 0; i < 22; i++) {
        const k = i / 21;
        const x = -6 + k * 62 + Math.sin(k * 2.2) * 3;
        const y = -2 + k * 24;
        R(x, y, 3, 2, '#40343a');
        R(x, y - 1, 3, 1, '#eef6fa');
        if (i % 4 === 0) { R(x + 2, y - 3, 4, 2, '#ffffff'); }
      }
      for (let i = 0; i < 10; i++) {
        const sx0 = 250 + hash1(i * 3.3) * 70;
        const sy0 = 130 + hash1(i * 7.1) * 44;
        if (Math.sin(t * 2 + i * 1.7) > 0.4) FXa.twinkle(sx0, sy0, 4, t + i, '#eaf6ff', 0.5);
      }
    }
  }

  /* 四季主场景：同一构图，人物位置固定 */
  function seasonScene(t, s, opt) {
    opt = opt || {};
    const season = opt.season || 'spring';
    const S = SEASON[season];
    const p = s.p === undefined ? 0.5 : s.p;
    const burst = opt.burst === undefined ? 0 : opt.burst;
    const pulse = opt.pulse === undefined ? 0 : opt.pulse;

    /* 镜头：整段间奏从 1.10 缓慢推到 1.17（不回弹），
       横向极缓慢右移 6px，制造“时间在流动”的感觉；
       小节线上的 pulse 只做 1.2% 的呼吸推近。 */
    const whole = opt.progress === undefined ? p : opt.progress;   // 0..1 across interlude
    /* 长缓推：使用 smooth 模式，缩放连续，避免量化导致的镜头抽动 */
    camOnFeet(166, 152 + whole * 7, 1.10 + whole * 0.07, 136, true);

    /* ---- 天空 ---- */
    const sunPos = St.w2s(206, 34 - p * 4);
    sky(S.sky, {
      sunX: sunPos.x, sunY: sunPos.y, sunColor: S.sunColor,
      sunR: S.sunR * St.VIEW.z * (season === 'summer' ? 2.6 : 2.0), sunI: S.sunI,
      horizon: S.horizon, horizonY: 130, horizonI: S.horizonI
    });

    /* ---- 云 ---- */
    /* ---- 云：每季不同的云型，全部循环漂移，不会漂出画外消失 ---- */
    if (season === 'summer') {
      PR.cloud(20, 34, 110, t, PAL.cloud, { drift: -t * 1.0, wrapX0: -10, wrapW: 330, alpha: 0.95, seed: 2 });
      PR.cloud(190, 22, 120, t, PAL.cloud, { drift: -t * 0.8, wrapX0: -10, wrapW: 330, alpha: 0.9, seed: 5 });
      PR.cloud(120, 56, 74, t, PAL.cloud, { drift: -t * 1.4, wrapX0: -10, wrapW: 330, alpha: 0.7, seed: 9 });
      PR.cloud(-40, 12, 140, t, PAL.cloud, { drift: -t * 0.45, wrapX0: -10, wrapW: 330, alpha: 0.45, seed: 31 });
      PR.cloud(250, 66, 76, t, PAL.cloud, { drift: -t * 1.9, wrapX0: -10, wrapW: 330, alpha: 0.55, seed: 33 });
    } else if (season === 'winter') {
      // 厚重雪云：压低、叠层
      for (let i = 0; i < 5; i++) {
        PR.cloud(-20 + i * 88, 18 + (i % 2) * 14, 96, t,
          ['#eef4f8', '#e4ecf2', '#d2dce6', '#b8c6d4'],
          { drift: -t * 0.32, wrapX0: -10, wrapW: 330, alpha: 0.7, seed: 20 + i, squish: 1.05 });
      }
      PR.cloud(60, 52, 110, t, ['#e8eff4', '#dce6ee', '#c8d4de', '#aebcc8'],
        { drift: -t * 0.22, wrapX0: -10, wrapW: 330, alpha: 0.4, seed: 41 });
    } else if (season === 'autumn') {
      PR.cloud(14, 40, 96, t, PAL.cloudWarm, { drift: -t * 0.55, wrapX0: -10, wrapW: 330, alpha: 0.5, seed: 4 });
      PR.cloud(186, 26, 106, t, PAL.cloudWarm, { drift: -t * 0.4, wrapX0: -10, wrapW: 330, alpha: 0.45, seed: 6 });
      PR.cloud(-30, 16, 130, t, ['#f6e2cc', '#e8c8a8', '#d2a888', '#b48874'],
        { drift: -t * 0.3, wrapX0: -10, wrapW: 330, alpha: 0.34, seed: 35 });
      PR.cloud(120, 62, 70, t, PAL.cloudWarm, { drift: -t * 0.9, wrapX0: -10, wrapW: 330, alpha: 0.36, seed: 37, squish: 0.7 });
    } else {
      PR.cloud(26, 38, 100, t, PAL.cloud, { drift: -t * 0.9, wrapX0: -10, wrapW: 330, alpha: 0.9, seed: 2 });
      PR.cloud(178, 24, 96, t, PAL.cloud, { drift: -t * 1.2, wrapX0: -10, wrapW: 330, alpha: 0.75, seed: 5 });
      PR.cloud(96, 62, 62, t, PAL.cloud, { drift: -t * 1.6, wrapX0: -10, wrapW: 330, alpha: 0.55, seed: 11 });
      PR.cloud(-40, 14, 120, t, PAL.cloud, { drift: -t * 0.5, wrapX0: -10, wrapW: 330, alpha: 0.4, seed: 27 });
      PR.cloud(230, 54, 80, t, PAL.cloudWarm, { drift: -t * 1.4, wrapX0: -10, wrapW: 330, alpha: 0.4, seed: 29, squish: 0.8 });
    }
    /* 中层云：这个镜头天空很高（屏幕 0~110），中段也要有云，否则上半部空荡 */
    const midRamp = season === 'winter' ? ['#eef4f8', '#e2eaf0', '#ccd8e2', '#b2c0d0']
      : season === 'autumn' ? ['#f8e8d4', '#eccfae', '#d2ab8c', '#b58874']
        : PAL.cloud;
    PR.cloud(60, 84, 92, t, midRamp, {
      drift: -t * 0.5, wrapX0: -10, wrapW: 330,
      alpha: season === 'winter' ? 0.52 : 0.42, seed: 61, squish: 0.9
    });
    PR.cloud(20, 104, 64, t, midRamp, {
      drift: -t * 1.15, wrapX0: -10, wrapW: 330, alpha: 0.3, seed: 65, squish: 0.7
    });

    /* ---- 远山三层 ---- */
    PR.hills(126, S.hillFar, mix(S.hillFar, '#dfe8ec', 0.25), S.horizon, t, { step: 10 });
    PR.hills(136, S.hillMid, S.hillFar, S.horizon, t, { step: 8 });
    PR.hills(150, S.hillNear, S.hillMid, S.horizon, t, { step: 7 });

    /* ---- 远处城堡 ---- */
    St.ctx().save();
    St.ctx().globalAlpha = season === 'winter' ? 0.55 : 0.42;
    castle(t, {
      x: 246, y: 140, s: 0.5, lit: 0.5, stone: S.stone, window: S.window,
      flag: season === 'winter' ? '#8a5a68' : '#c4553f'
    });
    St.ctx().restore();

    /* ---- 地面 ---- */
    PR.lawn(152, S.grass, t);
    seasonGround(season, 152, t);

    /* ---- 中景：树与小径 ---- */
    PR.fence(-40, 400, 150, t, season === 'winter' ? ['#5a6470', '#68727e', '#76808c', '#8a94a0'] : PAL.ivy);
    if (season === 'winter') {
      // 篱笆积雪
      R(-40, 141, 440, 1, '#eef6fa');
      R(-40, 144, 440, 1, '#e2ecf2');
    }
    seasonTree(34, 154, 66, t, season, 1);
    seasonTree(292, 156, 60, t, season, 2);
    seasonTree(112, 152, 34, t, season, 3);
    PR.bush(66, 156, 20, season === 'winter' ? ['#8fa2b4', '#a4b8c6', '#bcccd8', '#d4e2ea', '#eef6f8']
      : season === 'autumn' ? ['#6e5c30', '#8a7440', '#a8904c', '#c4ac62', '#dcc47c']
        : SEASON[season].canopy2, 4);

    /* ---- 远处炊烟 / 季节标志物 ---- */
    if (season === 'winter') {
      // 城堡的炊烟
      for (let i = 0; i < 5; i++) {
        const k = ((t * 0.22 + i * 0.2) % 1);
        EllipseA(250 + Math.sin(k * 6 + i) * 3, 112 - k * 26, 2 + k * 3, 1.4 + k * 1.6, '#e8eef4', 0.35 * (1 - k));
      }
    } else if (season === 'autumn') {
      // 远处田野的烟
      for (let i = 0; i < 4; i++) {
        const k = ((t * 0.18 + i * 0.25) % 1);
        EllipseA(232 + Math.sin(k * 5 + i) * 4, 128 - k * 22, 2 + k * 3.4, 1.2 + k * 1.6, '#e0d4bc', 0.28 * (1 - k));
      }
    }

    /* ---- 季节专属中景道具 ---- */
    if (season === 'spring') {
      // 小溪（从右后方流向前景）
      for (let i = 0; i < 46; i++) {
        const k = i / 45;
        const sx0 = 250 - k * 96;
        const sy0 = 152 + k * 22;
        const w = 3 + k * 9;
        R(sx0 - w / 2, sy0, w, 1, '#7fc8e4');
        R(sx0 - w / 2, sy0, 1, 1, '#a8e0f0');
        R(sx0 + w / 2 - 1, sy0, 1, 1, '#5aa8c8');
        if (i % 3 === 0) R(sx0 - 1 + Math.sin(t * 2.4 + i) * 1.5, sy0, 2, 1, '#e0f6ff');
      }
      // 溪边石块
      for (let i = 0; i < 8; i++) {
        const rx = 150 + i * 14 + hash1(i * 3.1) * 8;
        const ry = 162 + hash1(i * 7.7) * 12;
        EllipseA(rx, ry, 3 + hash1(i * 5.3) * 2, 1.6, SEASON.spring.stone[3], 0.9);
      }
      // 长椅上的花束
      R(132, 148, 20, 2, '#6b5344');
      R(132, 148, 20, 1, '#7d624f');
      P(136, 147, PAL.blossom[1]);
      P(139, 147, PAL.rose[2]);
      P(142, 147, PAL.blossom[2]);
      // 水面涟漪（花瓣落水）
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.5 + i * 0.31) % 1;
        const rx2 = 210 - ph * 26 + i * 8;
        const ry2 = 160 + ph * 12;
        EllipseA(rx2, ry2, 2 + ph * 5, 0.8 + ph * 1.6, '#e8f8ff', (1 - ph) * 0.45);
      }
    } else if (season === 'summer') {
      // 向日葵
      for (let i = 0; i < 9; i++) {
        const fx = 60 + i * 26 + hash1(i * 3.7) * 8;
        const fy = 158 + hash1(i * 8.1) * 14;
        const hh = 12 + hash1(i * 5.3) * 8;
        const sway = Math.sin(t * 1.2 + i * 0.9) * 1.2;
        VLine(fx + sway * 0.5, fy - hh, fy, '#3f7030');
        P(fx + sway * 0.5, fy - hh * 0.55, '#63a04a');
        // 花盘
        const cxp = fx + sway, cyp = fy - hh;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * TAU;
          R(cxp + Math.cos(ang) * 3, cyp + Math.sin(ang) * 3, 2, 1, '#ffd24a');
        }
        R(cxp - 1, cyp - 1, 3, 3, '#8a5a2a');
        P(cxp, cyp, '#5a3a1a');
      }
      // 草叶上的阳光反光
      for (let i = 0; i < 16; i++) {
        const gx2 = 40 + hash1(i * 3.7) * 260;
        const gy2 = 158 + hash1(i * 7.9) * 18;
        const tw2 = Math.sin(t * 2.2 + i * 1.4);
        if (tw2 > 0.55) P(gx2, gy2, '#f6ffd8');
      }
      // 稻草人
      R(276, 138, 2, 20, '#6b5030');
      R(268, 144, 18, 2, '#6b5030');
      R(273, 130, 8, 8, '#d8b878');
      R(273, 130, 8, 2, '#8a6a3a');
      R(268, 140, 18, 6, '#b8763c');
      P(275, 133, '#3a2a20');
      P(279, 133, '#3a2a20');
    } else if (season === 'autumn') {
      // 草垛
      for (let i = 0; i < 3; i++) {
        const hx = 78 + i * 34 + hash1(i * 3.1) * 8;
        const hy = 162 + hash1(i * 7.7) * 8;
        EllipseA(hx, hy, 9, 5, '#c9a04e', 0.95);
        EllipseA(hx, hy - 2, 8, 4, '#dcb45e', 0.95);
        EllipseA(hx - 1, hy - 4, 5, 2.4, '#efd089', 0.9);
        for (let j = 0; j < 4; j++) VLine(hx - 5 + j * 3, hy - 4, hy + 3, '#a8843c');
      }
      // 田野上的薄雾
      for (let i = 0; i < 3; i++) {
        const fy2 = 150 + i * 4;
        RA(-40, fy2, 400, 2, '#f0e0c0', 0.1 - i * 0.02);
      }
      // 果篮
      R(198, 152, 10, 5, '#8a5a34');
      R(198, 152, 10, 1, '#a87448');
      for (let i = 0; i < 4; i++) P(199 + i * 2, 151, i % 2 ? '#c4553f' : '#e0a140');
    } else {
      // 冬季：结冰的池塘
      Ellipse(222, 168, 40, 10, '#b8cad8');
      Ellipse(222, 167, 38, 9, '#cfe0ea');
      Ellipse(222, 167, 34, 7.4, '#e2eef4');
      // 冰面反光与裂纹
      for (let i = 0; i < 14; i++) {
        const a = hash1(i * 3.3) * TAU;
        const r = hash1(i * 7.9) * 30;
        R(222 + Math.cos(a) * r, 167 + Math.sin(a) * r * 0.22, 2 + hash1(i * 5.1) * 4, 1, '#f8fdff');
      }
      for (let i = 0; i < 5; i++) {
        const a = hash1(i * 2.7) * TAU;
        Line(222 + Math.cos(a) * 6, 167 + Math.sin(a) * 2, 222 + Math.cos(a) * 22, 167 + Math.sin(a) * 6, '#aec6d6');
      }
      // 池边雪堆与小树
      EllipseA(222, 175, 42, 4, '#eef6fa', 0.8);
      // 雪面反光
      for (let i = 0; i < 26; i++) {
        const sx2 = hash1(i * 3.1) * 320;
        const sy2 = 156 + hash1(i * 7.7) * 20;
        const tw2 = Math.sin(t * 1.8 + i * 1.9);
        if (tw2 > 0.5) P(sx2, sy2, '#ffffff');
        else if (tw2 < -0.4) P(sx2, sy2, '#dceaf4');
      }
      // 雪人（很远的细节，不抢人物）
      EllipseA(72, 166, 6, 3, '#f8fdff', 0.9);
      EllipseA(72, 160, 4.6, 2.6, '#ffffff', 0.95);
      EllipseA(72, 155, 3.4, 2.2, '#ffffff', 0.95);
      P(71, 154, '#3a2a30');
      P(74, 154, '#3a2a30');
      R(74, 155, 2, 1, '#e08a4a');
      R(68, 159, 9, 1, '#c4553f');
    }

    /* ---- 灯笼（冬夜/秋昏时更亮） ---- */
    PR.lantern(104, 132, t, { post: true, scale: 0.85, tassel: true, glowA: season === 'winter' ? 0.8 : 0.55 });
    PR.lantern(214, 134, t, { post: true, scale: 0.85, tassel: true, glowA: season === 'winter' ? 0.8 : 0.55 });
    warmPools(t, [[104, 152, 16], [214, 154, 16]]);

    /* ---- 两人（固定位置，季节化表演） ---- */
    const winter = season === 'winter';
    const wp = C.basePose();
    wp.x = 149; wp.y = 165; wp.facing = 1;
    wp.headTilt = winter ? 1 : -1;
    wp.headDy = winter ? 1 : -1;
    wp.skirtSway = Math.sin(t * 0.7) * 0.5;
    wp.hairSway = Math.sin(t * 0.8) * 0.6;
    wp.bob = Math.sin(t * 0.9) * 0.2;
    wp.smile = season === 'winter' ? 0.5 : 0.7;
    wp.blush = winter ? 0.85 : 0.6;
    wp.blink = blinkAt(t + 0.4, 4.6, 0.5);
    if (winter) { wp.hold = 0.95; }
    wchar(Object.assign({}, wp, { scale: 0.94 }), t, {
      dress: winter ? '#c8d8e6' : undefined,
      dressMid: winter ? '#a8bccc' : undefined,
      dressDark: winter ? '#8498ae' : undefined,
      dressDeep: winter ? '#68788e' : undefined,
      trim: winter ? '#ffffff' : undefined,
      trimMid: winter ? '#e4f0f8' : undefined,
      light: { x: 0, y: -1, color: winter ? '#eaf4ff' : '#fff0c0', alpha: winter ? 0.38 : 0.3 },
      haloAlpha: 0.15
    });
    // 冬装：披肩与毛领
    if (winter) {
      RA(wp.x - 5, wp.y - 22, 11, 7, '#a8442f', 0.92);
      RA(wp.x - 5, wp.y - 22, 11, 2, '#c4553f', 0.95);
      RA(wp.x - 5, wp.y - 16, 11, 1, '#8a3424', 0.9);
      for (let i = 0; i < 9; i++) P(wp.x - 5 + i, wp.y - 23, i % 2 ? '#f4f8fc' : '#dceaf4');
    }
    const gp = C.basePose();
    gp.x = 166; gp.y = 165; gp.facing = -1;
    gp.headTilt = winter ? 1 : -1;
    gp.headDy = winter ? 1 : -1;
    gp.capeSwing = Math.sin(t * 0.9) * 0.7;
    gp.bob = Math.sin(t * 0.85 + 1) * 0.2;
    gp.smile = 0.6; gp.blush = winter ? 0.7 : 0.4;
    gp.blink = blinkAt(t + 2.5, 4.2, 0.5);
    gchar(Object.assign({}, gp, { scale: 0.94 }), t, {
      cape: winter ? '#6a4660' : undefined,
      capeMid: winter ? '#523448' : undefined,
      capeDark: winter ? '#3c2434' : undefined,
      trim: winter ? '#dcb878' : undefined,
      light: { x: 0, y: -1, color: winter ? '#eaf4ff' : '#fff0c0', alpha: winter ? 0.38 : 0.3 },
      haloAlpha: 0.14
    });
    if (winter) {
      for (let i = 0; i < 9; i++) P(gp.x + 4 - i, gp.y - 26, i % 2 ? '#f4f8fc' : '#dceaf4');
      RA(gp.x + 3, gp.y - 27, 3, 2, '#c4553f', 0.9);
    }
    // 牵手
    RA(157, 151, 4, 1, winter ? '#e8d8cc' : PAL.wendy.skin, 0.92);

    /* ---- 季节化的小互动 ---- */
    if (season === 'spring') {
      // 她手里的一枝花
      P(143, 149, PAL.blossom[1]);
      P(143, 148, PAL.blossom[2]);
      P(144, 149, PAL.rose[2]);
      R(143, 150, 1, 3, '#7fae62');
    } else if (season === 'summer') {
      // 她的小扇子
      R(143, 148, 4, 3, '#f4e0a8');
      R(143, 148, 4, 1, '#fff6d8');
      R(143, 151, 1, 2, '#8a6a3a');
    } else if (season === 'autumn') {
      // 他肩上落了一片叶子
      P(170, 140, '#e0a140');
      P(170, 141, '#c9762f');
    } else {
      // 红围巾 + 哈气
      R(146, 148, 5, 1, '#c4553f');
      R(145, 149, 2, 2, '#a8442f');
      R(149, 147, 4, 1, '#d4664e');
      // 呼出的白气（两个人都呼）
      for (let i = 0; i < 3; i++) {
        const bh = ((t * 0.62 + i * 0.34) % 1);
        const ba = Math.sin(bh * Math.PI) * 0.62;
        if (ba > 0.05) {
          const hx2 = 145 - bh * 8 - i * 2;
          const hy2 = 144 - bh * 6 - i;
          EllipseA(hx2, hy2, 1.4 + bh * 2.4, 1 + bh * 1.4, '#f2faff', ba);
          EllipseA(hx2 - 2, hy2 - 1, 1 + bh * 1.6, 0.8 + bh, '#ffffff', ba * 0.7);
        }
      }
      for (let i = 0; i < 3; i++) {
        const bh = ((t * 0.55 + i * 0.3 + 0.4) % 1);
        const ba = Math.sin(bh * Math.PI) * 0.5;
        if (ba > 0.05) {
          const hx2 = 172 + bh * 7 + i * 2;
          const hy2 = 143 - bh * 6 - i;
          EllipseA(hx2, hy2, 1.2 + bh * 2.2, 0.9 + bh * 1.2, '#f2faff', ba);
        }
      }
    }

    /* ---- 光与天气 ---- */
    glowAdd(149, 148, 11, winter ? '#cfe4f4' : '#ffcf8a', 0.12);
    glowAdd(166, 147, 11, winter ? '#cfe4f4' : '#ffcf8a', 0.12);
    // 夏季强光晕
    if (season === 'summer') glowAdd(206, 100, 46, '#fff6d0', 0.22);
    if (season === 'winter') glowAdd(206, 96, 30, '#dcecf8', 0.14);

    seasonWeather(season, t, burst, pulse);
    seasonForeground(season, t);

    /* ---- 转场色洗（在场景最后叠加，掩盖切镜） ---- */
    if (opt.washK > 0.001) St.overlay(S.wash, opt.washK * 0.88);
  }

  window.SCENES = {
    kingdomWide, gardenApproach, windowGaze, moonlitGarden,
    gardenConfession, closeEyes, ballroomOutside, ballroomFlare,
    skyMemory, tearScene, farewell, nightSong, flowerField,
    sunsetCircle, dawnRise, outro, seasonScene
  };
  window.blinkAt = blinkAt;
})();
