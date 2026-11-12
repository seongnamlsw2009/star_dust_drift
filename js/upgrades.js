'use strict';
// 업그레이드 보상 (기획서 6장) — 중간보스 처치마다 선택
const UPGRADES = [
  { id: 'dmg',        name: '공격력 강화',     desc: '기본 공격 피해 +15%',            max: 3 },
  { id: 'rate',       name: '연사 가속',       desc: '발사 속도 +15%',                 max: 3 },
  { id: 'spread',     name: '확산 포',         desc: '발사 줄 수 증가 (1줄 → 3줄 → 5줄)', max: 2 },
  { id: 'homing',     name: '유도 보조탄',     desc: '적을 추적하는 보조탄 추가',        max: 2 },
  { id: 'dashStock',  name: '대쉬 스톡 확장',  desc: '대쉬 충전량 +1',                  max: 2 },
  { id: 'dashCharge', name: '대쉬 가속 충전',  desc: '대쉬 충전 시간 -20%',             max: 3 },
  { id: 'phase',      name: '위상 장갑',       desc: '대쉬 무적 시간 +0.05초',          max: 2 },
  { id: 'repair',     name: '수리 모듈',       desc: '목숨 +1 (최대 6)',                max: 2 },
  { id: 'shield',     name: '에너지 실드',     desc: '스테이지마다 첫 피격 1회 무효',    max: 1 },
  // 아래는 스킬 트리와 같은 mod 값을 더하는 추가 모듈 (Player.applyUpgrade가 mods에 합산)
  { id: 'speed',      name: '추진기 개량',     desc: '이동 속도 +8%',                  max: 3, mod: { speed: 0.08 } },
  { id: 'magnet',     name: '자기장 수집기',   desc: '아이템 흡수 범위 +35%',           max: 2, mod: { magnet: 0.35 } },
  { id: 'score',      name: '데이터 분석기',   desc: '획득 점수 +10%',                 max: 3, mod: { scoreMul: 0.1 } },
  { id: 'bossDmg',    name: '대형 표적 조준기', desc: '보스에게 주는 피해 +10%',         max: 3, mod: { bossDmg: 0.1 } },
  { id: 'hit',        name: '초정밀 코어',     desc: '피격 판정 -0.3px',               max: 2, mod: { hit: 0.3 } },
  { id: 'dashDist',   name: '확장 추진 노즐',  desc: '대쉬 거리 +15%',                 max: 2, mod: { dashDist: 0.15 } },
  { id: 'dashBlast',  name: '충격파 대쉬',     desc: '대쉬할 때 주변 탄 제거 (반경 70)', max: 1, mod: { dashBlast: 70 } },
  { id: 'cellDrop',   name: '에너지 변환기',   desc: '적 처치 시 에너지 셀 드랍 확률 +8%', max: 2, mod: { cellDrop: 0.08 } },
  { id: 'regenShield', name: '재생 실드',      desc: '웨이브 클리어마다 실드 재충전',     max: 1, mod: { shieldRegen: 1 } }
];

function rollUpgradeChoices(ups, n) {
  const pool = UPGRADES.filter(u => (ups[u.id] || 0) < u.max);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}
