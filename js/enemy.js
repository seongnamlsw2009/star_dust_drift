'use strict';
// 적 (소형/중형/엘리트) — 이동 경로와 공격 패턴 (기획서 5장)
const ETYPES = {
  small:  { hp: 7,   r: 12, score: 100 },
  medium: { hp: 34,  r: 16, score: 500 },
  elite:  { hp: 170, r: 21, score: 2000 },
  // 챕터 2 전용 적
  drone:    { hp: 8,   r: 11, score: 130,  kind: 'small' },
  lancer:   { hp: 38,  r: 16, score: 600,  kind: 'medium' },
  sentinel: { hp: 190, r: 22, score: 2400, kind: 'elite' },
  // 챕터 3 전용 적
  wisp:     { hp: 9,   r: 11, score: 150,  kind: 'small' },
  warden:   { hp: 42,  r: 17, score: 700,  kind: 'medium' },
  bastion:  { hp: 210, r: 23, score: 2800, kind: 'elite' },
  // 강화 적 (Hard 이상에서만 등장): 체력 앞에 쉴드가 있어 쉴드를 먼저 깎아야 한다
  guard:    { hp: 34,  r: 16, score: 800,  kind: 'medium', shield: 34, armored: true },
  aegis:    { hp: 38,  r: 17, score: 850,  kind: 'medium', shield: 46, armored: true },
  bulwark:  { hp: 44,  r: 18, score: 950,  kind: 'medium', shield: 60, armored: true }
};

const Enemies = {
  spawn(spec, i, n, D) {
    const T = ETYPES[spec.type];
    const x0 = spec.xs ? spec.xs[i % spec.xs.length] : (spec.x != null ? spec.x : PW * (i + 1) / (n + 1));
    const e = {
      type: spec.type, r: T.r, hp: T.hp * D.hpMul, maxhp: T.hp * D.hpMul,
      shield: (T.shield || 0) * D.hpMul, shieldMax: (T.shield || 0) * D.hpMul,
      t: 0, i, x0, x: x0, y: -30, spec, flee: false, fleeT: 0, dead: false,
      atks: (spec.atk || []).map(a => ({ a, st: Patterns.newState(a) }))
    };
    this.place(e);
    return e;
  },

  // 피해 적용: 쉴드가 있으면 쉴드부터 깎는다
  hurt(e, dmg) {
    if (e.shield > 0) {
      e.shield -= dmg;
      if (e.shield <= 0) { e.hp += e.shield; e.shield = 0; e.shieldBreak = 0.25; if (Game.spark) Game.spark(e.x, e.y, '#9fe8ff'); }
    } else e.hp -= dmg;
  },

  place(e) {
    const s = e.spec, t = e.t, i = e.i;
    switch (s.path) {
      case 'sweepL': {
        const ys = s.y != null ? s.y : 90 + (i % 3) * 45;
        e.x = -20 + t * (s.vx || 120); e.y = ys + Math.sin(t * 2 + i) * 22;
        break;
      }
      case 'sweepR': {
        const ys = s.y != null ? s.y : 90 + (i % 3) * 45;
        e.x = PW + 20 - t * (s.vx || 120); e.y = ys + Math.sin(t * 2 + i) * 22;
        break;
      }
      case 'hover': {
        const yT = s.y != null ? s.y : 120, stay = s.stay != null ? s.stay : 14;
        const enter = 1.3;
        const k = Math.min(1, t / enter), ease = 1 - (1 - k) * (1 - k);
        e.x = e.x0 + Math.sin(t * 0.8 + i * 1.7) * (s.sway != null ? s.sway : 40) * ease;
        e.y = -30 + (yT + 30) * ease;
        if (t > enter + stay) e.y -= (t - enter - stay) * 150;
        break;
      }
      case 'zigzag': { // 좌우로 크게 흔들리며 내려옴
        e.x = e.x0 + Math.sin(t * 2.1 + i * 0.9) * (s.amp || 100);
        e.y = -30 + t * (s.vy || 62);
        break;
      }
      case 'dive': { // 위에서 멈춰 사격하다가 플레이어 쪽으로 가속 돌진
        const yT = s.y != null ? s.y : 100, hold = s.stay != null ? s.stay : 1.6, enter = 1.0;
        if (t < enter) { const k = t / enter; e.y = -30 + (yT + 30) * (1 - (1 - k) * (1 - k)); }
        else if (t < enter + hold) { e.y = yT + Math.sin(t * 7) * 2; }
        else {
          if (e.dx0 === undefined) { e.dx0 = e.x; e.vx = Math.max(-150, Math.min(150, (Patterns.env.px - e.x) * 0.75)); }
          const u = t - enter - hold;
          e.x = e.dx0 + e.vx * u; e.y = yT + u * 70 + u * u * 230;
        }
        break;
      }
      case 'orbit': { // 타원 궤도를 따라 한 줄로 공전
        const cx = s.cx != null ? s.cx : PW / 2, cy = s.cy != null ? s.cy : 150, R = s.R || 130;
        const enter = 1.3, k = Math.min(1, t / enter), ease = 1 - (1 - k) * (1 - k);
        const ang = (s.dir || 1) * t * (s.w || 0.8) + (s.a0 || 0);
        e.x = cx + Math.cos(ang) * R * ease;
        e.y = cy + Math.sin(ang) * R * 0.5 * ease - (1 - ease) * (cy + 40);
        if (s.stay != null && t > enter + s.stay) e.y -= (t - enter - s.stay) * 170;
        break;
      }
      case 'pendulum': { // 진자: 위에서 내려와 호를 그리며 좌우로 흔들림
        const cx = s.cx != null ? s.cx : PW / 2, y0 = s.y != null ? s.y : 70, R = s.R || 90, w = s.w || 1.2;
        const enter = 1.2, k = Math.min(1, t / enter), ease = 1 - (1 - k) * (1 - k);
        e.x = cx + Math.sin(t * w + i * 0.6) * R * ease;
        e.y = -30 + (y0 + 30) * ease + R * 0.45 * (1 - Math.cos(t * w + i * 0.6)) * ease;
        if (s.stay != null && t > enter + s.stay) e.y -= (t - enter - s.stay) * 170;
        break;
      }
      default: { // 'down'
        e.x = e.x0 + Math.sin(t * 1.6 + i * 0.7) * 30;
        e.y = -30 + t * (s.vy || 75);
      }
    }
    if (e.flee) e.y -= e.fleeT * 260;
  },

  update(e, dt) {
    e.t += dt;
    if (e.flee) e.fleeT += dt;
    this.place(e);
    const onScreen = e.y > 8 && e.y < H - 20 && e.x > 0 && e.x < PW;
    if (onScreen && !e.flee) for (const A of e.atks) Patterns.update(A.a, A.st, dt, e.x, e.y);
    else for (const A of e.atks) if (A.st.t < 0.4) A.st.t = 0.4;
    // 화면 밖으로 완전히 나가면 제거 (처치가 아님)
    if (e.t > 2 && (e.y > H + 40 || e.y < -60 || e.x < -60 || e.x > PW + 60)) e.dead = 'escaped';
  },

  draw(ctx, e, hue) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const hurt = e.hp < e.maxhp;
    const T = ETYPES[e.type];
    ctx.shadowColor = `hsl(${hue},90%,60%)`; ctx.shadowBlur = 10;
    ctx.fillStyle = `hsl(${hue},75%,${hurt ? 70 : 58}%)`;
    ctx.strokeStyle = `hsl(${hue},90%,85%)`; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (e.type === 'small') {
      ctx.moveTo(0, 12); ctx.lineTo(11, -9); ctx.lineTo(0, -4); ctx.lineTo(-11, -9);
    } else if (e.type === 'drone') { // 구형 드론: 원 + 네 개의 돌기
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); }
    } else if (e.type === 'lancer') { // 창기병: 길쭉한 쐐기
      ctx.moveTo(0, 20); ctx.lineTo(13, -6); ctx.lineTo(9, -16); ctx.lineTo(0, -9); ctx.lineTo(-9, -16); ctx.lineTo(-13, -6);
    } else if (e.type === 'sentinel') { // 파수병: 팔각형 + 바깥 고리
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); }
    } else if (e.type === 'wisp') { // 도깨비불: 눈물방울 + 꼬리
      ctx.arc(0, 2, 8, 0, Math.PI * 2); ctx.moveTo(-6, -4); ctx.lineTo(0, -15); ctx.lineTo(6, -4);
    } else if (e.type === 'warden' || T.armored) { // 감시자/강화 적: 겹친 두 사각형
      ctx.moveTo(-13, -13); ctx.lineTo(13, -13); ctx.lineTo(13, 13); ctx.lineTo(-13, 13); ctx.closePath();
      if (T.armored) { ctx.moveTo(0, -19); ctx.lineTo(19, 0); ctx.lineTo(0, 19); ctx.lineTo(-19, 0); }
      else { ctx.moveTo(0, -18); ctx.lineTo(18, 0); ctx.lineTo(0, 18); ctx.lineTo(-18, 0); }
    } else if (e.type === 'bastion') { // 보루: 육각 + 안쪽 육각
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); }
      ctx.closePath(); ctx.moveTo(15, 0);
      for (let k = 1; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI; ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); }
    } else if (e.type === 'medium') {
      ctx.moveTo(0, -16); ctx.lineTo(16, 0); ctx.lineTo(0, 16); ctx.lineTo(-16, 0);
    } else {
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + Math.PI / 6;
        ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21);
      }
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (e.type !== 'small' && e.type !== 'drone' && e.type !== 'wisp') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, (T.kind === 'elite') ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    }
    if (e.type === 'sentinel') { ctx.strokeStyle = `hsl(${hue},90%,80%)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke(); }
    if (e.shield > 0) { // 쉴드: 남은 양에 따라 진해지는 고리
      ctx.strokeStyle = `rgba(150,235,255,${0.35 + 0.55 * e.shield / e.shieldMax})`; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#9fe8ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 9, 0, Math.PI * 2); ctx.stroke();
    } else if (e.shieldBreak > 0) {
      e.shieldBreak -= 0.016;
      ctx.strokeStyle = `rgba(255,255,255,${e.shieldBreak * 3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 9 + (0.25 - e.shieldBreak) * 40, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (T.kind === 'elite') { // 체력 바
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - 22, e.y - 32, 44, 4);
      ctx.fillStyle = '#ff7a90'; ctx.fillRect(e.x - 22, e.y - 32, 44 * Math.max(0, e.hp / e.maxhp), 4);
    }
  }
};
