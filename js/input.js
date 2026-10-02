'use strict';
// ===== Input: joystick ảo (cảm ứng) + nút + bàn phím =====
const Input = {
  pointers: new Map(),
  joy: { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0, mag: 0 },
  taps: [],            // hàng đợi chạm {x,y} (toạ độ logic 1280x720)
  keyActions: [],      // hành động từ bàn phím: 'skill:0' 'potion' 'lb' 'pause' 'confirm'
  keys: new Set(),
  joyR: 72,

  moveVec() {
    let x = 0, y = 0;
    if (this.joy.on) { x = this.joy.dx * this.joy.mag; y = this.joy.dy * this.joy.mag; }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m) };
  },

  init(canvas, toLogical) {
    const down = e => {
      e.preventDefault(); Snd.ensure();
      const p = toLogical(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, p);
      this.taps.push({ x: p.x, y: p.y });
      // joystick: bắt đầu ở nửa trái màn hình logic
      if (G.state === 'duty' && !this.joy.on && p.x < G.VW * 0.485 && G.player && G.player.alive) {
        this.joy = { on: true, id: e.pointerId, bx: p.x, by: p.y, dx: 0, dy: 0, mag: 0 };
      }
    };
    const move = e => {
      if (!this.pointers.has(e.pointerId)) return;
      e.preventDefault();
      const p = toLogical(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, p);
      if (this.joy.on && this.joy.id === e.pointerId) {
        let dx = p.x - this.joy.bx, dy = p.y - this.joy.by;
        const d = Math.hypot(dx, dy);
        if (d > this.joyR) { dx = dx / d * this.joyR; dy = dy / d * this.joyR; }
        const mag = Math.min(1, d / this.joyR);
        if (d > 0.001) { this.joy.dx = dx / (Math.hypot(dx, dy) || 1); this.joy.dy = dy / (Math.hypot(dx, dy) || 1); }
        this.joy.mag = mag < 0.16 ? 0 : mag;
      }
    };
    const up = e => {
      this.pointers.delete(e.pointerId);
      if (this.joy.on && this.joy.id === e.pointerId) {
        this.joy = { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0, mag: 0 };
      }
    };
    canvas.addEventListener('pointerdown', down, { passive: false });
    canvas.addEventListener('pointermove', move, { passive: false });
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      Snd.ensure();
      this.keys.add(e.code);
      const map = { Digit1: 'skill:0', Digit2: 'skill:1', Digit3: 'skill:2', Digit4: 'skill:3', Digit5: 'skill:4', KeyQ: 'potion', KeyR: 'lb', KeyP: 'pause', Escape: 'pause', Enter: 'confirm', Space: 'confirm' };
      if (map[e.code]) { e.preventDefault(); this.keyActions.push(map[e.code]); }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }
};
