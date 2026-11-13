'use strict';
// 플레이어: 이동, 자동 발사, 대쉬, 무적, 업그레이드 적용
const Player = {
  x: PW / 2, y: H - 90, r: 3,
  lives: 3, maxLives: 3,
  inv: 0, dashT: 0, dashInvT: 0, dashDX: 0, dashDY: -1,
  lastDX: 0, lastDY: -1, moveT: 0,
  dashStocks: 2, dashProg: 0,
  ups: {}, stats: {},
  shieldReady: false,
  fireT: 0, missT: 0,
  bullets: [],
  trail: [],
  flash: 0,
  D: null,
  shipKey: 'astra', shipDef: null, mods: {},
  reviveReady: false, reviveFlash: false,

  // shipKey: 기체. 스킬 트리에서 활성화한 노드·패시브가 mods로 합산되어 능력치에 반영된다.
  reset(D, shipKey) {
    this.D = D;
    this.moveT = 0; this.lastDX = 0; this.lastDY = -1;
    this.shipKey = SHIPS[shipKey] ? shipKey : 'astra';
    this.shipDef = SHIPS[this.shipKey];
    this.mods = Ships.mods(this.shipKey);
    const b = this.shipDef.base;
    this.ups = {};
    this.r = Math.max(1.6, b.r - this.mods.hit);
    this.lives = D.lives + b.lives + this.mods.lives; this.maxLives = this.lives;
    this.recompute();
    this.x = PW / 2; this.y = H - 90;
    this.inv = 1.5; this.dashT = 0; this.dashInvT = 0;
    this.dashStocks = this.stats.dashMax; this.dashProg = 0;
    this.shieldReady = this.stats.shield;
    this.reviveReady = this.mods.revive > 0; this.reviveFlash = false;
    this.bullets = []; this.trail = [];
    this.fireT = 0; this.missT = 0; this.flash = 0;
    this.skillT = 0; this.skillCD = this.stats.skill.cool * 0.4; Bullets.slow = null; // 고유 스킬: 시작 시 쿨타임 40% 진행 상태
  },

  recompute() {
    const u = this.ups, D = this.D, g = k => u[k] || 0;
    const b = this.shipDef.base, m = this.mods;
    this.stats = {
      dmg: 2.2 * b.dmg * (1 + 0.15 * g('dmg') + m.dmg),
      rate: 12 * b.rate * (1 + 0.15 * g('rate') + m.rate),
      lines: [1, 3, 5][Math.min(2, g('spread') + b.spread + m.spread)],
      homing: Math.min(5, g('homing') + b.homing + m.homing),
      dashMax: 2 + b.dashMax + g('dashStock') + m.dashMax,
      dashCool: Math.max(0.8, D.dashCool * b.dashCool * (1 - 0.2 * g('dashCharge')) * (1 + m.dashCool)),
      dashInv: D.dashInv + 0.05 * g('phase') + m.dashInv,
      dashDist: 140 * b.dashDist * (1 + m.dashDist),
      speed: b.speed * (1 + m.speed),
      shield: g('shield') > 0 || m.shield > 0 || m.shieldRegen > 0,
      skill: Ships.skillStats(this.shipKey, m)
    };
  },

  lowHp() { return this.mods.lastStand > 0 && this.lives <= 1; }, // 패시브 '코로나'

  applyUpgrade(id) {
    this.ups[id] = (this.ups[id] || 0) + 1;
    const up = UPGRADES.find(u => u.id === id);
    if (up && up.mod) { // 추가 모듈: mod 값을 이번 판의 mods에 합산
      for (const k in up.mod) this.mods[k] = (this.mods[k] || 0) + up.mod[k];
      if (up.mod.hit) this.r = Math.max(1.6, this.r - up.mod.hit);
    }
    if (id === 'repair') { this.maxLives = Math.min(8, this.maxLives + 1); this.lives = Math.min(this.maxLives, this.lives + 1); }
    this.recompute();
    if (id === 'dashStock') this.dashStocks = Math.min(this.stats.dashMax, this.dashStocks + 1);
    if (id === 'regenShield') this.shieldReady = true;
  },

  // 스테이지 시작 시 대쉬 가득 충전 + 실드 재장전
  stageStart() {
    this.dashStocks = this.stats.dashMax; this.dashProg = 0;
    this.shieldReady = this.stats.shield;
  },

  invulnerable() { return this.inv > 0 || this.dashInvT > 0; },

  /* ---------- 고유 스킬 (Q / SKILL 버튼) ---------- */
  skillActive() { return this.skillT > 0; },

  trySkill() {
    if (this.skillT > 0 || this.skillCD > 0) return false;
    const sd = this.shipDef.skill, ss = this.stats.skill;
    this.skillCD = ss.cool;
    Sound.play('ready');
    if (sd.id === 'missile') { // 즉발: 강력한 유도탄 부채꼴 발사
      const n = ss.cnt;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * (1.9 / Math.max(1, n - 1));
        this.bullets.push({ x: this.x, y: this.y - 6, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
          dmg: 6 * (1 + ss.pow) * (1 + this.mods.homingDmg), hm: true, a, v: 380 });
      }
      this.skillFlash = 0.3;
    } else this.skillT = this.skillLen = ss.dur;
    return true;
  },

  updateSkill(dt) {
    if (Input.take('KeyQ') || Input.take('skillBtn')) this.trySkill();
    if (this.skillCD > 0) this.skillCD -= dt;
    if (this.skillFlash > 0) this.skillFlash -= dt;
    const id = this.shipDef.skill.id, ss = this.stats.skill;
    if (this.skillT > 0) {
      this.skillT -= dt;
      if (id === 'warp') Bullets.slow = { x: this.x, y: this.y, r: 105 * (1 + ss.pow), k: Math.max(0.15, 0.35 / (1 + 0.5 * ss.pow)) };
      else if (id === 'beam') this.beamDamage(dt);
    }
    if (this.skillT <= 0 && Bullets.slow) Bullets.slow = null;
  },

  beamW() { return 46 * (1 + this.stats.skill.pow * 0.4); },

  beamDamage(dt) {
    const w = this.beamW() / 2, dps = this.stats.dmg * 40 * (1 + this.stats.skill.pow), d = dps * dt;
    for (const e of Game.enemies) {
      if (e.dead || e.y < 0 || e.y > this.y || Math.abs(e.x - this.x) > w + e.r) continue;
      Enemies.hurt(e, d);
      if (e.hp <= 0) Game.killEnemy(e);
    }
    const bo = Game.boss;
    if (bo && bo.state === 'fight' && bo.y < this.y && Math.abs(bo.x - this.x) < w + bo.r) {
      bo.hp -= d * (1 + (this.mods.bossDmg || 0));
      if (Math.random() < 0.2) Game.spark(this.x + (Math.random() - 0.5) * w, bo.y + bo.r, '#ffd278');
    }
  },

  drawSkill(ctx, time) {
    if (!this.shipDef) return;
    const id = this.shipDef.skill.id, ss = this.stats.skill;
    if (this.skillT > 0) {
      const fade = Math.min(1, this.skillT * 4);
      if (id === 'warp') {
        const z = Bullets.slow; if (!z) return;
        ctx.save();
        const g = ctx.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
        g.addColorStop(0, 'rgba(120,150,255,0.05)'); g.addColorStop(1, 'rgba(140,170,255,0.28)');
        ctx.globalAlpha = fade; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(170,200,255,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 30;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (id === 'beam') {
        const w = this.beamW(), wob = 1 + Math.sin(time * 40) * 0.08;
        ctx.save(); ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(255,170,60,0.35)'; ctx.fillRect(this.x - w * wob / 2 - 4, 0, w * wob + 8, this.y);
        ctx.fillStyle = 'rgba(255,215,120,0.75)'; ctx.fillRect(this.x - w * wob / 2, 0, w * wob, this.y);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(this.x - w * 0.18, 0, w * 0.36, this.y);
        ctx.restore();
      } else if (id === 'clone') {
        ctx.save(); ctx.globalAlpha = 0.5 * fade;
        for (const s of [-1, 1]) this.ship(ctx, this.x + s * 34, this.y + 6, this.shipDef.color, false);
        ctx.restore();
      }
    }
    if (this.skillFlash > 0) {
      ctx.strokeStyle = `rgba(255,220,140,${this.skillFlash * 3})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, 18 + (0.3 - this.skillFlash) * 120, 0, Math.PI * 2); ctx.stroke();
    }
  },

  tryDash() {
    if (this.dashT > 0 || this.dashStocks <= 0) return false;
    this.dashStocks--;
    this.dashT = 0.18;
    this.dashInvT = this.stats.dashInv;
    // 방금 움직이고 있었을 때만 그 방향으로 대쉬한다. 가만히 있으면 제자리에서 무적 대쉬만 발동한다.
    const moving = this.moveT > 0;
    this.dashDX = moving ? this.lastDX : 0; this.dashDY = moving ? this.lastDY : 0;
    Sound.play('dash');
    const m = this.mods;
    if (m.dashBlast > 0) Bullets.clearRadius(this.x, this.y, m.dashBlast, (x, y, c) => Game.spark(x, y, c)); // 충격파 대쉬 / 위상 이탈
    if (m.dashShot > 0) { // 대쉬 점화: 사방으로 탄 발사
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI * 2 / 12;
        this.bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: this.stats.dmg * 1.6, hm: false, rot: true, a });
      }
    }
    return true;
  },

  update(dt, targets, bossPull) {
    const ax = Input.axis();
    const tm = Input.takeTouchMove();
    if (this.dashT > 0) {
      const sp = this.stats.dashDist / 0.18;
      this.x += this.dashDX * sp * dt;
      this.y += this.dashDY * sp * dt;
      this.dashT -= dt;
      this.trail.push({ x: this.x, y: this.y, a: 0.5 });
    } else {
      let dx = ax.x, dy = ax.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { dx /= len; dy /= len; this.lastDX = dx; this.lastDY = dy; this.moveT = 0.12; }
      else this.moveT -= dt;
      const spd = this.stats.speed * (this.skillT > 0 && this.shipDef.skill.id === 'beam' ? 0.6 : 1); // 코로나 빔 사용 중 감속
      const sp = (ax.slow ? 120 : 280) * spd;
      this.x += dx * sp * dt + tm.x * (ax.slow ? 0.5 : 1.15) * spd;
      this.y += dy * sp * dt + tm.y * (ax.slow ? 0.5 : 1.15) * spd;
      if (Math.abs(tm.x) + Math.abs(tm.y) > 0.5) {
        const l = Math.hypot(tm.x, tm.y);
        this.lastDX = tm.x / l; this.lastDY = tm.y / l; this.moveT = 0.12;
      }
    }
    if (bossPull) { // 에레보스 중력 왜곡: 보스 쪽으로 끌려감
      const dx = bossPull.x - this.x, dy = bossPull.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.x += dx / d * bossPull.k * dt;
      this.y += dy / d * bossPull.k * dt;
    }
    this.x = Math.max(12, Math.min(PW - 12, this.x));
    this.y = Math.max(20, Math.min(H - 16, this.y));

    if (Input.take('Space') || Input.take('dashBtn')) this.tryDash();
    this.updateSkill(dt);

    // 스톡 충전
    if (this.dashStocks < this.stats.dashMax) {
      this.dashProg += dt / this.stats.dashCool;
      if (this.dashProg >= 1) { this.dashProg = 0; this.dashStocks++; Sound.play('ready'); }
    } else this.dashProg = 0;

    if (this.inv > 0) this.inv -= dt;
    if (this.dashInvT > 0) this.dashInvT -= dt;
    if (this.flash > 0) this.flash -= dt;
    for (const t of this.trail) t.a -= dt * 3.2;
    this.trail = this.trail.filter(t => t.a > 0);

    // 자동 발사
    this.fireT -= dt;
    if (this.fireT <= 0) { this.shoot(); this.fireT += 1 / (this.stats.rate * (this.lowHp() ? 1.2 : 1)); }
    if (this.stats.homing > 0) {
      this.missT -= dt;
      if (this.missT <= 0) { this.missiles(); this.missT += 0.65; }
    }
    this.updateBullets(dt, targets);
  },

  shoot() {
    const s = this.stats, L = s.lines;
    const dmg = s.dmg * (this.lowHp() ? 1.35 : 1);
    const offs = L === 1 ? [0] : L === 3 ? [0, -0.1, 0.1] : [0, -0.1, 0.1, -0.2, 0.2];
    for (let i = 0; i < offs.length; i++) {
      const a = -Math.PI / 2 + offs[i];
      this.bullets.push({ x: this.x + (offs[i] * 30), y: this.y - 14, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, dmg: dmg * (i === 0 ? 1 : 0.7), hm: false });
    }
    if (this.skillT > 0 && this.shipDef.skill.id === 'clone') { // 잔상 편대: 분신 2기가 함께 사격
      for (const sx of [-34, 34]) this.bullets.push({ x: this.x + sx, y: this.y - 8, vx: 0, vy: -760, dmg: s.dmg * 0.6 * (1 + s.skill.pow), hm: false });
    }
    Sound.play('shot');
  },

  missiles() {
    const n = this.stats.homing * 2;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
      this.bullets.push({ x: this.x, y: this.y - 6, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, dmg: 3.2 * (1 + this.mods.homingDmg), hm: true, a, v: 340 });
    }
  },

  updateBullets(dt, targets) {
    const out = [];
    for (const b of this.bullets) {
      if (b.hm) {
        let best = null, bd = 1e9;
        for (const t of targets) {
          const d = (t.x - b.x) * (t.x - b.x) + (t.y - b.y) * (t.y - b.y);
          if (d < bd) { bd = d; best = t; }
        }
        if (best) {
          const want = Math.atan2(best.y - b.y, best.x - b.x);
          let d = want - b.a;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const m = 5 * dt;
          b.a += Math.max(-m, Math.min(m, d));
        }
        b.vx = Math.cos(b.a) * b.v; b.vy = Math.sin(b.a) * b.v;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < PW + 20) out.push(b);
    }
    this.bullets = out;
  },

  // 피격 처리: 'shield' | 'hit' | null 반환
  hit() {
    if (this.invulnerable()) return null;
    if (this.shieldReady) {
      this.shieldReady = false; this.inv = 1.2; this.flash = 0.3;
      Sound.play('shield');
      return 'shield';
    }
    if (!Game.practice) this.lives--; // 연습 모드에서는 목숨이 줄지 않는다
    if (this.lives <= 0 && this.reviveReady) { this.reviveReady = false; this.lives = 1; this.reviveFlash = true; } // 패시브 '재기동'
    this.inv = 2; this.flash = 0.4;
    Sound.play('die');
    return 'hit';
  },

  draw(ctx, time) {
    this.drawSkill(ctx, time);
    // 대쉬 잔상
    for (const t of this.trail) {
      ctx.globalAlpha = Math.max(0, t.a) * 0.6;
      this.ship(ctx, t.x, t.y, this.shipDef ? this.shipDef.color : '#7fe9ff', false);
    }
    ctx.globalAlpha = 1;
    const blink = this.inv > 0 && this.dashInvT <= 0 && Math.floor(time * 18) % 2 === 0;
    if (!blink) this.ship(ctx, this.x, this.y, this.dashInvT > 0 ? '#ffffff' : (this.shipDef ? this.shipDef.color : '#9fe7ff'), true);
    if (this.shieldReady) {
      ctx.strokeStyle = 'rgba(120,255,200,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI * 2); ctx.stroke();
    }
    // 대쉬 가능 링
    if (this.dashStocks > 0) {
      ctx.strokeStyle = 'rgba(127,233,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI * 2 * (this.dashStocks / this.stats.dashMax)); ctx.stroke();
    }
    // 판정점 (저속 이동 시 표시)
    if (Input.axis().slow) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 1.6, 0, Math.PI * 2); ctx.stroke();
    }
  },

  // 기체 모양은 ships.js의 drawShip을 쓴다 (선택한 기체, 없으면 아스트라)
  ship(ctx, x, y, color, glow) {
    Ships.drawShip(ctx, this.shipDef || SHIPS.astra, x, y, color, glow);
  },

  drawBullets(ctx) {
    ctx.fillStyle = '#bff6ff';
    for (const b of this.bullets) {
      if (b.hm) {
        ctx.fillStyle = '#9dffb0';
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bff6ff';
      } else if (b.rot) { // 대쉬 점화 탄: 진행 방향으로 회전
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2);
        ctx.fillStyle = '#ffd39a'; ctx.fillRect(-1.5, -6, 3, 12); ctx.restore();
        ctx.fillStyle = '#bff6ff';
      } else ctx.fillRect(b.x - 1.5, b.y - 7, 3, 12);
    }
  }
};
