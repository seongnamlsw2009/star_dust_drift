'use strict';
// 키보드 / 터치 입력
const Input = {
  keys: {},
  pressed: {},
  touchDX: 0, touchDY: 0, touchSlow: false,
  scale: 1,
  _touches: {},

  init(canvasEl) {
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });

    // 터치: 화면 드래그 = 상대 이동, 두 손가락 = 저속 이동
    const el = canvasEl;
    el.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) this._touches[t.identifier] = { x: t.clientX, y: t.clientY };
      this.touchSlow = Object.keys(this._touches).length >= 2;
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      const ids = Object.keys(this._touches);
      for (const t of e.changedTouches) {
        const p = this._touches[t.identifier];
        if (!p) continue;
        if (ids.length === 0 || String(t.identifier) === ids[0]) {
          this.touchDX += (t.clientX - p.x) / this.scale;
          this.touchDY += (t.clientY - p.y) / this.scale;
        }
        p.x = t.clientX; p.y = t.clientY;
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) delete this._touches[t.identifier];
      this.touchSlow = Object.keys(this._touches).length >= 2;
    };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  },

  down(code) { return !!this.keys[code]; },
  // 눌린 순간 한 번만 true
  take(code) { const v = !!this.pressed[code]; this.pressed[code] = false; return v; },
  clearPressed() { this.pressed = {}; },

  axis() {
    let x = 0, y = 0;
    if (this.down('ArrowLeft') || this.down('KeyA')) x -= 1;
    if (this.down('ArrowRight') || this.down('KeyD')) x += 1;
    if (this.down('ArrowUp') || this.down('KeyW')) y -= 1;
    if (this.down('ArrowDown') || this.down('KeyS')) y += 1;
    const slow = this.down('ShiftLeft') || this.down('ShiftRight') || this.touchSlow;
    return { x, y, slow };
  },
  takeTouchMove() {
    const r = { x: this.touchDX, y: this.touchDY };
    this.touchDX = 0; this.touchDY = 0;
    return r;
  }
};
