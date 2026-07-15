/**
 * Lightweight audio manager with volume controls and placeholder assets.
 */
export class AudioManager {
  constructor() {
    this.settings = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };
    this.sounds = new Map();
  }

  /**
   * Play a menu sound placeholder.
   */
  playMenuSound() {
    this.playSfx('menu');
  }

  /**
   * Play a simple generated sound via the Web Audio API.
   * @param {string} type
   */
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
