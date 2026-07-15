import { Game } from './modules/Game.js';

/**
 * Application entry point.
 */
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  game.start();
});
