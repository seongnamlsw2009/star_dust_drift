'use strict';
// 게임 진행: 스테이지·웨이브·보스·아이템·점수·렌더링 (기획서 3~5, 8장)
const UI_FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif';

const Game = {
  D: DIFFS.normal,
  phase: 'idle',      // break | wave | warning | boss | upgrade | done | dead | idle
  stageIdx: 0, waveIdx: 0, wave: null,
  waveT: 0, breakT: 0, warnT: 0, spawnQ: [], hazards: [], enemies: [],
  boss: null, warnBoss: null,
  items: [], parts: [], texts: [], banner: null,
  score: 0, combo: 0, waveHit: false, hits: 0, stageT: 0, runT: 0, repairPieces: 0, kills: 0,
  shake: 0, time: 0, wobble: 0, vignette: 0,
  stars: [],
  result: null,
  onUpgrade: null, onClear: null, onGameOver: null,

  init() {
    Bullets.init();
    this.stars = [];
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random() * W, y: Math.random() * H, l: i % 3, tw: Math.random() * 6 });
  },

  /* ---------- 시작 / 진행 ---------- */
  // mode: 'story'(기본) | 'challenge'(웨이브마다 중간보스, 스테이지 끝 최종보스) | 'endless'(무한 모드)
  start(diffKey, practice, shipKey, mode, chapter) {
    this.D = DIFFS[diffKey];
    this.mode = practice ? 'story' : (mode || 'story');
    this.chapter = practice ? (practice.chapter || 0) : (this.mode === 'story' ? (chapter || 0) : 0); // 챕터 2는 스토리·연습 모드 전용
    this.loop = 0; this.waveTotal = 0; this.bossKills = 0; this.upNext = null;
    this.dMul = 1; this.sMul = 1; this.hMul = 1;
    this.practice = practice || null; // 연습 모드 설정 { stage, target, ups }
    this.shipKey = SHIPS[shipKey] ? shipKey : 'astra';
    this.pointsEarned = 0; this.lastAward = 0; this.awardRows = 0; // 이번 판에서 받은 스킬 포인트
    Player.reset(this.D, this.shipKey);
    Bullets.clear(); Bullets.cap = this.D.cap;
    this.enemies = []; this.items = []; this.parts = []; this.texts = [];
    this.boss = null; this.warnBoss = null; this.banner = null;
    this.score = 0; this.combo = 0; this.hits = 0; this.runT = 0; this.stageT = 0;
    this.repairPieces = 0; this.kills = 0; this.shake = 0; this.wobble = 0; this.vignette = 0;
    this.result = null;
    if (this.practice) { this.startPractice(this.practice); return; }
    this.stageIdx = 0;
    this.startStage();
  },

  /* ---------- 챕터별 데이터 ---------- */
  stages() { return CH_STAGES[this.chapter || 0]; },
  story() { return Story.chapters[this.chapter || 0]; },
  diffFinal() { return finalOf(this.D, this.chapter); },
  chKey(k) { return this.chapter > 0 ? 'c' + (this.chapter + 1) + ':' + k : k; },       // 기록 저장 키 (챕터별로 분리)
  tag(n) { return ['s', 'b', 'c'][this.chapter || 0] + n; }, // 챕터 3: c1~c3 / cg        // 스킬 포인트 구간 태그: s1~s3/g (챕터 1), b1~b3/bg (챕터 2)
  stageBgm() { return ['stage', 'c2s', 'c3s'][this.chapter || 0] + (this.stageIdx + 1); },

  // 연습 모드: 선택한 웨이브/중간보스/최종보스 하나만 플레이한다. 목숨은 줄지 않고 기록도 저장하지 않는다.
  startPractice(cfg) {
    this.stageIdx = cfg.stage;
    if (cfg.ups) { // 진행 수준에 맞는 업그레이드 지급
      const n = cfg.target === 'final' ? 3 : cfg.stage;
      ['rate', 'dmg', 'dashStock'].slice(0, n).forEach(id => Player.applyUpgrade(id));
    }
    Player.stageStart();
    Bullets.clear(); this.stageT = 0; this.waveIdx = 0;
    if (typeof cfg.target === 'number') {
      this.waveIdx = cfg.target - 1;
      this.phase = 'break'; this.breakT = 1.8;
      this.setBanner('PRACTICE', this.story().stageNames[cfg.stage] + ' — WAVE ' + cfg.target, 1.6);
      Sound.bgm(this.stageBgm());
    } else {
      this.phase = 'warning'; this.warnT = 2.4;
      this.warnBoss = cfg.target === 'final' ? this.diffFinal() : this.stages()[cfg.stage].mid;
      this.setBanner('WARNING', '연습 모드', 2.2);
      Sound.play('warn');
    }
  },

  // 스킬 포인트 지급. (기체, 난이도, 구간)마다 처음 한 번만 지급하고, 연습 모드에서는 지급하지 않는다.
  award(tag) {
    if (this.practice || this.mode !== 'story') return 0; // 연습·도전·무한 모드는 포인트 없음
    const n = Ships.award(this.shipKey, this.D.key, tag);
    if (n > 0) {
      this.pointsEarned += n; this.lastAward += n;
      this.floatText(PW / 2, 190 + 24 * this.awardRows++, '스킬 포인트 +' + n, '#9dffb0');
    }
    return n;
  },

  finishPractice() {
    this.result = { cleared: true, practice: true, bonus: 0 };
    this.phase = 'done';
    Sound.play('clear');
    setTimeout(() => { if (this.onClear) this.onClear(); }, 1800);
  },

  // 무한 모드: 반복할수록 탄 밀도·속도·체력이 올라간다 (스테이지 하나마다 한 단계)
  applyScale() {
    const lvl = this.mode === 'endless' ? this.loop * 3 + this.stageIdx : 0;
    this.dMul = 1 + 0.08 * lvl;
    this.sMul = Math.min(1.35, 1 + 0.03 * lvl);
    this.hMul = 1 + 0.12 * lvl;
    Bullets.cap = Math.min(1400, Math.round(this.D.cap * (1 + 0.06 * lvl)));
  },

  FINALS: ['luna', 'nebula', 'quasar', 'erebus'],
  // 도전 모드: 웨이브 n의 중간보스 / 스테이지 끝 최종보스
  challengeMid() { const ids = ['meteora', 'pulsar', 'eclipse']; return ids[(this.stageIdx + this.waveIdx + 2) % 3]; },
  challengeFinal() { return this.stageIdx < 2 ? this.FINALS[this.stageIdx] : (this.D.key === 'nightmare' ? 'erebus' : 'quasar'); },
  endlessFinal() { return this.FINALS[(DIFF_ORDER.indexOf(this.D.key) + this.loop) % 4]; },
  finalId() { return this.mode === 'endless' ? this.endlessFinal() : this.diffFinal(); },

  queueBoss(id) {
    this.phase = 'warning'; this.warnT = 2.4; this.warnBoss = id;
    this.setBanner('WARNING', BOSSES[id].name + ' — ' + BOSSES[id].title, 2.2);
    Sound.play('warn');
  },

  // 업그레이드 선택을 띄우고, 선택이 끝나면 next를 실행한다 (선택지가 없으면 바로 진행)
  offerUpgrade(next) {
    this.upNext = next; this.phase = 'upgrade';
    this.upgradeChoices = rollUpgradeChoices(Player.ups, this.D.choices);
    if (!this.upgradeChoices.length) { this.pickUpgrade(null); return; }
    setTimeout(() => { if (this.onUpgrade) this.onUpgrade(this.upgradeChoices); }, 1200);
  },

  startStage() {
    this.applyScale();
    this.waveIdx = 0; this.stageT = 0;
    Player.stageStart();
    Bullets.clear();
    this.phase = 'break'; this.breakT = 2.8;
    const sv = this.story();
    this.setBanner('STAGE ' + (this.stageIdx + 1), sv.stageNames[this.stageIdx] + ' — ' + sv.stageSubs[this.stageIdx], 2.6);
    Sound.bgm(this.stageBgm());
  },

  startWave() {
    const st = this.stages()[this.stageIdx];
    this.wave = st.waves[this.waveIdx];
    this.waveT = 0; this.waveHit = false; this.waveEnding = false;
    this.spawnQ = [];
    const hardOn = this.D.key === 'hard' || this.D.key === 'nightmare';
    for (const sp of this.wave.spawns) {
      if (sp.hard && !hardOn) continue; // 강화 적은 Hard 이상에서만 등장
      for (let i = 0; i < sp.n; i++) this.spawnQ.push({ t: (sp.delay || 0) + i * (sp.gap || 0), spec: sp, i, n: sp.n });
    }
    this.spawnQ.sort((a, b) => a.t - b.t);
    this.hazards = (this.wave.hazards || []).map(a => ({ a, st: Patterns.newState(a) }));
    this.phase = 'wave';
    this.setBanner('WAVE ' + (this.waveIdx + 1), '', 1.4);
    Sound.play('wave');
  },

  endWave() {
    Bullets.clearWithFx((x, y, c) => this.spark(x, y, c));
    Sound.play('wave');
    if (Player.mods.shieldRegen > 0) Player.shieldReady = true; // 패시브: 웨이브 클리어마다 실드 재충전
    const noHit = !this.waveHit;
    this.addScore(noHit ? 1500 : 1000);
    if (noHit) { this.combo++; this.floatText(PW / 2, 220, '무피격 콤보 ×' + this.combo, '#9dffb0'); }
    this.waveIdx++; this.waveTotal++;
    if (this.practice) { this.finishPractice(); return; }
    if (this.waveIdx < 5) {
      this.phase = 'break'; this.breakT = 2;
    } else {
      this.phase = 'warning'; this.warnT = 3.2;
      const stg = this.stages()[this.stageIdx];
      this.warnBoss = stg.mid;
      this.setBanner('WARNING', stg.warn || (stg.mid === 'meteora' ? '거대한 운석의 기척이 다가온다' : '강대한 존재가 접근 중'), 3);
      Sound.play('warn');
    }
  },

  bestScore() {
    if (this.mode === 'story') return Store.data.best[this.chKey(this.D.key)] || 0;
    const r = (Store.data.modeBest || {})[this.mode + ':' + this.D.key];
    return r ? r.score : 0;
  },

  setBanner(text, sub, dur) { this.banner = { text, sub: sub || '', t: dur, dur }; },

  addScore(base) {
    const v = Math.round(base * (1 + 0.1 * Math.min(5, this.combo)) * this.D.score * (1 + (Player.mods.scoreMul || 0)));
    this.score += v;
    return v;
  },

  /* ---------- 업데이트 ---------- */
  update(dt) {
    this.time += dt; this.runT += dt;
    if (this.phase !== 'break' || true) this.stageT += dt;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    if (this.shake > 0) this.shake -= dt;

    const E = Patterns.env;
    E.dens = this.D.dens * this.dMul; E.spd = this.D.spd * this.sMul; E.px = Player.x; E.py = Player.y;

    // 에레보스 중력 왜곡
    let pull = null;
    if (this.boss && this.boss.state === 'fight') {
      const ph = this.boss.def.phases[this.boss.phase];
      if (ph.pull) pull = { x: this.boss.x, y: this.boss.y, k: ph.pull };
      this.wobble = ph.wobble ? 1 : 0;
    } else this.wobble = 0;

    Player.update(dt, this.targets(), pull);

    switch (this.phase) {
      case 'break':
        this.breakT -= dt;
        if (this.breakT <= 0) { if (this.mode === 'challenge') this.queueBoss(this.challengeMid()); else this.startWave(); }
        break;
      case 'wave': this.updateWave(dt); break;
      case 'warning':
        this.warnT -= dt;
        if (this.warnT <= 0) this.spawnBoss(this.warnBoss);
        break;
      case 'boss': this.updateBoss(dt); break;
    }

    for (const e of this.enemies) Enemies.update(e, dt);
    this.enemies = this.enemies.filter(e => !e.dead);

    Bullets.update(dt, Player.x, Player.y);

    this.collide();
    this.updateItems(dt);
    this.updateFx(dt);
  },

  targets() {
    const t = this.enemies.filter(e => e.y > 0);
    if (this.boss && this.boss.state === 'fight') t.push(this.boss);
    return t;
  },

  updateWave(dt) {
    const w = this.wave;
    this.waveT += dt;
    while (this.spawnQ.length && this.spawnQ[0].t <= this.waveT) {
      const q = this.spawnQ.shift();
      this.enemies.push(Enemies.spawn(q.spec, q.i, q.n, { hpMul: this.D.hpMul * this.hMul }));
    }
    if (!this.waveEnding) {
      for (const h of this.hazards) Patterns.update(h.a, h.st, dt, PW / 2, 0);
    }
    const done = this.spawnQ.length === 0 && this.enemies.length === 0;
    if (!this.waveEnding && this.waveT >= w.dur && !done) {
      this.waveEnding = true; this.spawnQ = [];
      for (const e of this.enemies) e.flee = true;
    }
    if (done || (this.waveEnding && this.enemies.length === 0) || this.waveT > w.dur + 8) this.endWave();
  },

  /* ---------- 보스 ---------- */
  spawnBoss(id) {
    const def = BOSSES[id];
    const bossMul = this.mode === 'challenge' ? (def.mid ? 0.7 : 1) : (this.mode === 'endless' ? this.hMul : 1); // 도전 모드의 웨이브 보스는 15번 연속이라 체력을 줄였다
    const hpTotal = (def.mid ? def.hp * this.D.hpMul : def.hp) * bossMul;
    this.boss = { def, hpTotal, phase: -1, state: 'enter', t: 0, x: PW / 2, y: -80, hp: 1, hpMax: 1, st: [], limitT: 0, introT: 0, tx: PW / 2, ty: 130, jumpT: 0, r: def.r + 4, ang: 0 };
    this.phase = 'boss';
    Sound.bgm(def.final ? ['final', 'final2', 'final3'][this.chapter || 0] : 'mid');
    this.setBanner(def.name, def.title, 2.6);
    Bullets.clear();
  },

  startPhase(i) {
    const b = this.boss, ph = b.def.phases[i];
    b.phase = i; b.hpMax = b.hpTotal * ph.share; b.hp = b.hpMax;
    b.limitT = ph.limit; b.state = 'intro'; b.introT = 1.7; b.jumpT = 0; b.t = 0;
    b.st = ph.attacks.map(a => ({ a, st: Patterns.newState(a) }));
    Bullets.clearWithFx((x, y, c) => this.spark(x, y, c));
    Sound.play('phase');
    this.setBanner(ph.name, 'PHASE ' + (i + 1) + ' / ' + b.def.phases.length, 1.7);
    this.shake = 0.25;
  },

  updateBoss(dt) {
    const b = this.boss, def = b.def;
    b.ang += dt;
    if (b.state === 'enter') {
      b.t += dt;
      const k = Math.min(1, b.t / 2.2);
      b.y = -80 + 210 * (1 - (1 - k) * (1 - k));
      if (k >= 1) this.startPhase(0);
      return;
    }
    const ph = def.phases[b.phase];
    b.t += dt;
    // 이동
    switch (ph.move) {
      case 'sway': b.tx = PW / 2 + Math.sin(b.t * 0.6) * 110; b.ty = 125 + Math.sin(b.t * 1.1) * 12; break;
      case 'sweep': b.tx = PW / 2 + Math.sin(b.t * 0.9) * 190; b.ty = 110 + Math.sin(b.t * 1.7) * 10; break;
      case 'circle': b.tx = PW / 2 + Math.cos(b.t * 0.8) * 150; b.ty = 135 + Math.sin(b.t * 0.8) * 45; break;
      case 'jump':
        b.jumpT -= dt;
        if (b.jumpT <= 0) { b.jumpT = 2.8; b.tx = 120 + Math.random() * 240; b.ty = 90 + Math.random() * 100; }
        break;
      default: b.tx = PW / 2 + Math.sin(b.t * 0.5) * 30; b.ty = 130;
    }
    const k = 1 - Math.exp(-3 * dt);
    b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k;

    if (b.state === 'intro') {
      b.introT -= dt;
      if (b.introT <= 0) b.state = 'fight';
      return;
    }
    // 공격
    for (const A_ of b.st) Patterns.update(A_.a, A_.st, dt, b.x, b.y);
    if (ph.limit > 0) {
      b.limitT -= dt;
      if (b.limitT <= 0) { this.endPhase(false); return; }
    }
    if (b.hp <= 0) this.endPhase(true);
  },

  endPhase(killed) {
    const b = this.boss, def = b.def;
    const last = b.phase === def.phases.length - 1;
    this.burst(b.x, b.y, def.color, 30, 220);
    Sound.play('kill');
    if (killed && def.final) this.addScore(8000);
    if (last) { this.bossDefeated(); return; }
    this.startPhase(b.phase + 1);
  },

  bossDefeated() {
    const b = this.boss, def = b.def;
    Bullets.clearWithFx((x, y, c) => this.spark(x, y, c));
    this.burst(b.x, b.y, def.color, 80, 380);
    this.burst(b.x, b.y, '#ffffff', 40, 260);
    Sound.play('boom');
    this.shake = 0.8;
    this.enemies = [];
    if (this.practice) { this.boss = null; this.finishPractice(); return; }
    this.bossKills++;
    if (this.mode === 'challenge') { this.challengeDefeated(b, def); return; }
    if (def.mid) {
      this.addScore(10000);
      this.lastAward = 0; this.awardRows = 0;
      if (this.stageIdx < 2) this.award(this.tag(this.stageIdx + 1)); // 스테이지 1·2 클리어. 스테이지 3은 최종보스 격파 때 지급
      const t = this.stages()[this.stageIdx].target;
      const tb = this.stageT <= t ? 5000 : Math.max(0, 5000 - (this.stageT - t) * 50);
      if (tb > 0) { this.addScore(tb); this.floatText(PW / 2, 260, '시간 보너스 +' + Math.round(tb * this.D.score), '#ffe28a'); }
      for (let i = 0; i < 2; i++) this.items.push({ type: 'repair', x: b.x - 14 + i * 28, y: b.y, vy: 40, mag: false });
      this.boss = null;
      this.phase = 'upgrade';
      this.upgradeChoices = rollUpgradeChoices(Player.ups, this.D.choices);
      setTimeout(() => { if (this.onUpgrade) this.onUpgrade(this.upgradeChoices); }, 1200);
    } else {
      this.boss = null;
      if (this.mode === 'endless') { // 무한 모드: 최종보스를 잡으면 한 바퀴 더 (난이도 상승)
        this.addScore(8000);
        this.loop++;
        this.setBanner('LOOP ' + (this.loop + 1), '더 강한 적이 몰려온다', 2.4);
        this.offerUpgrade(() => { this.stageIdx = 0; this.startStage(); });
        return;
      }
      this.finish(true);
    }
  },

  // 도전 모드: 웨이브 보스 / 스테이지 최종보스 격파 처리
  challengeDefeated(b, def) {
    this.boss = null;
    for (let i = 0; i < (def.final ? 2 : 1); i++) this.items.push({ type: 'repair', x: b.x - 10 + i * 20, y: b.y, vy: 40, mag: false });
    if (def.final) {
      if (this.stageIdx >= 2) { this.finish(true); return; }
      this.offerUpgrade(() => { this.stageIdx++; this.startStage(); });
      return;
    }
    this.addScore(4000);
    this.waveIdx++; this.waveTotal++;
    const next = () => {
      if (this.waveIdx < 5) { this.phase = 'break'; this.breakT = 2; this.setBanner('BOSS ' + (this.waveIdx + 1), BOSSES[this.challengeMid()].name, 1.8); }
      else this.queueBoss(this.challengeFinal());
    };
    if (this.waveIdx === 3) this.offerUpgrade(next); else next();
  },

  // 업그레이드 선택 이후 진행
  pickUpgrade(id) {
    if (id) Player.applyUpgrade(id);
    Sound.play('pick');
    if (this.upNext) { const f = this.upNext; this.upNext = null; f(); return; }
    if (this.stageIdx < 2) {
      this.stageIdx++;
      this.startStage();
    } else {
      this.phase = 'warning'; this.warnT = 3.2; this.warnBoss = this.finalId();
      this.setBanner('WARNING', '공허의 심장 깊은 곳에서 무언가가 눈을 뜬다', 3);
      Sound.play('warn');
    }
  },

  finish(cleared) {
    if (cleared) {
      this.lastAward = 0; this.awardRows = 0;
      this.award(this.tag(3)); // 스테이지 3 클리어 +1
      this.award(['g', 'bg', 'cg'][this.chapter || 0]); // 게임 클리어 +2 (챕터 1 태그 'g'는 기존 저장 기록과 호환)
      const bonus = Math.round((Player.lives * 10000 + Player.dashStocks * 1000) * this.D.score);
      this.score += bonus;
      this.result = { cleared: true, bonus };
      this.phase = 'done';
      Sound.play('clear');
      setTimeout(() => { if (this.onClear) this.onClear(); }, 1800);
    } else {
      this.result = { cleared: false, bonus: 0 };
      this.phase = 'dead';
      Bullets.clear();
      this.burst(Player.x, Player.y, '#9fe7ff', 50, 300);
      Sound.play('boom');
      setTimeout(() => { if (this.onGameOver) this.onGameOver(); }, 1400);
    }
  },

  /* ---------- 충돌 ---------- */
  collide() {
    if (this.phase === 'dead' || this.phase === 'done') return;
    // 플레이어 공격 → 적 / 보스
    const pb = Player.bullets;
    for (let i = pb.length - 1; i >= 0; i--) {
      const b = pb[i];
      let hit = false;
      for (const e of this.enemies) {
        if (e.y < 0 || e.dead) continue;
        const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + 3;
        if (dx * dx + dy * dy < rr * rr) {
          Enemies.hurt(e, b.dmg); hit = true;
          if (e.hp <= 0) this.killEnemy(e);
          else if (Math.random() < 0.2) Sound.play('hit');
          break;
        }
      }
      if (!hit && this.boss && (this.boss.state === 'fight' || this.boss.state === 'intro')) {
        const bo = this.boss, dx = bo.x - b.x, dy = bo.y - b.y, rr = bo.r + 3;
        if (dx * dx + dy * dy < rr * rr) {
          hit = true;
          if (bo.state === 'fight') { bo.hp -= b.dmg * (1 + (Player.mods.bossDmg || 0)); if (Math.random() < 0.15) Sound.play('hit'); }
          if (Math.random() < 0.3) this.spark(b.x, b.y, '#ffffff');
        }
      }
      if (hit) pb.splice(i, 1);
    }
    // 적 탄 → 플레이어
    if (!Player.invulnerable() && Bullets.hitTest(Player.x, Player.y, Player.r)) this.playerHit();
  },

  playerHit() {
    const res = Player.hit();
    if (!res) return;
    this.burst(Player.x, Player.y, res === 'shield' ? '#7dffcf' : '#ff6f8a', 24, 220);
    Bullets.clearWithFx((x, y, c) => this.spark(x, y, c));
    this.shake = res === 'hit' ? 0.45 : 0.2;
    if (res === 'hit') {
      this.hits++; this.combo = 0; this.waveHit = true;
      this.floatText(Player.x, Player.y - 24, '피격!', '#ff6f8a');
      if (Player.reviveFlash) { Player.reviveFlash = false; this.floatText(Player.x, Player.y - 46, '재기동!', '#ffe28a'); }
      if (Player.lives <= 0) this.finish(false);
    } else this.floatText(Player.x, Player.y - 24, '실드 방어', '#7dffcf');
  },

  killEnemy(e) {
    if (e.dead) return;
    e.dead = 'killed';
    this.kills++;
    const T = ETYPES[e.type];
    const kind = T.kind || e.type; // 챕터 2 적은 소형/중형/엘리트와 같은 드랍 규칙
    this.addScore(T.score);
    this.burst(e.x, e.y, `hsl(${this.stages()[this.stageIdx].hue},90%,65%)`, kind === 'elite' ? 26 : 12, kind === 'elite' ? 240 : 160);
    Sound.play('kill');
    const drop = (type, n) => { for (let i = 0; i < n; i++) this.items.push({ type, x: e.x + (i - (n - 1) / 2) * 16, y: e.y, vy: 50, mag: false }); };
    if (kind === 'small') { if (Math.random() < 0.6) drop('star', 1); }
    else if (kind === 'medium') drop('star', 2);
    else { drop('star', 3); this.items.push({ type: 'cell', x: e.x, y: e.y - 10, vy: 50, mag: false }); }
    if (kind !== 'elite' && Math.random() < (Player.mods.cellDrop || 0)) this.items.push({ type: 'cell', x: e.x, y: e.y - 10, vy: 50, mag: false }); // 패시브: 에너지 셀 추가 드랍
  },

  updateItems(dt) {
    const out = [];
    for (const it of this.items) {
      const dx = Player.x - it.x, dy = Player.y - it.y, d = Math.hypot(dx, dy);
      if (!it.mag && (d < 80 * (1 + (Player.mods.magnet || 0)) || Player.y < 150)) it.mag = true;
      if (it.mag && this.phase !== 'dead') {
        const sp = 460;
        it.x += dx / (d || 1) * sp * dt; it.y += dy / (d || 1) * sp * dt;
      } else it.y += it.vy * dt;
      if (d < 17) { this.collect(it); continue; }
      if (it.y < H + 20) out.push(it);
    }
    this.items = out;
  },

  collect(it) {
    Sound.play('item');
    if (it.type === 'star') this.addScore(50);
    else if (it.type === 'cell') {
      if (Player.dashStocks < Player.stats.dashMax) Player.dashStocks++;
      this.floatText(Player.x, Player.y - 22, '대쉬 충전', '#7fe9ff');
    } else if (it.type === 'repair') {
      this.repairPieces++;
      if (this.repairPieces >= 5) {
        this.repairPieces -= 5;
        if (Player.lives < Player.maxLives) { Player.lives++; this.floatText(Player.x, Player.y - 22, '목숨 +1', '#9dffb0'); }
        else { this.addScore(5000); this.floatText(Player.x, Player.y - 22, '+5000', '#ffe28a'); }
      } else this.floatText(Player.x, Player.y - 22, '수리 조각 ' + this.repairPieces + '/5', '#9dffb0');
    }
  },

  /* ---------- 이펙트 ---------- */
  burst(x, y, color, n, sp) {
    for (let i = 0; i < n && this.parts.length < 450; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * sp;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.2, max: 0.6, color, size: 2 + Math.random() * 2.5 });
    }
  },
  spark(x, y, color) {
    if (this.parts.length > 350) return;
    this.parts.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.3, max: 0.3, color, size: 2.5 });
  },
  floatText(x, y, text, color) { this.texts.push({ x, y, text, color, t: 1.1 }); },
  updateFx(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.y -= 28 * dt; t.t -= dt; }
    this.texts = this.texts.filter(t => t.t > 0);
  },
  updateBg(dt) {
    for (const s of this.stars) {
      s.y += (12 + s.l * 22) * dt;
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    }
  },

  /* ---------- 렌더링 ---------- */
  drawBackdrop(ctx, time, stageIdx, full, ch) {
    const chp = ch != null ? ch : (this.chapter || 0), c2 = chp === 1, c3 = chp === 2;
    const st = CH_STAGES[chp][stageIdx || 0];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.bg[0]); g.addColorStop(1, st.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, full ? W : PW, H);
    for (const s of this.stars) {
      if (!full && s.x > PW) continue;
      const a = 0.35 + 0.25 * s.l + 0.2 * Math.sin(time * 2 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const z = 1 + s.l * 0.6;
      ctx.fillRect(s.x, s.y, z, z);
    }
    if (c2) { // 챕터 2 배경 장식
      ctx.save();
      if (stageIdx === 0) { // 코키토스: 대각선으로 흐르는 극광 띠
        for (let k = 0; k < 3; k++) {
          const gx = ((time * 14 + k * 190) % (PW + 300)) - 150;
          const gg = ctx.createLinearGradient(gx, 0, gx + 120, H);
          gg.addColorStop(0, 'rgba(120,255,230,0)'); gg.addColorStop(0.5, 'rgba(120,255,230,0.07)'); gg.addColorStop(1, 'rgba(120,255,230,0)');
          ctx.fillStyle = gg; ctx.fillRect(0, 0, PW, H);
        }
      } else if (stageIdx === 1) { // 쌍성계: 위쪽의 두 태양
        for (const sx of [PW * 0.28, PW * 0.72]) {
          const sy = 40 + Math.sin(time * 0.5 + sx) * 6;
          const gg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150);
          gg.addColorStop(0, 'rgba(255,200,110,0.35)'); gg.addColorStop(1, 'rgba(255,90,20,0)');
          ctx.fillStyle = gg; ctx.fillRect(0, 0, PW, 260);
        }
      } else { // 초신성 잔해: 천천히 맥동하는 붉은 안개
        const gg = ctx.createRadialGradient(PW / 2, H * 0.4, 20, PW / 2, H * 0.4, 300 + Math.sin(time * 0.8) * 25);
        gg.addColorStop(0, 'rgba(255,60,120,0.16)'); gg.addColorStop(1, 'rgba(60,0,40,0)');
        ctx.fillStyle = gg; ctx.fillRect(0, 0, PW, H);
      }
      ctx.restore();
    }
    if (c3) { // 챕터 3 배경 장식
      ctx.save();
      if (stageIdx === 0) { // 시계 정거장: 천천히 도는 거대한 톱니
        ctx.translate(PW * 0.72, H * 0.3); ctx.rotate(time * 0.1);
        ctx.strokeStyle = 'rgba(190,150,255,0.10)'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, 0, 130, 0, 7); ctx.stroke();
        for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = 'rgba(190,150,255,0.10)'; ctx.fillRect(126, -9, 22, 18); }
      } else if (stageIdx === 1) { // 성간 도시: 아래에서 위로 흐르는 회로선
        ctx.strokeStyle = 'rgba(110,255,180,0.10)'; ctx.lineWidth = 2;
        for (let k = 0; k < 6; k++) {
          const x = 40 + k * 80, o = (time * 40 + k * 97) % (H + 120) - 60;
          ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, o + 60); ctx.lineTo(x + 26, o + 30); ctx.lineTo(x + 26, o); ctx.stroke();
        }
      } else { // 강착원반: 중심 아래의 불타는 타원 고리
        ctx.translate(PW / 2, H * 0.78); ctx.rotate(Math.sin(time * 0.2) * 0.06);
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = `rgba(255,${150 + k * 30},60,${0.14 - k * 0.03})`; ctx.lineWidth = 12 - k * 3;
          ctx.beginPath(); ctx.ellipse(0, 0, 260 - k * 45, 60 - k * 10, 0, 0, 7); ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (!c2 && !c3 && stageIdx === 2) { // 사건의 지평선: 느린 소용돌이
      ctx.save();
      ctx.translate(PW / 2, H * 0.35);
      ctx.rotate(time * 0.08);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        const gg = ctx.createRadialGradient(0, 0, 10, 0, 0, 260);
        gg.addColorStop(0, 'rgba(255,190,70,0.10)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.ellipse(110, 0, 150, 40, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },

  render(ctx) {
    const t = this.time;
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, PW, H); ctx.clip();
    if (this.shake > 0 && Store.data.shake) ctx.translate((Math.random() - 0.5) * 9 * Math.min(1, this.shake * 2), (Math.random() - 0.5) * 9 * Math.min(1, this.shake * 2));
    if (this.wobble) {
      ctx.translate(PW / 2, H / 2);
      ctx.rotate(Math.sin(t * 1.6) * 0.018);
      ctx.translate(-PW / 2, -H / 2);
    }
    this.drawBackdrop(ctx, t, this.stageIdx, false);
    this.drawItems(ctx);
    const hue = this.stages()[this.stageIdx].hue;
    for (const e of this.enemies) Enemies.draw(ctx, e, hue);
    if (this.boss) this.drawBoss(ctx);
    Player.drawBullets(ctx);
    if (this.phase !== 'dead') Player.draw(ctx, t);
    Bullets.draw(ctx);
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = `bold 14px ${UI_FONT}`; ctx.textAlign = 'center';
    for (const f of this.texts) {
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    if (this.boss && this.boss.def.id === 'erebus' && this.boss.state !== 'enter') { // 공허의 어둠
      const vg = ctx.createRadialGradient(PW / 2, H / 2, 160, PW / 2, H / 2, 420);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,0,40,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, PW, H);
    }
    this.drawBossBar(ctx);
    this.drawDash(ctx);
    this.drawBanner(ctx);
    ctx.restore();
    this.drawPanel(ctx);
  },

  drawItems(ctx) {
    for (const it of this.items) {
      ctx.save(); ctx.translate(it.x, it.y);
      if (it.type === 'star') {
        ctx.fillStyle = '#ffe28a'; ctx.shadowColor = '#ffe28a'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      } else if (it.type === 'cell') {
        ctx.fillStyle = '#7fe9ff'; ctx.shadowColor = '#7fe9ff'; ctx.shadowBlur = 10;
        ctx.beginPath(); for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos(k * Math.PI / 3) * 8, Math.sin(k * Math.PI / 3) * 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#033'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('E', 0, 3);
      } else {
        ctx.fillStyle = '#9dffb0'; ctx.shadowColor = '#9dffb0'; ctx.shadowBlur = 10;
        ctx.fillRect(-2.5, -7, 5, 14); ctx.fillRect(-7, -2.5, 14, 5);
      }
      ctx.restore();
    }
  },

  drawBoss(ctx) {
    const b = this.boss, d = b.def, t = b.ang;
    ctx.save();
    ctx.translate(b.x, b.y);
    const flash = b.state === 'intro' ? 0.5 + 0.5 * Math.sin(this.time * 20) : 1;
    ctx.globalAlpha = b.state === 'intro' ? 0.55 + 0.35 * flash : 1;
    ctx.shadowColor = d.color; ctx.shadowBlur = 24;
    const r = d.r;
    switch (d.shape) {
      case 'rock': {
        ctx.fillStyle = '#8a6a4b'; ctx.strokeStyle = d.color; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) { const a = k * Math.PI * 2 / 9 + t * 0.2, rr = r * (0.8 + 0.25 * ((k * 7) % 3) / 2); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5e452f'; ctx.beginPath(); ctx.arc(-8, -6, 6, 0, 7); ctx.arc(9, 8, 8, 0, 7); ctx.fill();
        break;
      }
      case 'pulsar': {
        ctx.rotate(t * 1.2);
        ctx.fillStyle = 'rgba(159,216,255,0.35)';
        ctx.fillRect(-r * 2.2, -3, r * 4.4, 6); ctx.fillRect(-3, -r * 2.2, 6, r * 4.4);
        ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(0, 0, r * (0.6 + 0.08 * Math.sin(t * 6)), 0, 7); ctx.fill();
        ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
        break;
      }
      case 'eclipse': {
        ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 7); ctx.fill();
        ctx.strokeStyle = d.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, 7); ctx.stroke();
        ctx.rotate(t * 0.5); ctx.strokeStyle = 'rgba(255,207,106,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(r * 0.95, 0); ctx.lineTo(r * 1.35, 0); ctx.stroke(); }
        break;
      }
      case 'moon': {
        ctx.fillStyle = '#e9eeff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#b6c0e6'; ctx.beginPath(); ctx.arc(-10, -8, 7, 0, 7); ctx.arc(11, 5, 9, 0, 7); ctx.arc(-4, 14, 5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(200,215,255,0.6)'; ctx.lineWidth = 2; ctx.rotate(t * 0.7);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.45, 0, 0, 7); ctx.stroke();
        break;
      }
      case 'nebula': {
        for (let k = 0; k < 5; k++) {
          ctx.rotate(t * 0.15 + k);
          ctx.fillStyle = `hsla(${290 + k * 14},80%,65%,0.35)`;
          ctx.beginPath(); ctx.ellipse(r * 0.25, 0, r * 1.1, r * 0.55, 0, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#fff0ff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); ctx.fill();
        break;
      }
      case 'quasar': {
        ctx.fillStyle = 'rgba(127,233,255,0.3)';
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -r * 2.4); ctx.lineTo(6, 0); ctx.lineTo(0, r * 2.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.fill();
        ctx.rotate(t); ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.4, 0, 0, 7); ctx.stroke();
        break;
      }
      case 'titan': { // 얼음 위성: 육각 결정 + 고리
        ctx.fillStyle = '#cfefff'; ctx.strokeStyle = d.color; ctx.lineWidth = 3;
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * 0.2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(143,227,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * 0.2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); } ctx.stroke();
        ctx.rotate(-t * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 0.38, 0, 0, 7); ctx.stroke();
        break;
      }
      case 'gemini': { // 쌍둥이 태양: 서로를 도는 두 구체
        for (let k = 0; k < 2; k++) {
          const a = t * 1.4 + k * Math.PI, ox = Math.cos(a) * r * 0.6, oy = Math.sin(a) * r * 0.6;
          const gg = ctx.createRadialGradient(ox, oy, 2, ox, oy, r * 0.75);
          gg.addColorStop(0, k ? '#fff2dd' : '#ffffff'); gg.addColorStop(1, k ? '#ff7a2a' : '#ffb066');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(ox, oy, r * 0.62, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,176,102,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, 7); ctx.stroke();
        break;
      }
      case 'antares': { // 붉은 거성: 일렁이는 외곽 + 홍염
        const pulse = 1 + 0.06 * Math.sin(t * 3);
        const gg = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 1.5 * pulse);
        gg.addColorStop(0, '#ffe0c0'); gg.addColorStop(0.45, '#ff6a5c'); gg.addColorStop(1, 'rgba(120,0,20,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, r * 1.5 * pulse, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,140,100,0.7)'; ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + t * 0.4; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.4, a + 2.4, a + 4); ctx.stroke(); }
        break;
      }
      case 'aurora': { // 극광: 물결치는 리본
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = `hsla(${150 + k * 25},90%,${65 - k * 4}%,${0.75 - k * 0.12})`; ctx.lineWidth = 6 - k;
          ctx.beginPath();
          for (let x = -r * 1.5; x <= r * 1.5; x += 4) { const y = Math.sin(x * 0.12 + t * 2 + k) * r * 0.45 + (k - 1.5) * 9; x === -r * 1.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = '#eafff6'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill();
        break;
      }
      case 'andromeda': { // 나선 은하
        for (let arm = 0; arm < 2; arm++) {
          ctx.strokeStyle = `rgba(201,168,255,${arm ? 0.55 : 0.85})`; ctx.lineWidth = 4;
          ctx.beginPath();
          for (let u = 0; u < 4.5; u += 0.15) { const a = u * 1.3 + arm * Math.PI + t * 0.5, rr = r * 0.2 + u * r * 0.27; u === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.stroke();
        }
        ctx.fillStyle = '#fff4ff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, 7); ctx.fill();
        break;
      }
      case 'sirius': { // 시리우스: 십자 광망을 두른 청백색 별
        ctx.rotate(t * 0.3);
        ctx.fillStyle = 'rgba(159,232,255,0.4)';
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, r * 2.2); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill(); }
        const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.6, '#bfeeff'); gg.addColorStop(1, '#5fc8ff');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, r * (0.85 + 0.05 * Math.sin(t * 5)), 0, 7); ctx.fill();
        break;
      }
      case 'perseus': { // 페르세우스: 회전하는 방패와 칼날
        ctx.fillStyle = '#efe0ff'; ctx.strokeStyle = d.color; ctx.lineWidth = 3;
        ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4 + t * 0.3; ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); } ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.rotate(-t * 0.7); ctx.strokeStyle = 'rgba(217,184,255,0.8)'; ctx.lineWidth = 2;
        for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(r * 0.25, 0); ctx.lineTo(r * 1.5, 0); ctx.stroke(); }
        ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, 7); ctx.fill();
        break;
      }
      case 'cassiopeia': { // W자 별자리
        const pts = [[-1.5, -0.4], [-0.75, 0.55], [0, -0.4], [0.75, 0.55], [1.5, -0.4]];
        ctx.strokeStyle = 'rgba(255,217,120,0.75)'; ctx.lineWidth = 3; ctx.beginPath();
        pts.forEach((p, k) => k ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r)); ctx.stroke();
        pts.forEach((p, k) => { const pr = r * (0.28 + 0.06 * Math.sin(t * 4 + k)); const gg = ctx.createRadialGradient(p[0] * r, p[1] * r, 1, p[0] * r, p[1] * r, pr * 1.6); gg.addColorStop(0, '#fff8e0'); gg.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, pr * 1.6, 0, 7); ctx.fill(); });
        break;
      }
      case 'hydra': { // 히드라: 중심을 둘러싼 다섯 머리
        for (let k = 0; k < 5; k++) {
          const a = k * Math.PI * 2 / 5 + t * 0.5, hx = Math.cos(a) * r * 1.2, hy = Math.sin(a) * r * 1.2 + Math.sin(t * 3 + k) * 4;
          ctx.strokeStyle = 'rgba(143,255,168,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.7, hx, hy); ctx.stroke();
          ctx.fillStyle = '#d8ffe0'; ctx.beginPath(); ctx.arc(hx, hy, r * 0.24, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#4fbf6a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 7); ctx.fill();
        break;
      }
      case 'lyra': { // 거문고: U자 틀과 현, 꼭대기의 직녀성
        ctx.strokeStyle = d.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.9); ctx.bezierCurveTo(-r * 1.2, r * 0.7, r * 1.2, r * 0.7, r * 0.8, -r * 0.9); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(200,225,255,0.85)';
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.3, -r * 0.9); ctx.lineTo(k * r * 0.3, r * (0.6 - Math.abs(k) * 0.12) + Math.sin(t * 8 + k) * 2); ctx.stroke(); }
        const gg = ctx.createRadialGradient(0, -r * 1.1, 1, 0, -r * 1.1, r * 0.5); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, 'rgba(160,210,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, -r * 1.1, r * 0.5, 0, 7); ctx.fill();
        break;
      }
      case 'orion': { // 오리온: 어깨·허리띠·발의 일곱 별
        const pts = [[-1, -1.2, 1], [1, -1.2, 1], [-0.35, 0, 0.7], [0, 0, 0.7], [0.35, 0, 0.7], [-0.8, 1.25, 0.8], [0.8, 1.25, 0.8]];
        ctx.strokeStyle = 'rgba(255,179,107,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
        for (const [a, b] of [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]]) { ctx.moveTo(pts[a][0] * r, pts[a][1] * r); ctx.lineTo(pts[b][0] * r, pts[b][1] * r); } ctx.stroke();
        pts.forEach((p, k) => { const pr = r * 0.22 * p[2] * (1 + 0.1 * Math.sin(t * 5 + k)); ctx.fillStyle = k < 2 ? '#ff8a5c' : '#fff1de'; ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, pr, 0, 7); ctx.fill(); });
        break;
      }
      case 'cygnus': { // 북십자: 십자 + 소용돌이 원반
        ctx.rotate(Math.sin(t * 0.5) * 0.15);
        ctx.strokeStyle = 'rgba(192,240,255,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, 0, r * (1.5 - k * 0.3), r * (0.4 - k * 0.07), t * 0.6, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = d.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.lineTo(0, r * 1.5); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(r, -r * 0.3); ctx.stroke();
        ctx.fillStyle = '#02040a'; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        break;
      }
      case 'sagittarius': { // 궁수자리 A*: 불타는 강착원반 + 검은 구멍 + 활
        for (let k = 0; k < 4; k++) { ctx.strokeStyle = `rgba(255,${130 + k * 28},50,${0.8 - k * 0.15})`; ctx.lineWidth = 6 - k; ctx.beginPath(); ctx.ellipse(0, 0, r * (1.7 - k * 0.2), r * (0.55 - k * 0.07), t * 0.4, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.fill();
        ctx.strokeStyle = d.color; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,180,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(Math.PI * 1.15) * r * 1.05, Math.sin(Math.PI * 1.15) * r * 1.05); ctx.lineTo(Math.cos(Math.PI * 1.85) * r * 1.05, Math.sin(Math.PI * 1.85) * r * 1.05); ctx.stroke();
        break;
      }
      case 'omega': { // 오메가: 열린 고리(Ω)와 중심의 눈
        ctx.strokeStyle = d.color; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, -2, r * 0.95, Math.PI * 0.72, Math.PI * 2.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 1.1, r * 0.85); ctx.lineTo(-r * 0.55, r * 0.85); ctx.moveTo(r * 1.1, r * 0.85); ctx.lineTo(r * 0.55, r * 0.85); ctx.stroke();
        ctx.rotate(t * 0.8); ctx.strokeStyle = 'rgba(255,122,217,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * 0.45, k * Math.PI / 2, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#10020d'; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 7); ctx.fill();
        ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, 7); ctx.fill();
        break;
      }
      default: { // void
        ctx.rotate(t * 0.6);
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = `rgba(${176 - k * 30},${107 - k * 20},255,${0.7 - k * 0.15})`; ctx.lineWidth = 4 - k;
          ctx.beginPath(); ctx.ellipse(0, 0, r * (1.5 - k * 0.2), r * (0.5 + k * 0.1), k * 0.5, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, 7); ctx.fill();
        ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawBossBar(ctx) {
    const b = this.boss;
    if (!b || b.state === 'enter') return;
    const d = b.def, x = 30, w = PW - 60, y = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = d.color; ctx.fillRect(x, y, w * Math.max(0, b.hp / b.hpMax), 8);
    // 페이즈 표시
    const n = d.phases.length;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i < b.phase ? '#444' : (i === b.phase ? '#fff' : d.color);
      ctx.beginPath(); ctx.arc(x + 6 + i * 13, y + 22, 4, 0, 7); ctx.fill();
    }
    ctx.font = `bold 13px ${UI_FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(d.name, x + n * 13 + 6, y + 27);
    if (b.def.phases[b.phase].limit > 0) {
      ctx.textAlign = 'right'; ctx.fillStyle = b.limitT < 10 ? '#ff7a90' : '#cfd8ff';
      ctx.fillText(Math.max(0, Math.ceil(b.limitT)) + 's', x + w, y + 27);
    }
  },

  drawDash(ctx) {
    const s = Player.stats, n = s.dashMax;
    const x0 = 14, y = H - 18, w = 26;
    // 고유 스킬 게이지
    const sd = Player.shipDef.skill, ss = Player.stats.skill, sy = y - 24, sw = n * (w + 4) - 4;
    ctx.font = `bold 10px ${UI_FONT}`; ctx.textAlign = 'left';
    const act = Player.skillT > 0, rdy = !act && Player.skillCD <= 0;
    ctx.fillStyle = rdy ? '#ffd278' : '#b99a5a'; ctx.fillText(sd.name + (rdy ? ' · Q' : ''), x0, sy - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, sy, sw + 36, 7);
    ctx.fillStyle = act ? '#ffffff' : (rdy ? '#ffd278' : 'rgba(255,210,120,0.55)');
    const frac = act ? Player.skillT / Player.skillLen : 1 - Math.max(0, Player.skillCD) / ss.cool;
    ctx.fillRect(x0, sy, (sw + 36) * Math.max(0, Math.min(1, frac)), 7);
    ctx.font = `bold 10px ${UI_FONT}`; ctx.textAlign = 'left';
    ctx.fillStyle = '#7fe9ff'; ctx.fillText('DASH', x0, y - 6);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (w + 4) + 36;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y - 12, w, 9);
      if (i < Player.dashStocks) { ctx.fillStyle = '#7fe9ff'; ctx.fillRect(x, y - 12, w, 9); }
      else if (i === Player.dashStocks) { ctx.fillStyle = 'rgba(127,233,255,0.55)'; ctx.fillRect(x, y - 12, w * Player.dashProg, 9); }
    }
    if (Player.shieldReady) { ctx.fillStyle = '#7dffcf'; ctx.fillText('SHIELD', x0 + n * (w + 4) + 42, y - 4); }
  },

  drawBanner(ctx) {
    const b = this.banner;
    if (!b) return;
    const a = Math.min(1, b.t * 2, (b.dur - b.t) * 3);
    ctx.globalAlpha = Math.max(0, a);
    const warn = b.text === 'WARNING';
    ctx.textAlign = 'center';
    ctx.fillStyle = warn ? '#ff4d6d' : '#ffffff';
    ctx.shadowColor = warn ? '#ff4d6d' : '#7fb8ff'; ctx.shadowBlur = 16;
    ctx.font = `bold ${warn ? 44 : 34}px ${UI_FONT}`;
    ctx.fillText(b.text, PW / 2, H * 0.4);
    ctx.shadowBlur = 0;
    if (b.sub) { ctx.font = `15px ${UI_FONT}`; ctx.fillStyle = '#cfd8ff'; ctx.fillText(b.sub, PW / 2, H * 0.4 + 30); }
    ctx.globalAlpha = 1;
  },

  drawPanel(ctx) {
    const x = PW;
    ctx.fillStyle = '#0a0d1c'; ctx.fillRect(x, 0, W - PW, H);
    ctx.fillStyle = this.D.color; ctx.fillRect(x, 0, 2, H);
    ctx.textAlign = 'left';
    const lab = (t, y) => { ctx.font = `bold 11px ${UI_FONT}`; ctx.fillStyle = '#7e89b3'; ctx.fillText(t, x + 14, y); };
    const val = (t, y, c, s) => { ctx.font = `bold ${s || 18}px ${UI_FONT}`; ctx.fillStyle = c || '#fff'; ctx.fillText(t, x + 14, y); };
    lab('SCORE', 32); val(String(this.score).padStart(8, '0'), 56, '#fff', 20);
    lab('BEST', 82); val(String(this.bestScore()).padStart(8, '0'), 102, '#ffe28a', 15);
    lab('DIFFICULTY', 134); val(this.D.name, 154, this.D.color, 16);
    ctx.font = `11px ${UI_FONT}`; ctx.fillStyle = Player.shipDef ? Player.shipDef.color : '#8f9bcc';
    ctx.fillText((Player.shipDef ? Player.shipDef.name : '') + (this.practice ? ' · 연습' : this.mode === 'challenge' ? ' · 도전' : this.mode === 'endless' ? ' · 무한' : ''), x + 14, 172);
    if (this.mode === 'endless') {
      lab('WAVE · LOOP ' + (this.loop + 1), 186);
      const inBoss = this.phase === 'boss' || this.phase === 'warning' || this.phase === 'upgrade';
      val(inBoss ? 'BOSS' : String(this.waveTotal + 1), 208, '#fff', 17);
    } else if (this.mode === 'challenge') {
      lab('STAGE', 186);
      val((this.stageIdx + 1) + ' - ' + (this.waveIdx >= 5 ? 'FINAL' : 'B' + (this.waveIdx + 1)), 208, '#fff', 17);
    } else {
    lab(this.chapter > 0 ? 'CH.' + (this.chapter + 1) + ' STAGE' : 'STAGE', 186);
    const wv = this.phase === 'boss' || this.phase === 'warning' || this.phase === 'upgrade' || this.phase === 'done' ? 'BOSS' : 'W' + Math.min(5, this.waveIdx + (this.phase === 'wave' ? 1 : (this.waveIdx === 0 ? 1 : this.waveIdx + 1)));
    val((this.stageIdx + 1) + ' - ' + wv, 208, '#fff', 17);
    }
    lab('COMBO', 240); val('×' + (1 + 0.1 * Math.min(5, this.combo)).toFixed(1) + (this.combo ? '  (' + this.combo + ')' : ''), 262, this.combo ? '#9dffb0' : '#aab', 16);
    lab('LIVES', 294);
    for (let i = 0; i < Player.maxLives; i++) {
      ctx.save(); ctx.translate(x + 22 + i * Math.min(20, 128 / Player.maxLives), 316);
      ctx.fillStyle = i < Player.lives ? '#ff6f8a' : 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 6); ctx.lineTo(0, 2); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    lab('REPAIR', 348);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < this.repairPieces ? '#9dffb0' : 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 14 + i * 20, 356, 15, 7); }
    lab('UPGRADES', 392);
    let yy = 412;
    ctx.font = `11px ${UI_FONT}`;
    const owned = UPGRADES.filter(u => Player.ups[u.id]);
    if (!owned.length) { ctx.fillStyle = '#556'; ctx.fillText('없음', x + 14, yy); }
    for (const u of owned.slice(0, 10)) {
      ctx.fillStyle = '#cfd8ff'; ctx.fillText(u.name + ' Lv' + Player.ups[u.id], x + 14, yy); yy += 14;
    }
    if (owned.length > 10) { ctx.fillStyle = '#8f9bcc'; ctx.fillText('외 ' + (owned.length - 10) + '종', x + 14, yy); }
    ctx.font = `10px ${UI_FONT}`; ctx.fillStyle = '#556';
    ctx.fillText('Space 대쉬  Shift 저속', x + 10, H - 22);
    ctx.fillText('ESC 일시정지', x + 10, H - 8);
  }
};
