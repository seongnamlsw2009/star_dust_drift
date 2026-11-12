'use strict';
// 기체 4종, 기체별 육각 스킬 노드 그래프, 패시브 노드, 스킬 포인트 규칙
//
// 스킬 노드: 육각 격자(axial 좌표 q,r)에 배치되고, edges(간선)로 연결된다.
//   - 코어(core)는 처음부터 활성 상태이고, 활성 노드와 간선으로 이어진 노드만 1포인트로 활성화할 수 있다.
// 패시브 노드: 기체마다 3개. 연결 조건 없이 2포인트로 활성화한다.
// 포인트: 기체별로 따로 쌓인다. (기체 × 난이도 × 스테이지)마다 처음 클리어할 때만 지급한다.
//   - 스테이지 1·2: 중간보스 격파 시 +1 / 스테이지 3: 최종보스 격파 시 +1
//   - 게임 클리어(최종보스 격파): 추가 +2
//   - 이미 포인트를 받은 구간은 다시 클리어해도 지급하지 않는다.

const N = (id, q, r, name, mod, core) => ({ id, q, r, name, mod: mod || {}, core: !!core });
// 스킬 노드: 기체의 고유 스킬(Q)을 강화하는 노드. 일반 노드와 같은 규칙(활성 노드와 인접, 1포인트)을 따른다.
const SK = (id, q, r, name, mod) => Object.assign(N(id, q, r, name, mod), { sk: true });

const SHIPS = {
  /* ---------- 아스트라: 균형형, 코어 → 안쪽 고리 → 바깥 증폭기 (별자리형) ---------- */
  astra: {
    id: 'astra', name: '아스트라', role: '균형형 정찰기', color: '#9fe7ff', accent: '#3a6cff', shape: 'dart',
    desc: '무엇이든 무난한 기본 기체. 스킬 트리도 고르게 성장한다.',
    skill: { id: 'warp', name: '시공 왜곡장', icon: 'sWarp', cool: 26, dur: 4, desc: '주변에 왜곡장을 펼쳐, 안쪽에 들어온 적 탄의 속도를 크게 늦춘다.' },
    stars: { power: 3, mobility: 3, defense: 3, support: 3 },
    base: { speed: 1, dmg: 1, rate: 1, spread: 0, homing: 0, dashMax: 0, dashCool: 1, dashDist: 1, lives: 0, r: 3 },
    nodes: [
      N('ac', 0, 0, '아스트라 코어', {}, true),
      N('ae', 1, 0, '화력 코어', { dmg: 0.08 }),
      N('ane', 1, -1, '연사 코어', { rate: 0.08 }),
      N('anw', 0, -1, '추진 코어', { speed: 0.06 }),
      N('aw', -1, 0, '냉각 코어', { dashCool: -0.08 }),
      N('asw', -1, 1, '위상 코어', { dashInv: 0.03 }),
      N('ase', 0, 1, '자석 코어', { magnet: 0.25 }),
      N('ae2', 2, 0, '집속 증폭기', { dmg: 0.12 }),
      N('ane2', 2, -2, '연사 증폭기', { rate: 0.12 }),
      N('anw2', 0, -2, '도약 증폭기', { dashDist: 0.15 }),
      N('aw2', -2, 0, '예비 추진기', { dashMax: 1 }),
      N('asw2', -2, 2, '보강 장갑', { lives: 1 }),
      N('ase2', 0, 2, '방벽 발생기', { shield: 1 }),
      SK('as1', 2, -1, '시공 가속기', { skCool: 0.12 }),
      SK('as2', 3, -1, '왜곡장 확장기', { skPow: 0.25 }),
      SK('as3', 3, -2, '왜곡장 안정기', { skDur: 1.0 })
    ],
    edges: [
      ['ac', 'ae'], ['ac', 'ane'], ['ac', 'anw'], ['ac', 'aw'], ['ac', 'asw'], ['ac', 'ase'],
      ['ae', 'ane'], ['ane', 'anw'], ['anw', 'aw'], ['aw', 'asw'], ['asw', 'ase'], ['ase', 'ae'],
      ['ae', 'ae2'], ['ane', 'ane2'], ['anw', 'anw2'], ['aw', 'aw2'], ['asw', 'asw2'], ['ase', 'ase2'],
      ['ae2', 'as1'], ['ane2', 'as1'], ['as1', 'as2'], ['as2', 'as3']
    ],
    passives: [
      { id: 'pa1', name: '위상 방벽', cost: 2, mod: { shieldRegen: 1 } },
      { id: 'pa2', name: '재기동', cost: 2, mod: { revive: 1 } },
      { id: 'pa3', name: '충격파 대쉬', cost: 2, mod: { dashBlast: 75 } }
    ]
  },

  /* ---------- 헬리오스: 화력형, 긴 척추 + 위/아래 가지 ---------- */
  helios: {
    id: 'helios', name: '헬리오스', role: '화력형 중장갑기', color: '#ffb45f', accent: '#ff4d2e', shape: 'wing',
    desc: '화력이 높지만 크고 느리다. 판정이 커서 회피에 신경 써야 한다.',
    skill: { id: 'beam', name: '코로나 빔', icon: 'sBeam', cool: 30, dur: 1.8, desc: '정면으로 강력한 빔을 쏟아 적과 보스에게 큰 피해를 준다. 사용 중에는 이동이 느려진다.' },
    stars: { power: 5, mobility: 2, defense: 3, support: 1 },
    base: { speed: 0.92, dmg: 1.3, rate: 0.9, spread: 0, homing: 0, dashMax: 0, dashCool: 1.1, dashDist: 0.9, lives: 0, r: 3.4 },
    nodes: [
      N('hc', 0, 0, '헬리오스 코어', {}, true),
      N('h1', 1, 0, '집속 I', { dmg: 0.10 }),
      N('h2', 2, 0, '집속 II', { dmg: 0.10 }),
      N('h3', 3, 0, '확산 포', { spread: 1 }),
      N('h4', 4, 0, '플레어 캐논', { dmg: 0.14 }),
      N('hu1', 1, -1, '연사 I', { rate: 0.08 }),
      N('hu2', 2, -2, '연사 II', { rate: 0.08 }),
      N('hu3', 3, -2, '관통 탄두', { bossDmg: 0.12 }),
      N('hd1', 0, 1, '냉각 I', { dashCool: -0.08 }),
      N('hd2', 1, 1, '위상 장갑', { dashInv: 0.03 }),
      N('hd3', 2, 1, '외갑 보강', { lives: 1 }),
      N('hw1', -1, 0, '추진기', { speed: 0.08 }),
      N('hw2', -2, 0, '강화 동력', { rate: 0.10 }),
      SK('hs1', 0, -1, '빔 냉각기', { skCool: 0.12 }),
      SK('hs2', 1, -2, '빔 집속 렌즈', { skPow: 0.25 }),
      SK('hs3', 0, -2, '지속 연소기', { skDur: 0.6 })
    ],
    edges: [
      ['hc', 'h1'], ['h1', 'h2'], ['h2', 'h3'], ['h3', 'h4'],
      ['hc', 'hu1'], ['hu1', 'h1'], ['hu1', 'hu2'], ['hu2', 'hu3'],
      ['hc', 'hd1'], ['hd1', 'hd2'], ['hd2', 'h1'], ['hd2', 'hd3'], ['hd3', 'h2'],
      ['hc', 'hw1'], ['hw1', 'hw2'],
      ['hc', 'hs1'], ['hu1', 'hs1'], ['hs1', 'hs2'], ['hs2', 'hs3']
    ],
    passives: [
      { id: 'ph1', name: '태양 폭발', cost: 2, mod: { bossDmg: 0.25 } },
      { id: 'ph2', name: '코로나', cost: 2, mod: { lastStand: 1 } },
      { id: 'ph3', name: '대쉬 점화', cost: 2, mod: { dashShot: 1 } }
    ]
  },

  /* ---------- 세레스: 기동형, 코어에서 갈라져 큰 고리를 도는 루프형 ---------- */
  ceres: {
    id: 'ceres', name: '세레스', role: '기동형 요격기', color: '#8dffb0', accent: '#00a86b', shape: 'needle',
    desc: '빠르고 판정이 작다. 대쉬가 길고 자주 쓸 수 있지만 화력은 낮다.',
    skill: { id: 'clone', name: '잔상 편대', icon: 'sClone', cool: 24, dur: 5, desc: '분신 2기를 불러내 기체 옆에서 함께 사격하게 한다.' },
    stars: { power: 2, mobility: 5, defense: 2, support: 3 },
    base: { speed: 1.15, dmg: 0.85, rate: 1.05, spread: 0, homing: 0, dashMax: 1, dashCool: 0.85, dashDist: 1.15, lives: 0, r: 2.4 },
    nodes: [
      N('cc', 0, 0, '세레스 코어', {}, true),
      N('cs1', 1, 0, '경량 프레임', { speed: 0.06 }),
      N('cs2', -1, 0, '냉각 루프', { dashCool: -0.08 }),
      N('cr1', 2, 0, '냉각 코일', { dashCool: -0.08 }),
      N('cr2', 2, -1, '도약 코일', { dashDist: 0.12 }),
      N('cr3', 2, -2, '예비 코일', { dashMax: 1 }),
      N('cr4', 1, -2, '위상 코일', { dashInv: 0.04 }),
      N('cr5', 0, -2, '연사 코일', { rate: 0.08 }),
      N('cr6', -1, -1, '집속 코일', { dmg: 0.08 }),
      N('cr7', -2, 0, '추진 코일', { speed: 0.08 }),
      N('cr8', -2, 1, '미세 선체', { hit: 0.4 }),
      N('cr9', -2, 2, '인력 코일', { magnet: 0.3 }),
      N('cr10', -1, 2, '보강 코일', { lives: 1 }),
      SK('ks1', 0, -1, '잔상 냉각기', { skCool: 0.12 }),
      SK('ks2', 1, -1, '분신 강화기', { skPow: 0.25 }),
      SK('ks3', 0, 1, '분신 지속기', { skDur: 1.5 })
    ],
    edges: [
      ['cc', 'cs1'], ['cc', 'cs2'], ['cs1', 'cr1'], ['cs1', 'cr2'], ['cr1', 'cr2'],
      ['cr2', 'cr3'], ['cr3', 'cr4'], ['cr4', 'cr5'], ['cr5', 'cr6'], ['cr6', 'cr7'],
      ['cr7', 'cr8'], ['cr8', 'cr9'], ['cr9', 'cr10'],
      ['cs2', 'cr7'], ['cs2', 'cr6'], ['cs2', 'cr8'],
      ['cc', 'ks1'], ['ks1', 'ks2'], ['cc', 'ks3']
    ],
    passives: [
      { id: 'pc1', name: '유성 흡착', cost: 2, mod: { magnet: 1.2, cellDrop: 0.1 } },
      { id: 'pc2', name: '무중력 기동', cost: 2, mod: { dashMax: 1, dashCool: -0.1 } },
      { id: 'pc3', name: '위상 이탈', cost: 2, mod: { dashInv: 0.12, dashBlast: 60 } }
    ]
  },

  /* ---------- 베가: 유도·지원형, 위로 뻗는 줄기와 좌우·아래 가지 (나무형) ---------- */
  vega: {
    id: 'vega', name: '베가', role: '유도 지원기', color: '#d3a4ff', accent: '#7a3cff', shape: 'orb',
    desc: '처음부터 유도 보조탄을 쏜다. 직접 화력은 낮지만 안정적으로 딜을 넣는다.',
    skill: { id: 'missile', name: '유도탄 일제사격', icon: 'sMissile', cool: 22, dur: 0, cnt: 10, desc: '강력한 유도탄을 부채꼴로 한꺼번에 발사한다. 지속 시간 없이 즉시 발동한다.' },
    stars: { power: 3, mobility: 3, defense: 4, support: 5 },
    base: { speed: 1, dmg: 0.85, rate: 0.95, spread: 0, homing: 1, dashMax: 0, dashCool: 1, dashDist: 1, lives: 0, r: 3 },
    nodes: [
      N('vc', 0, 0, '베가 코어', {}, true),
      N('vt1', 0, -1, '추적 신호 I', { homing: 1 }),
      N('vt2', 1, -2, '추적 신호 II', { homing: 1 }),
      N('vt3', 1, -3, '추적 신호 III', { homing: 1 }),
      N('vl1', -1, 0, '연사 안테나', { rate: 0.08 }),
      N('vl2', -2, 0, '위성 방벽', { shield: 1 }),
      N('vl3', -2, -1, '위상 안테나', { dashInv: 0.04 }),
      N('vr1', 1, 0, '집속 렌즈', { dmg: 0.10 }),
      N('vr2', 2, -1, '냉각 렌즈', { dashCool: -0.08 }),
      N('vr3', 3, -2, '보강 렌즈', { lives: 1 }),
      N('vd1', 0, 1, '추진 안테나', { speed: 0.06 }),
      N('vd2', 0, 2, '인력 안테나', { magnet: 0.3 }),
      N('vd3', 1, 1, '공명 렌즈', { scoreMul: 0.08 }),
      SK('vs1', -1, 1, '미사일 냉각기', { skCool: 0.12 }),
      SK('vs2', -1, 2, '탄두 강화', { skPow: 0.25 }),
      SK('vs3', -2, 2, '탄창 확장', { skCnt: 4 })
    ],
    edges: [
      ['vc', 'vt1'], ['vt1', 'vt2'], ['vt2', 'vt3'],
      ['vc', 'vl1'], ['vl1', 'vl2'], ['vl2', 'vl3'], ['vt1', 'vl1'],
      ['vc', 'vr1'], ['vr1', 'vr2'], ['vr2', 'vr3'],
      ['vc', 'vd1'], ['vd1', 'vd2'], ['vd1', 'vd3'], ['vd3', 'vr1'],
      ['vl1', 'vs1'], ['vd1', 'vs1'], ['vs1', 'vs2'], ['vs2', 'vs3']
    ],
    passives: [
      { id: 'pv1', name: '추적 신호 증폭', cost: 2, mod: { homingDmg: 0.4 } },
      { id: 'pv2', name: '위성 수호', cost: 2, mod: { shield: 1, shieldRegen: 1 } },
      { id: 'pv3', name: '항성 공명', cost: 2, mod: { scoreMul: 0.2, cellDrop: 0.06 } }
    ]
  }
};

const MOD_KEYS = ['dmg', 'rate', 'speed', 'dashMax', 'dashCool', 'dashInv', 'dashDist', 'lives', 'shield', 'homing', 'spread',
  'hit', 'magnet', 'scoreMul', 'bossDmg', 'cellDrop', 'shieldRegen', 'revive', 'dashBlast', 'dashShot', 'lastStand', 'homingDmg',
  'skCool', 'skPow', 'skDur', 'skCnt'];

const GLYPH = { dmg: '공', rate: '연', speed: '속', dashMax: '대', dashCool: '충', dashInv: '무', dashDist: '거', lives: '♥', shield: '방',
  homing: '유', spread: '확', hit: '소', magnet: '흡', scoreMul: '점', bossDmg: '보', cellDrop: '셀', shieldRegen: '방', revive: '재',
  dashBlast: '파', dashShot: '탄', lastStand: '분', homingDmg: '유' };

// 스킬 노드 아이콘 (중심 0,0 기준 ±10 범위의 SVG 도형). 'f' 접두는 채움, 나머지는 선.
const SHIELD_PATH = 'M0,-9 L8,-6 V1 C8,6 4,9 0,10 C-4,9 -8,6 -8,1 V-6 Z';
const ICONS = {
  core:        { f: 'M0,-10 L2.9,-3.5 L9.5,-3.1 L4.5,1.4 L6,8.1 L0,4.6 L-6,8.1 L-4.5,1.4 L-9.5,-3.1 L-2.9,-3.5 Z' },
  dmg:         { f: 'M0,-10 L2.5,-2.5 L10,0 L2.5,2.5 L0,10 L-2.5,2.5 L-10,0 L-2.5,-2.5 Z' },
  rate:        { s: 'M-6,3 V-5 M0,7 V-9 M6,3 V-5', w: 3.2 },
  speed:       { s: 'M-8,-7 L0,0 L-8,7 M0,-7 L8,0 L0,7' },
  dashMax:     { s: 'M-8,-6 H8 M-8,0 H8 M-8,6 H8', w: 3 },
  dashCool:    { s: 'M0,-4 V0 L4,2', c: [[0, 0, 8.5]] },
  dashInv:     { c: [[0, 0, 8.5, '3 3']], d: [[0, 0, 2.6]] },
  dashDist:    { s: 'M-9,0 H9 M-5,-4 L-9,0 L-5,4 M5,-4 L9,0 L5,4' },
  lives:       { f: 'M0,8 C-12,0 -9,-9 -4,-8 C-1,-7 0,-4 0,-3 C0,-4 1,-7 4,-8 C9,-9 12,0 0,8 Z' },
  shield:      { s: SHIELD_PATH },
  homing:      { s: 'M0,-10 V-5 M0,5 V10 M-10,0 H-5 M5,0 H10', c: [[0, 0, 5.5]], d: [[0, 0, 1.6]] },
  spread:      { s: 'M0,8 L-9,-6 M0,8 L0,-9 M0,8 L9,-6' },
  hit:         { c: [[0, 0, 9, '2.5 3']], d: [[0, 0, 2.8]] },
  magnet:      { s: 'M-6.5,-9 V1 A6.5,6.5 0 0 0 6.5,1 V-9 M-9.5,-9 H-3.5 M3.5,-9 H9.5', w: 2.8 },
  scoreMul:    { s: 'M-8,-2 L-4,-8 H4 L8,-2 L0,9 Z M-8,-2 H8' },
  bossDmg:     { s: 'M-9,6 L-9,-5 L-4,0 L0,-8 L4,0 L9,-5 L9,6 Z' },
  cellDrop:    { s: 'M-6,-6 H6 V9 H-6 Z M-2.5,-9 H2.5 M1,-3 L-2,2 H2 L-1,7' },
  shieldRegen: { s: SHIELD_PATH + ' M0,-3 V5 M-4,1 H4' },
  revive:      { s: 'M7.5,-3.5 A8,8 0 1 0 8,2 M8.5,-9 V-3 H2.5' },
  dashBlast:   { s: 'M0,-10 V-6 M0,6 V10 M-10,0 H-6 M6,0 H10 M-7,-7 L-4.2,-4.2 M7,7 L4.2,4.2 M7,-7 L4.2,-4.2 M-7,7 L-4.2,4.2', c: [[0, 0, 2.5]] },
  dashShot:    { d: [[0, -8, 1.8], [5.7, -5.7, 1.8], [8, 0, 1.8], [5.7, 5.7, 1.8], [0, 8, 1.8], [-5.7, 5.7, 1.8], [-8, 0, 1.8], [-5.7, -5.7, 1.8], [0, 0, 3]] },
  lastStand:   { f: 'M0,-10 C4,-4 8,-1 8,4 A8,8 0 0 1 -8,4 C-8,0 -4,-2 0,-10 Z' },
  // 스킬 관련
  skCool:      { s: 'M-2.5,-10 H2.5 M0,-10 V-7 M0,2 L3.5,-1.5', c: [[0, 2, 7.5]] },
  skPow:       { f: 'M2.5,-10 L-5,2 H0 L-2.5,10 L6,-3 H1 Z' },
  skDur:       { s: 'M-6,-9 H6 L0,0 L6,9 H-6 L0,0 Z' },
  skCnt:       { s: 'M-6,9 V-2 M-8.5,1 L-6,-3 L-3.5,1 M0,9 V-7 M-2.5,-3 L0,-7 L2.5,-3 M6,9 V-2 M3.5,1 L6,-3 L8.5,1' },
  // 고유 스킬 아이콘
  sWarp:       { c: [[0, 0, 9, '3 2.5'], [0, 0, 5]], d: [[0, 0, 1.8]] },
  sBeam:       { f: 'M-3,-10 H3 V10 H-3 Z', s: 'M-7,-8 V10 M7,-8 V10' },
  sClone:      { s: 'M0,-9 L5,2 L0,0 L-5,2 Z M-9,3 L-5.5,10 L-8,8.5 L-10,10 Z M9,3 L5.5,10 L8,8.5 L10,10 Z' },
  sMissile:    { s: 'M-7,9 L-2,-6 M0,9 V-9 M7,9 L2,-6 M-4,-2 L-2,-6 L0,-3 M-2,-6 M2,-6 L4,-2 M0,-9 L-2.5,-5 M0,-9 L2.5,-5' },
  homingDmg:   { s: 'M-10,10 L-3.5,3.5 M-6,10 L-2.5,6.5 M-10,6 L-6.5,2.5', c: [[3, -3, 5.5]], d: [[3, -3, 1.8]] }
};

const Ships = {
  order: ['astra', 'helios', 'ceres', 'vega'],

  /* ----- 저장 데이터 ----- */
  data(k) {
    if (!Store.data.ships) Store.data.ships = {};
    let d = Store.data.ships[k];
    if (!d) d = Store.data.ships[k] = { earned: 0, nodes: [], passives: [] };
    if (!Array.isArray(d.nodes)) d.nodes = [];
    if (!Array.isArray(d.passives)) d.passives = [];
    if (typeof d.earned !== 'number') d.earned = 0;
    return d;
  },
  spent(k) {
    const d = this.data(k), def = SHIPS[k];
    let s = d.nodes.length;
    for (const p of def.passives) if (d.passives.includes(p.id)) s += p.cost;
    return s;
  },
  points(k) { return this.data(k).earned - this.spent(k); },

  /* ----- 그래프 ----- */
  node(k, id) { return SHIPS[k].nodes.find(n => n.id === id) || null; },
  passive(k, id) { return SHIPS[k].passives.find(p => p.id === id) || null; },
  neighbors(k, id) {
    const out = [];
    for (const [a, b] of SHIPS[k].edges) { if (a === id) out.push(b); else if (b === id) out.push(a); }
    return out;
  },
  isActive(k, id) {
    const n = this.node(k, id);
    if (n && n.core) return true;
    const d = this.data(k);
    return d.nodes.includes(id) || d.passives.includes(id);
  },
  // 활성 노드와 간선으로 이어져 있어 (포인트만 있으면) 활성화할 수 있는 상태인가
  reachable(k, id) {
    const n = this.node(k, id);
    if (!n || n.core || this.isActive(k, id)) return false;
    return this.neighbors(k, id).some(o => this.isActive(k, o));
  },
  canBuyNode(k, id) { return this.reachable(k, id) && this.points(k) >= 1; },
  canBuyPassive(k, id) { const p = this.passive(k, id); return !!p && !this.isActive(k, id) && this.points(k) >= p.cost; },
  buyNode(k, id) {
    if (!this.canBuyNode(k, id)) return false;
    this.data(k).nodes.push(id); Store.save(); return true;
  },
  buyPassive(k, id) {
    if (!this.canBuyPassive(k, id)) return false;
    this.data(k).passives.push(id); Store.save(); return true;
  },
  reset(k) { const d = this.data(k); d.nodes = []; d.passives = []; Store.save(); }, // 포인트는 환불된다

  /* ----- 능력치 합산 ----- */
  // 고유 스킬의 현재 수치: 기본값에 활성화한 스킬 노드를 반영한다
  skillStats(k, modsIn) {
    const sk = SHIPS[k].skill, m = modsIn || this.mods(k);
    return {
      cool: Math.max(sk.cool * 0.45, sk.cool * (1 - m.skCool)),
      dur: sk.dur + m.skDur, pow: m.skPow, cnt: (sk.cnt || 0) + m.skCnt
    };
  },

  mods(k) {
    const m = {};
    for (const key of MOD_KEYS) m[key] = 0;
    const def = SHIPS[k], d = this.data(k);
    const add = mod => { for (const key in mod) m[key] = (m[key] || 0) + mod[key]; };
    for (const n of def.nodes) if (n.core || d.nodes.includes(n.id)) add(n.mod);
    for (const p of def.passives) if (d.passives.includes(p.id)) add(p.mod);
    return m;
  },

  /* ----- 포인트 지급 (중복 방지) ----- */
  // tag: 's1' | 's2' | 's3' (스테이지 클리어, +1) | 'g' (게임 클리어, +2)
  // (기체, 난이도, tag)마다 한 번만 지급하고, 이미 받았으면 0을 돌려준다.
  award(k, diff, tag) {
    if (!SHIPS[k]) return 0;
    if (!Store.data.clears) Store.data.clears = {};
    const key = k + ':' + diff;
    const rec = Store.data.clears[key] || (Store.data.clears[key] = {});
    if (rec[tag]) return 0;
    rec[tag] = true;
    const n = /g$/.test(tag) ? 2 : 1; // 'g'(챕터 1)·'bg'(챕터 2) = 게임 클리어 +2
    this.data(k).earned += n;
    Store.save();
    return n;
  },
  clearRec(k, diff) { return (Store.data.clears && Store.data.clears[k + ':' + diff]) || {}; },

  /* ----- 표시용 텍스트 ----- */
  describe(mod) {
    const pc = v => Math.round(Math.abs(v) * 100);
    const T = {
      dmg: v => `공격력 +${pc(v)}%`, rate: v => `연사 속도 +${pc(v)}%`, speed: v => `이동 속도 +${pc(v)}%`,
      dashMax: v => `대쉬 스톡 +${v}`, dashCool: v => `대쉬 충전 시간 -${pc(v)}%`, dashInv: v => `대쉬 무적 +${v.toFixed(2)}초`,
      dashDist: v => `대쉬 거리 +${pc(v)}%`, lives: v => `목숨 +${v}`, shield: () => '스테이지 시작 시 실드 1회',
      homing: v => `유도 보조탄 +${v}단계`, spread: v => `확산 포 +${v}단계`, hit: v => `피격 판정 -${v}px`,
      magnet: v => `아이템 흡수 범위 +${pc(v)}%`, scoreMul: v => `획득 점수 +${pc(v)}%`, bossDmg: v => `보스 피해 +${pc(v)}%`,
      cellDrop: v => `적 처치 시 ${pc(v)}% 확률로 에너지 셀 드랍`, shieldRegen: () => '웨이브 클리어마다 실드 재충전',
      revive: () => '치명 피격 시 목숨 1로 부활 (한 판에 1회)', dashBlast: v => `대쉬 시작 시 반경 ${v}px 탄 소거`,
      dashShot: () => '대쉬 시작 시 사방으로 탄 발사', lastStand: () => '목숨 1개일 때 공격력 +35%, 연사 +20%',
      homingDmg: v => `유도 보조탄 피해 +${pc(v)}%`,
      skCool: v => `고유 스킬 쿨타임 -${pc(v)}%`, skPow: v => `고유 스킬 위력 +${pc(v)}%`,
      skDur: v => `고유 스킬 지속 시간 +${v}초`, skCnt: v => `고유 스킬 유도탄 +${v}발`
    };
    return Object.keys(mod).map(k => (T[k] ? T[k](mod[k]) : k)).join(', ') || '효과 없음 (시작 노드)';
  },
  glyph(n) { if (n.core) return '★'; const k = Object.keys(n.mod)[0]; return GLYPH[k] || '·'; },
  // 노드/패시브의 첫 번째 효과에 해당하는 아이콘을 SVG 조각으로 돌려준다 (글자 대신 그림)
  iconSvg(n) {
    const ic = ICONS[n.icon || (n.core ? 'core' : Object.keys(n.mod)[0])] || ICONS.dmg;
    let o = '';
    if (ic.f) o += `<path class="f" d="${ic.f}"/>`;
    if (ic.s) o += `<path d="${ic.s}"${ic.w ? ` style="stroke-width:${ic.w}"` : ''}/>`;
    for (const c of ic.c || []) o += `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"${c[3] ? ` stroke-dasharray="${c[3]}"` : ''}/>`;
    for (const d of ic.d || []) o += `<circle class="f" cx="${d[0]}" cy="${d[1]}" r="${d[2]}"/>`;
    return o;
  },

  /* ----- 기체 그리기 (게임 화면·카드 아이콘 공용) ----- */
  drawShip(ctx, def, x, y, color, glow, sc) {
    ctx.save();
    ctx.translate(x, y);
    if (sc) ctx.scale(sc, sc);
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    ctx.fillStyle = color;
    ctx.beginPath();
    switch (def.shape) {
      case 'wing':
        ctx.moveTo(0, -13); ctx.lineTo(16, 11); ctx.lineTo(7, 8); ctx.lineTo(0, 13); ctx.lineTo(-7, 8); ctx.lineTo(-16, 11); ctx.closePath();
        break;
      case 'needle':
        ctx.moveTo(0, -18); ctx.lineTo(5, 9); ctx.lineTo(0, 5); ctx.lineTo(-5, 9); ctx.closePath();
        break;
      case 'orb':
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.moveTo(-8, -3); ctx.lineTo(-16, 9); ctx.lineTo(-6, 6); ctx.closePath();
        ctx.moveTo(8, -3); ctx.lineTo(16, 9); ctx.lineTo(6, 6); ctx.closePath();
        break;
      default:
        ctx.moveTo(0, -14); ctx.lineTo(10, 11); ctx.lineTo(0, 6); ctx.lineTo(-10, 11); ctx.closePath();
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.accent;
    ctx.beginPath();
    if (def.shape === 'orb') ctx.arc(0, 0, 4, 0, Math.PI * 2);
    else { ctx.moveTo(0, -6); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.closePath(); }
    ctx.fill();
    if (glow) { // 엔진 불꽃
      ctx.fillStyle = 'rgba(255,200,120,0.9)';
      ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(3, 8); ctx.lineTo(0, 14 + Math.random() * 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
};
