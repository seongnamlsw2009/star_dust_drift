import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 브라우저용 js/cloud.js를 불러와 merge만 검사한다
const ctx = {};
vm.runInNewContext(readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8') + '\nthis.Cloud = Cloud;', ctx);
const { Cloud } = ctx;

test('두 기기의 기록을 합친다', () => {
  const local = {
    best: { normal: 100, hard: 50 }, bestTime: { normal: 300 }, cleared: { normal: true },
    modeBest: { 'endless:normal': { score: 10, time: 0, wave: 8 } },
    clears: { 'astra:normal': { s1: true } },
    ships: { astra: { earned: 1, nodes: [], passives: [] } },
    vol: { sfx: 0.2, bgm: 0.1 }, lastShip: 'astra'
  };
  const remote = {
    best: { normal: 80, easy: 70 }, bestTime: { normal: 250, hard: 400 }, cleared: { hard: true },
    modeBest: { 'endless:normal': { score: 20, time: 0, wave: 5 } },
    clears: { 'astra:normal': { s2: true } },
    ships: { astra: { earned: 4, nodes: ['n1'], passives: [] }, nova: { earned: 2, nodes: [], passives: [] } },
    vol: { sfx: 0.9, bgm: 0.9 }, lastShip: 'nova'
  };
  const m = JSON.parse(JSON.stringify(Cloud.merge(local, remote)));
  assert.deepEqual(m.best, { normal: 100, hard: 50, easy: 70 });
  assert.deepEqual(m.bestTime, { normal: 250, hard: 400 });
  assert.deepEqual(m.cleared, { normal: true, hard: true });
  assert.deepEqual(m.modeBest['endless:normal'], { score: 20, time: 0, wave: 8 });
  assert.deepEqual(m.clears['astra:normal'], { s1: true, s2: true });
  assert.equal(m.ships.astra.earned, 4);
  assert.equal(m.ships.nova.earned, 2);
  assert.deepEqual(m.vol, local.vol); // 설정은 지금 기기 값
  assert.equal(m.lastShip, 'astra');
});
