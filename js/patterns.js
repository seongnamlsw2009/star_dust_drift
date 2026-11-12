'use strict';
// 발사 패턴 함수 모음 — 패턴은 데이터(atk)로 정의하고 여기서 해석한다
// atk 공통: type, interval, delay, speed, b(탄 종류), maxv/acc(가속), curve, turnAt/turnD
const Patterns = {
  // 난이도 배율: 밀도는 개수와 간격에 제곱근씩 나눠 반영해 가독성을 지킨다
  env: { dens: 1, spd: 1, px: 0, py: 0 },

  newState(atk) {
    return { t: atk.delay != null ? atk.delay : 1.0, ang: atk.start || 0, ang2: 0, gapX: PW / 2, n: 0 };
  },

  update(atk, st, dt, ex, ey) {
    st.t -= dt;
    let guard = 0;
    while (st.t <= 0 && guard++ < 4) {
      this.fire(atk, st, ex, ey);
      st.t += (atk.interval || 1) / Math.sqrt(this.env.dens);
    }
  },

  opts(atk, extra) {
    const o = {};
    if (atk.maxv) { o.maxv = atk.maxv * this.env.spd; o.acc = atk.acc || 220; }
    if (atk.stopGo) o.stopGo = atk.stopGo;
    if (atk.split) o.split = atk.split;
    if (atk.curve) o.curve = atk.curve * (extra && extra.sign ? extra.sign : 1);
    if (atk.turnAt) { o.turnAt = atk.turnAt; o.turnD = (atk.turnD || 1.2) * (extra && extra.sign ? extra.sign : 1); }
    return o;
  },

  fire(atk, st, ex, ey) {
    const E = this.env, sd = Math.sqrt(E.dens);
    const spd = (atk.speed || 120) * E.spd;
    const bt = atk.b || 'normal';
    const o = this.opts(atk);
    st.n++;
    switch (atk.type) {
      case 'ring': {
        const n = Math.max(6, Math.round((atk.count || 12) * sd));
        for (let i = 0; i < n; i++) Bullets.spawn(ex, ey, st.ang + i * Math.PI * 2 / n, spd, bt, o);
        st.ang += atk.rot != null ? atk.rot : 0.2;
        break;
      }
      case 'spiral': {
        const arms = atk.arms || 2;
        for (let i = 0; i < arms; i++) Bullets.spawn(ex, ey, st.ang + i * Math.PI * 2 / arms, spd, bt, o);
        st.ang += atk.rot != null ? atk.rot : 0.25;
        break;
      }
      case 'cross': { // 두 나선을 반대 방향으로 겹침
        const arms = atk.arms || 2;
        for (let i = 0; i < arms; i++) {
          Bullets.spawn(ex, ey, st.ang + i * Math.PI * 2 / arms, spd, bt, o);
          Bullets.spawn(ex, ey, st.ang2 + i * Math.PI * 2 / arms, spd * 0.92, atk.b2 || bt, o);
        }
        st.ang += atk.rot != null ? atk.rot : 0.22;
        st.ang2 -= atk.rot != null ? atk.rot : 0.22;
        break;
      }
      case 'aimed': {
        const n = Math.max(1, Math.round((atk.count || 3) * (atk.count > 1 ? sd : 1)));
        const base = Math.atan2(E.py - ey, E.px - ex);
        const spread = (atk.spread || 30) * Math.PI / 180;
        for (let i = 0; i < n; i++) {
          const a = n === 1 ? base : base - spread / 2 + spread * i / (n - 1);
          Bullets.spawn(ex, ey, a, spd, bt, o);
        }
        break;
      }
      case 'homing': {
        const n = Math.max(1, Math.round((atk.count || 2) * sd));
        const base = Math.atan2(E.py - ey, E.px - ex);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.5;
          Bullets.spawn(ex, ey, a, spd, 'homing', o);
        }
        break;
      }
      case 'random': { // 난사 (아래 방향 중심의 부채꼴)
        const n = Math.max(1, Math.round((atk.count || 4) * sd));
        const center = atk.center != null ? atk.center : Math.PI / 2;
        const spread = (atk.spread || 120) * Math.PI / 180;
        for (let i = 0; i < n; i++) {
          const a = center + (Math.random() - 0.5) * spread;
          Bullets.spawn(ex, ey, a, spd * (0.75 + Math.random() * 0.5), bt, o);
        }
        break;
      }
      case 'wall': { // 한쪽 틈을 남기고 가로줄로 탄을 내려보냄 (틈은 항상 통과 가능)
        const gapW = atk.gap || 90;
        const sp = atk.spacing || 28;
        // 틈 위치는 직전 위치에서 도달 가능한 범위로 이동
        st.gapX = Math.max(gapW / 2 + 20, Math.min(PW - gapW / 2 - 20, st.gapX + (Math.random() - 0.5) * 240));
        for (let x = sp / 2; x < PW; x += sp) {
          if (Math.abs(x - st.gapX) < gapW / 2) continue;
          Bullets.spawn(x, -10, Math.PI / 2, spd, bt, o);
        }
        break;
      }
      case 'sidewall': { // 좌우 가장자리에서 안쪽으로 좁혀 오는 탄 (틈 포함)
        const gapH = atk.gap || 100;
        const sp = atk.spacing || 30;
        const gy = 80 + Math.random() * (H - 260);
        for (let y = sp / 2; y < H - 120; y += sp) {
          if (Math.abs(y - gy) < gapH / 2) continue;
          Bullets.spawn(-10, y, 0, spd, bt, o);
        }
        const gy2 = 80 + Math.random() * (H - 260);
        for (let y = sp / 2; y < H - 120; y += sp) {
          if (Math.abs(y - gy2) < gapH / 2) continue;
          Bullets.spawn(PW + 10, y, Math.PI, spd, bt, o);
        }
        break;
      }
      case 'flower': { // 꽃잎: 방향마다 속도를 달리 해 꽃 모양으로 퍼지는 고리
        const n = Math.max(12, Math.round((atk.count || 30) * sd)), p = atk.petals || 5;
        for (let i = 0; i < n; i++) {
          const th = i * Math.PI * 2 / n;
          const k = 0.5 + 0.5 * Math.abs(Math.cos(p * th / 2));
          Bullets.spawn(ex, ey, st.ang + th, spd * k, bt, o);
        }
        st.ang += atk.rot != null ? atk.rot : 0.3;
        break;
      }
      case 'wave': { // 뱀 파동: 발사각이 좌우로 출렁이는 연속 사격
        const arms = atk.arms || 1, amp = atk.amp != null ? atk.amp : 0.8;
        const center = atk.aim ? Math.atan2(E.py - ey, E.px - ex) : (atk.center != null ? atk.center : Math.PI / 2);
        const a = center + Math.sin(st.n * (atk.freq || 0.35)) * amp;
        for (let i = 0; i < arms; i++) Bullets.spawn(ex, ey, a + (i - (arms - 1) / 2) * (atk.gapA || 0.5), spd, bt, o);
        break;
      }
      case 'curtain': { // 세로 줄 커튼: 줄 간격을 엇갈려 내려오는 격자
        const sp = atk.spacing || 64, off = (st.n % 2) * sp / 2;
        for (let x = off + sp / 2; x < PW; x += sp) Bullets.spawn(x, -10, Math.PI / 2, spd, bt, o);
        break;
      }
      case 'diag': { // 대각선 줄: 위쪽 가장자리에서 좌/우로 번갈아 비스듬히 내려옴
        const sp = atk.spacing || 70, tilt = atk.tilt || 0.55, dir = st.n % 2 ? 1 : -1;
        for (let x = (st.n % 3) * sp / 3 - 20; x < PW + 40; x += sp) Bullets.spawn(x, -10, Math.PI / 2 + dir * tilt, spd, bt, o);
        break;
      }
      case 'polygon': { // 다각형: 방향마다 속도를 달리해 n각형 윤곽이 퍼져 나간다 (챕터 3)
        const n = Math.max(24, Math.round((atk.count || 36) * sd)), sides = atk.sides || 5, seg = Math.PI * 2 / sides;
        for (let i = 0; i < n; i++) {
          const th = i * Math.PI * 2 / n, loc = ((th % seg) + seg) % seg - seg / 2;
          Bullets.spawn(ex, ey, st.ang + th, spd * Math.cos(seg / 2) / Math.cos(loc), bt, o);
        }
        st.ang += atk.rot != null ? atk.rot : 0.3;
        break;
      }
      case 'swirl': { // 소용돌이: 휘어지며 퍼지는 고리. 발사마다 휘는 방향이 바뀐다 (챕터 3)
        const n = Math.max(8, Math.round((atk.count || 14) * sd)), c = (atk.curve || 0.8) * (st.n % 2 ? 1 : -1);
        for (let i = 0; i < n; i++) Bullets.spawn(ex, ey, st.ang + i * Math.PI * 2 / n, spd, bt, Object.assign({}, o, { curve: c }));
        st.ang += atk.rot != null ? atk.rot : 0.15;
        break;
      }
      case 'lance': { // 창: 속도가 조금씩 다른 탄을 같은 방향으로 쏴 길쭉한 줄을 만든다 (챕터 3)
        const n = Math.max(3, Math.round((atk.count || 5) * Math.sqrt(sd))), base = Math.atan2(E.py - ey, E.px - ex);
        for (let i = 0; i < n; i++) Bullets.spawn(ex, ey, base, Math.max(60, spd - i * (atk.gap || 14) * E.spd), bt, o);
        break;
      }
      case 'crossfire': { // 교차 사격: 좌우 가장자리에서 플레이어 높이 쪽을 가로지르는 탄 (챕터 3)
        const n = atk.count || 2, side = st.n % 2 ? 1 : -1, y0 = E.py + (Math.random() - 0.5) * 70;
        for (let i = 0; i < n; i++) {
          const y = Math.max(24, Math.min(H - 24, y0 + (i - (n - 1) / 2) * (atk.spacing || 40)));
          Bullets.spawn(side > 0 ? -10 : PW + 10, y, side > 0 ? 0.08 : Math.PI - 0.08, spd, bt, o);
        }
        break;
      }
      case 'rain': { // 위에서 무작위로 떨어지는 탄 (운석, 중력장 탄)
        const n = Math.max(1, Math.round((atk.count || 1) * sd));
        for (let i = 0; i < n; i++) {
          const x = 15 + Math.random() * (PW - 30);
          const sign = Math.random() < 0.5 ? -1 : 1;
          const oo = this.opts(atk, { sign });
          Bullets.spawn(x, -12, Math.PI / 2 + (Math.random() - 0.5) * (atk.jitter != null ? atk.jitter : 0.25), spd * (0.85 + Math.random() * 0.3), bt, oo);
        }
        break;
      }
    }
  },

  // 위에서 정의한 hazard/boss 공통 사용: 위치 고정 발사 위치가 필요 없는 타입
  fromTop(atk) { return ['wall', 'sidewall', 'rain', 'curtain', 'diag', 'crossfire'].includes(atk.type); }
};
