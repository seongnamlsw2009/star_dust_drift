'use strict';
// 보스 데이터 (기획서 6장): 중간보스 3종, 난이도별 최종보스 4종
// phase: { name, limit(제한 시간), share(체력 비율), move, attacks[], pull, wobble }
// 마지막 페이즈는 제한 시간이 없고, 격파해야 끝난다.
const BOSSES = {
  // ---- 중간보스 (체력은 난이도 배율 적용) ----
  meteora: {
    id: 'meteora', name: '메테오라', title: '소행성대의 수호자', hp: 1200, r: 30, shape: 'rock', color: '#d2a679', mid: true,
    phases: [
      { name: '운석 낙하', limit: 36, share: 0.5, move: 'sway', attacks: [
        A('rain', { b: 'big', count: 1, speed: 150, interval: 0.5, jitter: 0.3, delay: 1 }),
        A('ring', { count: 12, speed: 100, interval: 2.4, rot: 0.2 })
      ] },
      { name: '암석 파편', limit: 36, share: 0.5, move: 'sweep', attacks: [
        A('ring', { count: 16, speed: 115, interval: 1.6, rot: 0.17 }),
        A('aimed', { count: 3, spread: 30, speed: 150, interval: 1.9 })
      ] }
    ]
  },
  pulsar: {
    id: 'pulsar', name: '펄사 센티넬', title: '규칙적으로 빛나는 파수꾼', hp: 1500, r: 30, shape: 'pulsar', color: '#9fd8ff', mid: true,
    phases: [
      { name: '맥동', limit: 36, share: 0.5, move: 'sway', attacks: [
        A('spiral', { arms: 4, rot: 0.21, speed: 120, interval: 0.14, b: 'rice' })
      ] },
      { name: '점멸 일제 사격', limit: 38, share: 0.5, move: 'jump', attacks: [
        A('ring', { count: 20, speed: 120, interval: 1.5, rot: 0.1 }),
        A('aimed', { count: 5, spread: 50, speed: 170, interval: 1.3, b: 'rice' })
      ] }
    ]
  },
  eclipse: {
    id: 'eclipse', name: '이클립스', title: '별빛을 가리는 그림자', hp: 1800, r: 32, shape: 'eclipse', color: '#ffcf6a', mid: true,
    phases: [
      { name: '좁혀 오는 그림자', limit: 38, share: 0.5, move: 'sway', attacks: [
        A('sidewall', { b: 'normal', speed: 95, gap: 110, interval: 2.9, delay: 1.5 }),
        A('aimed', { count: 3, spread: 40, speed: 140, interval: 1.7 })
      ] },
      { name: '코로나', limit: 40, share: 0.5, move: 'sweep', attacks: [
        A('sidewall', { b: 'normal', speed: 100, gap: 110, interval: 3.2, delay: 1.5 }),
        A('spiral', { arms: 3, rot: 0.25, speed: 115, interval: 0.22, b: 'rice' })
      ] }
    ]
  },

  // ---- 최종보스 (난이도별) ----
  luna: {
    id: 'luna', name: '루나', title: '꺼진 위성의 은빛 수호령', hp: 2400, r: 34, shape: 'moon', color: '#dfe6ff', final: true,
    phases: [
      { name: '은빛 파동', limit: 50, share: 0.5, move: 'sway', attacks: [
        A('ring', { count: 16, speed: 105, interval: 1.3, rot: 0.2 }),
        A('aimed', { count: 3, spread: 30, speed: 130, interval: 2.0 })
      ] },
      { name: '월광 나선', limit: 0, share: 0.5, move: 'center', attacks: [
        A('spiral', { arms: 2, rot: 0.28, speed: 125, interval: 0.13 }),
        A('ring', { count: 12, speed: 95, interval: 2.6 })
      ] }
    ]
  },
  nebula: {
    id: 'nebula', name: '네뷸라', title: '성운의 여왕', hp: 3600, r: 36, shape: 'nebula', color: '#e58bff', final: true,
    phases: [
      { name: '성운의 숨결', limit: 50, share: 0.3, move: 'sway', attacks: [
        A('ring', { count: 18, speed: 110, interval: 1.5, rot: 0.18 }),
        A('aimed', { count: 5, spread: 50, speed: 145, interval: 1.8 })
      ] },
      { name: '이중 나선', limit: 55, share: 0.35, move: 'center', attacks: [
        A('cross', { arms: 2, rot: 0.2, speed: 120, interval: 0.2, b2: 'rice' }),
        A('wall', { b: 'normal', speed: 100, gap: 100, interval: 4.0, delay: 2 })
      ] },
      { name: '별무리 폭풍', limit: 0, share: 0.35, move: 'jump', attacks: [
        A('homing', { count: 2, speed: 120, interval: 3.0 }),
        A('random', { b: 'big', count: 2, spread: 90, speed: 95, interval: 0.9 }),
        A('ring', { b: 'accel', count: 16, speed: 60, maxv: 230, interval: 2.0, rot: 0.2 })
      ] }
    ]
  },
  quasar: {
    id: 'quasar', name: '퀘이사', title: '은하핵의 광휘', hp: 5000, r: 36, shape: 'quasar', color: '#7fe9ff', final: true,
    phases: [
      { name: '광휘의 난사', limit: 45, share: 0.22, move: 'sweep', attacks: [
        A('random', { b: 'rice', count: 5, spread: 100, speed: 210, interval: 0.38 }),
        A('aimed', { count: 7, spread: 60, speed: 170, interval: 1.5, b: 'rice' })
      ] },
      { name: '가속의 고리', limit: 50, share: 0.26, move: 'center', attacks: [
        A('ring', { b: 'accel', count: 18, speed: 50, maxv: 250, interval: 1.8, rot: 0.2 }),
        A('cross', { arms: 2, rot: 0.24, speed: 120, interval: 0.22, b: 'rice', b2: 'rice' })
      ] },
      { name: '빛의 장벽', limit: 50, share: 0.26, move: 'sway', attacks: [
        A('wall', { b: 'normal', speed: 115, gap: 95, interval: 3.4, delay: 2 }),
        A('sidewall', { b: 'normal', speed: 100, gap: 100, interval: 5.0, delay: 3.5 }),
        A('aimed', { count: 3, spread: 30, speed: 150, interval: 1.4 })
      ] },
      { name: '특이점', limit: 0, share: 0.26, move: 'jump', attacks: [
        A('cross', { arms: 3, rot: 0.18, speed: 125, interval: 0.2 }),
        A('ring', { count: 20, speed: 100, interval: 1.7 }),
        A('homing', { count: 3, speed: 125, interval: 3.0 }),
        A('random', { b: 'rice', count: 4, spread: 140, speed: 190, interval: 0.55 })
      ] }
    ]
  },
  erebus: {
    id: 'erebus', name: '에레보스', title: '공허의 심장', hp: 7000, r: 40, shape: 'void', color: '#b06bff', final: true,
    phases: [
      { name: '이벤트 호라이즌', limit: 45, share: 0.2, move: 'sway', attacks: [
        A('ring', { count: 20, speed: 105, interval: 1.4, rot: 0.15 }),
        A('aimed', { count: 5, spread: 50, speed: 150, interval: 1.6 }),
        A('rain', { b: 'refract', count: 1, speed: 120, interval: 0.55, jitter: 0.4, turnAt: 0.9, turnD: 1.2, delay: 2 })
      ] },
      { name: '중력 붕괴', limit: 50, share: 0.2, move: 'center', pull: 35, attacks: [
        A('cross', { arms: 2, rot: 0.2, speed: 110, interval: 0.22, b: 'rice', b2: 'rice' }),
        A('sidewall', { b: 'normal', speed: 100, gap: 105, interval: 4.5, delay: 2 })
      ] },
      { name: '시간의 균열', limit: 50, share: 0.2, move: 'jump', wobble: true, attacks: [
        A('ring', { b: 'accel', count: 20, speed: 40, maxv: 260, interval: 1.7, rot: 0.17 }),
        A('wall', { b: 'normal', speed: 115, gap: 95, interval: 3.4, delay: 2 }),
        A('homing', { count: 2, speed: 120, interval: 3.0 })
      ] },
      { name: '공허의 파도', limit: 50, share: 0.2, move: 'sweep', pull: 50, wobble: true, attacks: [
        A('spiral', { arms: 5, rot: 0.12, speed: 105, interval: 0.15, b: 'rice' }),
        A('random', { b: 'big', count: 2, spread: 100, speed: 95, interval: 1.1 }),
        A('aimed', { count: 3, spread: 30, speed: 160, interval: 1.3 })
      ] },
      { name: '공허의 심장', limit: 0, share: 0.2, move: 'center', pull: 60, wobble: true, attacks: [
        A('cross', { arms: 3, rot: 0.15, speed: 110, interval: 0.22 }),
        A('ring', { count: 24, speed: 100, interval: 1.6, rot: 0.12 }),
        A('wall', { b: 'normal', speed: 105, gap: 95, interval: 4.0, delay: 2 }),
        A('homing', { count: 2, speed: 120, interval: 3.4 })
      ] }
    ]
  }
};
