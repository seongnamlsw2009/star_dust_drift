'use strict';
// 스테이지 3개 × 웨이브 5개 (기획서 5장)
// spawns: { type, n, gap(출현 간격), delay, path, atk[], x/xs/y/stay/sway }
// hazards: 화면 위에서 발사되는 환경 패턴(운석, 중력장, 공간 왜곡, 벽)
const A = (type, p) => Object.assign({ type }, p);

const STAGES = [
  { // 1. 오리온 성운 외곽 — 운석
    name: '오리온 성운 외곽', hue: 205, bg: ['#050b24', '#0b2150'], mid: 'meteora', target: 210,
    waves: [
      { dur: 28, spawns: [
        { type: 'small', n: 5, gap: 1.0, delay: 0, path: 'down', atk: [A('aimed', { count: 1, speed: 150, interval: 1.7, delay: 0.8 })] },
        { type: 'small', n: 5, gap: 1.0, delay: 7, path: 'down', atk: [A('aimed', { count: 1, speed: 150, interval: 1.7, delay: 0.8 })] }
      ] },
      { dur: 28, spawns: [
        { type: 'medium', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [140, 340], y: 115, stay: 13, atk: [A('ring', { count: 14, speed: 105, interval: 1.9, rot: 0.2 })] },
        { type: 'small', n: 4, gap: 1.2, delay: 5, path: 'sweepL', atk: [A('aimed', { count: 1, speed: 150, interval: 1.8 })] },
        { type: 'small', n: 4, gap: 1.2, delay: 6, path: 'sweepR', atk: [A('aimed', { count: 1, speed: 150, interval: 1.8 })] }
      ] },
      { dur: 28, hazards: [A('rain', { b: 'big', count: 1, speed: 140, interval: 0.6, jitter: 0.25, delay: 1 })], spawns: [
        { type: 'small', n: 3, gap: 1.4, delay: 1, path: 'sweepL', atk: [A('aimed', { count: 1, speed: 150, interval: 1.6 })] },
        { type: 'small', n: 3, gap: 1.4, delay: 3, path: 'sweepR', atk: [A('aimed', { count: 1, speed: 150, interval: 1.6 })] },
        { type: 'small', n: 4, gap: 1.2, delay: 12, path: 'down', atk: [A('aimed', { count: 1, speed: 150, interval: 1.6 })] }
      ] },
      { dur: 30, hazards: [A('wall', { b: 'normal', speed: 105, gap: 100, interval: 3.4, delay: 2 })], spawns: [
        { type: 'medium', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [A('aimed', { count: 3, spread: 40, speed: 140, interval: 1.7 })] }
      ] },
      { dur: 34, spawns: [
        { type: 'elite', n: 1, gap: 0, delay: 0, path: 'hover', xs: [240], y: 130, stay: 24, sway: 60, atk: [A('ring', { count: 18, speed: 105, interval: 2.2, rot: 0.15 }), A('spiral', { arms: 2, rot: 0.3, speed: 110, interval: 0.17, b: 'rice', delay: 2 })] },
        { type: 'small', n: 6, gap: 1.2, delay: 5, path: 'down', atk: [A('aimed', { count: 1, speed: 150, interval: 1.8 })] }
      ] }
    ]
  },
  { // 2. 침묵의 성단 — 중력장 (탄이 휘어짐)
    name: '침묵의 성단', hue: 285, bg: ['#12041f', '#3a0f4d'], mid: 'pulsar', target: 215,
    waves: [
      { dur: 28, spawns: [
        { type: 'small', n: 3, gap: 1.0, delay: 0, path: 'sweepL', atk: [A('aimed', { count: 3, spread: 30, speed: 170, interval: 1.8, b: 'rice' })] },
        { type: 'small', n: 3, gap: 1.0, delay: 1, path: 'sweepR', atk: [A('aimed', { count: 3, spread: 30, speed: 170, interval: 1.8, b: 'rice' })] },
        { type: 'small', n: 3, gap: 1.0, delay: 8, path: 'sweepL', atk: [A('aimed', { count: 3, spread: 30, speed: 170, interval: 1.8, b: 'rice' })] },
        { type: 'small', n: 3, gap: 1.0, delay: 9, path: 'sweepR', atk: [A('aimed', { count: 3, spread: 30, speed: 170, interval: 1.8, b: 'rice' })] }
      ] },
      { dur: 28, spawns: [
        { type: 'medium', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [130, 350], y: 115, stay: 13, atk: [A('spiral', { arms: 2, rot: 0.35, speed: 120, interval: 0.15, b: 'rice' })] },
        { type: 'small', n: 4, gap: 1.2, delay: 6, path: 'down', atk: [A('aimed', { count: 1, speed: 160, interval: 1.8 })] }
      ] },
      { dur: 30, hazards: [A('rain', { b: 'refract', count: 1, speed: 115, interval: 0.45, jitter: 0.4, curve: 0.9, delay: 1 })], spawns: [
        { type: 'small', n: 6, gap: 1.4, delay: 1, path: 'down', atk: [A('aimed', { count: 1, speed: 160, interval: 1.6 })] },
        { type: 'small', n: 4, gap: 1.4, delay: 10, path: 'sweepL', atk: [A('aimed', { count: 1, speed: 160, interval: 1.6 })] }
      ] },
      { dur: 30, spawns: [
        { type: 'medium', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [A('aimed', { count: 3, spread: 35, speed: 150, interval: 1.7, b: 'rice' }), A('homing', { count: 2, speed: 120, interval: 3.2, delay: 2.2 })] }
      ] },
      { dur: 34, spawns: [
        { type: 'elite', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 24, sway: 35, atk: [A('cross', { arms: 2, rot: 0.2, speed: 115, interval: 0.22, b2: 'rice' })] },
        { type: 'small', n: 4, gap: 1.4, delay: 6, path: 'sweepL', atk: [A('aimed', { count: 1, speed: 160, interval: 1.8 })] }
      ] }
    ]
  },
  { // 3. 공허의 심장, 사건의 지평선 — 공간 왜곡 (탄이 중간에 꺾임)
    name: '공허의 심장, 사건의 지평선', hue: 42, bg: ['#050505', '#241a05'], mid: 'eclipse', target: 220,
    waves: [
      { dur: 28, spawns: [
        { type: 'small', n: 4, gap: 0.9, delay: 0, path: 'sweepL', atk: [A('aimed', { count: 1, b: 'accel', speed: 70, maxv: 270, interval: 1.3 })] },
        { type: 'small', n: 4, gap: 0.9, delay: 1, path: 'sweepR', atk: [A('aimed', { count: 1, b: 'accel', speed: 70, maxv: 270, interval: 1.3 })] },
        { type: 'small', n: 4, gap: 0.9, delay: 9, path: 'sweepL', atk: [A('aimed', { count: 1, b: 'accel', speed: 70, maxv: 270, interval: 1.3 })] },
        { type: 'small', n: 4, gap: 0.9, delay: 10, path: 'sweepR', atk: [A('aimed', { count: 1, b: 'accel', speed: 70, maxv: 270, interval: 1.3 })] }
      ] },
      { dur: 30, spawns: [
        { type: 'medium', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [A('cross', { arms: 3, rot: 0.18, speed: 105, interval: 0.28 })] }
      ] },
      { dur: 30, hazards: [A('rain', { b: 'refract', count: 1, speed: 130, interval: 0.42, jitter: 0.5, turnAt: 0.9, turnD: 1.3, delay: 1 })], spawns: [
        { type: 'small', n: 6, gap: 1.3, delay: 1, path: 'sweepL', atk: [A('aimed', { count: 1, speed: 170, interval: 1.5 })] },
        { type: 'small', n: 4, gap: 1.3, delay: 9, path: 'sweepR', atk: [A('aimed', { count: 1, speed: 170, interval: 1.5 })] }
      ] },
      { dur: 32, hazards: [A('wall', { b: 'normal', speed: 115, gap: 100, interval: 3.6, delay: 2 })], spawns: [
        { type: 'medium', n: 4, gap: 0.5, delay: 0, path: 'hover', xs: [70, 190, 290, 410], y: 120, stay: 17, atk: [A('ring', { count: 14, speed: 105, interval: 2.3, rot: 0.2 })] }
      ] },
      { dur: 36, spawns: [
        { type: 'elite', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 26, sway: 35, atk: [A('ring', { count: 20, speed: 105, interval: 1.6, rot: 0.17 }), A('cross', { arms: 2, rot: 0.2, speed: 115, interval: 0.3, delay: 2 })] },
        { type: 'small', n: 4, gap: 1.4, delay: 6, path: 'down', atk: [A('aimed', { count: 1, speed: 170, interval: 1.6 })] }
      ] }
    ]
  }
];
