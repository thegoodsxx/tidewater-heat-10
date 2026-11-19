/**
 * Tidewater Heat - Input Controller
 * Captures keyboard and mouse events, coordinates mapping, and edge-triggered presses.
 */

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Map();
    this.justPressed = new Set();
    
    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseJustPressed = false;
    this.hasUserInteracted = false;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.hasUserInteracted = true;
      if (!this.keys.get(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.set(e.code, true);

      // Prevent default page scroll on arrow keys / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.hasUserInteracted = true;
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseJustPressed = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(code) {
    return !!this.keys.get(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  wasMousePressed() {
    return this.mouseJustPressed;
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) dy -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) dy += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) dx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) dx += 1;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }
    return { dx, dy, isMoving: len > 0 };
  }

  isSprinting() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  isBraking() {
    return this.isDown('Space');
  }

  clearAll() {
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDown = false;
    this.mouseJustPressed = false;
  }

  endFrame() {
    this.justPressed.clear();
    this.mouseJustPressed = false;
  }
}
