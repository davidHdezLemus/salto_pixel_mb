"use strict";

(function () {
  const { register, withPowerUps } = window.MarioLevelTools;

  function buildWorldOneAssetLevel() {
    const width = 106;
    const height = 16;
    const rows = Array.from({ length: height }, () => Array(width).fill(0));
    const holes = [[35, 37], [52, 54], [80, 82]];
    for (let x = 0; x < width; x++) {
      if (!holes.some(([a, b]) => x >= a && x <= b)) {
        rows[13][x] = 1;
        rows[14][x] = 1;
        rows[15][x] = 1;
      }
    }
    [[10, 9, 4, 2], [18, 7, 5, 2], [31, 10, 3, 3], [43, 8, 6, 2], [60, 9, 5, 2], [70, 6, 4, 3], [87, 10, 6, 2], [96, 7, 4, 3]].forEach(([x, y, len, type]) => {
      for (let i = 0; i < len; i++) rows[y][x + i] = type;
    });
    [[14, 8], [22, 6], [32, 9], [45, 7], [62, 8], [72, 5], [89, 9], [98, 6]].forEach(([x, y]) => rows[y][x] = 4);
    [[16, 12], [28, 12, 7], [41, 12, 10], [48, 12], [65, 12, 7], [76, 12, 10], [90, 12]].forEach(([x, y, type = 5]) => rows[y][x] = type);
    rows[12][101] = 6;
    rows[11][101] = 6;
    return {
      rows,
      width,
      height,
      start: { x: 70, y: 260 },
      palette: { sky: "#6388ff", hills: "#55a95d", back: "#8dd27b", bgAsset: "world-one" }
    };
  }

  register(() => withPowerUps(buildWorldOneAssetLevel(), [[12, 8], [61, 8]]));
})();
