/* ============================================================
   util.js — 数学 / 颜色 / 随机 / 缓动
   像素动画 MV《温蒂公主的侍卫》专用工具层
   ============================================================ */
'use strict';

const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a));
const sat = (x) => clamp(x, 0, 1);

function smoothstep(e0, e1, x) {
  const t = sat((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInQuad = (t) => t * t;
const easeIn = (t) => t * t * t;
const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* 确定性伪随机：同一帧多次绘制结果一致 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
/* 一维平滑噪声（风、摇曳、火苗） */
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash1(i * 37.77 + seed * 11.3);
  const b = hash1((i + 1) * 37.77 + seed * 11.3);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi + seed, yi), b = hash2(xi + 1 + seed, yi);
  const c = hash2(xi + seed, yi + 1), d = hash2(xi + 1 + seed, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/* ---------------- 颜色 ---------------- */
const _rgbCache = new Map();
function hexToRgb(hex) {
  let v = _rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgbCache.set(hex, v);
  return v;
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
}
const _mixCache = new Map();
function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const key = a + b + (t * 64 | 0);
  let v = _mixCache.get(key);
  if (v) return v;
  const A = hexToRgb(a), B = hexToRgb(b);
  v = rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  if (_mixCache.size > 20000) _mixCache.clear();
  _mixCache.set(key, v);
  return v;
}
/* 变亮/变暗（保持色相） */
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  if (f >= 0) return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
}
function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function rampAt(ramp, t) {
  const n = ramp.length - 1;
  const x = clamp(t, 0, 1) * n;
  const i = Math.floor(x);
  return i >= n ? ramp[n] : mix(ramp[i], ramp[i + 1], x - i);
}

/* 数组关键帧插值：keys = [{t, v:number|[numbers]}] */
function keyAt(keys, t, ease = easeInOut) {
  if (!keys.length) return 0;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const k = ease(sat((t - a.t) / (b.t - a.t || 1)));
      if (Array.isArray(a.v)) return a.v.map((v, j) => lerp(v, b.v[j], k));
      return lerp(a.v, b.v, k);
    }
  }
  return keys[keys.length - 1].v;
}

/* 把数值格式化成 0:00 */
function fmtTime(t) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

/* 画布整数缩放 */
function fitCanvas(canvas, W, H) {
  const box = canvas.parentElement.getBoundingClientRect();
  const sx = box.width / W, sy = box.height / H;
  const s = Math.max(1, Math.floor(Math.min(sx, sy)));
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
  return s;
}
