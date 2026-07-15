/**
 * Lightweight particle system with pooling-friendly behavior.
 */
export class ParticleSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.particles = [];
  }

  /**
   * Update particles by delta time.
   * @param {number} dt
   */
  update(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 8 * dt;
      return particle.life > 0;
    });
  }

  /**
   * Render particles.
   */
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

  /**
   * Emit a burst of particles.
   * @param {{x:number,y:number}} position
   * @param {string} color
   * @param {number} count
   */
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
