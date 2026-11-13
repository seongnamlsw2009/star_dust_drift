'use strict';
// 강화 적 — 모든 챕터의 일부 웨이브에 추가된다. hard:true 이므로 Hard·Nightmare 난이도에서만 등장한다.
// 챕터마다 종류가 다르다: 챕터 1 방패병(guard) / 챕터 2 이지스(aegis) / 챕터 3 보루병(bulwark). 모두 체력 앞에 쉴드가 있다.
(function () {
  const H = (type, n, delay, xs, y, stay, atk) => ({ type, n, gap: 0.7, delay, path: 'hover', xs, y, stay, hard: true, atk });
  const add = (stages, picks) => picks.forEach(([si, wi, spec]) => stages[si].waves[wi].spawns.push(spec));
  // 챕터 1: 방패병 — 조준탄 + 고리
  add(STAGES, [
    [0, 1, H('guard', 2, 6, [90, 390], 135, 14, [A('aimed', { count: 3, spread: 36, speed: 140, interval: 1.9, delay: 1 })])],
    [0, 3, H('guard', 2, 8, [150, 330], 140, 14, [A('ring', { count: 12, speed: 100, interval: 2.6, delay: 1 })])],
    [1, 1, H('guard', 2, 6, [110, 370], 135, 14, [A('aimed', { count: 3, spread: 36, speed: 145, interval: 1.8, delay: 1 })])],
    [1, 3, H('guard', 3, 8, [90, 240, 390], 140, 14, [A('ring', { count: 12, speed: 100, interval: 2.6, delay: 1 })])],
    [2, 2, H('guard', 2, 6, [110, 370], 135, 15, [A('aimed', { count: 5, spread: 50, speed: 145, interval: 1.9, delay: 1 })])],
    [2, 4, H('guard', 3, 8, [90, 240, 390], 140, 20, [A('ring', { count: 14, speed: 105, interval: 2.4, delay: 1 })])]
  ]);
  // 챕터 2: 이지스 — 꽃잎 + 분열탄
  add(STAGES2, [
    [0, 1, H('aegis', 2, 6, [110, 370], 135, 14, [A('flower', { count: 24, petals: 4, speed: 110, interval: 2.6, rot: 0.4, delay: 1 })])],
    [0, 3, H('aegis', 2, 8, [150, 330], 140, 14, [A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.0, delay: 1.5, split: { at: 1.0, n: 8, speed: 110 } })])],
    [1, 1, H('aegis', 2, 6, [110, 370], 135, 14, [A('flower', { count: 26, petals: 5, speed: 112, interval: 2.4, rot: 0.3, delay: 1 })])],
    [1, 3, H('aegis', 3, 8, [90, 240, 390], 140, 14, [A('aimed', { count: 1, b: 'big', speed: 105, interval: 3.0, delay: 1.5, split: { at: 1.0, n: 8, speed: 110 } })])],
    [2, 2, H('aegis', 2, 6, [110, 370], 135, 15, [A('flower', { count: 28, petals: 6, speed: 112, interval: 2.4, rot: 0.3, delay: 1 })])],
    [2, 4, H('aegis', 3, 8, [90, 240, 390], 140, 20, [A('aimed', { count: 1, b: 'big', speed: 108, interval: 2.8, delay: 1.5, split: { at: 1.0, n: 10, speed: 115 } })])]
  ]);
  // 챕터 3: 보루병 — 다각형 + 창
  add(STAGES3, [
    [0, 1, H('bulwark', 2, 6, [110, 370], 135, 14, [POLY(4, 32, 105, 2.6, 0.3, 1)])],
    [0, 3, H('bulwark', 2, 8, [150, 330], 140, 14, [LANCE(4, 2.2, 155, 1)])],
    [1, 1, H('bulwark', 2, 6, [110, 370], 135, 14, [POLY(5, 36, 108, 2.5, 0.3, 1)])],
    [1, 3, H('bulwark', 3, 8, [90, 240, 390], 140, 14, [LANCE(4, 2.2, 155, 1)])],
    [2, 1, H('bulwark', 2, 6, [110, 370], 135, 14, [POLY(6, 40, 110, 2.4, 0.25, 1)])],
    [2, 3, H('bulwark', 4, 8, [70, 190, 290, 410], 140, 18, [LANCE(4, 2.4, 160, 1)])]
  ]);
})();
