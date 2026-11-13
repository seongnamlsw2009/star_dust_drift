'use strict';
// 챕터 2 — 스테이지 3개 × 웨이브 5개. 새 적(드론·창기병·파수병)과 새 패턴(꽃잎·뱀 파동·커튼·대각선·정지 후 재조준·분열탄)을 쓴다.
// 이동 경로: zigzag(좌우로 크게 흔들림) / dive(멈춰 사격 후 돌진) / orbit(타원 궤도 공전)
const SG = (at, hold) => ({ at, hold }); // stopGo
const STAGES2 = [
  { // 1. 코키토스 — 얼어붙은 외행성대
    name: '코키토스 빙원', hue: 190, bg: ['#03111d', '#0c4a63'], mid: 'titan', target: 225,
    warn: '얼음 위성이 천천히 몸을 일으킨다',
    waves: [
      { dur: 28, spawns: [
        { type: 'drone', n: 6, gap: 1.0, delay: 0, path: 'zigzag', amp: 100, atk: [A('aimed', { count: 1, speed: 140, interval: 1.5, delay: 0.8, b: 'rice' })] },
        { type: 'drone', n: 6, gap: 1.0, delay: 8, path: 'zigzag', amp: 110, atk: [A('aimed', { count: 1, speed: 140, interval: 1.5, delay: 0.8, b: 'rice' })] },
        { type: 'drone', n: 3, gap: 0.5, delay: 17, path: 'dive', xs: [120, 240, 360], y: 90, stay: 1.6, atk: [A('aimed', { count: 3, spread: 30, speed: 150, interval: 0.9, delay: 0.3 })] }
      ] },
      { dur: 28, spawns: [
        { type: 'lancer', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [140, 340], y: 115, stay: 13, atk: [A('flower', { count: 24, petals: 4, speed: 115, interval: 2.4, rot: 0.4 })] },
        { type: 'drone', n: 6, gap: 0.7, delay: 4, path: 'orbit', cx: 240, cy: 175, R: 150, w: 0.7, stay: 10, atk: [A('aimed', { count: 1, speed: 150, interval: 1.8 })] }
      ] },
      { dur: 30, hazards: [A('curtain', { b: 'normal', speed: 85, spacing: 70, interval: 1.7, delay: 1 })], spawns: [
        { type: 'drone', n: 5, gap: 1.2, delay: 1, path: 'zigzag', amp: 90, atk: [A('aimed', { count: 1, speed: 140, interval: 1.7 })] },
        { type: 'drone', n: 3, gap: 0.5, delay: 10, path: 'dive', xs: [100, 240, 380], y: 100, stay: 1.5, atk: [A('aimed', { count: 3, spread: 30, speed: 150, interval: 0.9, delay: 0.3 })] },
        { type: 'drone', n: 5, gap: 1.0, delay: 17, path: 'zigzag', amp: 110, atk: [A('aimed', { count: 1, speed: 140, interval: 1.7 })] }
      ] },
      { dur: 30, spawns: [
        { type: 'lancer', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [
          A('ring', { count: 10, speed: 100, interval: 2.8, b: 'rice', stopGo: SG(0.8, 1.0) }),
          A('aimed', { count: 3, spread: 35, speed: 140, interval: 1.8, delay: 1.5 })] }
      ] },
      { dur: 34, spawns: [
        { type: 'sentinel', n: 1, gap: 0, delay: 0, path: 'hover', xs: [240], y: 130, stay: 24, sway: 60, atk: [
          A('flower', { count: 30, petals: 5, speed: 110, interval: 2.0, rot: 0.35 }),
          A('wave', { speed: 140, interval: 0.12, amp: 0.7, freq: 0.3, b: 'rice', delay: 2 })] },
        { type: 'drone', n: 6, gap: 0.7, delay: 5, path: 'orbit', cx: 240, cy: 190, R: 160, w: -0.7, stay: 14, atk: [A('aimed', { count: 1, speed: 150, interval: 2.0 })] }
      ] }
    ]
  },
  { // 2. 카스토르와 폴룩스 — 불타는 쌍성계
    name: '쌍성계 카스토르', hue: 18, bg: ['#1d0904', '#6b2208'], mid: 'gemini', target: 230,
    warn: '두 개의 태양이 서로를 부른다',
    waves: [
      { dur: 28, spawns: [
        { type: 'drone', n: 5, gap: 1.0, delay: 0, path: 'zigzag', amp: 110, atk: [A('aimed', { count: 2, spread: 25, speed: 150, interval: 1.6, b: 'rice' })] },
        { type: 'drone', n: 5, gap: 1.0, delay: 6, path: 'zigzag', amp: 110, atk: [A('aimed', { count: 2, spread: 25, speed: 150, interval: 1.6, b: 'rice' })] },
        { type: 'lancer', n: 1, gap: 0, delay: 9, path: 'hover', xs: [240], y: 110, stay: 14, atk: [A('aimed', { count: 1, b: 'big', speed: 110, interval: 2.6, delay: 0.5, split: { at: 0.9, n: 8, speed: 120 } })] }
      ] },
      { dur: 28, hazards: [A('diag', { b: 'normal', speed: 100, spacing: 80, tilt: 0.5, interval: 2.2, delay: 1 })], spawns: [
        { type: 'drone', n: 6, gap: 0.6, delay: 0, path: 'orbit', cx: 240, cy: 165, R: 160, w: 0.8, stay: 9, atk: [A('aimed', { count: 1, speed: 150, interval: 1.7 })] },
        { type: 'lancer', n: 2, gap: 0.6, delay: 10, path: 'hover', xs: [130, 350], y: 115, stay: 13, atk: [A('wave', { arms: 2, gapA: 0.7, amp: 0.7, freq: 0.4, speed: 130, interval: 0.14, b: 'rice' })] }
      ] },
      { dur: 30, spawns: [
        { type: 'lancer', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [
          A('ring', { count: 12, speed: 100, interval: 2.6, b: 'rice', stopGo: SG(0.8, 1.0) }),
          A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.0, delay: 1.5, split: { at: 1.0, n: 8, speed: 110 } })] },
        { type: 'drone', n: 3, gap: 0.5, delay: 9, path: 'dive', xs: [100, 240, 380], y: 100, stay: 1.5, atk: [A('aimed', { count: 3, spread: 30, speed: 160, interval: 0.8, delay: 0.3 })] },
        { type: 'drone', n: 3, gap: 0.5, delay: 16, path: 'dive', xs: [160, 320, 420], y: 90, stay: 1.5, atk: [A('aimed', { count: 3, spread: 30, speed: 160, interval: 0.8, delay: 0.3 })] }
      ] },
      { dur: 30, hazards: [A('curtain', { b: 'rice', speed: 95, spacing: 60, interval: 1.5, delay: 2 })], spawns: [
        { type: 'lancer', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [130, 350], y: 115, stay: 14, atk: [A('flower', { count: 28, petals: 6, speed: 115, interval: 2.2, rot: 0.25 })] },
        { type: 'drone', n: 6, gap: 1.0, delay: 6, path: 'zigzag', amp: 100, atk: [A('aimed', { count: 1, speed: 150, interval: 1.6 })] }
      ] },
      { dur: 34, spawns: [
        { type: 'sentinel', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 24, sway: 35, atk: [
          A('ring', { count: 14, speed: 105, interval: 1.9, b: 'rice', stopGo: SG(0.9, 0.9) }),
          A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.0, delay: 2, split: { at: 1.0, n: 10, speed: 115 } })] },
        { type: 'drone', n: 5, gap: 0.8, delay: 6, path: 'orbit', cx: 240, cy: 200, R: 170, w: 0.75, stay: 15, atk: [A('aimed', { count: 1, speed: 155, interval: 2.0 })] }
      ] }
    ]
  },
  { // 3. 붉은 거성의 무덤 — 초신성 잔해
    name: '초신성 잔해 · 레퀴엠', hue: 335, bg: ['#12030f', '#4a0b33'], mid: 'antares', target: 235,
    warn: '붉은 거성이 마지막 숨을 들이켠다',
    waves: [
      { dur: 28, spawns: [
        { type: 'drone', n: 5, gap: 0.5, delay: 0, path: 'dive', xs: [60, 150, 240, 330, 420], y: 95, stay: 1.8, atk: [A('wave', { aim: true, amp: 0.5, freq: 0.6, speed: 150, interval: 0.22, b: 'rice' })] },
        { type: 'drone', n: 6, gap: 0.9, delay: 7, path: 'zigzag', amp: 110, atk: [A('aimed', { count: 2, spread: 25, speed: 155, interval: 1.5, b: 'rice' })] },
        { type: 'drone', n: 5, gap: 0.5, delay: 16, path: 'dive', xs: [90, 180, 270, 360, 440], y: 95, stay: 1.8, atk: [A('wave', { aim: true, amp: 0.5, freq: 0.6, speed: 150, interval: 0.22, b: 'rice' })] }
      ] },
      { dur: 30, spawns: [
        { type: 'lancer', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [
          A('flower', { count: 26, petals: 5, speed: 112, interval: 2.4, rot: 0.3 }),
          A('ring', { count: 10, speed: 100, interval: 3.0, b: 'rice', delay: 1.5, stopGo: SG(0.8, 1.0) })] },
        { type: 'drone', n: 6, gap: 0.7, delay: 9, path: 'orbit', cx: 240, cy: 180, R: 165, w: -0.8, stay: 11, atk: [A('aimed', { count: 1, speed: 155, interval: 1.7 })] }
      ] },
      { dur: 30, hazards: [
        A('rain', { b: 'refract', count: 1, speed: 130, interval: 0.45, jitter: 0.5, turnAt: 0.9, turnD: 1.3, delay: 1 }),
        A('diag', { b: 'normal', speed: 100, spacing: 90, tilt: 0.5, interval: 3.0, delay: 3 })], spawns: [
        { type: 'drone', n: 6, gap: 0.6, delay: 1, path: 'orbit', cx: 240, cy: 175, R: 160, w: 0.8, stay: 12, atk: [A('aimed', { count: 1, speed: 155, interval: 1.6 })] },
        { type: 'drone', n: 4, gap: 0.5, delay: 14, path: 'dive', xs: [100, 200, 300, 400], y: 95, stay: 1.5, atk: [A('aimed', { count: 3, spread: 30, speed: 160, interval: 0.8, delay: 0.3 })] }
      ] },
      { dur: 32, hazards: [A('curtain', { b: 'rice', speed: 95, spacing: 62, interval: 1.6, delay: 2 })], spawns: [
        { type: 'lancer', n: 4, gap: 0.5, delay: 0, path: 'hover', xs: [70, 190, 290, 410], y: 120, stay: 17, atk: [
          A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.0, delay: 1.2, split: { at: 1.0, n: 8, speed: 110 } }),
          A('ring', { count: 10, speed: 100, interval: 3.2, b: 'rice', delay: 2, stopGo: SG(0.8, 1.0) })] }
      ] },
      { dur: 36, spawns: [
        { type: 'sentinel', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 26, sway: 35, atk: [
          A('flower', { count: 30, petals: 6, speed: 110, interval: 2.1, rot: 0.3 }),
          A('wave', { aim: true, amp: 0.6, freq: 0.35, speed: 140, interval: 0.2, b: 'rice', delay: 2 }),
          A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.4, delay: 2.5, split: { at: 1.0, n: 10, speed: 115 } })] },
        { type: 'drone', n: 6, gap: 0.8, delay: 7, path: 'orbit', cx: 240, cy: 190, R: 170, w: 0.8, stay: 17, atk: [A('aimed', { count: 1, speed: 160, interval: 2.0 })] }
      ] }
    ]
  }
];
