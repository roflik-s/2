/**
 * Keyboard and pointer input abstraction.
 */
export class InputManager {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.bind();
  }

  /**
   * Bind browser input events.
   */
  bind() {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.key);
      if (event.key === 'Escape') event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key);
    });
    window.addEventListener('mousedown', (event) => {
      this.mouse.down = true;
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
  }

  /**
   * Check whether a key is active.
   * @param {string} key
   * @returns {boolean}
   */
  isDown(key) {
    return this.keys.has(key);
  }
}
