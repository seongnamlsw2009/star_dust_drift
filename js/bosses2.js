'use strict';
// 챕터 2 보스: 중간보스 3종, 난이도별 최종보스 4종 (BOSSES에 합친다)
const SGo = (at, hold) => ({ at, hold });
Object.assign(BOSSES, {
  // ---- 중간보스 (체력은 난이도 배율 적용) ----
  titan: {
    id: 'titan', name: '타이탄', title: '얼어붙은 위성의 거인', hp: 1900, r: 32, shape: 'titan', color: '#8fe3ff', mid: true,
    phases: [
      { name: '빙정 낙하', limit: 38, share: 0.5, move: 'sway', attacks: [
        A('curtain', { b: 'rice', speed: 85, spacing: 64, interval: 1.9, delay: 1.5 }),
        A('flower', { count: 24, petals: 4, speed: 105, interval: 2.4, rot: 0.4 })
      ] },
      { name: '얼어붙은 시간', limit: 40, share: 0.5, move: 'sweep', attacks: [
        A('ring', { count: 14, speed: 100, interval: 2.2, b: 'rice', stopGo: SGo(0.8, 1.0) }),
        A('wave', { aim: true, amp: 0.6, freq: 0.35, speed: 140, interval: 0.16, b: 'rice' })
      ] }
    ]
  },
  gemini: {
    id: 'gemini', name: '제미니', title: '서로를 태우는 쌍둥이 태양', hp: 2200, r: 30, shape: 'gemini', color: '#ffb066', mid: true,
    phases: [
      { name: '쌍둥이의 나선', limit: 38, share: 0.5, move: 'sway', attacks: [
        A('cross', { arms: 2, rot: 0.22, speed: 110, interval: 0.2, b: 'rice', b2: 'normal' }),
        A('aimed', { count: 1, b: 'big', speed: 105, interval: 2.6, split: { at: 0.9, n: 8, speed: 115 } })
      ] },
      { name: '쌍성 공전', limit: 40, share: 0.5, move: 'circle', attacks: [
        A('flower', { count: 28, petals: 6, speed: 112, interval: 2.0, rot: 0.3 }),
        A('diag', { b: 'normal', speed: 100, spacing: 80, tilt: 0.5, interval: 2.6, delay: 2 })
      ] }
    ]
  },
  antares: {
    id: 'antares', name: '안타레스', title: '숨이 꺼져 가는 붉은 거성', hp: 2500, r: 34, shape: 'antares', color: '#ff6a5c', mid: true,
    phases: [
      { name: '표면 폭발', limit: 38, share: 0.5, move: 'sway', attacks: [
        A('random', { b: 'big', count: 3, spread: 100, speed: 95, interval: 1.0, split: { at: 1.0, n: 6, speed: 110 } }),
        A('ring', { count: 14, speed: 100, interval: 2.2 })
      ] },
      { name: '적색 거성의 숨', limit: 42, share: 0.5, move: 'jump', attacks: [
        A('ring', { count: 18, speed: 105, interval: 1.8, b: 'rice', stopGo: SGo(0.9, 1.0) }),
        A('curtain', { b: 'normal', speed: 90, spacing: 70, interval: 2.0, delay: 2 }),
        A('aimed', { count: 5, spread: 50, speed: 150, interval: 1.6 })
      ] }
    ]
  },

  // ---- 챕터 2 최종보스 (난이도별) ----
  aurora: {
    id: 'aurora', name: '오로라', title: '극광을 걷는 별의 무희', hp: 3000, r: 34, shape: 'aurora', color: '#7dffc8', final: true,
    phases: [
      { name: '극광의 리본', limit: 50, share: 0.5, move: 'sway', attacks: [
        A('wave', { arms: 2, gapA: 0.6, amp: 0.9, freq: 0.3, speed: 125, interval: 0.13, b: 'rice' }),
        A('flower', { count: 26, petals: 5, speed: 105, interval: 2.4 })
      ] },
      { name: '빛의 장막', limit: 0, share: 0.5, move: 'center', attacks: [
        A('curtain', { b: 'rice', speed: 95, spacing: 62, interval: 1.5, delay: 1.5 }),
        A('ring', { count: 12, speed: 100, interval: 2.4, stopGo: SGo(0.8, 1.0) })
      ] }
    ]
  },
  andromeda: {
    id: 'andromeda', name: '안드로메다', title: '사슬에 묶인 이웃 은하', hp: 4400, r: 36, shape: 'andromeda', color: '#c9a8ff', final: true,
    phases: [
      { name: '은하의 팔', limit: 50, share: 0.3, move: 'sway', attacks: [
        A('spiral', { arms: 3, rot: 0.2, speed: 115, interval: 0.15, b: 'rice' }),
        A('aimed', { count: 5, spread: 50, speed: 145, interval: 1.8 })
      ] },
      { name: '사슬의 꽃', limit: 55, share: 0.35, move: 'center', attacks: [
        A('flower', { count: 30, petals: 6, speed: 112, interval: 1.8, rot: 0.35 }),
        A('diag', { b: 'normal', speed: 105, spacing: 76, tilt: 0.5, interval: 2.8, delay: 2 })
      ] },
      { name: '충돌하는 은하', limit: 0, share: 0.35, move: 'jump', attacks: [
        A('ring', { count: 18, speed: 105, interval: 1.9, b: 'rice', stopGo: SGo(0.9, 1.0) }),
        A('aimed', { count: 1, b: 'big', speed: 105, interval: 2.2, split: { at: 1.0, n: 10, speed: 115 } }),
        A('wave', { aim: true, amp: 0.6, freq: 0.4, speed: 145, interval: 0.2, b: 'rice' })
      ] }
    ]
  },
  sirius: {
    id: 'sirius', name: '시리우스', title: '하늘에서 가장 밝은 늑대별', hp: 6000, r: 36, shape: 'sirius', color: '#9fe8ff', final: true,
    phases: [
      { name: '푸른 섬광', limit: 45, share: 0.22, move: 'sweep', attacks: [
        A('random', { b: 'rice', count: 5, spread: 100, speed: 200, interval: 0.4 }),
        A('aimed', { count: 7, spread: 60, speed: 165, interval: 1.5, b: 'rice' })
      ] },
      { name: '늑대의 울음', limit: 50, share: 0.26, move: 'center', attacks: [
        A('flower', { count: 32, petals: 6, speed: 115, interval: 1.8, rot: 0.3 }),
        A('wave', { arms: 3, gapA: 0.55, amp: 0.8, freq: 0.32, speed: 130, interval: 0.16, b: 'rice' })
      ] },
      { name: '빙결의 포효', limit: 50, share: 0.26, move: 'sway', attacks: [
        A('ring', { count: 18, speed: 105, interval: 1.7, b: 'rice', stopGo: SGo(0.9, 1.1) }),
        A('curtain', { b: 'normal', speed: 100, spacing: 64, interval: 2.0, delay: 2 }),
        A('aimed', { count: 3, spread: 30, speed: 150, interval: 1.4 })
      ] },
      { name: '천랑성', limit: 0, share: 0.26, move: 'jump', attacks: [
        A('cross', { arms: 3, rot: 0.18, speed: 125, interval: 0.2 }),
        A('flower', { count: 28, petals: 5, speed: 110, interval: 2.0, rot: 0.3 }),
        A('aimed', { count: 1, b: 'big', speed: 110, interval: 2.4, split: { at: 1.0, n: 10, speed: 120 } }),
        A('homing', { count: 3, speed: 125, interval: 3.0 })
      ] }
    ]
  },
  omega: {
    id: 'omega', name: '오메가', title: '마지막 별의 종언', hp: 8500, r: 40, shape: 'omega', color: '#ff7ad9', final: true,
    phases: [
      { name: '종말의 서곡', limit: 45, share: 0.2, move: 'sway', attacks: [
        A('flower', { count: 30, petals: 5, speed: 108, interval: 1.7, rot: 0.3 }),
        A('aimed', { count: 5, spread: 50, speed: 150, interval: 1.6 }),
        A('curtain', { b: 'rice', speed: 95, spacing: 66, interval: 2.2, delay: 2 })
      ] },
      { name: '정지한 시간', limit: 50, share: 0.2, move: 'center', pull: 35, attacks: [
        A('ring', { count: 20, speed: 105, interval: 1.6, b: 'rice', stopGo: SGo(0.9, 1.1) }),
        A('cross', { arms: 2, rot: 0.2, speed: 110, interval: 0.22, b: 'rice', b2: 'rice' })
      ] },
      { name: '분열하는 별', limit: 50, share: 0.2, move: 'circle', wobble: true, attacks: [
        A('aimed', { count: 1, b: 'big', speed: 105, interval: 1.6, split: { at: 0.9, n: 10, speed: 120 } }),
        A('diag', { b: 'normal', speed: 105, spacing: 76, tilt: 0.55, interval: 2.6, delay: 2 }),
        A('wave', { aim: true, arms: 2, gapA: 0.6, amp: 0.7, freq: 0.4, speed: 135, interval: 0.2, b: 'rice' })
      ] },
      { name: '종언의 파도', limit: 50, share: 0.2, move: 'sweep', pull: 50, wobble: true, attacks: [
        A('spiral', { arms: 5, rot: 0.12, speed: 105, interval: 0.15, b: 'rice' }),
        A('flower', { count: 30, petals: 6, speed: 108, interval: 2.0, rot: 0.25 }),
        A('aimed', { count: 3, spread: 30, speed: 160, interval: 1.3 })
      ] },
      { name: '오메가', limit: 0, share: 0.2, move: 'center', pull: 60, wobble: true, attacks: [
        A('cross', { arms: 3, rot: 0.15, speed: 110, interval: 0.22 }),
        A('ring', { count: 22, speed: 100, interval: 1.7, b: 'rice', stopGo: SGo(0.9, 1.0) }),
        A('curtain', { b: 'normal', speed: 100, spacing: 70, interval: 2.4, delay: 2 }),
        A('aimed', { count: 1, b: 'big', speed: 105, interval: 2.6, split: { at: 1.0, n: 10, speed: 115 } }),
        A('homing', { count: 2, speed: 120, interval: 3.4 })
      ] }
    ]
  }
});
