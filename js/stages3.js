'use strict';
// 챕터 3 — 성좌의 회랑. 스테이지 3개 × 웨이브 5개.
// 새 적: 도깨비불(wisp)·감시자(warden)·보루(bastion), 새 패턴: 다각형(polygon)·소용돌이(swirl)·창(lance)·교차 사격(crossfire), 새 이동: 진자(pendulum)
const LANCE = (n, i, sp, d) => A('lance', { count: n, speed: sp || 150, gap: 14, interval: i, delay: d || 0, b: 'rice' });
const POLY = (sides, count, sp, i, rot, d, b) => A('polygon', { sides, count, speed: sp, interval: i, rot: rot != null ? rot : 0.3, delay: d || 0, b: b || 'normal' });
const SWIRL = (count, curve, sp, i, d, b) => A('swirl', { count, curve, speed: sp, interval: i, delay: d || 0, b: b || 'rice' });
const AIM = (c, sp, i, spread, d) => A('aimed', { count: c, spread: spread || 30, speed: sp, interval: i, delay: d || 0 });
const XF = (n, sp, i, d, sp2) => A('crossfire', { count: n, speed: sp, spacing: sp2 || 44, interval: i, delay: d || 0, b: 'normal' });

const STAGES3 = [
  { // 1. 프록시마 시계 정거장 — 멈춘 톱니바퀴의 도시
    name: '프록시마 시계 정거장', hue: 265, bg: ['#0a0620', '#2d1a6b'], mid: 'perseus', target: 240,
    warn: '멈춘 시계탑에서 종이 울리기 시작한다',
    waves: [
      { dur: 28, spawns: [
        { type: 'wisp', n: 6, gap: 0.9, delay: 0, path: 'pendulum', cx: 140, y: 50, R: 100, w: 1.2, stay: 9, atk: [LANCE(3, 2.0, 150, 0.8)] },
        { type: 'wisp', n: 6, gap: 0.9, delay: 9, path: 'pendulum', cx: 340, y: 50, R: 100, w: -1.2, stay: 9, atk: [LANCE(3, 2.0, 150, 0.8)] },
        { type: 'wisp', n: 4, gap: 1.0, delay: 18, path: 'zigzag', amp: 100, atk: [AIM(1, 150, 1.6, 30, 0.6)] }
      ] },
      { dur: 28, spawns: [
        { type: 'warden', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [140, 340], y: 115, stay: 13, atk: [POLY(4, 32, 105, 2.4, 0.3)] },
        { type: 'wisp', n: 6, gap: 0.7, delay: 5, path: 'orbit', cx: 240, cy: 170, R: 150, w: 0.7, stay: 10, atk: [LANCE(3, 2.2, 155)] }
      ] },
      { dur: 30, hazards: [XF(2, 150, 2.6, 2)], spawns: [
        { type: 'wisp', n: 5, gap: 1.1, delay: 1, path: 'zigzag', amp: 100, atk: [AIM(1, 150, 1.7)] },
        { type: 'warden', n: 1, gap: 0, delay: 8, path: 'hover', xs: [240], y: 110, stay: 14, atk: [SWIRL(14, 0.8, 100, 2.0)] },
        { type: 'wisp', n: 5, gap: 0.9, delay: 16, path: 'pendulum', cx: 240, y: 60, R: 150, w: 1.0, stay: 9, atk: [LANCE(3, 2.0, 155, 0.8)] }
      ] },
      { dur: 30, spawns: [
        { type: 'warden', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [POLY(3, 30, 108, 2.6, 0.35), LANCE(4, 2.4, 150, 1.5)] }
      ] },
      { dur: 34, spawns: [
        { type: 'bastion', n: 1, gap: 0, delay: 0, path: 'hover', xs: [240], y: 130, stay: 24, sway: 60, atk: [POLY(5, 40, 110, 2.0, 0.25), SWIRL(12, 0.9, 100, 2.4, 2)] },
        { type: 'wisp', n: 6, gap: 0.7, delay: 5, path: 'orbit', cx: 240, cy: 190, R: 160, w: -0.7, stay: 14, atk: [LANCE(3, 2.2, 155)] }
      ] }
    ]
  },
  { // 2. 라이라 성간 도시 — 불 꺼진 회로의 도시
    name: '라이라 성간 도시', hue: 150, bg: ['#02140e', '#0b5a3c'], mid: 'cassiopeia', target: 245,
    warn: '도시의 회로가 한꺼번에 점등된다',
    waves: [
      { dur: 28, hazards: [XF(2, 150, 2.8, 2)], spawns: [
        { type: 'wisp', n: 6, gap: 1.0, delay: 0, path: 'zigzag', amp: 110, atk: [AIM(2, 150, 1.6, 25)] },
        { type: 'wisp', n: 5, gap: 0.8, delay: 8, path: 'pendulum', cx: 240, y: 60, R: 160, w: 1.1, stay: 9, atk: [LANCE(3, 2.0, 155, 0.8)] },
        { type: 'warden', n: 1, gap: 0, delay: 12, path: 'hover', xs: [240], y: 110, stay: 12, atk: [POLY(4, 32, 105, 2.4)] }
      ] },
      { dur: 30, spawns: [
        { type: 'warden', n: 2, gap: 0.6, delay: 0, path: 'hover', xs: [130, 350], y: 115, stay: 14, atk: [SWIRL(16, 0.9, 100, 2.0), AIM(1, 140, 2.6, 30, 1.2)] },
        { type: 'wisp', n: 6, gap: 0.6, delay: 7, path: 'orbit', cx: 240, cy: 175, R: 160, w: 0.8, stay: 10, atk: [LANCE(3, 2.0, 160)] }
      ] },
      { dur: 30, hazards: [A('curtain', { b: 'rice', speed: 90, spacing: 66, interval: 1.8, delay: 2 })], spawns: [
        { type: 'warden', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [POLY(6, 36, 108, 2.6, 0.2), LANCE(3, 2.2, 150, 1.5)] },
        { type: 'wisp', n: 5, gap: 1.0, delay: 10, path: 'zigzag', amp: 100, atk: [AIM(1, 155, 1.6)] }
      ] },
      { dur: 32, hazards: [XF(3, 150, 3.0, 2, 56)], spawns: [
        { type: 'wisp', n: 8, gap: 0.5, delay: 0, path: 'pendulum', cx: 240, y: 55, R: 170, w: 1.2, stay: 11, atk: [LANCE(4, 2.0, 160, 0.6)] },
        { type: 'warden', n: 2, gap: 0.6, delay: 8, path: 'hover', xs: [130, 350], y: 125, stay: 16, atk: [SWIRL(14, 1.0, 100, 1.9)] }
      ] },
      { dur: 36, spawns: [
        { type: 'bastion', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 26, sway: 35, atk: [POLY(5, 40, 110, 2.1, 0.25), SWIRL(14, 0.9, 100, 2.6, 1.5), LANCE(4, 2.8, 155, 2.5)] },
        { type: 'wisp', n: 6, gap: 0.8, delay: 6, path: 'orbit', cx: 240, cy: 195, R: 170, w: 0.8, stay: 16, atk: [LANCE(3, 2.2, 160)] }
      ] }
    ]
  },
  { // 3. 궁수자리 A* 강착원반 — 은하 중심의 심연
    name: '궁수자리 A* 강착원반', hue: 32, bg: ['#120a02', '#5a3a05'], mid: 'hydra', target: 250,
    warn: '중심의 심연이 별빛을 삼키며 다가온다',
    waves: [
      { dur: 28, spawns: [
        { type: 'wisp', n: 7, gap: 0.8, delay: 0, path: 'pendulum', cx: 240, y: 55, R: 170, w: 1.3, stay: 10, atk: [LANCE(4, 1.9, 160, 0.6)] },
        { type: 'warden', n: 2, gap: 0.6, delay: 7, path: 'hover', xs: [130, 350], y: 115, stay: 14, atk: [POLY(5, 36, 108, 2.2, 0.3), SWIRL(12, 0.9, 100, 2.8, 1.5)] },
        { type: 'wisp', n: 6, gap: 0.9, delay: 16, path: 'zigzag', amp: 110, atk: [AIM(2, 155, 1.5, 25)] }
      ] },
      { dur: 30, hazards: [XF(2, 155, 2.4, 2)], spawns: [
        { type: 'warden', n: 3, gap: 0.5, delay: 0, path: 'hover', xs: [90, 240, 390], y: 120, stay: 15, atk: [POLY(3, 30, 110, 2.4, 0.4), LANCE(4, 2.2, 155, 1.5)] },
        { type: 'wisp', n: 6, gap: 0.6, delay: 9, path: 'orbit', cx: 240, cy: 180, R: 165, w: -0.8, stay: 11, atk: [LANCE(3, 2.0, 160)] }
      ] },
      { dur: 30, hazards: [A('rain', { b: 'refract', count: 1, speed: 130, interval: 0.5, jitter: 0.5, turnAt: 0.9, turnD: 1.3, delay: 1 }), XF(2, 150, 3.2, 3)], spawns: [
        { type: 'wisp', n: 8, gap: 0.5, delay: 1, path: 'pendulum', cx: 240, y: 55, R: 170, w: 1.2, stay: 10, atk: [LANCE(3, 2.0, 160, 0.6)] },
        { type: 'warden', n: 2, gap: 0.6, delay: 12, path: 'hover', xs: [130, 350], y: 120, stay: 14, atk: [SWIRL(16, 1.0, 100, 1.9)] }
      ] },
      { dur: 32, hazards: [A('curtain', { b: 'rice', speed: 95, spacing: 62, interval: 1.7, delay: 2 })], spawns: [
        { type: 'warden', n: 4, gap: 0.5, delay: 0, path: 'hover', xs: [70, 190, 290, 410], y: 120, stay: 17, atk: [POLY(4, 32, 108, 2.4, 0.3), LANCE(3, 2.6, 155, 2)] }
      ] },
      { dur: 36, spawns: [
        { type: 'bastion', n: 2, gap: 0.8, delay: 0, path: 'hover', xs: [130, 350], y: 125, stay: 26, sway: 35, atk: [POLY(6, 42, 110, 2.0, 0.22), SWIRL(14, 1.0, 100, 2.4, 1.5), LANCE(5, 2.8, 160, 2.5)] },
        { type: 'wisp', n: 6, gap: 0.8, delay: 7, path: 'orbit', cx: 240, cy: 195, R: 170, w: 0.8, stay: 17, atk: [LANCE(3, 2.2, 165)] }
      ] }
    ]
  }
];

// 챕터 공통 조회
const CH_STAGES = [STAGES, STAGES2, STAGES3];
const finalOf = (D, ch) => [D.final, D.final2, D.final3][ch || 0];
