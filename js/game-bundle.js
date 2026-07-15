const GAME_CONFIG = {
  appName: 'Cup Escape: Curse of the Pyramid',
  canvas: {
    width: 1280,
    height: 720,
    minWidth: 900,
    minHeight: 540
  },
  tileSize: 32,
  level: {
    width: 31,
    height: 31,
    themes: [
      'Ancient Entrance',
      'Dark Catacombs',
      'Sand Chambers',
      'Royal Tombs',
      'Secret Libraries',
      'Treasure Vaults',
      'Underground Rivers',
      'Forgotten Temples',
      'Final Pharaoh Chamber'
    ]
  },
  player: {
    speed: 210,
    sprintMultiplier: 1.6,
    health: 100,
    interactionRadius: 72,
    invulnerabilityDuration: 1.2,
    startingInventory: []
  },
  difficulty: {
    enemySpeedBase: 70,
    enemySpeedGrowth: 0.6,
    trapFrequencyBase: 0.03,
    trapFrequencyGrowth: 0.002,
    visibilityDecay: 0.0015,
    dangerGrowthPerMinute: 0.12
  },
  assets: {
    images: {
      player: 'assets/images/player.svg',
      cup: 'assets/images/cup.svg',
      artifact: 'assets/images/artifact.svg',
      exit: 'assets/images/exit.svg',
      torch: 'assets/images/torch.svg',
      wall: 'assets/images/wall.svg',
      floor: 'assets/images/floor.svg',
      treasure: 'assets/images/treasure.svg',
      mummy: 'assets/images/mummy.svg',
      pharaoh: 'assets/images/pharaoh.svg',
      uiIcon: 'assets/ui/icon.svg'
    },
    audio: {
      music: 'assets/audio/ambient_music.wav',
      ambient: 'assets/audio/ambient_cave.wav',
      pickup: 'assets/audio/pickup.wav',
      enemy: 'assets/audio/enemy.wav',
      trap: 'assets/audio/trap.wav',
      menu: 'assets/audio/menu.wav',
      victory: 'assets/audio/victory.wav'
    }
  },
  controls: {
    moveUp: ['ArrowUp', 'w', 'W'],
    moveDown: ['ArrowDown', 's', 'S'],
    moveLeft: ['ArrowLeft', 'a', 'A'],
    moveRight: ['ArrowRight', 'd', 'D'],
    sprint: ['Shift'],
    useItem: [' '],
    interact: ['e', 'E'],
    pause: ['Escape']
  },
  ui: {
    hudPadding: 18,
    minimapScale: 0.16
  }
};

class InputManager {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.bind();
  }

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

  isDown(key) {
    return this.keys.has(key);
  }
}

class AudioManager {
  constructor() {
    this.settings = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };
  }

  playMenuSound() {
    this.playSfx('menu');
  }

  playSfx(type) {
    if (this.settings.muted) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = type === 'menu' ? 440 : 660;
    gain.gain.value = this.settings.sfx * 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  }
}

class Renderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  renderWorld(level, player, particles) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#0c0704';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const tileSize = GAME_CONFIG.tileSize;
    const startX = Math.floor(player.x * tileSize - this.canvas.width / 2);
    const startY = Math.floor(player.y * tileSize - this.canvas.height / 2);
    for (let y = 0; y < level.grid.length; y += 1) {
      for (let x = 0; x < level.grid[y].length; x += 1) {
        const cell = level.grid[y][x];
        if (cell === 1) {
          ctx.fillStyle = '#4c3b2d';
          ctx.fillRect(x * tileSize - startX, y * tileSize - startY, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#8b6e46';
          ctx.fillRect(x * tileSize - startX, y * tileSize - startY, tileSize, tileSize);
        }
      }
    }

    ctx.fillStyle = '#f4d29b';
    ctx.beginPath();
    ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffdb70';
    ctx.beginPath();
    ctx.arc(player.x * tileSize - startX, player.y * tileSize - startY, 16, 0, Math.PI * 2);
    ctx.fill();

    particles.render();
    ctx.restore();
  }

  renderMenuBackdrop() {
    const ctx = this.ctx;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#19110a');
    gradient.addColorStop(1, '#060402');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#c68d2f';
    ctx.font = 'bold 48px Segoe UI';
    ctx.fillText('Cup Escape', 48, 96);
    ctx.restore();
  }
}

class Player {
  constructor(position, level, input) {
    this.position = { ...position };
    this.x = position.x;
    this.y = position.y;
    this.level = level;
    this.input = input;
    this.speed = GAME_CONFIG.player.speed;
    this.sprintMultiplier = GAME_CONFIG.player.sprintMultiplier;
    this.health = GAME_CONFIG.player.health;
    this.maxHealth = GAME_CONFIG.player.health;
    this.score = 0;
    this.collectedCups = 0;
    this.inventory = [];
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.checkpoint = { ...position };
    this.animationState = 'idle';
    this.interactionRadius = GAME_CONFIG.player.interactionRadius;
    this.stats = {
      damageResistance: 1,
      movementBonus: 0,
      visibilityBonus: 0
    };
  }

  update(dt, level) {
    this.handleInput(dt, level);
    if (this.invulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.invulnerable = false;
    }
  }

  handleInput(dt, level) {
    let dx = 0;
    let dy = 0;

    if (this.input?.isDown('ArrowUp') || this.input?.isDown('w')) dy -= 1;
    if (this.input?.isDown('ArrowDown') || this.input?.isDown('s')) dy += 1;
    if (this.input?.isDown('ArrowLeft') || this.input?.isDown('a')) dx -= 1;
    if (this.input?.isDown('ArrowRight') || this.input?.isDown('d')) dx += 1;

    const isSprinting = this.input?.isDown('Shift');
    const movementScale = isSprinting ? this.sprintMultiplier : 1;
    const moveSpeed = (this.speed + this.stats.movementBonus) * movementScale * dt;

    if (dx !== 0 || dy !== 0) {
      const magnitude = Math.hypot(dx, dy) || 1;
      const nx = dx / magnitude;
      const ny = dy / magnitude;
      const nextX = this.x + nx * moveSpeed;
      const nextY = this.y + ny * moveSpeed;

      if (!level.isBlocked(nextX, this.y)) this.x = nextX;
      if (!level.isBlocked(this.x, nextY)) this.y = nextY;
      this.animationState = isSprinting ? 'run' : 'walk';
    } else {
      this.animationState = 'idle';
    }

    this.position.x = this.x;
    this.position.y = this.y;
  }

  takeDamage(amount) {
    if (this.invulnerable) return;
    this.health = Math.max(0, this.health - amount * this.stats.damageResistance);
    this.invulnerable = true;
    this.invulnerableTimer = GAME_CONFIG.player.invulnerabilityDuration;
  }

  addScore(amount) {
    this.score += amount;
  }

  addToInventory(item) {
    this.inventory.push(item);
  }

  setCheckpoint(position) {
    this.checkpoint = { ...position };
  }
}

class LevelGenerator {
  constructor() {
    this.tileSize = GAME_CONFIG.tileSize;
  }

  generateLevel() {
    const width = GAME_CONFIG.level.width;
    const height = GAME_CONFIG.level.height;
    const grid = Array.from({ length: height }, () => Array(width).fill(1));
    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const stack = [];
    const start = { x: 1, y: 1 };
    visited[1][1] = true;
    grid[1][1] = 0;
    stack.push(start);

    const dirs = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];
      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && !visited[ny][nx]) {
          neighbors.push({ x: nx, y: ny, wallX: current.x + dir.dx / 2, wallY: current.y + dir.dy / 2 });
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[next.y][next.x] = true;
      grid[next.y][next.x] = 0;
      grid[next.wallY][next.wallX] = 0;
      stack.push(next);
    }

    const exit = this.placeExit(grid);
    const collectibles = this.placeCollectibles(grid);
    const enemies = this.placeEnemies(grid);
    const traps = this.placeTraps(grid);
    const decorations = this.placeDecorations(grid);

    return {
      grid,
      theme: GAME_CONFIG.level.themes[Math.floor(Math.random() * GAME_CONFIG.level.themes.length)],
      exit,
      collectibles,
      enemies,
      traps,
      decorations,
      isBlocked: (x, y) => {
        const tx = Math.floor(x);
        const ty = Math.floor(y);
        return tx < 0 || ty < 0 || tx >= grid[0].length || ty >= grid.length || grid[ty][tx] === 1;
      },
      update() {
        return 0;
      }
    };
  }

  placeExit(grid) {
    let x = 1;
    let y = 1;
    while (grid[y][x] !== 0) {
      x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
      y = Math.floor(Math.random() * (grid.length - 2)) + 1;
    }
    return { x, y };
  }

  placeCollectibles(grid) {
    const items = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid[y].length - 1; x += 1) {
        if (grid[y][x] === 0 && Math.random() < 0.06) {
          items.push({ x, y, type: 'cup', value: 10 });
        }
      }
    }
    return items;
  }

  placeEnemies(grid) {
    const enemies = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid[y].length - 1; x += 1) {
        if (grid[y][x] === 0 && Math.random() < 0.025) {
          enemies.push({ x, y, type: 'mummy' });
        }
      }
    }
    return enemies;
  }

  placeTraps(grid) {
    const traps = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid[y].length - 1; x += 1) {
        if (grid[y][x] === 0 && Math.random() < 0.015) {
          traps.push({ x, y, type: 'spike' });
        }
      }
    }
    return traps;
  }

  placeDecorations(grid) {
    const decorations = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid[y].length - 1; x += 1) {
        if (grid[y][x] === 0 && Math.random() < 0.03) {
          decorations.push({ x, y, type: 'pillar' });
        }
      }
    }
    return decorations;
  }
}

class HUD {
  constructor(ctx) {
    this.ctx = ctx;
    this.fps = 60;
    this.frameTimer = 0;
    this.frameCount = 0;
  }

  update(dt, player, level) {
    this.frameTimer += dt;
    this.frameCount += 1;
    if (this.frameTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.frameTimer);
      this.frameTimer = 0;
      this.frameCount = 0;
    }
    this.player = player;
    this.level = level;
  }

  render(player, level) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(12, 12, 300, 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(12, 12, 300, 160);

    ctx.fillStyle = '#f7e6c8';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Health: ${Math.round(player.health)}`, 24, 38);
    ctx.fillText(`Score: ${player.score}`, 24, 62);
    ctx.fillText(`Cups: ${player.collectedCups}`, 24, 86);
    ctx.fillText(`Level: ${level.theme}`, 24, 110);
    ctx.fillText(`FPS: ${this.fps}`, 24, 134);
    ctx.fillText('Objective: Collect cups and escape', 24, 158);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.ctx.canvas.width - 220, 12, 200, 140);
    ctx.fillStyle = '#f7e6c8';
    ctx.fillText('Minimap', this.ctx.canvas.width - 180, 36);
    ctx.fillText('Explored Areas', this.ctx.canvas.width - 200, 62);
    ctx.fillText('Enemies Hidden', this.ctx.canvas.width - 200, 86);
    ctx.restore();
  }
}

class ParticleSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.particles = [];
  }

  update(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 8 * dt;
      return particle.life > 0;
    });
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    this.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  emit(position, color = '#ffd27a', count = 20) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 1 + Math.random() * 3,
        color
      });
    }
  }
}

class SaveSystem {
  constructor() {
    this.storageKey = 'cup-escape-save';
  }

  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  load() {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }
}

class AchievementSystem {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.achievements = new Set();
  }

  unlock(key) {
    if (!this.achievements.has(key)) {
      this.achievements.add(key);
      this.saveSystem.save({ achievements: Array.from(this.achievements) });
    }
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new InputManager();
    window.__INPUT__ = this.input;
    this.audio = new AudioManager();
    this.renderer = new Renderer(this.ctx, canvas);
    this.particleSystem = new ParticleSystem(this.ctx);
    this.hud = new HUD(this.ctx, this.input);
    this.saveSystem = new SaveSystem();
    this.achievements = new AchievementSystem(this.saveSystem);

    this.lastTime = 0;
    this.deltaTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.state = 'menu';
    this.currentLevel = null;
    this.player = null;
    this.loadingProgress = 0;
    this.setupUI();
    this.bindEvents();
    this.preloadAssets();
  }

  setupUI() {
    this.overlay = document.getElementById('overlay');
    this.loadingScreen = document.getElementById('loading-screen');
    this.menuScreen = document.getElementById('menu-screen');
    this.settingsScreen = document.getElementById('settings-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.loadingFill = document.getElementById('loading-fill');
    this.loadingText = document.getElementById('loading-text');

    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleMenuAction(btn.dataset.action));
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
  }

  start() {
    this.resize();
    this.isRunning = true;
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(time) {
    if (!this.isRunning) return;
    if (!this.lastTime) this.lastTime = time;
    this.deltaTime = Math.min(0.032, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (!this.isPaused) {
      this.update(this.deltaTime);
    }
    this.render();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    if (this.state === 'playing' && this.currentLevel && this.player) {
      this.player.update(dt, this.currentLevel);
      this.currentLevel.update(dt, this.player);
      this.particleSystem.update(dt);
      this.hud.update(dt, this.player, this.currentLevel);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'playing' && this.currentLevel && this.player) {
      this.renderer.renderWorld(this.currentLevel, this.player, this.particleSystem);
      this.hud.render(this.player, this.currentLevel);
    } else {
      this.renderer.renderMenuBackdrop();
    }
  }

  preloadAssets() {
    const step = () => {
      this.loadingProgress = Math.min(100, this.loadingProgress + 12 + Math.random() * 8);
      this.loadingFill.style.width = `${this.loadingProgress}%`;
      this.loadingText.textContent = `Preparing the tombs... ${Math.round(this.loadingProgress)}%`;
      if (this.loadingProgress < 100) {
        setTimeout(step, 90);
      } else {
        this.showScreen('menu');
      }
    };

    setTimeout(step, 120);
  }

  showScreen(name) {
    this.loadingScreen.classList.remove('visible');
    this.menuScreen.classList.remove('visible');
    this.settingsScreen.classList.remove('visible');
    this.gameoverScreen.classList.remove('visible');
    this.victoryScreen.classList.remove('visible');

    switch (name) {
      case 'loading':
        this.loadingScreen.classList.add('visible');
        break;
      case 'menu':
        this.menuScreen.classList.add('visible');
        break;
      case 'settings':
        this.settingsScreen.classList.add('visible');
        break;
      case 'gameover':
        this.gameoverScreen.classList.add('visible');
        break;
      case 'victory':
        this.victoryScreen.classList.add('visible');
        break;
      default:
        break;
    }
  }

  handleMenuAction(action) {
    switch (action) {
      case 'new-game':
        this.startNewGame();
        break;
      case 'continue':
        this.continueGame();
        break;
      case 'settings':
        this.showScreen('settings');
        break;
      case 'back-menu':
        this.showScreen('menu');
        break;
      case 'restart':
        this.startNewGame();
        break;
      case 'exit':
        window.close();
        break;
      default:
        break;
    }
  }

  startNewGame() {
    const generator = new LevelGenerator();
    this.currentLevel = generator.generateLevel();
    this.player = new Player({ x: 2, y: 2 }, this.currentLevel, this.input);
    this.state = 'playing';
    this.isPaused = false;
    this.showScreen('menu');
    this.audio.playMenuSound();
    this.overlay.classList.add('hidden');
  }

  continueGame() {
    const saved = this.saveSystem.load();
    if (saved && saved.level) {
      this.currentLevel = saved.level;
      this.player = new Player(saved.playerPosition || { x: 2, y: 2 }, this.currentLevel, this.input);
      this.state = 'playing';
      this.isPaused = false;
      this.showScreen('menu');
      this.overlay.classList.add('hidden');
    }
  }

  pause() {
    if (this.state === 'playing') {
      this.isPaused = true;
    }
  }

  resume() {
    this.isPaused = false;
  }

  resize() {
    const ratio = Math.min(window.innerWidth / GAME_CONFIG.canvas.width, window.innerHeight / GAME_CONFIG.canvas.height);
    const width = Math.max(GAME_CONFIG.canvas.minWidth, Math.floor(GAME_CONFIG.canvas.width * ratio));
    const height = Math.max(GAME_CONFIG.canvas.minHeight, Math.floor(GAME_CONFIG.canvas.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  game.start();
});
