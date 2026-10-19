/* ============================================================
   palette.js — 统一世界观色板
   底色：暖奶油 / 玫瑰金 / 暮紫 / 湖蓝
   所有场景、角色、道具共用，保证色调连贯
   原则：夜戏也保持可读的中间调，暖光负责提亮，冷影负责退后
   ============================================================ */
'use strict';

const PAL = {
  /* 夜空（月光下的暖紫，非纯黑） */
  nightSky: ['#2b2a58', '#342f61', '#3f3769', '#4c3e73', '#5b477d', '#6c5187', '#7d5b8d', '#8f6690'],
  nightDeep: '#1d1a3a',
  star: ['#fff8e2', '#ffe9b8', '#d6ddff', '#a9c0f0'],
  moon: ['#fffaea', '#fbeec9', '#ecd49f', '#cfa976'],
  moonHalo: '#ffecc4',

  /* 黎明 / 黄昏 */
  dawnSky: ['#3b2c58', '#553560', '#7a4064', '#a3556a', '#c97268', '#e29570', '#f2bd8c', '#fbe0b4'],
  duskSky: ['#452a52', '#63345a', '#8f4460', '#b95d61', '#dc8063', '#f0a877', '#f9d0a0'],
  sunsetSky: ['#54305a', '#7c3a5e', '#a8484f', '#d0664a', '#e8904e', '#f5b465', '#fbd892', '#fdeccb'],
  sunsetSun: ['#fff8da', '#ffe3a2', '#ffc178', '#f59a55', '#dd6f45'],

  /* 晴空 */
  daySky: ['#5b9ecb', '#74b3d9', '#8ec6e4', '#aad8ec', '#c6e8f2', '#e2f5f7'],
  cloud: ['#ffffff', '#f7fafd', '#e2ecf6', '#c6dae9', '#a9c6da'],
  cloudWarm: ['#fff6e8', '#ffe7cb', '#fbcfa8', '#e8ab80'],

  /* 王国石造建筑 */
  stoneDark: ['#2e2438', '#3f3146', '#503e52', '#634d5f', '#78606c', '#90777c', '#a88f8c'],
  stoneWarm: ['#63463f', '#7b584e', '#946c5e', '#ad846f', '#c69d83', '#dcb99b', '#efd3b3'],
  wallNight: ['#302540', '#3f304e', '#4f3c5c', '#604a68', '#735a75', '#8a6d84'],
  roofNight: ['#281d38', '#352647', '#443155', '#553c62'],
  roofDusk: ['#46293f', '#5c344b', '#734253', '#8d525c'],

  /* 庭院 */
  grassNight: ['#22303a', '#2c3f46', '#394f4c', '#486154', '#5a785c'],
  grassDusk: ['#4a4636', '#5d573b', '#736a42', '#8c7f4c', '#a3975a'],
  grassDay: ['#55834e', '#669657', '#7bab61', '#96c370', '#b5d889'],
  ivy: ['#2f4a3c', '#3d5e4e', '#4c765d', '#62906e', '#84ac82'],
  rose: ['#b85460', '#d46c6f', '#ec9286', '#fcc0aa'],
  blossom: ['#eda9b2', '#f7c5c6', '#ffddd4', '#fff2e8'],

  /* 暖光 */
  lantern: ['#fff3d2', '#ffdda2', '#f9be74', '#dd9852', '#b06a40'],
  glow: ['#fff0ca', '#ffd79a', '#f7b568'],
  windowLight: ['#ffe6b6', '#f9c882', '#e09b5c'],

  /* 水面 */
  waterNight: ['#243050', '#2f3f60', '#3c5276', '#4e6a90', '#6685a8'],
  waterDay: ['#6fa8c8', '#8fc3da', '#acdbe8', '#cdeef2'],

  /* 角色 —— 温蒂公主 */
  wendy: {
    hair: '#f9e8bf', hairMid: '#eccd8e', hairDark: '#c9a066', hairShine: '#fffbe8',
    skin: '#ffe7cf', skinMid: '#f3cbaa', skinDark: '#d6a482',
    dress: '#b3d5ec', dressMid: '#8ab4d8', dressDark: '#5f89b3', dressDeep: '#44688f',
    trim: '#fff8e8', trimMid: '#ecdcc0',
    crown: '#f8d98f', crownDark: '#cf9f4e',
    blush: '#f4ad9f', mouth: '#bd6268',
    shoe: '#6f4e56'
  },

  /* 角色 —— 侍卫 */
  guard: {
    hair: '#58402f', hairMid: '#6d5038', hairDark: '#3d2a20',
    skin: '#fcdcbf', skinMid: '#eac29c', skinDark: '#cb9a77',
    coat: '#4a6180', coatMid: '#3a4d68', coatDark: '#2b3a50', coatDeep: '#1e2938',
    trim: '#eec684', trimDark: '#c3934f',
    cape: '#7b526c', capeMid: '#613e58', capeDark: '#482d44',
    pants: '#333d52', boot: '#3d2b30', bootMid: '#573a3f',
    cap: '#394c66', capDark: '#26344a', feather: '#f8ead0', featherMid: '#dcc6a4',
    belt: '#9a6844', buckle: '#f4cf8c',
    mouth: '#ad6260', blush: '#ec9f89'
  },

  silhouette: '#221a30',
  silhouetteWarm: '#46293a'
};

/* 天空渐变条带（有序抖动） */
const SKY_RAMPS = {
  night: PAL.nightSky,
  dawn: PAL.dawnSky,
  dusk: PAL.duskSky,
  sunset: PAL.sunsetSky,
  day: PAL.daySky
};
