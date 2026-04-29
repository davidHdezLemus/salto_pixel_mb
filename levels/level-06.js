"use strict";

(function () {
  const { TILE, register, withPowerUps } = window.MarioLevelTools;

  function buildVerticalLevel() {
    const width = 34;
    const height = 44;
    const rows = Array.from({ length: height }, () => Array(width).fill(0));
    for (let x = 0; x < width; x++) {
      rows[height - 2][x] = 1;
      rows[height - 1][x] = 1;
    }
    const platforms = [
      [2, 39, 7], [13, 36, 5], [23, 33, 6], [10, 30, 5],
      [2, 27, 5], [15, 24, 5], [25, 21, 5], [12, 18, 5],
      [4, 15, 5], [17, 12, 6], [7, 9, 5], [21, 6, 6],
      [13, 3, 8]
    ];
    const helperBlocks = [
      [9, 38, 2], [20, 35, 2], [18, 29, 2], [8, 23, 2],
      [22, 17, 2], [15, 11, 2], [19, 5, 2],
      // Puentes para saltos imposibles entre plataformas alejadas
      [18, 20, 3], [11, 13, 3], [14, 7, 4]
    ];
    platforms.forEach(([x, y, len]) => {
      for (let i = 0; i < len; i++) rows[y][x + i] = 8;
    });
    helperBlocks.forEach(([x, y, len]) => {
      for (let i = 0; i < len; i++) rows[y][x + i] = 8;
    });
    // Enemigos colocados 1 fila sobre su plataforma de aterrizaje
    [[25, 32, 7], [12, 29, 10], [4, 26], [18, 23, 7], [27, 20], [13, 17, 10], [14, 17, 7], [6, 14], [20, 11, 7], [22, 5, 10]].forEach(([x, y, type = 5]) => rows[y][x] = type);
    [[4, 37], [15, 34], [25, 31], [12, 28], [4, 25], [17, 22], [27, 19], [14, 16], [6, 13], [20, 10], [10, 7], [24, 4]].forEach(([x, y]) => rows[y][x] = 4);
    rows[2][18] = 6;
    rows[1][18] = 6;
    return {
      rows,
      width,
      height,
      start: { x: 80, y: (height - 4) * TILE },
      palette: { sky: "#7fcfff", hills: "#7aa9d8", back: "#ffffff", vertical: true }
    };
  }

  register(() => withPowerUps(buildVerticalLevel(), [[15, 35], [21, 11]]));
})();
