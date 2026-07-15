import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * Heads-up display for runtime state and objective tracking.
 */
export class HUD {
  constructor(ctx) {
    this.ctx = ctx;
    this.fps = 60;
    this.frameTimer = 0;
    this.frameCount = 0;
  }

  /**
   * Update HUD timing.
   * @param {number} dt
   * @param {object} player
   * @param {object} level
   * @param {object} game
   */
  update(dt, player, level, game) {
    this.frameTimer += dt;
    this.frameCount += 1;
    if (this.frameTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.frameTimer);
      this.frameTimer = 0;
      this.frameCount = 0;
    }
    this.player = player;
    this.level = level;
    this.game = game;
  }

  /**
   * Render the HUD overlay.
   * @param {object} player
   * @param {object} level
   * @param {object} game
   */
  render(player, level, game) {
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
    ctx.fillText(`Objective: Collect cups and escape`, 24, 158);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.ctx.canvas.width - 220, 12, 200, 140);
    ctx.fillStyle = '#f7e6c8';
    ctx.fillText('Minimap', this.ctx.canvas.width - 180, 36);
    ctx.fillText('Explored Areas', this.ctx.canvas.width - 200, 62);
    ctx.fillText('Enemies Hidden', this.ctx.canvas.width - 200, 86);
    ctx.restore();
  }
}
