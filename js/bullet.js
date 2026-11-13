'use strict';
// 적 탄 풀 (오브젝트 풀링, 최대 1500개) — 기획서 7장·10장
const BT = {
  normal:  { r: 5,   color: '#ff6fa8' },
  big:     { r: 12,  color: '#ffb347' },
  rice:    { r: 3.5, color: '#7fd1ff', long: true },
  homing:  { r: 5,   color: '#c58bff' },
  accel:   { r: 5,   color: '#fff27a' },
  refract: { r: 5,   color: '#6fffcf' }
};

const Bullets = {
  MAX: 1500,
  pool: [],
  count: 0,
  cap: 250,
  cursor: 0,
  sprites: {},

  init() {
    this.pool = [];
    for (let i = 0; i < this.MAX; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, a: 0, s: 0, r: 5, type: 'normal', t: 0, maxv: 0, acc: 0, curve: 0, turnAt: 0, turnD: 0, turned: false, hmT: 0, sgAt: 0, sgHold: 0, sgDone: 0, s0: 0, splitAt: 0, splitN: 0, splitS: 0 });
    }
    this.count = 0;
    this.buildSprites();
  },

  buildSprites() {
    const cb = Store.data.colorblind;
    for (const k in BT) {
      const d = BT[k];
      const size = Math.ceil((d.long ? d.r * 3.2 : d.r) * 2 + 12);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const m = size / 2;
      const grd = g.createRadialGradient(m, m, 0, m, m, m);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.35, d.color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath();
      if (d.long) g.ellipse(m, m, d.r * 3, d.r * 1.3 + 3, 0, 0, Math.PI * 2);
      else g.arc(m, m, d.r + 5, 0, Math.PI * 2);
      g.fill();
      // 본체
      g.fillStyle = d.color;
      g.beginPath();
      if (d.long) g.ellipse(m, m, d.r * 2.4, d.r * 0.95, 0, 0, Math.PI * 2);
      else g.arc(m, m, d.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      if (d.long) g.ellipse(m, m, d.r * 1.5, d.r * 0.5, 0, 0, Math.PI * 2);
      else g.arc(m, m, d.r * 0.55, 0, Math.PI * 2);
      g.fill();
      if (cb) { // 색약 모드: 탄 외곽선 강조
        g.strokeStyle = '#000'; g.lineWidth = 2;
        g.beginPath();
        if (d.long) g.ellipse(m, m, d.r * 2.4, d.r * 0.95, 0, 0, Math.PI * 2);
        else g.arc(m, m, d.r, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 1;
        g.stroke();
      }
      this.sprites[k] = c;
    }
  },

  spawn(x, y, a, s, type, o) {
    if (this.count >= this.cap) return null;
    const n = this.pool.length;
    for (let k = 0; k < n; k++) {
      const i = (this.cursor + k) % n;
      const b = this.pool[i];
      if (!b.alive) {
        this.cursor = i + 1;
        b.alive = true; b.x = x; b.y = y; b.a = a; b.s = s;
        b.type = type || 'normal'; b.r = BT[b.type].r; b.t = 0;
        b.maxv = 0; b.acc = 0; b.curve = 0; b.turnAt = 0; b.turnD = 0; b.turned = false; b.hmT = 0;
        b.sgAt = 0; b.sgHold = 0; b.sgDone = 0; b.s0 = 0; b.splitAt = 0; b.splitN = 0; b.splitS = 0;
        if (b.type === 'homing') b.hmT = 1.4;
        if (o) {
          if (o.maxv) { b.maxv = o.maxv; b.acc = o.acc || 220; }
          if (o.curve) b.curve = o.curve;
          if (o.turnAt) { b.turnAt = o.turnAt; b.turnD = o.turnD || 1.2; }
          if (o.stopGo) { b.sgAt = o.stopGo.at; b.sgHold = o.stopGo.hold; }   // 멈췄다가 플레이어를 향해 재출발
          if (o.split) { b.splitAt = o.split.at; b.splitN = o.split.n; b.splitS = o.split.speed; } // 일정 시간 뒤 작은 탄으로 분열
        }
        this.count++;
        return b;
      }
    }
    return null;
  },

  update(dt0, px, py) {
    const p = this.pool, z = this.slow;
    for (let i = 0; i < p.length; i++) {
      const b = p[i];
      if (!b.alive) continue;
      let dt = dt0;
      if (z) { const zx = b.x - z.x, zy = b.y - z.y; if (zx * zx + zy * zy < z.r * z.r) dt = dt0 * z.k; } // 시공 왜곡장: 범위 안 탄은 느리게
      b.t += dt;
      if (b.splitAt && b.t >= b.splitAt) { // 분열: 자신은 사라지고 사방으로 쌀탄을 뿌린다
        const n = b.splitN, a0 = b.a + 0.3;
        b.alive = false; this.count--;
        for (let j = 0; j < n; j++) this.spawn(b.x, b.y, a0 + j * Math.PI * 2 / n, b.splitS, 'rice');
        continue;
      }
      if (b.sgAt) { // 정지 → 대기 → 조준 재출발
        if (!b.sgDone && b.t >= b.sgAt) { b.s0 = b.s; b.s = 0; b.sgDone = 1; b.maxv = 0; b.curve = 0; b.turnAt = 0; }
        else if (b.sgDone === 1 && b.t >= b.sgAt + b.sgHold) { b.a = Math.atan2(py - b.y, px - b.x); b.s = Math.max(120, b.s0 * 1.15); b.sgDone = 2; }
      }
      if (b.hmT > 0) { // 유도탄: 일정 시간 플레이어 쪽으로 방향 전환 후 직진
        b.hmT -= dt;
        const want = Math.atan2(py - b.y, px - b.x);
        let d = want - b.a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const m = 1.7 * dt;
        b.a += Math.max(-m, Math.min(m, d));
      }
      if (b.maxv) { // 가속탄
        if (b.s < b.maxv) b.s = Math.min(b.maxv, b.s + b.acc * dt);
        else if (b.s > b.maxv) b.s = Math.max(b.maxv, b.s - b.acc * dt);
      }
      if (b.curve) b.a += b.curve * dt; // 중력장: 궤적이 휘어짐
      if (b.turnAt && !b.turned && b.t >= b.turnAt) { b.a += b.turnD; b.turned = true; } // 공간 왜곡: 중간에 꺾임
      b.x += Math.cos(b.a) * b.s * dt;
      b.y += Math.sin(b.a) * b.s * dt;
      if (b.x < -40 || b.x > PW + 40 || b.y < -40 || b.y > H + 40) { b.alive = false; this.count--; }
    }
  },

  // 플레이어 피격 판정 (원 대 원, 거리 제곱 비교)
  hitTest(px, py, pr) {
    const p = this.pool;
    for (let i = 0; i < p.length; i++) {
      const b = p[i];
      if (!b.alive) continue;
      const dx = b.x - px, dy = b.y - py;
      const rr = b.r * 0.88 + pr;
      if (dx * dx + dy * dy < rr * rr) return b;
    }
    return null;
  },

  clear() {
    for (const b of this.pool) b.alive = false;
    this.count = 0;
  },

  // 지정한 원 안의 탄만 지운다 (대쉬 충격파 패시브)
  clearRadius(x, y, r, fx) {
    const rr = r * r;
    for (const b of this.pool) {
      if (!b.alive) continue;
      const dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy <= rr) {
        if (fx) fx(b.x, b.y, BT[b.type].color);
        b.alive = false; this.count--;
      }
    }
  },

  // 탄을 점수 아이템 대신 반짝이는 파티클로 바꿔 지움
  clearWithFx(fx) {
    for (const b of this.pool) {
      if (b.alive && fx) fx(b.x, b.y, BT[b.type].color);
      b.alive = false;
    }
    this.count = 0;
  },

  draw(ctx) {
    const p = this.pool;
    for (let i = 0; i < p.length; i++) {
      const b = p[i];
      if (!b.alive) continue;
      const sp = this.sprites[b.type];
      const m = sp.width / 2;
      if (BT[b.type].long) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.drawImage(sp, -m, -m);
        ctx.restore();
      } else {
        ctx.drawImage(sp, b.x - m, b.y - m);
      }
    }
  }
};
