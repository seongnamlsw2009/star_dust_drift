'use strict';
// 서버 계정 · 플레이 데이터 동기화 (/api). 오프라인이거나 서버가 응답하지 않아도 게임은 localStorage로 계속 돌아간다.
const Cloud = {
  sessKey: 'star_dust_drift_session', // { token, name }
  syncKey: 'star_dust_drift_sync',    // { at: 마지막으로 맞춘 서버 updatedAt, dirty: 서버에 아직 안 올린 변경이 있는지 }
  session: null,
  sync: { at: 0, dirty: false },
  status: '',
  _timer: null,
  _pushing: false,

  init() {
    this.session = this._read(this.sessKey);
    this.sync = Object.assign({ at: 0, dirty: false }, this._read(this.syncKey));
    window.addEventListener('pagehide', () => { if (this.sync.dirty) this.push(true); });
    this.bindUI();
    if (this.session) this.pull();
  },

  /* ---------- 저장 ---------- */
  _read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  _write(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  _saveSync() { this._write(this.syncKey, this.sync); },

  /* ---------- 서버 호출 ---------- */
  async api(path, method, body, keepalive) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.session) headers.Authorization = 'Bearer ' + this.session.token;
    const res = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, keepalive: !!keepalive });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && this.session && path !== 'login') this._expire();
    if (!res.ok) { const e = new Error(json.error || '서버에 연결할 수 없습니다.'); e.status = res.status; throw e; }
    return json;
  },

  _expire() {
    this.session = null; this._write(this.sessKey, null);
    this.setStatus('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    this.render();
  },

  /* ---------- 로그인 · 가입 ---------- */
  async auth(kind, name, password) {
    const r = await this.api(kind, 'POST', { name, password });
    this.session = { token: r.token, name: r.name };
    this._write(this.sessKey, this.session);
    // 이 기기의 기록과 서버 기록을 합친다
    const merged = r.data ? this.merge(Store.data, r.data) : Store.data;
    this.sync = { at: r.updatedAt || 0, dirty: !r.data || !this.same(merged, r.data) };
    this._saveSync();
    const changed = !this.same(merged, Store.data);
    if (changed) this._apply(merged);
    if (this.sync.dirty) await this.push();
    if (changed) { location.reload(); return; } // 화면·설정이 합친 기록으로 다시 그려지도록
    this.setStatus(kind === 'register' ? '가입했습니다. 이 기기의 기록을 서버에 저장했습니다.' : '로그인했습니다.');
    this.render();
  },

  async logout() {
    if (this.sync.dirty) await this.push().catch(() => {});
    try { await this.api('logout', 'POST'); } catch (e) { /* 서버 세션은 만료로 정리된다 */ }
    this.session = null; this._write(this.sessKey, null);
    this.sync = { at: 0, dirty: false }; this._saveSync();
    this.setStatus('로그아웃했습니다. 이 기기의 기록은 그대로 남아 있습니다.');
    this.render();
  },

  /* ---------- 동기화 ---------- */
  // 게임 시작 시: 다른 기기에서 더 새로 저장한 기록이 있으면 합쳐서 반영한다
  async pull() {
    try {
      const r = await this.api('data', 'GET');
      if (r.data && r.updatedAt > this.sync.at) {
        const merged = this.merge(Store.data, r.data);
        this.sync.at = r.updatedAt;
        this.sync.dirty = this.sync.dirty || !this.same(merged, r.data);
        this._saveSync();
        if (!this.same(merged, Store.data)) { this._apply(merged); location.reload(); return; }
      }
      if (this.sync.dirty) await this.push();
      else this.setStatus('동기화됨');
    } catch (e) { this.setStatus('동기화 실패: ' + e.message); }
  },

  // Store.save()가 부를 때마다 잠시 모았다가 한 번에 올린다
  schedule() {
    this.sync.dirty = true; this._saveSync();
    if (!this.session) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.push(), 2000);
  },

  async push(keepalive) {
    if (!this.session || this._pushing) return;
    this._pushing = true;
    clearTimeout(this._timer);
    try {
      const r = await this.api('data', 'PUT', { data: Store.data }, keepalive);
      this.sync = { at: r.updatedAt, dirty: false }; this._saveSync();
      this.setStatus('동기화됨');
    } catch (e) {
      this.setStatus('동기화 실패: ' + e.message + ' (다음 저장 때 다시 시도합니다)');
    } finally { this._pushing = false; }
  },

  _apply(d) { try { localStorage.setItem(Store.key, JSON.stringify(d)); } catch (e) { /* ignore */ } Object.assign(Store.data, d); },
  same(a, b) { return JSON.stringify(a) === JSON.stringify(b); },

  // 두 기기의 기록 합치기: 점수는 높은 쪽, 시간은 짧은 쪽, 클리어·보상 여부는 어느 한쪽이라도.
  // 기체 스킬은 포인트를 더 많이 번 쪽을 따르고, 설정과 마지막 기체는 지금 기기의 값을 유지한다.
  merge(local, remote) {
    const L = local || {}, R = remote || {};
    const out = Object.assign({}, R, L);
    const keys = (a, b) => Array.from(new Set(Object.keys(a || {}).concat(Object.keys(b || {}))));
    const each = (a, b, f) => { const o = {}; for (const k of keys(a, b)) o[k] = f((a || {})[k], (b || {})[k]); return o; };
    const minT = (a, b) => (a && b) ? Math.min(a, b) : (a || b || 0);
    out.best = each(L.best, R.best, (a, b) => Math.max(a || 0, b || 0));
    out.bestTime = each(L.bestTime, R.bestTime, minT);
    out.cleared = each(L.cleared, R.cleared, (a, b) => !!(a || b));
    out.modeBest = each(L.modeBest, R.modeBest, (a, b) => {
      a = a || {}; b = b || {};
      return { score: Math.max(a.score || 0, b.score || 0), time: minT(a.time, b.time), wave: Math.max(a.wave || 0, b.wave || 0) };
    });
    out.clears = each(L.clears, R.clears, (a, b) => each(a, b, (x, y) => !!(x || y)));
    out.ships = each(L.ships, R.ships, (a, b) => (!a ? b : !b ? a : ((b.earned || 0) > (a.earned || 0) ? b : a)));
    return out;
  },

  /* ---------- 계정 화면 ---------- */
  setStatus(s) { this.status = s; const el = document.getElementById('acc-status'); if (el) el.textContent = s; },

  render() {
    const $ = id => document.getElementById(id);
    if (!$('acc-in')) return;
    const on = !!this.session;
    $('acc-in').style.display = on ? '' : 'none';
    $('acc-out').style.display = on ? 'none' : '';
    if (on) $('acc-name').textContent = this.session.name;
    $('acc-status').textContent = this.status;
    const t = document.querySelector('#s-title button[data-act="account"]');
    if (t) t.textContent = on ? '계정 · ' + this.session.name : '계정 · 로그인';
  },

  bindUI() {
    const $ = id => document.getElementById(id);
    if (!$('acc-in')) return;
    const run = async (kind) => {
      const name = $('acc-id').value, pw = $('acc-pw').value;
      if (!name || !pw) { this.setStatus('닉네임과 비밀번호를 입력해 주세요.'); return; }
      $('acc-login').disabled = $('acc-register').disabled = true;
      this.setStatus(kind === 'register' ? '가입하는 중…' : '로그인하는 중…');
      try { await this.auth(kind, name, pw); $('acc-pw').value = ''; }
      catch (e) { this.setStatus(e.message); }
      finally { $('acc-login').disabled = $('acc-register').disabled = false; }
    };
    $('acc-login').addEventListener('click', () => run('login'));
    $('acc-register').addEventListener('click', () => run('register'));
    $('acc-pw').addEventListener('keydown', e => { if (e.key === 'Enter') run('login'); });
    $('acc-sync').addEventListener('click', () => { this.setStatus('동기화하는 중…'); this.sync.dirty = true; this.push(); });
    $('acc-logout').addEventListener('click', () => this.logout());
    this.render();
  }
};
