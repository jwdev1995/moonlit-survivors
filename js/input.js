'use strict';
// 키보드 + 터치 가상 조이스틱
const Input = {
  keys: new Set(),
  joy: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, max: 48 },
  handlers: {},
  init(canvas, handlers) {
    this.handlers = handlers || {};
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'p' || k === 'escape') this.emit('pause');
      if (k === 'm') this.emit('mute');
      if (k === '1' || k === '2' || k === '3') this.emit('choose', Number(k) - 1);
      if (k === 'enter' || k === ' ') this.emit('confirm');
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.emit('blur'); });

    const start = e => {
      if (this.joy.active) return;
      const t = e.changedTouches[0];
      this.joy.active = true; this.joy.id = t.identifier;
      this.joy.ox = t.clientX; this.joy.oy = t.clientY; this.joy.x = 0; this.joy.y = 0;
      e.preventDefault();
    };
    const move = e => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) {
        let dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy;
        const d = Math.hypot(dx, dy);
        if (d > this.joy.max) { dx = dx / d * this.joy.max; dy = dy / d * this.joy.max; }
        this.joy.x = dx; this.joy.y = dy;
      }
      e.preventDefault();
    };
    const end = e => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) {
        this.joy.active = false; this.joy.id = null; this.joy.x = this.joy.y = 0;
      }
    };
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  },
  emit(name, arg) { if (this.handlers[name]) this.handlers[name](arg); },
  // 이동 벡터 (-1~1, 길이 ≤ 1)
  vector() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (this.joy.active) {
      const d = Math.hypot(this.joy.x, this.joy.y);
      if (d > 6) { const s = Math.min(1, d / this.joy.max); x = this.joy.x / d * s; y = this.joy.y / d * s; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },
};
