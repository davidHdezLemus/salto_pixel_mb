"use strict";

(function () {
  const TILE = 32;
  const factories = [];

  function buildLevel(width, holes, platforms, enemies, coins, goalX, palette) {
    const height = 16;
    const rows = Array.from({ length: height }, () => Array(width).fill(0));
    for (let x = 0; x < width; x++) {
      if (!holes.some(([a, b]) => x >= a && x <= b)) {
        rows[13][x] = 1;
        rows[14][x] = 1;
        rows[15][x] = 1;
      }
    }
    platforms.forEach(([x, y, len, type = 3]) => {
      for (let i = 0; i < len; i++) rows[y][x + i] = type;
    });
    coins.forEach(([x, y]) => rows[y][x] = 4);
    enemies.forEach(([x, y, type = 5]) => rows[y][x] = type);
    rows[12][goalX] = 6;
    rows[11][goalX] = 6;
    return { rows, width, height, start: { x: 70, y: 260 }, palette };
  }

  function withPowerUps(level, positions) {
    positions.forEach(([x, y]) => {
      let blockY = y;
      const solid = (value) => [1, 2, 3, 8, 11, 12].includes(value);
      if (solid(level.rows[blockY + 1]?.[x])) blockY = Math.max(1, blockY - 3);
      while (blockY > 1 && solid(level.rows[blockY + 1]?.[x])) blockY--;
      if (level.rows[blockY] && level.rows[blockY][x] !== undefined) level.rows[blockY][x] = 11;
    });
    return level;
  }

  function generateBonusCoins(width, forbidden, every = 11) {
    const coins = [];
    for (let x = 14; x < width - 12; x += every) {
      if (!forbidden.some(([a, b]) => x >= a - 1 && x <= b + 1)) coins.push([x, 9 - (x % 3)]);
    }
    return coins;
  }

  window.MARIO_LEVEL_FACTORIES = factories;
  window.MarioLevelTools = {
    TILE,
    buildLevel,
    withPowerUps,
    generateBonusCoins,
    register(factory) {
      factories.push(factory);
    }
  };
})();
