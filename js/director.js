/* ============================================================
   director.js — 分镜时间轴 / 镜头调度 / 歌词呈现
   时间轴依据 LRC 与音频能量分析对齐：
   0–34.7 前奏（渐入）、34.7 主歌一、52.1 预副歌、63.2 副歌一、
   86.9 主歌二、110.7 桥段、122.2 副歌二、139.5 副歌三、
   157.8 长间奏、191.8 尾声副歌、226.8 尾奏、244 黎明收束
   ============================================================ */
(function () {
  'use strict';

  /* 歌词：逐句时间取自 LRC；「亲爱的」等短句与下一句合并成一张字幕卡 */
  const LYRICS = [
    { t: 34.74, s: '亲爱的 我现在要对你 告白', tag: '告白' },
    { t: 41.45, s: '但或许不是 那么简单', tag: '' },
    { t: 45.73, s: '请亮着双眼 听我说', tag: '' },
    { t: 52.21, s: '亲爱的 或许我们 不会永远', tag: '永远' },
    { t: 58.44, s: '永远陪伴 在彼此身边', tag: '' },
    { t: 63.20, s: '意外和明天或谁 比我更耀眼', tag: '耀眼' },
    { t: 69.68, s: '但你 像蓝天般的你', tag: '蓝天' },
    { t: 76.01, s: '全存在我心底', tag: '' },
    { t: 80.66, s: '久而久之 变成唯一', tag: '' },
    { t: 86.92, s: '亲爱的 眼泪 别轻易地掉', tag: '泪' },
    { t: 93.79, s: '珍贵的 要守护好', tag: '' },
    { t: 97.98, s: '如果不小心 我突然 离你而去', tag: '离别' },
    { t: 104.45, s: '亲爱的 你会不会还记得', tag: '' },
    { t: 110.72, s: '曾有人为你唱歌', tag: '守候' },
    { t: 115.33, s: '一夜又一夜地唱', tag: '' },
    { t: 122.28, s: '但你 像蓝天般的你', tag: '花田' },
    { t: 128.62, s: '全存在我心底', tag: '' },
    { t: 132.96, s: '久而久之 变成唯一', tag: '' },
    { t: 139.61, s: '而你 圆圈夕阳的你', tag: '夕阳' },
    { t: 145.93, s: '全存在我心里', tag: '' },
    { t: 150.44, s: '眼睛看着晕黄散去', tag: '' },
    { t: 191.95, s: '但你 像蓝天般的你', tag: '回声' },
    { t: 198.17, s: '全存在我心底', tag: '' },
    { t: 202.83, s: '久而久之 变成唯一', tag: '' },
    { t: 209.39, s: '而你 圆圈夕阳的你', tag: '晕黄' },
    { t: 215.96, s: '全存在我心里', tag: '' },
    { t: 220.24, s: '眼睛看着晕黄散去', tag: '' },
    { t: 226.76, s: '亲爱的 你会不会还记得', tag: '夜歌' },
    { t: 233.14, s: '曾有人为你唱歌', tag: '' },
    { t: 237.34, s: '一夜又一夜地唱', tag: '' }
  ];

  /* 分镜表 */
  const SHOTS = [
    { t0: 0.00, t1: 9.60, fn: 'kingdomWide',
        focus: () => [[160, 104, 70, 46]], tag: '序 · 月下王国', trans: 'open', title: true },
    { t0: 9.60, t1: 16.60, fn: 'gardenApproach',
        focus: () => [[156, 116, 52, 42]], tag: '一 · 夜巡' },
    { t0: 16.60, t1: 26.00, fn: 'windowGaze',
        focus: () => [[160, 104, 48, 52]], tag: '二 · 塔上塔下', trans: 'dissolve' },
    { t0: 26.00, t1: 34.74, fn: 'moonlitGarden',
        focus: () => [[128, 120, 48, 42]], tag: '三 · 月光庭院', trans: 'dissolve' },
    { t0: 34.74, t1: 45.70, fn: 'gardenConfession',
        focus: () => [[156, 108, 46, 52]], tag: '四 · 告白' },
    { t0: 45.70, t1: 52.10, fn: 'closeEyes',
        focus: () => [[168, 96, 44, 46]], tag: '五 · 请看着我的眼睛', trans: 'dissolve' },
    { t0: 52.10, t1: 63.15, fn: 'ballroomOutside',
        focus: () => [[120, 116, 40, 42]], tag: '六 · 窗外' },
    { t0: 63.15, t1: 69.65, fn: 'ballroomFlare', tag: '七 · 耀眼', trans: 'dissolve' },
    { t0: 69.65, t1: 86.90, fn: 'skyMemory',
        focus: () => [[152, 112, 50, 40]], tag: '八 · 蓝天般的你', trans: 'flash' },
    { t0: 86.90, t1: 97.95, fn: 'tearScene',
        focus: () => [[161, 108, 40, 46]], tag: '九 · 眼泪', trans: 'dissolve' },
    { t0: 97.95, t1: 110.65, fn: 'farewell',
        focus: () => [[110, 116, 34, 40], [200, 120, 26, 30]], tag: '十 · 送别', trans: 'dissolve' },
    { t0: 110.65, t1: 122.20, fn: 'nightSong',
        focus: () => [[150, 118, 46, 44]], tag: '十一 · 夜歌' },
    { t0: 122.20, t1: 139.55, fn: 'flowerField',
        focus: () => [[138, 114, 46, 40]], tag: '十二 · 金色花田', trans: 'flash' },
    { t0: 139.55, t1: 157.80, fn: 'sunsetCircle',
        focus: () => [[157, 122, 40, 34]], tag: '十三 · 圆圈夕阳', trans: 'dissolve', sunY0: 96, sunY1: 110, sunR: 20, z0: 1.0, z1: 1.12, season: 'petal' },
    { t0: 157.80, t1: 191.80, fn: 'sunsetInterlude', tag: '间奏 · 四季轮转', trans: 'dissolve' },
    { t0: 191.80, t1: 209.30, fn: 'skyMemory', tag: '十四 · 记忆回声', trans: 'dissolve', echo: true },
    { t0: 209.30, t1: 226.70, fn: 'sunsetCircle', tag: '十五 · 晕黄散去', sunY0: 106, sunY1: 114, sunR: 22, z0: 1.1, z1: 1.0, season: 'fire' },
    { t0: 226.70, t1: 244.00, fn: 'nightSong', tag: '十六 · 一夜又一夜', trans: 'dissolve' },
    { t0: 244.00, t1: 258.00, fn: 'dawnRise',
        focus: () => [[158, 116, 34, 34]], tag: '终 · 黎明', trans: 'dissolve' }
  ];

  function shotAt(t) {
    for (let i = 0; i < SHOTS.length; i++) {
      if (t < SHOTS[i].t1) return { shot: SHOTS[i], index: i };
    }
    const i = SHOTS.length - 1;
    return { shot: SHOTS[i], index: i };
  }

  function activeLyric(t) {
    let cur = null;
    for (let i = 0; i < LYRICS.length; i++) {
      if (t >= LYRICS[i].t - 0.02) cur = { line: LYRICS[i], index: i, next: LYRICS[i + 1] || null };
    }
    return cur;
  }

  function lyricAlpha(t, line, next, idx) {
    const inA = smoothstep(line.t - 0.02, line.t + 0.5, t);
    let end;
    if (next) end = Math.min(next.t - 0.12, line.t + 6.4);
    else end = line.t + 7;
    const outA = 1 - smoothstep(end - 0.5, end, t);
    return sat(inA) * sat(outA);
  }

  /* 音乐能量：读取 tools/energy.json（20fps 包络），驱动镜头微推与光晕强度 */
  const EN = window.ENERGY || null;
  function energyAt(t, band) {
    if (!EN) return 0.5;
    const arr = EN[band || 'full'];
    if (!arr || !arr.length) return 0.5;
    const i = clamp(Math.floor(t * EN.fps), 0, arr.length - 1);
    return arr[i];
  }
  function beatPulse(t) {
    /* 以约 112 BPM 的八分音符做轻微脉冲（0..1） */
    const bpm = 112;
    const ph = (t * bpm / 60) % 1;
    return Math.pow(1 - ph, 2.4);
  }

  /* 章节小标签 */
  function drawChapterTag(ctx, txt, alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    const x = 306, y = 12;
    const w = Txt.measure(txt, 1);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = 'rgba(255,220,170,0.45)';
    ctx.fillRect(St.sx(x - 12), St.sy(y + 6), St.ss(6), Math.max(1, St.ss(0.4)));
    Txt.draw(ctx, txt, x, y, { k: 1, color: '#f0d3a8', outline: '#241423', align: 'right', alpha: alpha * 0.92 });
    ctx.restore();
  }

  /* 局部压暗：以角色为中心向外平滑压暗背景（舞台式聚焦）。
     渐变半径取得远大于聚焦范围，铺满整个画面 —— 不能在椭圆边界上硬切，
     否则人物周围会出现一圈明显更暗的“黑圈”。 */
  function focusDim(ctx, focus, strength) {
    if (!focus || !focus.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = strength === undefined ? 0.55 : strength;
    for (const f of focus) {
      const cx = St.sx(f[0]), cy = St.sy(f[1]);
      const rx = St.ss(f[2]), ry = St.ss(f[3] || f[2] * 1.35);
      const R = Math.max(rx, ry) * 2.6;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.34, 'rgba(255,255,255,1)');
      g.addColorStop(0.62, 'rgba(228,220,234,1)');
      g.addColorStop(1, 'rgba(192,182,204,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.restore();
  }

  /* ---------------- 主绘制 ---------------- */
  function drawFrame(ctx, t) {
    const { shot, index } = shotAt(t);
    const dur = shot.t1 - shot.t0;
    const local = clamp(t - shot.t0, 0, dur);
    const p = dur > 0 ? local / dur : 0;
    const s = { t, shot, index, local, dur, p };

    St.setDrift(t);
    /* 低频 → 镜头推近幅度；中频 → 粒子/光晕活跃度 */
    const low = energyAt(t, 'low');
    const mid = energyAt(t, 'mid');
    St.setEnergy(low, mid, beatPulse(t));
    St.glowReset();
    if (shot.fn === 'sunsetInterlude') drawInterlude(ctx, t, s);
    else {
      const fn = SCENES[shot.fn];
      if (fn) fn(t, s);
    }
    St.glowFlush(0.80 + energyAt(t, 'mid') * 0.18, 'screen');

    /* 调色：轻微 S 曲线 + 暖色分级，统一全片质感
       四季间奏按季节调整分级：冬冷、夏艳、秋暖、春柔 */
    if (shot.fn === 'sunsetInterlude') {
      const sea = interludeSeason(t, s);
      const g = {
        spring: [0.22, 0.20], summer: [0.40, 0.24], autumn: [0.34, 0.30], winter: [0.26, 0.05]
      }[sea] || [0.3, 0.2];
      St.grade(g[0], g[1]);
    } else {
      St.grade(shot.fn === 'skyMemory' ? 0.18 : 0.32, shot.fn === 'skyMemory' ? 0.1 : 0.2);
    }

    /* 环境色 */
    switch (shot.fn) {
      case 'skyMemory': St.overlay(shot.echo ? '#8fb4d8' : '#ffd9a0', shot.echo ? 0.08 : 0.05); break;
      case 'flowerField': St.overlay('#ffe0a0', 0.06); break;
      case 'sunsetCircle': St.overlay('#ff9a5a', 0.07); break;
      case 'dawnRise': St.overlay('#ffc890', 0.05); break;
      case 'sunsetInterlude': break;
      default: St.overlay('#1a1030', 0.05);
    }
    /* 舞台式聚焦：把人物周围压暗一档（只压背景，人物本身不受影响） */
    if (shot.focus) {
      const k = sat((t - shot.t0) / 1.2) * (1 - sat((t - (shot.t1 - 0.8)) / 0.8));
      if (k > 0.02) focusDim(ctx, shot.focus(t, s), 0.5 * k);
    }

    St.vignette(0.52);
    St.grain(t, 0.03);

    /* 转场 */
    let black = 0;
    const tr = shot.trans;
    if (tr === 'dissolve' && index > 0) {
      // 溶解：前 0.7 秒由上一镜残留的暗场过渡
      black = 1 - smoothstep(shot.t0, shot.t0 + 0.75, t);
      black *= 0.85;
    }
    if (tr === 'flash') {
      const f = 1 - smoothstep(shot.t0, shot.t0 + 0.55, t);
      if (f > 0) St.overlay('#fff2d8', f * 0.5);
    }
    if (index === 0) black = Math.max(black, 1 - smoothstep(0.05, 2.4, t));
    if (shot.fn === 'prologue') black = Math.max(black, smoothstep(shot.t1 - 1.4, shot.t1, t));
    if (shot.fn === 'dawnRise') black = Math.max(black, 1 - smoothstep(shot.t0, shot.t0 + 1.2, t));
    const endFade = smoothstep(254.4, 257.6, t);
    if (endFade > 0) black = Math.max(black, endFade);
    if (black > 0) St.overlay('#0b0712', black);

    /* 标题卡 */
    if (shot.title) {
      const a = Math.min(smoothstep(1.8, 3.8, t), 1 - smoothstep(8.0, 9.5, t));
      if (a > 0.01) drawTitle(ctx, t, a);
    }

    /* 歌词 */
    drawLyrics(ctx, t);

    /* 章节标签 */
    const tagA = sat(smoothstep(shot.t0 + 1.0, shot.t0 + 2.2, t)) * (1 - smoothstep(shot.t1 - 1.2, shot.t1 - 0.15, t));
    if (!shot.title) drawChapterTag(ctx, shot.tag, tagA * 0.6);

    /* 结束卡 */
    if (t > 250.0) drawEndCard(ctx, t);
  }

  /* 间奏音乐的节拍网格：110 BPM、4/4，一小节 2.1818s
     首个小节线在间奏内 1.10s 处（由 onset 自相关拟合得出）。
     四季全部从「小节线」开始，各占 4 小节，最后一季占剩余的 3 小节多，
     因此四季时长均匀（8.7 / 8.7 / 8.7 / 6.7s），不会出现某季一闪而过。 */
  const INTER_BPM = 110;
  const INTER_BAR = 60 / INTER_BPM * 4;      // 2.1818s
  const INTER_B0 = 1.10;                     // 首小节线（间奏内相对时间）
  function interBar(n) { return INTER_B0 + n * INTER_BAR; }
  const INTER_SEGS = [
    { t0: interBar(0), t1: interBar(4), season: 'spring' },   // 1.10  -> 9.83
    { t0: interBar(4), t1: interBar(8), season: 'summer' },   // 9.83  -> 18.55
    { t0: interBar(8), t1: interBar(12), season: 'autumn' },  // 18.55 -> 27.28
    { t0: interBar(12), t1: 99, season: 'winter' }            // 27.28 -> 结束
  ];

  /* 当前间奏所处季节（供调色使用） */
  function interludeSeason(t, s) {
    const l = s.local;
    if (l < INTER_SEGS[1].t0) return 'spring';
    if (l < INTER_SEGS[2].t0) return 'summer';
    if (l < INTER_SEGS[3].t0) return 'autumn';
    return 'winter';
  }

  /* 长间奏：四季轮转
     同一处山坡、同一构图、同一对人物 —— 只改变季节与天气。
     · 季节边界全部落在 110BPM 的小节线上
     · 每季开头 0.9s 交叉溶解；文字与画面同步进出（不滞后）
     · 每小节一次轻微的光/风脉冲，画面跟着拍子呼吸 */
  function drawInterlude(ctx, t, s) {
    const l = s.local;
    const D = s.dur;

    let idx = 0;
    for (let k = 0; k < INTER_SEGS.length; k++) if (l >= INTER_SEGS[k].t0) idx = k;
    const seg = INTER_SEGS[idx];
    const segT1 = idx === INTER_SEGS.length - 1 ? D : seg.t1;
    const sp = sat((l - seg.t0) / (segT1 - seg.t0));

    /* ---- 交叉溶解：从小节线开始，0.9 秒完成 ---- */
    const XF = 0.9;
    let blend = 1;
    let prevSeason = null;
    if (idx > 0 && l - seg.t0 < XF) {
      blend = easeInOut(sat((l - seg.t0) / XF));
      prevSeason = INTER_SEGS[idx - 1].season;
    }

    /* ---- 拍点脉冲 ---- */
    const sinceBar = ((l - INTER_B0) % INTER_BAR + INTER_BAR) % INTER_BAR;
    const barPulse = Math.exp(-Math.pow(sinceBar / 0.22, 2));
    /* ---- 换季天气爆发：在新季小节线上起爆 ---- */
    const sinceSeg = Math.max(0, l - seg.t0);
    const burst = 0.55 * Math.exp(-Math.pow((sinceSeg - 0.3) / 0.85, 2)) + 0.10 * barPulse;

    if (prevSeason && blend < 0.999) {
      SCENES.seasonScene(t, { p: sp, local: l, dur: D }, {
        season: prevSeason, burst: burst * 0.55, washK: 0, pulse: barPulse * 0.4, progress: sat(l / D)
      });
      St.bufferPush();
      SCENES.seasonScene(t, { p: sp, local: l, dur: D }, {
        season: seg.season, burst: burst, washK: 0, pulse: barPulse, progress: sat(l / D)
      });
      St.bufferBlend(blend);
    } else {
      SCENES.seasonScene(t, { p: sp, local: l, dur: D }, {
        season: seg.season, burst: burst, washK: 0, pulse: barPulse, progress: sat(l / D)
      });
    }

    /* 间奏开头：从夕阳画面淡入（前 1.1s，正好到第一小节线） */
    const enterK = 1 - easeOut(sat(l / (INTER_B0 + 0.05)));
    if (enterK > 0.001) St.overlay('#3a2030', enterK * 0.88);

    /* ---- 季节文字：与画面同步 ----
       进入：溶解进行到一半时开始浮现，溶解结束时完全出现
       离开：下一季溶解开始前收干净
       最后一季：在间奏结束前 0.9s 收掉 */
    const labelIn = sat((l - seg.t0 - 0.2) / 0.55);
    const labelOut = idx === INTER_SEGS.length - 1
      ? 1 - sat((l - (D - 0.9)) / 0.55)
      : 1 - sat((l - (segT1 - 0.55)) / 0.35);
    const labelA = labelIn * labelOut;
    if (labelA > 0.02) {
      const words = {
        spring: ['春', '樱 花 与 新 绿'],
        summer: ['夏', '蝉 声 与 烈 日'],
        autumn: ['秋', '落 叶 与 归 雁'],
        winter: ['冬', '初 雪 与 围 巾']
      }[seg.season];
      const pop = 1 + barPulse * 0.03;
      /* 文字底衬：一层极淡的暖暗雾，保证亮天空里也看得清，又不显脏 */
      ctx.save();
      const gy0 = St.sy(0), gy1 = St.sy(64);
      const gg = ctx.createLinearGradient(0, gy0, 0, gy1);
      const ba = labelA * 0.30;
      gg.addColorStop(0, 'rgba(38,20,34,0)');
      gg.addColorStop(0.38, `rgba(38,20,34,${ba})`);
      gg.addColorStop(0.66, `rgba(38,20,34,${ba * 0.85})`);
      gg.addColorStop(1, 'rgba(38,20,34,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, gy0, ctx.canvas.width, gy1 - gy0);
      ctx.restore();
      /* 金线：大字与小字之间的分隔，避免两行文字挤在一起 */
      const lineW = 24 + labelA * 16;
      ctx.save();
      ctx.globalAlpha = labelA * 0.55;
      ctx.fillStyle = '#ffe3b0';
      ctx.fillRect(St.sx(160 - lineW / 2), St.sy(39.5), St.ss(lineW), Math.max(1, St.ss(0.45)));
      ctx.restore();
      /* 大字：y=4 起（墨迹 8~32），与小字完全分开 */
      Txt.draw(ctx, words[0], 160, 4, {
        k: 2, color: '#fffaf0', outline: '#2a1730', alpha: labelA * 0.95, letter: 4, z: pop
      });
      /* 小字：y=44 起（墨迹 46~58） */
      Txt.draw(ctx, words[1], 160, 44, {
        k: 1, color: '#ffeccc', outline: '#2a1730', alpha: labelA * 0.85, letter: 2
      });
    }
  }

  /* 调试：返回间奏在某一时刻的内部状态 */
  function interludeInfo(t) {
    const shot = SHOTS.find(s => s.fn === 'sunsetInterlude');
    if (!shot) return null;
    const l = t - shot.t0;
    const D = shot.t1 - shot.t0;
    let idx = 0;
    for (let k = 0; k < INTER_SEGS.length; k++) if (l >= INTER_SEGS[k].t0) idx = k;
    const seg = INTER_SEGS[idx];
    const segT1 = idx === INTER_SEGS.length - 1 ? D : seg.t1;
    const XF = 0.9;
    const blend = idx > 0 && l - seg.t0 < XF ? easeInOut(sat((l - seg.t0) / XF)) : 1;
    const labelIn = sat((l - seg.t0 - 0.2) / 0.55);
    const labelOut = idx === INTER_SEGS.length - 1
      ? 1 - sat((l - (D - 0.9)) / 0.55)
      : 1 - sat((l - (segT1 - 0.55)) / 0.35);
    const sinceBar = ((l - INTER_B0) % INTER_BAR + INTER_BAR) % INTER_BAR;
    return {
      local: +l.toFixed(2), season: seg.season, segT0: +seg.t0.toFixed(2),
      segT1: +segT1.toFixed(2), blend: +blend.toFixed(3),
      labelA: +(labelIn * labelOut).toFixed(3),
      barPulse: +Math.exp(-Math.pow(sinceBar / 0.22, 2)).toFixed(3)
    };
  }

  function drawTitle(ctx, t, a) {
    const y = 50;
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, St.sy(26), 0, St.sy(112));
    g.addColorStop(0, 'rgba(28,14,28,0)');
    g.addColorStop(0.48, 'rgba(28,14,28,0.34)');
    g.addColorStop(1, 'rgba(28,14,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, St.sy(26), ctx.canvas.width, St.ss(88));
    Txt.draw(ctx, '温蒂公主的侍卫', 160, y, {
      k: 2, color: '#ffeecb', outline: '#3a1e2a', letter: 1,
      shadow: '#8a4a2a', shadowOff: [1, 1]
    });
    Txt.draw(ctx, 'THE PRINCESS\'S GUARD', 160, y + 31, { k: 1, color: '#eec98e', outline: '#2a1626', alpha: 0.9, letter: 2 });
    ctx.fillStyle = 'rgba(238,201,142,0.5)';
    ctx.fillRect(St.sx(106), St.sy(y + 27), St.ss(108), Math.max(1, St.ss(0.4)));
    ctx.restore();
  }

  /* 歌词：底部居中，逐字浮现 + 轻微浮动；自动降级字号避免出屏 */
  function drawLyrics(ctx, t) {
    const cur = activeLyric(t);
    if (!cur) return;
    const { line, next } = cur;
    const a = lyricAlpha(t, line, next);
    if (a <= 0.01) return;

    const str = line.s;
    /* 统一点阵字号 1x（12px 原生像素 → 4x 放大即 48 设备像素高），
       最长 15 字 = 180 设计像素，左右各留 70px 安全边 */
    const k = 1;
    const baseY = 146;
    const age = t - line.t;

    /* 底衬暗带 */
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    const topY = baseY - (k === 2 ? 18 : 12);
    const g = ctx.createLinearGradient(0, St.sy(topY), 0, St.sy(178));
    g.addColorStop(0, 'rgba(18,9,20,0)');
    g.addColorStop(0.32, 'rgba(18,9,20,0.58)');
    g.addColorStop(1, 'rgba(18,9,20,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, St.sy(topY), ctx.canvas.width, St.ss(178 - topY));
    ctx.restore();

    const revealDur = clamp(str.length * 0.045, 0.4, 0.95);
    Txt.drawChars(ctx, str, 160, baseY, {
      k, color: '#fff4da', outline: '#2f1626', align: 'center', letter: k === 2 ? 1 : 1
    }, (i) => {
      const d = i / Math.max(1, str.length);
      const ra = sat((age - d * revealDur * 0.7) / 0.35);
      const bob = Math.sin(t * 1.5 - i * 0.3) * 0.5 * (1 - ra * 0.5);
      return { alpha: a * ra, dy: (1 - ra) * 2.5 + bob, color: ra > 0.99 ? '#fff4da' : '#ffe2b4' };
    });

    /* 装饰短线 */
    ctx.save();
    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = '#eec98e';
    const halfW = Txt.measure(str, k) / 2;
    ctx.fillRect(St.sx(160 - halfW - 11), St.sy(baseY + 1.5), St.ss(5), Math.max(1, St.ss(0.4)));
    ctx.fillRect(St.sx(160 + halfW + 6), St.sy(baseY + 1.5), St.ss(5), Math.max(1, St.ss(0.4)));
    ctx.restore();
  }

  function drawEndCard(ctx, t) {
    const a = smoothstep(251.2, 253.6, t);
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = '#0a0610';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    const fadeOut = 1;
    Txt.draw(ctx, '温蒂公主的侍卫', 160, 58, { k: 2, color: '#ffeecb', outline: '#3a1e2a', alpha: a * fadeOut, letter: 1 });
    Txt.draw(ctx, '告五人', 160, 86, { k: 1, color: '#eec98e', outline: '#2a1626', alpha: a * 0.95, letter: 3 });
    Txt.draw(ctx, '词 / 曲 · 潘云安', 160, 104, { k: 1, color: '#c9a98e', outline: '#2a1626', alpha: a * 0.8, letter: 0.5 });
    Txt.draw(ctx, '像素动画歌词 MV', 160, 118, { k: 1, color: '#a98a7c', outline: '#2a1626', alpha: a * 0.7, letter: 1 });
    Txt.draw(ctx, '灵感取自《彼得潘》', 160, 136, { k: 1, color: '#8f7168', outline: '#2a1626', alpha: a * 0.55 });
  }

  window.Director = {
    SHOTS, LYRICS, shotAt, activeLyric, drawFrame, drawLyrics,
    interludeInfo, INTER_BAR, INTER_B0, INTER_SEGS
  };
})();
