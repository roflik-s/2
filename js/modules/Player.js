import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * Player entity with movement, combat, inventory and checkpoint systems.
 */
export class Player {
  /**
   * @param {{x:number,y:number}} position
   * @param {object} level
   */
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

  /**
   * Update the player entity.
   * @param {number} dt
   * @param {object} level
   */
  update(dt, level) {
    this.handleInput(dt, level);
    if (this.invulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.invulnerable = false;
    }
  }

  /**
   * Handle movement input.
   * @param {number} dt
   * @param {object} level
   */
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

  /**
   * Apply damage to the player.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.invulnerable) return;
    this.health = Math.max(0, this.health - amount * this.stats.damageResistance);
    this.invulnerable = true;
    this.invulnerableTimer = GAME_CONFIG.player.invulnerabilityDuration;
  }

  /**
   * Add score and update cup collection state.
   * @param {number} amount
   */
  addScore(amount) {
    this.score += amount;
  }

  /**
   * Add an item to inventory.
   * @param {object} item
   */
  addToInventory(item) {
    this.inventory.push(item);
  }

  /**
   * Set the checkpoint.
   * @param {{x:number,y:number}} position
   */
  setCheckpoint(position) {
    this.checkpoint = { ...position };
  }
}
