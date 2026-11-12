'use strict';
// 최고 기록·설정 저장 (localStorage 실패 시에도 게임이 멈추지 않도록 try/catch)
const Store = {
  key: 'star_dust_drift_v1',
  data: {
    best: {},          // 난이도별 최고 점수
    bestTime: {},      // 난이도별 최단 클리어 시간(초)
    cleared: {},       // 난이도별 클리어 여부 (최종보스 이름 공개용)
    modeBest: {},      // 도전/무한 모드 기록 { '모드:난이도': { score, time, wave } }
    ships: {},         // 기체별 스킬 포인트·활성 노드 { earned, nodes[], passives[] }
    clears: {},        // 포인트를 이미 받은 구간 { '기체:난이도': { s1, s2, s3, g } }
    lastShip: 'astra', // 마지막으로 고른 기체
    vol: { sfx: 0.7, bgm: 0.5 },
    skipIntro: false,
    shake: true,
    colorblind: false
  },
  load() {
    try {
      const s = localStorage.getItem(this.key);
      if (s) {
        const d = JSON.parse(s);
        Object.assign(this.data, d);
        this.data.vol = Object.assign({ sfx: 0.7, bgm: 0.5 }, d.vol || {});
      }
    } catch (e) { /* 저장소를 쓸 수 없어도 계속 진행 */ }
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }
};
