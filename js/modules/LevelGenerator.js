import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * Procedural level generator using recursive backtracking.
 */
export class LevelGenerator {
  constructor() {
    this.tileSize = GAME_CONFIG.tileSize;
  }

  /**
   * Generate a level object.
   * @returns {{grid:number[][], theme:string, decorations:[], collectibles:[], enemies:[], traps:[]}}
   */
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
      update(dt, player) {
        // Level-specific live updates can be extended here.
        return dt;
      }
    };
  }

  /**
   * Place the level exit.
   * @param {number[][]} grid
   * @returns {{x:number,y:number}}
   */
  placeExit(grid) {
    let x = 1;
    let y = 1;
    while (grid[y][x] !== 0) {
      x = Math.floor(Math.random() * (grid[0].length - 2)) + 1;
      y = Math.floor(Math.random() * (grid.length - 2)) + 1;
    }
    return { x, y };
  }

  /**
   * Place collectible cups and items.
   * @param {number[][]} grid
   * @returns {Array<object>}
   */
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

  /**
   * Place enemies.
   * @param {number[][]} grid
   * @returns {Array<object>}
   */
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

  /**
   * Place traps.
   * @param {number[][]} grid
   * @returns {Array<object>}
   */
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

  /**
   * Place decorative objects.
   * @param {number[][]} grid
   * @returns {Array<object>}
   */
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
