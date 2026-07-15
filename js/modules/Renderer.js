import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * Renderer for the top-down world and UI atmosphere.
 */
export class Renderer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement} canvas
   */
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Render the game world.
   * @param {object} level
   * @param {object} player
   * @param {object} particles
   */
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

  /**
   * Render a menu backdrop.
   */
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
