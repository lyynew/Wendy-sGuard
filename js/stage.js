/* ============================================================
   stage.js — 像素舞台：坐标、绘图原语、天空、光晕
   设计分辨率 320x180，物理画布 1280x720（每像素 4x4）
   ============================================================ */
(function () {
  'use strict';

  const ART = 4;
  const SW = 320, SH = 180;
  const VIEW = { cx: 160, cy: 90, z: 1 };

  let cv = null, ctx = null;

  function init(canvas) {
    cv = canvas;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    cv.width = SW * ART;
    cv.height = SH * ART;
  }

  /* ---------- 交叉溶解缓冲：季节/场景之间做真正的溶解，而不是闪白 ---------- */
  let bufA = null, bufActx = null, bufB = null, bufBctx = null;
  function ensureBuffers() {
    if (bufA) return;
    bufA = document.createElement('canvas'); bufA.width = SW * ART; bufA.height = SH * ART;
    bufB = document.createElement('canvas'); bufB.width = SW * ART; bufB.height = SH * ART;
    bufActx = bufA.getContext('2d', { alpha: false });
    bufBctx = bufB.getContext('2d', { alpha: false });
  }
  /**
   * 把 current canvas 存进缓冲，切换绘制目标后绘制另一画面，最后按 k 混合回来。
   * 用法：
   *   St.bufferPush();      // 保存当前画面
   *   ...绘制第二画面...
   *   St.bufferCross(k);    // k=0 显示第一画面，k=1 显示第二画面
   */
  function bufferPush() {
    ensureBuffers();
    bufActx.setTransform(1, 0, 0, 1, 0, 0);
    bufActx.clearRect(0, 0, bufA.width, bufA.height);
    bufActx.drawImage(cv, 0, 0);
  }
  /* 更稳妥的版本：先把第二画面存进 B，再按 k 混合 A、B */
  function bufferBlend(k) {
    ensureBuffers();
    k = clamp(k, 0, 1);
    bufBctx.setTransform(1, 0, 0, 1, 0, 0);
    bufBctx.clearRect(0, 0, bufB.width, bufB.height);
    bufBctx.drawImage(cv, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(bufA, 0, 0);
    ctx.globalAlpha = k;
    ctx.drawImage(bufB, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* 全局呼吸：极缓慢的镜头漂移，任何静止镜头都保持“活着” */
  let DRIFT = { x: 0, y: 0, z: 0 };
  function setDrift(t) {
    const s = 1.0;
    /* 三个不同周期叠加：既有缓慢漂移，也有轻微手持感 */
    DRIFT.x = (Math.sin(t * 0.37) * 1.5 + Math.sin(t * 0.91 + 1.3) * 0.7 + Math.sin(t * 2.1) * 0.25) * s;
    DRIFT.y = (Math.sin(t * 0.29 + 2.1) * 1.2 + Math.sin(t * 0.77 + 0.4) * 0.55 + Math.sin(t * 1.9 + 2) * 0.2) * s;
    DRIFT.z = Math.sin(t * 0.21 + 4.2) * 0.012;
  }

  /* 音乐能量（0..1）：低频推镜、中频提亮、节拍脉冲 */
  let EN = { low: 0.5, mid: 0.5, beat: 0 };
  function setEnergy(low, mid, beat) { EN.low = low; EN.mid = mid; EN.beat = beat; }
  function energy() { return EN; }

  /**
   * 镜头控制
   * @param cx,cy 镜头中心（世界坐标）
   * @param z 缩放
   * @param opts.smooth  可选：连续推镜（不做缩放量化），用于长镜头缓推
   *
   * 像素画里缩放落在整齐的倍数上才不糊；但「缓慢推镜」如果量化到 1/8，
   * 会在 1.000 / 1.125 之间来回跳，看起来像镜头在抽。
   * 因此提供两种模式：
   *   · 默认：z 量化到 1/8，镜头稳定、像素硬边（绝大多数镜头）
   *   · smooth：z 保持连续（长缓推、四季间奏）
   *
   * 平滑只作用于「最终相机参数」，不对 z 做反馈式平滑，
   * 否则 camOnFeet 用 z 反算 cy 时会形成回路，逐帧震荡。
   */
  function setView(cx, cy, z, opts) {
    opts = opts || {};
    /* 低频能量让镜头轻微推近（最多 +5%），高能量段落更有压迫感 */
    z *= 1 + (EN.low - 0.55) * 0.10;
    cx += DRIFT.x;
    cy += DRIFT.y;
    z += DRIFT.z;

    if (opts.smooth) {
      /* 连续缩放：跟随目标，但不参与反算 */
      const target = clamp(z, 0.25, 3);
      VIEW.z = target;
    } else {
      VIEW.z = clamp(Math.round(z * 8) / 8, 0.25, 3);
    }

    /* 位置量化到「半设备像素」粒度：硬边 + 可见微动 */
    const q = VIEW.z;
    VIEW.cx = Math.round(cx * q * 2) / (q * 2);
    VIEW.cy = Math.round(cy * q * 2) / (q * 2);
  }

  function view() { return VIEW; }

  /* ---------- 角色精灵：先以 1x 画到离屏画布，再整数倍放大贴图 ---------- */
  const sprites = {};
  function makeSprite(name, w, h, ox, oy) {
    const pose = document.createElement('canvas');
    pose.width = w; pose.height = h;
    const tint = document.createElement('canvas');
    tint.width = w; tint.height = h;
    sprites[name] = {
      pose, pc: pose.getContext('2d'),
      tint, tc: tint.getContext('2d'),
      w, h, ox, oy
    };
    return sprites[name];
  }
  makeSprite('wendy', 44, 60, 22, 50);
  makeSprite('guard', 48, 64, 24, 54);

  /**
   * 绘制角色：以角色原生像素为单位，按镜头缩放贴图，保持硬边
   * 自动加 1px 暗色描边 + 光源侧轮廓光，保证暗景中也清晰可读
   */
  function drawChar(kind, p, t, o) {
    o = o || {};
    const spr = sprites[kind];
    if (!spr) return;
    const k = Math.max(0.5, (o.z || p.z || VIEW.z) * ART * (p.scale || 1));
    const pc = spr.pc;
    pc.clearRect(0, 0, spr.w, spr.h);
    pc.save();
    pc.translate(spr.ox, spr.oy);
    const pp = Object.assign({}, p, { x: 0, y: 0, floatY: 0 });
    if (kind === 'wendy') Chars.drawWendy(pc, pp, t, o);
    else Chars.drawGuard(pc, pp, t, o);
    pc.restore();

    const X = Math.round(toX(p.x) - spr.ox * k);
    const Y = Math.round(toY(p.y + (p.floatY || 0)) - spr.oy * k);
    const W = Math.round(spr.w * k), H = Math.round(spr.h * k);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    /* 投影 */
    if (o.ground !== false) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#140a18';
      const gw = Math.round(13 * k), gh = Math.max(2, Math.round(3 * k));
      ctx.fillRect(Math.round(toX(p.x) - gw / 2), Math.round(toY(p.y) - gh / 2), gw, gh);
      ctx.globalAlpha = 1;
    }

    /* 暗色描边（8 向，形成 1px 硬边），暗景也能把人物从背景里分出来 */
    if (o.outline !== false) {
      const tc = spr.tc;
      tc.clearRect(0, 0, spr.w, spr.h);
      tc.drawImage(spr.pose, 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = o.outlineColor || '#150c18';
      tc.fillRect(0, 0, spr.w, spr.h);
      tc.globalCompositeOperation = 'source-over';
      const ow = Math.max(1, Math.round(k * 0.7));
      ctx.globalAlpha = o.outlineAlpha === undefined ? 0.92 : o.outlineAlpha;
      ctx.drawImage(spr.tint, X - ow, Y, W, H);
      ctx.drawImage(spr.tint, X + ow, Y, W, H);
      ctx.drawImage(spr.tint, X, Y - ow, W, H);
      ctx.drawImage(spr.tint, X, Y + ow, W, H);
      ctx.drawImage(spr.tint, X - ow, Y - ow, W, H);
      ctx.drawImage(spr.tint, X + ow, Y - ow, W, H);
      ctx.drawImage(spr.tint, X - ow, Y + ow, W, H);
      ctx.drawImage(spr.tint, X + ow, Y + ow, W, H);
      ctx.globalAlpha = 1;
    }

    /* 背光晕：在角色身后铺一层柔光，把人物从背景里“托”出来 */
    if (o.halo !== false) {
      glowAdd(p.x, p.y - 18 * (p.scale || 1), 15 * (p.scale || 1), o.haloColor || '#ffcf9a', o.haloAlpha === undefined ? 0.1 : o.haloAlpha);
    }

    /* 轮廓光：默认从光源方向（月/日）勾一道暖边，保证暗景中的角色剪影清晰 */
    let L = o.light;
    if (L === undefined) L = { x: 1, y: -1, color: '#ffd9a0', alpha: 0.34 };
    if (L) {
      const lx = (L.x === undefined ? -1 : L.x), ly = (L.y === undefined ? -1 : L.y);
      const tc = spr.tc;
      tc.clearRect(0, 0, spr.w, spr.h);
      tc.drawImage(spr.pose, 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = L.color || '#ffd9a0';
      tc.fillRect(0, 0, spr.w, spr.h);
      tc.globalCompositeOperation = 'source-over';
      const lw = L.w === undefined ? 1.6 : L.w;
      ctx.globalAlpha = L.alpha === undefined ? 0.4 : L.alpha;
      ctx.drawImage(spr.tint, X + lx * k * lw, Y + ly * k * lw, W, H);
      ctx.drawImage(spr.tint, X + lx * k * lw * 0.5, Y + ly * k * lw * 0.5, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(spr.pose, X, Y, W, H);
    if (p.flash) {
      ctx.globalAlpha = p.flash;
      ctx.drawImage(spr.tint, X, Y, W, H);
    }
    ctx.restore();
  }

  const wchar = (p, t, o) => drawChar('wendy', p, t, o);
  const gchar = (p, t, o) => drawChar('guard', p, t, o);

  /* 屏幕空间（不随镜头） */

  const toX = (x) => Math.round((x - VIEW.cx) * VIEW.z * ART + SW * ART / 2);
  const toY = (y) => Math.round((y - VIEW.cy) * VIEW.z * ART + SH * ART / 2);
  const toS = (v) => Math.round(v * VIEW.z * ART);

  /* 角色轮廓光（逆光/记忆态） */
  function charGlow(x, y, s, color, a) {
    glowAdd(x, y - 12 * (s || 1), 16 * (s || 1), color, a);
  }

  /* 地面投影 */
  function charShadow(x, y, r, a) {
    EllipseA(x, y, r, Math.max(1, r * 0.34), '#170d18', a === undefined ? 0.28 : a);
  }

  /* 世界坐标 → 设计像素屏幕坐标（供天空这种屏幕空间绘制使用） */
  function w2s(x, y) {
    return { x: (x - VIEW.cx) * VIEW.z + 160, y: (y - VIEW.cy) * VIEW.z + 90 };
  }

  /* 屏幕空间（不随镜头） */
  const sx = (x) => Math.round(x * ART);
  const sy = (y) => Math.round(y * ART);
  const ss = (v) => Math.round(v * ART);

  /* ---------- 基础原语（世界坐标） ---------- */
  function R(x, y, w, h, c) {
    if (w <= 0 || h <= 0) return;
    const X = toX(x), Y = toY(y);
    const W = Math.max(1, toX(x + w) - X), H = Math.max(1, toY(y + h) - Y);
    ctx.fillStyle = c;
    ctx.fillRect(X, Y, W, H);
  }
  function RA(x, y, w, h, c, a) {
    if (a <= 0) return;
    const p = ctx.globalAlpha;
    ctx.globalAlpha = a;
    R(x, y, w, h, c);
    ctx.globalAlpha = p;
  }
  function P(x, y, c) { R(x, y, 1, 1, c); }
  function HLine(x0, x1, y, c) {
    if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
    R(x0, y, x1 - x0 + 1, 1, c);
  }
  function VLine(x, y0, y1, c) {
    if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
    R(x, y0, 1, y1 - y0 + 1, c);
  }
  function Line(x0, y0, x1, y1, c, w) {
    w = w || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sxv = x0 < x1 ? 1 : -1, syv = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    const hw = Math.floor(w / 2);
    let guard = 0;
    while (guard++ < 2000) {
      if (w <= 1) P(x0, y0, c);
      else R(x0 - hw, y0 - hw, w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sxv; }
      if (e2 < dx) { err += dx; y0 += syv; }
    }
  }
  function Ellipse(cx, cy, rx, ry, c) {
    const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
      if (xb > xa) R(xa, y, xb - xa, 1, c);
    }
  }
  function EllipseA(cx, cy, rx, ry, c, a) {
    const p = ctx.globalAlpha; ctx.globalAlpha = a;
    Ellipse(cx, cy, rx, ry, c);
    ctx.globalAlpha = p;
  }
  function Poly(pts, c) {
    let minY = 1e9, maxY = -1e9;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const y0 = Math.floor(minY), y1 = Math.ceil(maxY);
    ctx.fillStyle = c;
    for (let y = y0; y < y1; y++) {
      const yy = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        if (xb > xa) {
          const X = toX(xa), Y = toY(y);
          ctx.fillRect(X, Y, Math.max(1, toX(xb) - X), Math.max(1, toY(y + 1) - Y));
        }
      }
    }
  }
  /* 像素抖动填充（Bayer 4x4） */
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function Dither(x, y, w, h, cA, cB, threshold) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.ceil(x + w), y1 = Math.ceil(y + h);
    const th = threshold === undefined ? 0.5 : threshold;
    ctx.fillStyle = cA;
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const b = (BAYER4[((yy & 3) << 2) | (xx & 3)] + 0.5) / 16;
        if (b < th) {
          const X = toX(xx), Y = toY(yy);
          ctx.fillRect(X, Y, toX(xx + 1) - X, toY(yy + 1) - Y);
        }
      }
    }
    if (cB) {
      ctx.fillStyle = cB;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const b = (BAYER4[((yy & 3) << 2) | (xx & 3)] + 0.5) / 16;
          if (b >= th) {
            const X = toX(xx), Y = toY(yy);
            ctx.fillRect(X, Y, toX(xx + 1) - X, toY(yy + 1) - Y);
          }
        }
      }
    }
  }
  /* 世界坐标的竖直渐变条带（像素抖动） */
  function VGrad(x, y, w, h, ramp, bands) {
    bands = bands || Math.max(4, Math.round(h / 2));
    for (let i = 0; i < bands; i++) {
      const t0 = i / bands, t1 = (i + 1) / bands;
      R(x, y + h * t0, w, h * (t1 - t0) + 0.02, rampAt(ramp, (t0 + t1) / 2));
    }
  }

  /* ---------- 屏幕空间原语 ---------- */
  function S(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(sx(x), sy(y), Math.max(1, ss(w)), Math.max(1, ss(h)));
  }
  function SA(x, y, w, h, c, a) {
    if (a <= 0) return;
    const p = ctx.globalAlpha; ctx.globalAlpha = a;
    S(x, y, w, h, c);
    ctx.globalAlpha = p;
  }
  function SP(x, y, c) { S(x, y, 1, 1, c); }

  /* ---------- 天空 ---------- */
  const skyCv = document.createElement('canvas');
  skyCv.width = SW; skyCv.height = SH;
  const skyCtx = skyCv.getContext('2d');
  const skyData = skyCtx.createImageData(SW, SH);
  let skyKey = '';

  function paintSky(ramp, o) {
    o = o || {};
    const key = ramp.join('|') + (o.sunX | 0) + ',' + (o.sunY | 0) + ',' + (o.sunColor || '') + ',' + (o.sunR | 0) + ',' + (o.sunI | 0) + ',' + (o.horizon || '');
    if (key === skyKey) return;
    skyKey = key;
    const d = skyData.data;
    const n = ramp.length;
    const cols = ramp.map(hexToRgb);
    const sun = o.sunX !== undefined ? hexToRgb(o.sunColor || '#ffdc9a') : null;
    const sunX = o.sunX || 0, sunY = o.sunY || 0;
    const sunR = o.sunR || 0, sunI = o.sunI === undefined ? 0.9 : o.sunI;
    const hor = o.horizon ? hexToRgb(o.horizon) : null;
    const horY = o.horizonY === undefined ? 118 : o.horizonY;
    const horI = o.horizonI === undefined ? 0.5 : o.horizonI;

    /* 逐行计算基础色（相邻行轻微混合，避免硬色阶），再叠加太阳光晕与地平线暖雾 */
    const rowCol = [];
    for (let y = 0; y < SH; y++) {
      const t = y / (SH - 1);
      const idx = t * (n - 1);
      const i0 = Math.min(n - 1, Math.floor(idx));
      const fr = idx - i0;
      const A = cols[i0], B = cols[Math.min(i0 + 1, n - 1)];
      // 只有接近色彩边界时才做小幅抖动，形成像素画的柔和过渡
      const k = fr < 0.5 ? fr * 0.55 : 0.275 + (fr - 0.5) * 0.55;
      let r = A[0] + (B[0] - A[0]) * k;
      let g = A[1] + (B[1] - A[1]) * k;
      let b = A[2] + (B[2] - A[2]) * k;
      if (hor) {
        const hf = Math.max(0, 1 - Math.abs(y - horY) / 52) * horI;
        r += (hor[0] - r) * hf; g += (hor[1] - g) * hf; b += (hor[2] - b) * hf;
      }
      rowCol.push([r, g, b]);
    }
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        let [r, g, b] = rowCol[y];
        if (sun) {
          const dx = x - sunX, dy = y - sunY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < sunR * 3.2) {
            const f = Math.pow(Math.max(0, 1 - dist / (sunR * 3.2)), 2.0) * sunI;
            r += (sun[0] - r) * f; g += (sun[1] - g) * f; b += (sun[2] - b) * f;
          }
        }
        // 轻微有序抖动，打散色带
        const bayer = (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16 - 0.5;
        const amp = 2.2;
        const p = (y * SW + x) << 2;
        d[p] = r + bayer * amp;
        d[p + 1] = g + bayer * amp;
        d[p + 2] = b + bayer * amp;
        d[p + 3] = 255;
      }
    }
    skyCtx.putImageData(skyData, 0, 0);
  }

  function sky(ramp, o) {
    paintSky(ramp, o);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyCv, 0, 0, SW * ART, SH * ART);
  }

  /* ---------- 星星 ---------- */
  function stars(t, o) {
    o = o || {};
    const count = o.count || 70;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const yMax = o.yMax || 120;
    for (let i = 0; i < count; i++) {
      const x = (hash1(i * 3.7 + 1.3) * SW) | 0;
      const y = (hash1(i * 9.1 + 4.7) * yMax) | 0;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.7 + hash1(i * 5.3) * 2.2) + i * 1.7);
      const big = hash1(i * 13.1) > 0.86;
      const c = PAL.star[(i * 7) % PAL.star.length];
      const a = alpha * tw * (0.5 + hash1(i * 2.2) * 0.5);
      if (big) {
        SA(x, y, 1, 1, c, a);
        SA(x - 1, y, 1, 1, c, a * 0.4);
        SA(x + 1, y, 1, 1, c, a * 0.4);
        SA(x, y - 1, 1, 1, c, a * 0.4);
        SA(x, y + 1, 1, 1, c, a * 0.4);
      } else {
        SA(x, y, 1, 1, c, a);
      }
    }
  }

  /* ---------- 光晕层 ---------- */
  const glowCv = document.createElement('canvas');
  glowCv.width = SW / 2; glowCv.height = SH / 2;
  const glowCtx = glowCv.getContext('2d');
  let glowCount = 0;

  function glowReset() {
    glowCtx.clearRect(0, 0, glowCv.width, glowCv.height);
    glowCount = 0;
  }
  function glowAdd(x, y, r, color, a) {
    if (glowCount > 40) return;
    glowCount++;
    const gx = (x - VIEW.cx) * VIEW.z * 0.5 + SW / 4;
    const gy = (y - VIEW.cy) * VIEW.z * 0.5 + SH / 4;
    const gr = Math.max(1.5, r * VIEW.z * 0.5);
    if (gx < -gr || gx > SW / 2 + gr || gy < -gr || gy > SH / 2 + gr) return;
    const [rr, gg, bb] = hexToRgb(color);
    const grd = glowCtx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    grd.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`);
    grd.addColorStop(0.42, `rgba(${rr},${gg},${bb},${a * 0.42})`);
    grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    glowCtx.fillStyle = grd;
    glowCtx.beginPath();
    glowCtx.arc(gx, gy, gr, 0, TAU);
    glowCtx.fill();
  }
  function glowAddS(x, y, r, color, a) {
    glowAdd(x + VIEW.cx - 160, y + VIEW.cy - 90, r, color, a);
  }
  function glowFlush(alpha, mode) {
    ctx.save();
    ctx.globalCompositeOperation = mode || 'screen';
    ctx.globalAlpha = alpha === undefined ? 0.85 : alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(glowCv, 0, 0, SW * ART, SH * ART);
    ctx.restore();
  }

  /* ---------- 全屏叠色 / 转场 ---------- */
  function overlay(color, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SW * ART, SH * ART);
    ctx.restore();
  }
  function vignette(a) {
    const g = ctx.createRadialGradient(SW * ART / 2, SH * ART * 0.45, SH * ART * 0.28, SW * ART / 2, SH * ART * 0.5, SW * ART * 0.62);
    g.addColorStop(0, 'rgba(20,8,20,0)');
    g.addColorStop(1, `rgba(20,8,20,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW * ART, SH * ART);
  }
  function grain(t, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = 0; i < 140; i++) {
      const x = (hash1(i * 12.1 + Math.floor(t * 12) * 3.3) * SW) | 0;
      const y = (hash1(i * 7.7 + Math.floor(t * 12) * 5.1) * SH) | 0;
      ctx.fillStyle = i % 3 === 0 ? '#ffe7c4' : '#1b1020';
      ctx.fillRect(x * ART, y * ART, ART, ART);
    }
    ctx.restore();
  }

  /* ---------- 世界坐标转屏幕（供 UI 标记用） ---------- */
  function project(x, y) {
    return { x: toX(x) / ART, y: toY(y) / ART };
  }

  /* ---------- 调色：对比 + 暖色分级 ---------- */
  function grade(strength, warmth) {
    const c = cv;
    ctx.save();
    // 自叠加 = S 曲线，提升对比、压暗浑浊的中间调
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = strength === undefined ? 0.34 : strength;
    ctx.drawImage(c, 0, 0);
    // 暖色高光
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = warmth === undefined ? 0.22 : warmth;
    ctx.fillStyle = '#ffcf9a';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
  }

  /* 大气雾：把远景压暗/提亮，制造层次 */
  function haze(color, a, y0, y1) {
    if (a <= 0) return;
    const g = ctx.createLinearGradient(0, toY(y0 === undefined ? 60 : y0), 0, toY(y1 === undefined ? 170 : y1));
    g.addColorStop(0, withAlpha(color, 0));
    g.addColorStop(0.55, withAlpha(color, a * 0.7));
    g.addColorStop(1, withAlpha(color, a));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SW * ART, SH * ART);
    ctx.restore();
  }

  window.St = {
    ART, SW, SH, VIEW,
    init, setView, setDrift, setEnergy, energy, view, bufferPush, bufferBlend,
    toX, toY, toS, sx, sy, ss,
    R, RA, P, HLine, VLine, Line, Ellipse, EllipseA, Poly, Dither, VGrad,
    S, SA, SP, charGlow, charShadow, wchar, gchar,
    sky, stars, paintSky,
    glowReset, glowAdd, glowAddS, glowFlush,
    overlay, vignette, grain, project, grade, haze, w2s,
    ctx: () => ctx,
    canvas: () => cv
  };
})();
