'use strict';
// 챕터 3 보스: 중간보스 3종, 난이도별 최종보스 4종 — 별자리를 모티브로 한 새 패턴(다각형·소용돌이·창·교차 사격)을 쓴다
const SGt = (at, hold) => ({ at, hold });
Object.assign(BOSSES, {
  // ---- 중간보스 ----
  perseus: {
    id: 'perseus', name: '페르세우스', title: '메두사의 시선을 든 영웅', hp: 3000, r: 32, shape: 'perseus', color: '#d9b8ff', mid: true,
    phases: [
      { name: '석화의 시선', limit: 38, share: 0.5, move: 'sway', attacks: [
        POLY(5, 40, 105, 2.0, 0.25, 1), LANCE(4, 2.4, 150, 1.5)
      ] },
      { name: '영웅의 검', limit: 42, share: 0.5, move: 'sweep', attacks: [
        SWIRL(14, 0.9, 100, 2.2, 1), XF(2, 150, 2.8, 2), AIM(3, 150, 1.8, 30, 1)
      ] }
    ]
  },
  cassiopeia: {
    id: 'cassiopeia', name: '카시오페이아', title: '하늘의 왕좌에 앉은 여왕', hp: 3400, r: 31, shape: 'cassiopeia', color: '#ffd978', mid: true,
    phases: [
      { name: 'W의 왕좌', limit: 38, share: 0.5, move: 'sway', attacks: [
        POLY(4, 36, 108, 1.9, 0.3), A('wave', { aim: true, amp: 0.6, freq: 0.35, speed: 140, interval: 0.18, b: 'rice', delay: 1 })
      ] },
      { name: '여왕의 분노', limit: 42, share: 0.5, move: 'circle', attacks: [
        SWIRL(16, 1.0, 100, 2.0), A('curtain', { b: 'rice', speed: 92, spacing: 64, interval: 1.9, delay: 2 }), XF(2, 150, 3.0, 2.5)
      ] }
    ]
  },
  hydra: {
    id: 'hydra', name: '히드라', title: '목을 잘라도 돋아나는 바다뱀', hp: 3900, r: 34, shape: 'hydra', color: '#8fffa8', mid: true,
    phases: [
      { name: '다섯 개의 머리', limit: 38, share: 0.5, move: 'sway', attacks: [
        POLY(3, 36, 108, 1.8, 0.35), LANCE(5, 2.2, 155, 1)
      ] },
      { name: '재생하는 목', limit: 42, share: 0.5, move: 'jump', attacks: [
        SWIRL(18, 1.0, 100, 1.8, 1), AIM(5, 150, 1.6, 50), XF(3, 150, 3.0, 2, 54)
      ] }
    ]
  },

  // ---- 챕터 3 최종보스 (난이도별) ----
  lyra: {
    id: 'lyra', name: '리라', title: '별들의 노래를 연주하는 거문고', hp: 4500, r: 34, shape: 'lyra', color: '#9fd0ff', final: true,
    phases: [
      { name: '첫 번째 현', limit: 50, share: 0.5, move: 'sway', attacks: [
        POLY(5, 40, 105, 2.0, 0.25), A('wave', { arms: 2, gapA: 0.6, amp: 0.9, freq: 0.3, speed: 125, interval: 0.14, b: 'rice' })
      ] },
      { name: '끊어진 화음', limit: 0, share: 0.5, move: 'center', attacks: [
        SWIRL(16, 1.0, 100, 1.9, 1), LANCE(4, 2.4, 155, 1.5), XF(2, 150, 3.0, 2)
      ] }
    ]
  },
  orion: {
    id: 'orion', name: '오리온', title: '밤하늘을 누비는 사냥꾼', hp: 6200, r: 36, shape: 'orion', color: '#ffb36b', final: true,
    phases: [
      { name: '삼태성의 사냥', limit: 50, share: 0.3, move: 'sway', attacks: [
        POLY(3, 36, 110, 1.8, 0.3), AIM(5, 150, 1.8, 50)
      ] },
      { name: '붉은 어깨', limit: 55, share: 0.35, move: 'center', attacks: [
        SWIRL(18, 1.0, 100, 1.8, 1), LANCE(5, 2.2, 160, 1.5), A('curtain', { b: 'normal', speed: 95, spacing: 70, interval: 2.2, delay: 2 })
      ] },
      { name: '사냥꾼의 화살', limit: 0, share: 0.35, move: 'jump', attacks: [
        POLY(6, 42, 112, 1.8, 0.22), XF(3, 155, 2.8, 2, 54), A('aimed', { count: 1, b: 'big', speed: 105, interval: 2.2, split: { at: 1.0, n: 10, speed: 115 } })
      ] }
    ]
  },
  cygnus: {
    id: 'cygnus', name: '시그너스', title: '북십자 아래 잠든 검은 구멍', hp: 8200, r: 36, shape: 'cygnus', color: '#c0f0ff', final: true,
    phases: [
      { name: '백조의 날개', limit: 45, share: 0.22, move: 'sweep', attacks: [
        LANCE(6, 1.6, 165), POLY(4, 36, 108, 2.0, 0.3, 1)
      ] },
      { name: '북십자성', limit: 50, share: 0.26, move: 'center', attacks: [
        POLY(5, 42, 110, 1.8, 0.25), SWIRL(16, 1.0, 100, 2.2, 1)
      ] },
      { name: '강착원반', limit: 50, share: 0.26, move: 'sway', attacks: [
        SWIRL(20, 1.1, 100, 1.7), XF(3, 155, 2.6, 2, 54), A('curtain', { b: 'rice', speed: 95, spacing: 64, interval: 2.0, delay: 2 })
      ] },
      { name: '사건의 지평선', limit: 0, share: 0.26, move: 'jump', attacks: [
        POLY(6, 44, 112, 1.7, 0.2), LANCE(5, 2.2, 165, 1), A('homing', { count: 3, speed: 125, interval: 3.0 }),
        A('aimed', { count: 1, b: 'big', speed: 110, interval: 2.4, split: { at: 1.0, n: 10, speed: 120 } })
      ] }
    ]
  },
  sagittarius: {
    id: 'sagittarius', name: '궁수자리 A*', title: '은하의 심장에 도사린 거대한 심연', hp: 11000, r: 40, shape: 'sagittarius', color: '#ff9a3c', final: true,
    phases: [
      { name: '시위를 당기다', limit: 45, share: 0.2, move: 'sway', attacks: [
        POLY(5, 42, 108, 1.7, 0.28), LANCE(5, 2.0, 160, 1), A('curtain', { b: 'rice', speed: 95, spacing: 66, interval: 2.2, delay: 2 })
      ] },
      { name: '별을 삼키는 화살', limit: 50, share: 0.2, move: 'center', pull: 35, attacks: [
        SWIRL(20, 1.1, 100, 1.6), XF(3, 155, 2.6, 2, 54)
      ] },
      { name: '휘어진 시공', limit: 50, share: 0.2, move: 'circle', wobble: true, attacks: [
        POLY(4, 40, 110, 1.7, 0.3), A('aimed', { count: 1, b: 'big', speed: 105, interval: 1.7, split: { at: 0.9, n: 10, speed: 120 } }),
        A('wave', { aim: true, arms: 2, gapA: 0.6, amp: 0.7, freq: 0.4, speed: 135, interval: 0.2, b: 'rice' })
      ] },
      { name: '강착원반의 폭풍', limit: 50, share: 0.2, move: 'sweep', pull: 50, wobble: true, attacks: [
        SWIRL(22, 1.2, 100, 1.5), LANCE(6, 2.0, 165, 1), AIM(3, 160, 1.4, 30)
      ] },
      { name: '특이점', limit: 0, share: 0.2, move: 'center', pull: 60, wobble: true, attacks: [
        POLY(6, 46, 112, 1.6, 0.2), SWIRL(20, 1.1, 100, 2.0, 1), XF(3, 160, 2.6, 2, 54),
        A('aimed', { count: 1, b: 'big', speed: 105, interval: 2.6, split: { at: 1.0, n: 10, speed: 115 } }), A('homing', { count: 2, speed: 120, interval: 3.4 })
      ] }
    ]
  }
});
