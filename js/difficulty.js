'use strict';
// 난이도 4종 수치 테이블 (기획서 4장)
const W = 640, H = 640, PW = 480; // 전체 캔버스, 높이, 플레이 영역 폭

const DIFF_ORDER = ['easy', 'normal', 'hard', 'nightmare'];
const DIFFS = {
  easy:      { key: 'easy',      name: 'Easy',      dens: 0.6, spd: 0.8, lives: 5, dashCool: 2,   dashInv: 0.30, hpMul: 0.8, final: 'luna',   final2: 'aurora', final3: 'lyra',   choices: 4, score: 0.5, cap: 150, color: '#6fe0a0' },
  normal:    { key: 'normal',    name: 'Normal',    dens: 1.0, spd: 1.0, lives: 3, dashCool: 3,   dashInv: 0.25, hpMul: 1.0, final: 'nebula', final2: 'andromeda', final3: 'orion', choices: 3, score: 1.0, cap: 250, color: '#7fb8ff' },
  hard:      { key: 'hard',      name: 'Hard',      dens: 1.4, spd: 1.2, lives: 3, dashCool: 3.5, dashInv: 0.22, hpMul: 1.2, final: 'quasar', final2: 'sirius', final3: 'cygnus', choices: 3, score: 1.5, cap: 400, color: '#ffb347' },
  nightmare: { key: 'nightmare', name: 'Nightmare', dens: 1.8, spd: 1.4, lives: 2, dashCool: 4,   dashInv: 0.20, hpMul: 1.4, final: 'erebus', final2: 'omega', final3: 'sagittarius', choices: 3, score: 2.5, cap: 600, color: '#ff5d73' }
};
