// ECHO VAULT — input: keyboard, mouse and touch. One clear job: turn raw
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed by main each frame
    this.moveX = 0;
    this.moveY = 0;
    this.pointer = { x: 640, y: 360, down: false, active: false };
    this.joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.dashBtn = { x: 0, y: 0, r: 0 };
    this.onKey = null; // (code) => void, set by main for P/M/R/abilities
    this.onPointerDown = null; // (x, y) => void
    this.onPointerUp = null;
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        this.pressed.add(e.code);
        if (this.onKey) this.onKey(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointer.down = false; });

    const toLocal = (e) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    c.addEventListener('pointerdown', (e) => {
      const p = toLocal(e);
      this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.down = true; this.pointer.active = true;
      // Left half of the screen is a virtual joystick on touch.
      if (e.pointerType === 'touch' && p.x < 560) {
        this.joy.active = true; this.joy.id = e.pointerId;
        this.joy.ox = p.x; this.joy.oy = p.y; this.joy.dx = 0; this.joy.dy = 0;
      }
      if (this.onPointerDown) this.onPointerDown(p.x, p.y, e.pointerType === 'touch');
    });
    c.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      this.pointer.x = p.x; this.pointer.y = p.y;
      if (this.joy.active && e.pointerId === this.joy.id) {
        const dx = p.x - this.joy.ox, dy = p.y - this.joy.oy;
        const len = Math.hypot(dx, dy) || 1;
        const m = Math.min(len, 56) / len;
        this.joy.dx = dx * m / 56; this.joy.dy = dy * m / 56;
      }
    });
    const endPointer = (e) => {
      this.pointer.down = false;
      if (this.joy.active && e.pointerId === this.joy.id) {
        this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0;
      }
      if (this.onPointerUp) this.onPointerUp();
    };
    c.addEventListener('pointerup', endPointer);
    c.addEventListener('pointercancel', endPointer);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Read once per frame: the normalized movement vector from keys or stick.
  readMove() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0 && this.joy.active) { x = this.joy.dx; y = this.joy.dy; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.moveX = x; this.moveY = y;
    return { x, y };
  }

  wasPressed(code) { return this.pressed.has(code); }
  consume() { this.pressed.clear(); }
}
