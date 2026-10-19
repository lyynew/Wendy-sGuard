/* ============================================================
   chars.js — 像素角色：温蒂公主 / 侍卫 / 剪影 / 小动物
   坐标约定：局部原点在脚底中心，y 向上为负。
   角色由“手绘像素块 + 可动肢体”组成：躯干、头、发、服饰是
   逐像素精修的形状，四肢用分段线条绘制以支持连续动画。
   ============================================================ */
(function () {
  'use strict';

  const W = PAL.wendy;
  const G = PAL.guard;

  function basePose() {
    return {
      x: 0, y: 0,
      scale: 1,
      facing: 1,
      walk: 0,
      walkPhase: 0,
      bob: 0,
      lean: 0,
      headDy: 0,
      headTilt: 0,
      armL: 0.25, armR: 0.25,   // 手臂角度（弧度，正=向前）
      lift: 0,                   // 抬前臂 0..1
      hold: 0,                   // 双手前收 0..1
      capeSwing: 0,
      skirtSway: 0,
      hairSway: 0,
      blink: 0,
      mouth: 0,
      smile: 0.4,
      blush: 0,
      floatY: 0,
      flash: 0
    };
  }

  /* 像素填充 */
  function px(c, x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /* 带描边的矩形块：先画外框，再画内部 */
  function box(c, x, y, w, h, col, edge) {
    px(c, x, y, w, h, col);
    if (!edge) return;
    px(c, x, y, w, 1, edge);
    px(c, x, y + h - 1, w, 1, edge);
    px(c, x, y, 1, h, edge);
    px(c, x + w - 1, y, 1, h, edge);
  }

  /* 粗线段（用于手臂/腿），带底部暗边 */
  function limb(c, x0, y0, x1, y1, col, dark) {
    let x = Math.round(x0), y = Math.round(y0);
    const xe = Math.round(x1), ye = Math.round(y1);
    let dx = Math.abs(xe - x), dy = Math.abs(ye - y);
    const sx = x < xe ? 1 : -1, sy = y < ye ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 64) {
      px(c, x, y, 2, 2, col);
      if (dark) px(c, x, y + 1, 2, 1, dark);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  /* 眼睛：2x2 高光眼 */
  function eye(c, x, y, dir, blink, skin, iris, dark) {
    if (blink > 0.5) { px(c, x, y + 1, 2, 1, dark); return; }
    px(c, x, y, 2, 2, '#fffdf6');
    px(c, x + (dir > 0 ? 1 : 0), y, 1, 2, iris);
    px(c, x + (dir > 0 ? 1 : 0), y + 1, 1, 1, dark);
    if (blink > 0.15) px(c, x, y, 2, 1, skin);
  }

  /* ============================================================
     温蒂公主
     高度约 35px：王冠 4 + 头 7 + 颈 1 + 胸衣 6 + 裙 16 + 鞋 2
     ============================================================ */
  function drawWendy(c, p, t, o) {
    o = o || {};
    const dir = p.facing || 1;
    const walk = p.walk || 0;
    const ph = p.walkPhase || 0;
    const step = Math.sin(ph) * walk;
    const bob = Math.round((p.bob || 0) + Math.abs(Math.sin(ph)) * walk * 1.1);

    const skin = o.skin || W.skin, skinM = o.skinMid || W.skinMid, skinD = o.skinDark || W.skinDark;
    const hair = o.hair || W.hair, hairM = o.hairMid || W.hairMid, hairD = o.hairDark || W.hairDark;
    const dress = o.dress || W.dress, dressM = o.dressMid || W.dressMid,
      dressD = o.dressDark || W.dressDark, dressX = o.dressDeep || W.dressDeep;
    const trim = o.trim || W.trim, trimM = o.trimMid || W.trimMid;
    const ink = o.ink || '#2c1c2c';

    c.save();
    if (dir < 0) c.scale(-1, 1);

    const hs = Math.round((p.hairSway || 0) * 0.6 + step * 1.2);
    const sway = (p.skirtSway || 0) + step * 0.9;

    /* ---- 腿与鞋（先画，被裙摆覆盖） ---- */
    const legY = -4 + bob;
    const l1 = Math.round(step * 2), l2 = -Math.round(step * 2);
    px(c, -2 + l1, legY, 2, 3, skinM);
    px(c, 1 + l2, legY, 2, 3, skin);
    // 鞋（脚尖朝前）
    px(c, -3 + l1, legY + 3, 4, 2, W.shoe);
    px(c, 0 + l2, legY + 3, 4, 2, W.shoe);
    px(c, -3 + l1, legY + 4, 4, 1, ink);
    px(c, 0 + l2, legY + 4, 4, 1, ink);
    px(c, -3 + l1, legY + 3, 4, 1, shade(W.shoe, 0.2));

    /* ---- 裙摆：钟形 ---- */
    const skirtTop = -18 + bob;
    const skirtH = 14;
    for (let i = 0; i < skirtH; i++) {
      const k = i / (skirtH - 1);
      const half = 2 + Math.round(k * 6.4);
      const off = Math.round(sway * k * 1.8);
      let col = dress;
      if (i > skirtH - 3) col = dressD;
      else if (i > skirtH - 7) col = dressM;
      px(c, -half + 1 + off, skirtTop + i, half * 2, 1, col);
      // 左侧受光，右侧阴影
      px(c, -half + 1 + off, skirtTop + i, 1, 1, shade(col, 0.22));
      px(c, half + off, skirtTop + i, 1, 1, shade(col, -0.16));
    }
    // 裙面褶皱（竖向）
    for (let i = 3; i < skirtH - 1; i++) {
      const k = i / (skirtH - 1);
      const off = Math.round(sway * k * 1.8);
      px(c, -3 + off, skirtTop + i, 1, 1, shade(dress, 0.16));
      px(c, 1 + off, skirtTop + i, 1, 1, dressD);
      if (i > 6) px(c, -5 + off, skirtTop + i, 1, 1, shade(dress, 0.1));
    }
    // 下摆蕾丝
    const hem = skirtTop + skirtH - 1;
    for (let i = 0; i < 15; i += 2) {
      px(c, -6 + 1 + i + Math.round(sway), hem, 1, 1, trim);
      px(c, -5 + 1 + i + Math.round(sway), hem + 1, 1, 1, trimM);
    }
    // 裙摆描边
    px(c, -7 + Math.round(sway), hem + 1, 15, 1, dressX);

    /* ---- 胸衣 ---- */
    const tor = -24 + bob;
    px(c, -3, tor, 6, 7, dressM);
    px(c, -3, tor, 2, 7, dress);
    px(c, 2, tor, 1, 7, dressD);
    // 领口
    px(c, -2, tor, 4, 1, trim);
    px(c, -1, tor + 1, 1, 2, trimM);
    // 束腰
    px(c, -3, tor + 6, 6, 1, trimM);
    px(c, -1, tor + 6, 2, 1, W.crown);
    // 胸口小蝴蝶结
    px(c, -1, tor + 2, 2, 1, trim);
    px(c, -2, tor + 3, 1, 1, trimM);
    px(c, 1, tor + 3, 1, 1, trimM);

    /* ---- 手臂 ---- */
    const armBase = 0.3 + Math.sin(ph + Math.PI) * walk * 0.5;
    const lift = p.lift || 0;
    const hold = p.hold || 0;
    // 后臂
    const backA = p.armL + armBase + lift * 0.55 + hold * 0.5;
    // 前臂
    const frontA = p.armR - armBase - lift * 1.5 + hold * 0.5;

    const shoulderY = tor + 1;
    // 后臂（画在身后，稍暗）
    drawWendyArm(c, -3, shoulderY, backA, -1, dressM, dressD, skinM, skinD, lift);
    // 前臂
    drawWendyArm(c, 2, shoulderY, frontA, 1, dress, dressD, skin, skinM, lift);

    /* ---- 脖子 ---- */
    px(c, -1, tor - 2, 2, 2, skinM);

    /* ---- 头部 ---- */
    const headY = -32 + bob + Math.round(p.headDy || 0);
    const hx = Math.round(p.headTilt || 0);
    // 脸
    px(c, -3 + hx, headY, 6, 7, skin);
    px(c, 2 + hx, headY + 1, 1, 6, skinM);
    px(c, -3 + hx, headY + 6, 6, 1, skinM);
    px(c, -3 + hx, headY + 6, 1, 1, skinD);
    px(c, -3 + hx, headY, 6, 1, shade(skin, 0.12));
    // 后发（垂在背后）
    px(c, -5 + hx, headY + 1, 2, 9, hairM);
    px(c, -6 + hx + hs, headY + 5, 1, 7, hairM);
    px(c, -6 + hx + hs, headY + 11, 2, 2, hairD);
    px(c, -4 + hx, headY + 9, 1, 3, hairD);
    // 顶发
    px(c, -4 + hx, headY - 2, 8, 3, hair);
    px(c, -4 + hx, headY - 2, 8, 1, W.hairShine);
    px(c, -4 + hx, headY, 1, 1, hairM);
    px(c, 3 + hx, headY - 1, 1, 3, hairM);
    // 刘海
    px(c, -3 + hx, headY, 5, 1, hair);
    px(c, -3 + hx, headY + 1, 2, 1, hairM);
    px(c, 1 + hx, headY + 1, 2, 1, hair);
    px(c, 0 + hx, headY + 1, 1, 2, hairM);
    // 侧发垂到脸颊
    px(c, -4 + hx, headY + 1, 1, 5, hairM);
    px(c, -4 + hx, headY + 6, 1, 2, hairD);
    px(c, 3 + hx, headY + 1, 1, 4, hair);

    // 眉眼
    const ddir = dir > 0 ? 1 : -1;
    const skinForEye = skin;
    eye(c, -2 + hx, headY + 3, ddir, p.blink || 0, skinForEye, '#4d3e60', '#2b2138');
    eye(c, 1 + hx, headY + 3, ddir, p.blink || 0, skinForEye, '#4d3e60', '#2b2138');
    px(c, -2 + hx, headY + 2, 2, 1, hairD);
    px(c, 1 + hx, headY + 2, 2, 1, hairD);
    // 腮红
    if (p.blush > 0.05) {
      px(c, -3 + hx, headY + 5, 1, 1, mix(skin, W.blush, p.blush));
      px(c, 2 + hx, headY + 5, 1, 1, mix(skin, W.blush, p.blush));
    }
    // 嘴
    if (p.mouth > 0.5) px(c, 0 + hx, headY + 5, 2, 1, W.mouth);
    else if (p.smile > 0.25) {
      px(c, 0 + hx, headY + 5, 2, 1, mix(skinM, W.mouth, 0.5));
      px(c, -1 + hx, headY + 4, 1, 1, mix(skinM, W.mouth, 0.25));
    } else px(c, 0 + hx, headY + 5, 1, 1, mix(skinM, W.mouth, 0.4));

    /* ---- 王冠 ---- */
    const cy = headY - 6;
    px(c, -3 + hx, cy, 7, 2, W.crown);
    px(c, -3 + hx, cy + 1, 7, 1, W.crownDark);
    px(c, -3 + hx, cy - 1, 1, 1, W.crown);
    px(c, -1 + hx, cy - 2, 1, 3, W.crown);
    px(c, 2 + hx, cy - 1, 1, 1, W.crown);
    px(c, 0 + hx, cy - 2, 1, 1, '#fffbe0');
    px(c, -2 + hx, cy + 1, 1, 1, '#f78fa8');
    px(c, 2 + hx, cy + 1, 1, 1, '#8fd4ff');
    px(c, 0 + hx, cy + 1, 1, 1, '#fff3c0');

    c.restore();
  }

  /* 公主手臂：袖子 + 前臂 + 手 */
  function drawWendyArm(c, sx0, sy0, ang, side, sleeve, sleeveD, skin, skinM, lift) {
    const a = ang;
    const ex = Math.round(sx0 + Math.cos(a) * 2.6 * side);
    const ey = Math.round(sy0 + Math.sin(a) * 2.4 + 3);
    const a2 = a + 0.5 + lift * 0.9;
    const hx = Math.round(ex + Math.cos(a2) * 2.4 * side);
    const hy = Math.round(ey + Math.sin(a2) * 2.4 + 2);
    limb(c, sx0, sy0, ex, ey, sleeve, sleeveD);
    limb(c, ex, ey, hx, hy, skin, skinM);
    px(c, hx, hy - 1, 2, 2, skin);
    px(c, hx, hy - 1, 1, 1, shade(skin, 0.2));
  }

  /* ============================================================
     侍卫
     高度约 41px：羽 3 + 帽 4 + 头 8 + 颈 1 + 上身 15 + 腿 6 + 靴 4
     ============================================================ */
  function drawGuard(c, p, t, o) {
    o = o || {};
    const dir = p.facing || 1;
    const walk = p.walk || 0;
    const ph = p.walkPhase || 0;
    const step = Math.sin(ph) * walk;
    const bob = Math.round((p.bob || 0) + Math.abs(Math.sin(ph)) * walk * 1.2);

    const skin = o.skin || G.skin, skinM = o.skinMid || G.skinMid, skinD = o.skinDark || G.skinDark;
    const coat = o.coat || G.coat, coatM = o.coatMid || G.coatMid,
      coatD = o.coatDark || G.coatDark, coatX = o.coatDeep || G.coatDeep;
    const trim = o.trim || G.trim, trimD = o.trimDark || G.trimDark;
    const cape = o.cape || G.cape, capeM = o.capeMid || G.capeMid, capeD = o.capeDark || G.capeDark;
    const ink = o.ink || '#1c1524';

    c.save();
    if (dir < 0) c.scale(-1, 1);

    /* ---- 披风（身后） ---- */
    const swing = (p.capeSwing || 0) + step * 1.1;
    const topY = -28 + bob;
    for (let i = 0; i < 19; i++) {
      const k = i / 18;
      const y = topY + i;
      const half = 4 + Math.round(k * 3.4);
      const off = Math.round(swing * k * 3.4);
      let col = cape;
      if (i > 15) col = capeD; else if (i > 9) col = capeM;
      px(c, -half - 1 - off, y, half + 1, 1, col);
      px(c, -half - 1 - off, y, 1, 1, shade(col, 0.15));
    }
    px(c, -4, topY + 2, 3, 12, capeD);

    /* ---- 腿 / 靴 ---- */
    const legY = -10 + bob;
    const l1 = Math.round(step * 2.2), l2 = -Math.round(step * 2.2);
    px(c, -3 + l1, legY, 3, 7, G.pants);
    px(c, 1 + l2, legY, 3, 7, G.pants);
    px(c, -3 + l1, legY, 1, 7, shade(G.pants, 0.2));
    px(c, 1 + l2, legY, 1, 7, shade(G.pants, -0.18));
    // 靴筒
    px(c, -3 + l1, legY + 7, 3, 4, G.boot);
    px(c, 1 + l2, legY + 7, 4, 4, G.boot);
    px(c, -3 + l1, legY + 7, 3, 1, G.bootMid);
    px(c, 1 + l2, legY + 7, 4, 1, G.bootMid);
    px(c, -3 + l1, legY + 10, 4, 1, ink);
    px(c, 1 + l2, legY + 10, 5, 1, ink);
    px(c, -3 + l1, legY + 8, 3, 2, shade(G.boot, 0.14));

    /* ---- 上身 ---- */
    const tor = -26 + bob;
    px(c, -4, tor, 9, 16, coat);
    px(c, -4, tor, 2, 16, coatM);
    px(c, 3, tor, 1, 16, coatD);
    px(c, 4, tor, 1, 16, coatX);
    // 下摆开衩
    px(c, -4, tor + 14, 9, 2, coatD);
    // 双排扣
    for (let i = 0; i < 4; i++) {
      px(c, -2, tor + 4 + i * 2, 1, 1, trim);
      px(c, 1, tor + 4 + i * 2, 1, 1, trimD);
    }
    // 腰带
    px(c, -5, tor + 11, 10, 2, G.belt);
    px(c, -5, tor + 12, 10, 1, shade(G.belt, -0.3));
    px(c, -1, tor + 11, 3, 2, G.buckle);
    px(c, -1, tor + 11, 1, 1, shade(G.buckle, 0.35));
    // 肩章
    px(c, -6, tor, 3, 2, trim);
    px(c, 4, tor, 3, 2, trimD);
    px(c, -6, tor, 3, 1, shade(trim, 0.3));
    // 领口 / 立领
    px(c, -3, tor - 1, 7, 2, coatM);
    px(c, -2, tor - 1, 5, 1, trim);
    px(c, 0, tor, 1, 1, G.buckle);
    // 胸前绶带
    px(c, 2, tor + 2, 1, 9, trimD);
    px(c, 3, tor + 3, 1, 7, trim);

    /* ---- 手臂 ---- */
    const armBase = 0.25 + Math.sin(ph + Math.PI) * walk * 0.45;
    const lift = p.lift || 0;
    const hold = p.hold || 0;
    const shoulderY = tor + 2;
    // 后臂
    drawGuardArm(c, -4, shoulderY, p.armL + armBase + lift * 0.4 + hold * 0.5, -1,
      coatM, coatX, skinM, skinD, trimD);
    // 前臂
    drawGuardArm(c, 4, shoulderY, p.armR - armBase - lift * 1.45 + hold * 0.5, 1,
      coat, coatM, skin, skinM, trim);

    /* ---- 脖子 ---- */
    px(c, -1, tor - 3, 3, 2, skinM);

    /* ---- 头 ---- */
    const headY = -34 + bob + Math.round(p.headDy || 0);
    const hx = Math.round(p.headTilt || 0);
    px(c, -3 + hx, headY, 7, 8, skin);
    px(c, 3 + hx, headY + 1, 1, 7, skinM);
    px(c, -3 + hx, headY + 7, 7, 1, skinM);
    px(c, -3 + hx, headY + 7, 1, 1, skinD);
    px(c, -3 + hx, headY, 7, 1, shade(skin, 0.1));
    // 耳
    px(c, -4 + hx, headY + 4, 1, 2, skinM);
    // 鬓发
    px(c, -4 + hx, headY + 1, 1, 4, G.hairM);
    px(c, 3 + hx, headY + 1, 1, 3, G.hairD);

    /* 帽子 */
    const capY = headY - 5;
    px(c, -4 + hx, capY + 3, 9, 2, G.cap);
    px(c, -4 + hx, capY + 3, 9, 1, shade(G.cap, 0.18));
    px(c, -5 + hx, capY + 4, 11, 1, G.capDark);
    px(c, -3 + hx, capY, 7, 3, G.cap);
    px(c, -3 + hx, capY, 7, 1, shade(G.cap, 0.26));
    px(c, 3 + hx, capY, 1, 3, G.capDark);
    px(c, -3 + hx, capY + 2, 7, 1, trimD);
    px(c, 0 + hx, capY + 2, 1, 1, trim);
    // 帽檐
    px(c, 2 + hx, capY + 4, 4, 1, G.capDark);
    // 羽饰
    px(c, 3 + hx, capY - 1, 1, 2, G.feather);
    px(c, 4 + hx, capY - 3, 1, 3, G.feather);
    px(c, 5 + hx, capY - 2, 1, 2, G.featherMid);
    px(c, 5 + hx, capY - 1, 1, 1, '#fffaf0');

    // 眉眼
    const ddir = dir > 0 ? 1 : -1;
    eye(c, -2 + hx, headY + 3, ddir, p.blink || 0, skin, '#3e3129', '#241b17');
    eye(c, 2 + hx, headY + 3, ddir, p.blink || 0, skin, '#3e3129', '#241b17');
    px(c, -2 + hx, headY + 2, 2, 1, G.hairDark);
    px(c, 2 + hx, headY + 2, 2, 1, G.hairDark);
    // 嘴
    if (p.mouth > 0.5) px(c, 0 + hx, headY + 6, 2, 1, G.mouth);
    else if (p.smile > 0.25) px(c, 0 + hx, headY + 6, 2, 1, mix(skinM, G.mouth, 0.45));
    else px(c, 0 + hx, headY + 6, 2, 1, mix(skinM, G.mouth, 0.28));
    if (p.blush > 0.05) {
      px(c, -3 + hx, headY + 5, 1, 1, mix(skin, G.blush, p.blush));
      px(c, 3 + hx, headY + 5, 1, 1, mix(skin, G.blush, p.blush));
    }

    c.restore();
  }

  function drawGuardArm(c, sx0, sy0, ang, side, coat, coatD, skin, skinM, trim) {
    const a = ang;
    const ex = Math.round(sx0 + Math.cos(a) * 2.8 * side);
    const ey = Math.round(sy0 + Math.sin(a) * 2.6 + 4);
    const a2 = a + 0.45;
    const hx = Math.round(ex + Math.cos(a2) * 2.4 * side);
    const hy = Math.round(ey + Math.sin(a2) * 2.4 + 2);
    limb(c, sx0, sy0, ex, ey, coat, coatD);
    limb(c, ex, ey, hx, hy, skin, skinM);
    px(c, ex, ey, 2, 1, trim);
    px(c, hx, hy - 1, 2, 2, skin);
    px(c, hx, hy - 1, 1, 1, shade(skin, 0.18));
  }

  /* 斗篷（远行） */
  function drawCloak(c, p, t, o) {
    o = o || {};
    const col = o.color || '#6a567c', colD = o.colorDark || '#4b3b5e', colL = o.colorLight || '#88719a';
    const dir = p.facing || 1;
    c.save();
    if (dir < 0) c.scale(-1, 1);
    const flap = Math.sin(t * 1.6) * 1.4 + (p.capeSwing || 0) * 2;
    for (let i = 0; i < 24; i++) {
      const k = i / 23;
      const w = 8 + Math.round(k * 6);
      const off = Math.round(flap * k * 2);
      px(c, -Math.floor(w / 2) - off, -26 + i, w, 1, i > 18 ? colD : i > 10 ? col : colL);
    }
    c.restore();
  }

  /* ============================================================
     远景剪影 / 小动物
     ============================================================ */
  function drawSilhouette(c, x, y, h, color, opts) {
    opts = opts || {};
    const w = Math.max(2, Math.round(h * 0.3));
    const hx = Math.round(x), hy = Math.round(y);
    px(c, hx - 1, hy - h, 3, 3, color);
    px(c, hx - Math.floor(w / 2), hy - h + 3, w, Math.round(h * 0.45), color);
    px(c, hx - Math.floor(w / 2), hy - Math.round(h * 0.45), 1, Math.round(h * 0.45), color);
    px(c, hx + Math.floor(w / 2) - 1, hy - Math.round(h * 0.45), 1, Math.round(h * 0.45), color);
    if (opts.cape) px(c, hx - Math.floor(w / 2) - 2, hy - h + 4, 2, Math.round(h * 0.5), color);
  }

  function drawCat(c, x, y, t, color) {
    const col = color || '#edbf92';
    const c2 = shade(col, -0.3);
    const breathe = Math.sin(t * 2.2) > 0.6;
    px(c, x, y - 3, 5, 3, col);
    px(c, x + 4, y - 5, 3, 3, col);
    px(c, x + 4, y - 6, 1, 1, c2);
    px(c, x + 6, y - 6, 1, 1, c2);
    px(c, x + 5, y - 4, 1, 1, '#3a2a2a');
    px(c, x + 6, y - 4, 1, 1, '#3a2a2a');
    px(c, x - 1, y - 3, 2, 1, c2);
    px(c, x + 3, y - 1, 1, 1, c2);
    if (breathe) px(c, x + 2, y - 4, 1, 1, shade(col, 0.2));
  }

  function drawBird(c, x, y, t, color) {
    const flap = Math.sin(t * 9) > 0;
    const col = color || '#fff2d8';
    px(c, x, y, 2, 1, col);
    if (flap) { px(c, x - 1, y - 1, 1, 1, col); px(c, x + 2, y - 1, 1, 1, col); }
    else { px(c, x - 1, y + 1, 1, 1, col); px(c, x + 2, y + 1, 1, 1, col); }
  }

  function drawButterfly(c, x, y, t, c1, c2) {
    const flap = Math.sin(t * 12);
    const w = flap > 0 ? 2 : 1;
    px(c, x - w, y, w, 2, c1);
    px(c, x + 1, y, w, 2, c1);
    px(c, x - w, y - 1, 1, 1, c2);
    px(c, x + 1 + w - 1, y - 1, 1, 1, c2);
    px(c, x, y - 1, 1, 1, '#3a2a2a');
  }

  function drawBirds(c, n, t, o) {
    o = o || {};
    const col = o.color || '#3a2a3a';
    for (let i = 0; i < n; i++) {
      const sp = 0.6 + hash1(i * 3.1) * 0.5;
      const x = ((hash1(i * 7.7) * 400 + t * sp * 6) % 420) - 40;
      const y = (o.y || 40) + hash1(i * 5.3) * (o.spread || 24) + Math.sin(t * sp + i) * 2;
      const s = 1 + (hash1(i * 9.1) > 0.6 ? 1 : 0);
      const f = Math.sin(t * 7 + i) > 0;
      px(c, x, y, 2 * s, 1, col);
      if (f) { px(c, x - 1 * s, y - 1, 1, 1, col); px(c, x + 2 * s, y - 1, 1, 1, col); }
      else { px(c, x - 1 * s, y + 1, 1, 1, col); px(c, x + 2 * s, y + 1, 1, 1, col); }
    }
  }

  window.Chars = {
    basePose, drawWendy, drawGuard, drawCloak, drawSilhouette, drawCat, drawBird, drawButterfly, drawBirds, px
  };
})();
