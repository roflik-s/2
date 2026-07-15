import { GAME_CONFIG } from '../../config/gameConfig.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { Renderer } from './Renderer.js';
import { Player } from './Player.js';
import { LevelGenerator } from './LevelGenerator.js';
import { HUD } from './HUD.js';
import { SaveSystem } from './SaveSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { AchievementSystem } from './AchievementSystem.js';

/**
 * Main orchestrator for the game experience.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
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
    this.accumulator = 0;
    this.deltaTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.state = 'menu';
    this.currentLevel = null;
    this.player = null;
    this.screenOverlay = 1;
    this.loadingProgress = 0;
    this.assetsLoaded = 0;
    this.totalAssets = 0;
    this.setupUI();
    this.bindEvents();
    this.preloadAssets();
  }

  /**
   * Initialize DOM bindings for menu and settings UI.
   */
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

  /**
   * Bind input and resize handlers.
   */
  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
  }

  /**
   * Start the game loop.
   */
  start() {
    this.resize();
    this.isRunning = true;
    requestAnimationFrame((time) => this.loop(time));
  }

  /**
   * Main loop.
   * @param {number} time
   */
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

  /**
   * Update game systems.
   * @param {number} dt
   */
  update(dt) {
    if (this.state === 'playing' && this.currentLevel && this.player) {
      this.player.update(dt, this.currentLevel);
      this.currentLevel.update(dt, this.player);
      this.particleSystem.update(dt);
      this.hud.update(dt, this.player, this.currentLevel, this);
    }
  }

  /**
   * Render the current scene.
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'playing' && this.currentLevel && this.player) {
      this.renderer.renderWorld(this.currentLevel, this.player, this.particleSystem);
      this.hud.render(this.player, this.currentLevel, this);
    } else {
      this.renderer.renderMenuBackdrop();
    }
  }

  /**
   * Preload placeholder assets with a lightweight progress simulation.
   */
  preloadAssets() {
    const assetEntries = Object.values(GAME_CONFIG.assets.images).concat(Object.values(GAME_CONFIG.assets.audio));
    this.totalAssets = assetEntries.length;

    const step = () => {
      this.loadingProgress = Math.min(100, this.loadingProgress + 12 + Math.random() * 8);
      this.assetsLoaded = Math.min(this.totalAssets, Math.round(this.loadingProgress));
      this.loadingFill.style.width = `${this.loadingProgress}%`;
      this.loadingText.textContent = `Loading assets ${this.assetsLoaded}/${this.totalAssets}`;
      if (this.loadingProgress < 100) {
        setTimeout(step, 90);
      } else {
        this.showScreen('menu');
      }
    };

    setTimeout(step, 120);
  }

  /**
   * Set the active overlay screen.
   * @param {string} name
   */
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

  /**
   * Handle menu button actions.
   * @param {string} action
   */
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

  /**
   * Start a new game session.
   */
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

  /**
   * Continue a saved game.
   */
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

  /**
   * Pause the game.
   */
  pause() {
    if (this.state === 'playing') {
      this.isPaused = true;
    }
  }

  /**
   * Resume the game.
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Resize the canvas to fit the viewport.
   */
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
