/* ============================================================
   text.js — 像素中文字幕系统
   使用 12px 点阵字体渲染到 1x 遮罩，再按整数倍放大，
   保证任何字号都是硬边像素；逐字缓存，支持逐字入场动画。
   ============================================================ */
(function () {
  'use strict';

  const FONT = '"ArkPixel", monospace';
  const BASE = 12;         // 点阵字体原生像素高度
  const PAD = 2;           // 遮罩留白（用于描边）
  const GLYPH = BASE + PAD * 2;

  const maskCv = document.createElement('canvas');
  maskCv.width = 64; maskCv.height = 64;
  const maskCtx = maskCv.getContext('2d', { willReadFrequently: true });

  const glyphCache = new Map();
  const fontReady = (async () => {
    try {
      if (document.fonts && document.fonts.load) {
        await document.fonts.load(`${BASE}px ${FONT}`);
        await document.fonts.ready;
      }
    } catch (e) { /* 回退到系统字体 */ }
  })();

  function maskFor(ch) {
    maskCtx.clearRect(0, 0, 64, 64);
    maskCtx.font = `${BASE}px ${FONT}`;
    maskCtx.textBaseline = 'top';
    maskCtx.textAlign = 'left';
    maskCtx.fillStyle = '#fff';
    maskCtx.fillText(ch, PAD, PAD);
    const adv = Math.max(1, Math.round(maskCtx.measureText(ch).width));
    const data = maskCtx.getImageData(0, 0, GLYPH, GLYPH).data;
    const bits = new Uint8Array(GLYPH * GLYPH);
    let any = false;
    for (let i = 0; i < GLYPH * GLYPH; i++) {
      if (data[i * 4 + 3] > 110) { bits[i] = 1; any = true; }
    }
    return { bits, adv, any };
  }

  /* 生成放大 k 倍的像素字形画布 */
  function glyph(ch, k, color, outline) {
    const key = ch + '|' + k + '|' + color + '|' + (outline || '');
    let g = glyphCache.get(key);
    if (g) return g;
    const m = maskFor(ch);
    const w = GLYPH * k, h = GLYPH * k;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const px = (i, j, col) => {
      x.fillStyle = col;
      x.fillRect(i * k, j * k, k, k);
    };
    if (outline) {
      for (let j = 0; j < GLYPH; j++) {
        for (let i = 0; i < GLYPH; i++) {
          if (!m.bits[j * GLYPH + i]) continue;
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const ii = i + di, jj = j + dj;
              if (ii < 0 || jj < 0 || ii >= GLYPH || jj >= GLYPH) continue;
              if (!m.bits[jj * GLYPH + ii]) px(ii, jj, outline);
            }
          }
        }
      }
    }
    for (let j = 0; j < GLYPH; j++) {
      for (let i = 0; i < GLYPH; i++) {
        if (m.bits[j * GLYPH + i]) px(i, j, color);
      }
    }
    g = { canvas: c, adv: m.adv * k, empty: !m.any, k };
    if (glyphCache.size > 4000) glyphCache.clear();
    glyphCache.set(key, g);
    return g;
  }

  /* 计算文本宽度（设计像素） */
  function measure(str, k) {
    maskCtx.font = `${BASE}px ${FONT}`;
    let w = 0;
    for (const ch of str) {
      w += Math.max(1, Math.round(maskCtx.measureText(ch).width)) * k;
    }
    return w;
  }

  /* 按最大宽度折行（返回字符串数组） */
  function wrap(str, k, maxW) {
    const out = [];
    let cur = '';
    for (const ch of str) {
      const test = cur + ch;
      if (measure(test, k) > maxW && cur.length) {
        out.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }

  /**
   * 绘制单行像素文本
   * ctx 为屏幕空间 context（直接画到 stage 的 4x 画布）
   */
  function draw(ctx, str, x, y, o) {
    o = o || {};
    const k = o.k || 2;                  // 设计像素放大倍数
    const color = o.color || '#fff4dc';
    const outline = o.outline === undefined ? '#2a1626' : o.outline;
    const shadow = o.shadow || null;     // 阴影颜色
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const letter = o.letter || 0;
    const align = o.align || 'center';
    const scale = St.ART * (o.z === undefined ? 1 : o.z);
    const total = measure(str, k) + letter * Math.max(0, str.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const gx = Math.round(cx);
    if (alpha <= 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    let i = 0;
    for (const ch of str) {
      if (ch !== ' ') {
        const g = glyph(ch, k, color, outline);
        const dx = Math.round((gx + i) * scale);
        const dy = Math.round(y * scale);
        if (shadow && o.shadowOff) {
          const gs = glyph(ch, k, shadow, null);
          ctx.globalAlpha = alpha * 0.55;
          ctx.drawImage(gs.canvas, dx + o.shadowOff[0] * scale, dy + o.shadowOff[1] * scale, gs.canvas.width * scale, gs.canvas.height * scale);
        }
        ctx.globalAlpha = alpha;
        ctx.drawImage(g.canvas, dx, dy, g.canvas.width * scale, g.canvas.height * scale);
        ctx.globalAlpha = 1;
        i += measure(ch, k) + letter;
      } else {
        i += measure(' ', k) + letter;
      }
    }
    ctx.restore();
  }

  /* 逐字绘制（用于逐字浮现、浮动、波浪） */
  function drawChars(ctx, str, x, y, o, fn) {
    o = o || {};
    const k = o.k || 2;
    const color = o.color || '#fff4dc';
    const outline = o.outline === undefined ? '#2a1626' : o.outline;
    const letter = o.letter || 0;
    const align = o.align || 'center';
    const scale = St.ART * (o.z === undefined ? 1 : o.z);
    const total = measure(str, k) + letter * Math.max(0, str.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const gx = Math.round(cx);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    let i = 0, idx = 0;
    for (const ch of str) {
      const adv = measure(ch, k) + letter;
      const mod = fn ? fn(idx, ch, i) : null;
      if (ch !== ' ' && (!mod || mod.alpha > 0)) {
        const g = glyph(ch, k, (mod && mod.color) || color, outline);
        const a = mod ? mod.alpha : 1;
        const ox = mod ? (mod.dx || 0) : 0;
        const oy = mod ? (mod.dy || 0) : 0;
        ctx.globalAlpha = a;
        ctx.drawImage(g.canvas,
          Math.round((gx + i + ox) * scale),
          Math.round((y + oy) * scale),
          g.canvas.width * scale, g.canvas.height * scale);
      }
      i += adv;
      idx++;
    }
    ctx.restore();
  }

  /* 装饰性小字（英文/罗马数字） */
  function small(ctx, str, x, y, o) {
    o = Object.assign({ k: 1, color: '#e8c9a0', outline: '#241423', letter: 0.5 }, o || {});
    draw(ctx, str, x, y, o);
  }

  window.Txt = {
    ready: () => fontReady,
    draw, drawChars, measure, wrap, small,
    BASE, PAD, GLYPH
  };
})();
