const TILE_SIZE = 34;
const MAP_SIZE = 21;
const MAX_HEALTH = 100;

class InputManager {
  /**
   * Handle keyboard input for the game.
   */
  constructor() {
    this.keys = new Set();
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.key.toLowerCase());
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  /**
   * Check whether a key is currently pressed.
   * @param {string} key
   * @returns {boolean}
   */
  isDown(key) {
    return this.keys.has(key.toLowerCase());
  }
}

class AudioManager {
  constructor() {
    this.enabled = true;
    this.context = null;
  }

  /**
   * Initialize the Web Audio context lazily.
   */
  init() {
    if (!this.context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        this.context = new Ctx();
      }
    }
  }

  /**
   * Play a simple tone for UI and gameplay feedback.
   * @param {number} freq
   * @param {number} duration
   * @param {number} volume
   */
  beep(freq = 440, duration = 0.08, volume = 0.03) {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = freq;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
}

class LevelGenerator {
  /**
   * Create a unique maze level using recursive backtracking.
   * @returns {{grid: number[][], start: {x:number,y:number}, exit: {x:number,y:number}, cups: Array<object>, enemies: Array<object>, traps: Array<object>}}
   */
  generate() {
    const grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(1));
    const visited = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(false));
    const stack = [];

    const carve = (x, y) => {
      visited[y][x] = true;
      grid[y][x] = 0;
      const dirs = this.shuffle([
        { dx: 2, dy: 0 },
        { dx: -2, dy: 0 },
        { dx: 0, dy: 2 },
        { dx: 0, dy: -2 }
      ]);

      for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx > 0 && ny > 0 && nx < MAP_SIZE - 1 && ny < MAP_SIZE - 1 && !visited[ny][nx]) {
          grid[y + dir.dy / 2][x + dir.dx / 2] = 0;
          stack.push([x, y]);
          carve(nx, ny);
        }
      }
    };

    carve(1, 1);

    const openCells = [];
    for (let y = 1; y < MAP_SIZE - 1; y += 1) {
      for (let x = 1; x < MAP_SIZE - 1; x += 1) {
        if (grid[y][x] === 0) {
          openCells.push({ x, y });
        }
      }
    }

    const start = openCells[0];
    const exit = openCells[openCells.length - 1];
    const cups = [];
    const traps = [];
    const enemies = [];

    for (let i = 0; i < 8; i += 1) {
      const cell = openCells[Math.floor(Math.random() * openCells.length)];
      if (cell.x !== start.x || cell.y !== start.y) {
        cups.push({ x: cell.x, y: cell.y, value: i < 3 ? 50 : 20 });
      }
    }

    for (let i = 0; i < 6; i += 1) {
      const cell = openCells[Math.floor(Math.random() * openCells.length)];
      if (cell.x !== start.x || cell.y !== start.y) {
        traps.push({ x: cell.x, y: cell.y });
      }
    }

    for (let i = 0; i < 4; i += 1) {
      const cell = openCells[Math.floor(Math.random() * openCells.length)];
      if (cell.x !== start.x || cell.y !== start.y) {
        enemies.push({ x: cell.x, y: cell.y, vx: 0, vy: 0, state: 'idle' });
      }
    }

    return { grid, start, exit, cups, enemies, traps };
  }

  /**
   * Shuffle an array in place.
   * @param {Array<any>} array
   * @returns {Array<any>}
   */
  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

class Player {
  /**
   * Player entity containing movement, health and inventory state.
   * @param {{x:number,y:number}} position
   * @param {InputManager} input
   */
  constructor(position, input) {
    this.x = position.x;
    this.y = position.y;
    this.input = input;
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.score = 0;
    this.cups = 0;
    this.invulnerable = 0;
    this.speed = 3.6;
    this.sprintSpeed = 5.6;
    this.direction = { x: 1, y: 0 };
    this.potions = 1;
  }

  /**
   * Update player movement and interactions.
   * @param {number} dt
   * @param {number[][]} grid
   * @param {Array<object>} cups
   * @param {Array<object>} traps
   * @param {{x:number,y:number}} exit
   * @param {function(object): void} onPickup
   * @param {function(): void} onTrap
   * @param {function(): void} onExit
   * @returns {{collected:number, dead:boolean, win:boolean}}
   */
  update(dt, grid, cups, traps, exit, onPickup, onTrap, onExit) {
    let dx = 0;
    let dy = 0;
    if (this.input.isDown('arrowup') || this.input.isDown('w')) dy -= 1;
    if (this.input.isDown('arrowdown') || this.input.isDown('s')) dy += 1;
    if (this.input.isDown('arrowleft') || this.input.isDown('a')) dx -= 1;
    if (this.input.isDown('arrowright') || this.input.isDown('d')) dx += 1;

    const sprinting = this.input.isDown('shift');
    const speed = sprinting ? this.sprintSpeed : this.speed;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      this.direction = { x: nx, y: ny };
      const nextX = this.x + nx * speed * dt;
      const nextY = this.y + ny * speed * dt;
      if (!this.isBlocked(nextX, this.y, grid)) {
        this.x = nextX;
      }
      if (!this.isBlocked(this.x, nextY, grid)) {
        this.y = nextY;
      }
    }

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
    }

    for (let i = cups.length - 1; i >= 0; i -= 1) {
      const cup = cups[i];
      if (Math.abs(this.x - cup.x) < 0.55 && Math.abs(this.y - cup.y) < 0.55) {
        this.score += cup.value;
        this.cups += 1;
        cups.splice(i, 1);
        onPickup(cup);
      }
    }

    for (const trap of traps) {
      if (Math.abs(this.x - trap.x) < 0.6 && Math.abs(this.y - trap.y) < 0.6) {
        if (this.invulnerable <= 0) {
          this.health = Math.max(0, this.health - 20);
          this.invulnerable = 0.8;
          onTrap();
        }
      }
    }

    if (Math.abs(this.x - exit.x) < 0.7 && Math.abs(this.y - exit.y) < 0.7) {
      onExit();
    }

    return { dead: this.health <= 0, win: false };
  }

  /**
   * Check whether a world position is blocked by a wall.
   * @param {number} tx
   * @param {number} ty
   * @param {number[][]} grid
   * @returns {boolean}
   */
  isBlocked(tx, ty, grid) {
    const gx = Math.floor(tx);
    const gy = Math.floor(ty);
    return gx < 0 || gy < 0 || gx >= MAP_SIZE || gy >= MAP_SIZE || grid[gy][gx] === 1;
  }
}

class Enemy {
  /**
   * Simple chasing enemy.
   * @param {{x:number,y:number}} position
   */
  constructor(position) {
    this.x = position.x;
    this.y = position.y;
    this.speed = 2.2;
    this.state = 'idle';
    this.cooldown = 0;
  }

  /**
   * Update enemy AI.
   * @param {number} dt
   * @param {number[][]} grid
   * @param {{x:number,y:number}} player
   */
  update(dt, grid, player) {
    this.cooldown -= dt;
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist < 6) {
      this.state = 'chase';
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const nextX = this.x + nx * this.speed * dt;
      const nextY = this.y + ny * this.speed * dt;
      if (!this.isBlocked(nextX, this.y, grid)) this.x = nextX;
      if (!this.isBlocked(this.x, nextY, grid)) this.y = nextY;
    } else if (this.cooldown <= 0) {
      this.state = 'idle';
      const dir = Math.random() > 0.5 ? 1 : -1;
      const nextX = this.x + dir * (Math.random() * 0.6 + 0.2);
      const nextY = this.y + (Math.random() > 0.5 ? 0.3 : -0.3);
      if (!this.isBlocked(nextX, this.y, grid)) this.x = nextX;
      if (!this.isBlocked(this.x, nextY, grid)) this.y = nextY;
      this.cooldown = 1.2;
    }
  }

  /**
   * Check collision with walls.
   * @param {number} tx
   * @param {number} ty
   * @param {number[][]} grid
   * @returns {boolean}
   */
  isBlocked(tx, ty, grid) {
    const gx = Math.floor(tx);
    const gy = Math.floor(ty);
    return gx < 0 || gy < 0 || gx >= MAP_SIZE || gy >= MAP_SIZE || grid[gy][gx] === 1;
  }
}

class Game {
  /**
   * Main game controller.
   */
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.levelGenerator = new LevelGenerator();
    this.state = 'menu';
    this.level = null;
    this.player = null;
    this.enemies = [];
    this.cups = [];
    this.traps = [];
    this.paused = false;
    this.score = 0;
    this.timer = 0;
    this.difficulty = 'normal';
    this.settings = this.loadSettings();
    this.setupUI();
    this.bindEvents();
    this.resize();
    this.start();
  }

  /**
   * Wire up UI elements and button handlers.
   */
  setupUI() {
    this.overlay = document.getElementById('overlay');
    this.menuScreen = document.getElementById('menu-screen');
    this.settingsScreen = document.getElementById('settings-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.hud = document.getElementById('hud');
    this.statusText = document.getElementById('status-text');
    this.difficultySelect = document.getElementById('difficulty-select');
    this.volumeRange = document.getElementById('volume-range');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.scoreValue = document.getElementById('score-value');
    this.cupsValue = document.getElementById('cups-value');
    this.healthValue = document.getElementById('health-value');
    this.timerValue = document.getElementById('timer-value');

    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => this.handleAction(button.dataset.action));
    });

    this.difficultySelect.value = this.settings.difficulty;
    this.volumeRange.value = this.settings.volume * 100;
  }

  /**
   * Bind window-level events.
   */
  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.state === 'playing') {
        this.togglePause();
      }
      if (event.key === 'f' || event.key === 'F') {
        this.toggleFullscreen();
      }
    });
  }

  /**
   * Start the game loop.
   */
  start() {
    this.lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.032, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /**
   * Update game systems.
   * @param {number} dt
   */
  update(dt) {
    if (this.state !== 'playing' || this.paused) return;

    this.timer += dt;
    this.player.update(dt, this.level.grid, this.cups, this.traps, this.level.exit, this.handlePickup.bind(this), this.handleTrap.bind(this), this.handleWin.bind(this));
    this.enemies.forEach((enemy) => enemy.update(dt, this.level.grid, { x: this.player.x, y: this.player.y }));

    for (const enemy of this.enemies) {
      if (Math.abs(enemy.x - this.player.x) < 0.7 && Math.abs(enemy.y - this.player.y) < 0.7) {
        if (this.player.invulnerable <= 0) {
          this.player.health = Math.max(0, this.player.health - 15);
          this.player.invulnerable = 0.6;
          this.audio.beep(220, 0.08, 0.05);
        }
      }
    }

    if (this.player.health <= 0) {
      this.endGame(false);
    }
  }

  /**
   * Draw the current scene.
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();

    if (this.state === 'menu') {
      this.renderMenu();
    } else if (this.state === 'playing') {
      this.renderLevel();
      this.renderHUD();
    } else if (this.state === 'gameover') {
      this.renderMenu();
    } else if (this.state === 'victory') {
      this.renderMenu();
    }

    this.ctx.restore();
  }

  /**
   * Render the main menu and overlay background.
   */
  renderMenu() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#140c08');
    gradient.addColorStop(1, '#030303');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#f8d6a2';
    this.ctx.font = 'bold 42px Segoe UI';
    this.ctx.fillText('Cup Escape', 48, 90);
    this.ctx.font = '24px Segoe UI';
    this.ctx.fillText('Curse of the Pyramid', 48, 132);

    this.ctx.fillStyle = '#d48b14';
    this.ctx.fillRect(48, 150, 180, 4);
    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.ctx.font = '16px Segoe UI';
    this.ctx.fillText('Explore the maze, collect the cups, and escape the tomb.', 48, 182);

    this.ctx.fillStyle = '#7a522d';
    this.ctx.fillRect(48, 210, 70, 12);
    this.ctx.fillRect(130, 210, 70, 12);
    this.ctx.fillRect(212, 210, 70, 12);
    this.ctx.fillStyle = '#ffbf46';
    this.ctx.fillRect(50, 212, 66, 8);
    this.ctx.fillRect(132, 212, 66, 8);
    this.ctx.fillRect(214, 212, 66, 8);
  }

  /**
   * Render the level using the generated maze.
   */
  renderLevel() {
    const { width, height } = this.canvas;
    const grid = this.level.grid;
    const tilePx = TILE_SIZE;

    this.ctx.fillStyle = '#0b0604';
    this.ctx.fillRect(0, 0, width, height);

    const offsetX = (width - MAP_SIZE * tilePx) / 2;
    const offsetY = (height - MAP_SIZE * tilePx) / 2;

    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        const px = offsetX + x * tilePx;
        const py = offsetY + y * tilePx;
        if (grid[y][x] === 1) {
          this.ctx.fillStyle = '#3f2c22';
          this.ctx.fillRect(px, py, tilePx, tilePx);
          this.ctx.fillStyle = '#6d4b33';
          this.ctx.fillRect(px + 3, py + 3, tilePx - 6, tilePx - 6);
          this.ctx.fillStyle = '#2a1d17';
          this.ctx.fillRect(px + 4, py + 4, tilePx - 8, 3);
          this.ctx.fillRect(px + 4, py + tilePx - 7, tilePx - 8, 3);
          this.ctx.fillRect(px + 4, py + 4, 3, tilePx - 8);
          this.ctx.fillRect(px + tilePx - 7, py + 4, 3, tilePx - 8);
        } else {
          this.ctx.fillStyle = '#8d683d';
          this.ctx.fillRect(px, py, tilePx, tilePx);
          this.ctx.fillStyle = '#c8a05f';
          this.ctx.fillRect(px + 4, py + 4, tilePx - 8, tilePx - 8);
          if ((x + y) % 5 === 0) {
            this.ctx.fillStyle = '#7a522d';
            this.ctx.fillRect(px + 6, py + 6, 4, 4);
          }
        }
      }
    }

    this.ctx.fillStyle = '#5a3f2b';
    for (let i = 0; i < 5; i += 1) {
      const px = offsetX + 2 * tilePx + i * 3 * tilePx;
      const py = offsetY + 1.5 * tilePx;
      this.ctx.fillRect(px, py, 10, 18);
    }

    this.ctx.fillStyle = '#d48b14';
    this.ctx.beginPath();
    this.ctx.arc(offsetX + 7 * tilePx, offsetY + 2 * tilePx, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffbf46';
    this.ctx.beginPath();
    this.ctx.arc(offsetX + 7 * tilePx, offsetY + 2 * tilePx, 3, 0, Math.PI * 2);
    this.ctx.fill();

    for (const trap of this.traps) {
      const px = offsetX + trap.x * tilePx;
      const py = offsetY + trap.y * tilePx;
      this.ctx.fillStyle = '#2d1b1b';
      this.ctx.fillRect(px + 8, py + 8, tilePx - 16, tilePx - 16);
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.fillRect(px + 10, py + 10, tilePx - 20, tilePx - 20);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(px + 14, py + 12, 4, 8);
      this.ctx.fillRect(px + 16, py + 10, 4, 10);
      this.ctx.fillRect(px + 18, py + 12, 4, 8);
    }

    for (const cup of this.cups) {
      const px = offsetX + cup.x * tilePx;
      const py = offsetY + cup.y * tilePx;
      this.ctx.fillStyle = '#c28711';
      this.ctx.fillRect(px + 10, py + 8, tilePx - 20, tilePx - 18);
      this.ctx.fillStyle = '#ffe082';
      this.ctx.fillRect(px + 12, py + 10, tilePx - 24, tilePx - 22);
      this.ctx.fillStyle = '#8b5e3c';
      this.ctx.fillRect(px + 8, py + 6, tilePx - 16, 5);
      this.ctx.fillStyle = '#d4af37';
      this.ctx.beginPath();
      this.ctx.arc(px + tilePx / 2, py + 11, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const exit = this.level.exit;
    const ex = offsetX + exit.x * tilePx;
    const ey = offsetY + exit.y * tilePx;
    this.ctx.fillStyle = '#123b2f';
    this.ctx.fillRect(ex + 6, ey + 6, tilePx - 12, tilePx - 12);
    this.ctx.fillStyle = '#2ec4b6';
    this.ctx.fillRect(ex + 10, ey + 10, tilePx - 20, tilePx - 20);
    this.ctx.fillStyle = '#f8d6a2';
    this.ctx.fillRect(ex + 14, ey + 8, 6, 10);
    this.ctx.fillRect(ex + 16, ey + 6, 4, 14);

    const px = offsetX + this.player.x * tilePx;
    const py = offsetY + this.player.y * tilePx;

    this.ctx.fillStyle = '#8b5e3c';
    this.ctx.fillRect(px - 8, py - 8, 16, 10);
    this.ctx.fillStyle = '#b87333';
    this.ctx.fillRect(px - 7, py - 7, 14, 8);

    this.ctx.fillStyle = '#c9a227';
    this.ctx.beginPath();
    this.ctx.moveTo(px - 8, py - 1);
    this.ctx.lineTo(px, py - 12);
    this.ctx.lineTo(px + 8, py - 1);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#1d2f4d';
    this.ctx.fillRect(px - 6, py + 2, 12, 10);
    this.ctx.fillStyle = '#f2c08d';
    this.ctx.fillRect(px - 4, py - 2, 8, 8);

    this.ctx.fillStyle = '#2f2a24';
    this.ctx.fillRect(px - 8, py + 12, 5, 8);
    this.ctx.fillRect(px + 3, py + 12, 5, 8);

    this.ctx.fillStyle = '#ffb347';
    this.ctx.beginPath();
    this.ctx.arc(px + 6, py + 4, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#2b3d55';
    this.ctx.beginPath();
    this.ctx.arc(px - 2, py + 2, 2, 0, Math.PI * 2);
    this.ctx.arc(px + 2, py + 2, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#2b3d55';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(px - 3, py + 7);
    this.ctx.quadraticCurveTo(px, py + 10, px + 3, py + 7);
    this.ctx.stroke();

    for (const enemy of this.enemies) {
      const exPos = offsetX + enemy.x * tilePx;
      const eyPos = offsetY + enemy.y * tilePx;
      this.ctx.fillStyle = enemy.state === 'chase' ? '#a63d3d' : '#5c4b3b';
      this.ctx.beginPath();
      this.ctx.arc(exPos, eyPos, 10, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#111';
      this.ctx.fillRect(exPos - 8, eyPos - 6, 16, 8);
      this.ctx.fillStyle = '#ffd39a';
      this.ctx.fillRect(exPos - 4, eyPos - 10, 8, 6);
    }

    if (this.paused) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 32px Segoe UI';
      this.ctx.fillText('Paused', width / 2 - 50, height / 2 - 10);
    }
  }

  /**
   * Render the HUD and status strip.
   */
  renderHUD() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this.ctx.fillRect(16, 16, 320, 110);
    this.ctx.fillStyle = '#f8d6a2';
    this.ctx.font = '16px Segoe UI';
    this.ctx.fillText(`Health: ${Math.round(this.player.health)}`, 32, 40);
    this.ctx.fillText(`Score: ${this.score}`, 32, 64);
    this.ctx.fillText(`Cups: ${this.player.cups}/${this.level.cups.length}`, 32, 88);
    this.ctx.fillText(`Time: ${this.timer.toFixed(1)}s`, 32, 112);
  }

  /**
   * Handle pickup events.
   * @param {object} cup
   */
  handlePickup(cup) {
    this.audio.beep(660, 0.05, 0.04);
    this.score += cup.value;
  }

  /**
   * Handle trap collision.
   */
  handleTrap() {
    this.audio.beep(180, 0.08, 0.05);
  }

  /**
   * End the game in defeat or victory.
   * @param {boolean} won
   */
  endGame(won) {
    this.state = won ? 'victory' : 'gameover';
    this.overlay.style.display = 'flex';
    this.showOutcome(won);
  }

  /**
   * Show the appropriate outcome message.
   * @param {boolean} won
   */
  showOutcome(won) {
    const message = won
      ? `You escaped with ${this.score} points.`
      : `You were overwhelmed in the tomb. Score: ${this.score}`;
    if (won) {
      document.getElementById('victory-summary').textContent = message;
      this.victoryScreen.style.display = 'block';
      this.gameoverScreen.style.display = 'none';
      this.menuScreen.style.display = 'none';
      this.settingsScreen.style.display = 'none';
    } else {
      document.getElementById('gameover-summary').textContent = message;
      this.gameoverScreen.style.display = 'block';
      this.victoryScreen.style.display = 'none';
      this.menuScreen.style.display = 'none';
      this.settingsScreen.style.display = 'none';
    }
  }

  /**
   * Start a fresh game session.
   */
  startGame() {
    this.level = this.levelGenerator.generate();
    this.player = new Player(this.level.start, this.input);
    this.enemies = this.level.enemies.map((enemy) => new Enemy({ x: enemy.x, y: enemy.y }));
    this.cups = [...this.level.cups];
    this.traps = [...this.level.traps];
    this.score = 0;
    this.timer = 0;
    this.state = 'playing';
    this.paused = false;
    this.overlay.style.display = 'none';
    this.hud.style.display = 'block';
    this.audio.beep(540, 0.08, 0.05);
  }

  /**
   * Handle UI actions.
   * @param {string} action
   */
  handleAction(action) {
    if (action === 'new-game') {
      this.startGame();
    } else if (action === 'settings') {
      this.showScreen('settings');
    } else if (action === 'back-menu') {
      this.showScreen('menu');
    } else if (action === 'restart') {
      this.startGame();
    } else if (action === 'exit') {
      window.close();
    } else if (action === 'continue') {
      if (!this.level) {
        this.startGame();
      } else {
        this.state = 'playing';
        this.paused = false;
        this.overlay.style.display = 'none';
      }
    }
  }

  /**
   * Toggle pause state.
   */
  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
  }

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /**
   * Show the requested screen.
   * @param {string} screen
   */
  showScreen(screen) {
    this.menuScreen.style.display = screen === 'menu' ? 'block' : 'none';
    this.settingsScreen.style.display = screen === 'settings' ? 'block' : 'none';
    this.gameoverScreen.style.display = 'none';
    this.victoryScreen.style.display = 'none';
    this.overlay.style.display = 'flex';
    this.hud.style.display = 'none';
    this.state = 'menu';
  }

  /**
   * Apply the selected settings.
   */
  applySettings() {
    this.settings.difficulty = this.difficultySelect.value;
    this.settings.volume = Number(this.volumeRange.value) / 100;
    this.audio.enabled = this.settings.volume > 0.01;
    this.saveSettings();
  }

  /**
   * Save settings in LocalStorage.
   */
  saveSettings() {
    localStorage.setItem('cup-escape-settings', JSON.stringify(this.settings));
  }

  /**
   * Load settings from LocalStorage.
   * @returns {{difficulty:string, volume:number}}
   */
  loadSettings() {
    const raw = localStorage.getItem('cup-escape-settings');
    if (!raw) return { difficulty: 'normal', volume: 0.8 };
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { difficulty: 'normal', volume: 0.8 };
    }
  }

  /**
   * Handle victory when the exit is reached.
   */
  handleWin() {
    if (this.player.cups >= this.level.cups.length) {
      this.endGame(true);
    }
  }

  /**
   * Resize canvas to fit the available browser space.
   */
  resize() {
    const { innerWidth, innerHeight } = window;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
