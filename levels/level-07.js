"use strict";

(function () {
  const { register, withPowerUps } = window.MarioLevelTools;

  function fill(row, y, from, to, type = 1) {
    for (let x = from; x <= to; x++) row[y][x] = type;
  }

  function buildWorldOneAssetLevel() {
    const width = 212;
    const height = 16;
    const rows = Array.from({ length: height }, () => Array(width).fill(0));

    // Solid floor copied from the visible SMB 1-1 ground strips in bg-1-1-a.png.
    [[0, 68], [71, 85], [89, 152], [155, 211]].forEach(([from, to]) => {
      fill(rows, 13, from, to, 1);
      fill(rows, 14, from, to, 1);
      fill(rows, 15, from, to, 1);
    });

    // Floating bricks/question rows visible in the background image. These are
    // rendered mostly by the background, but still need matching collision.
    [
      [5, 22, 22], [5, 80, 87], [5, 91, 94], [5, 109, 109], [5, 121, 123], [5, 128, 131],
      [6, 22, 22], [6, 80, 87], [6, 91, 94], [6, 109, 109], [6, 121, 123], [6, 128, 131], [6, 188, 189],
      [9, 16, 16], [9, 20, 24], [9, 77, 79], [9, 94, 94], [9, 100, 101], [9, 106, 106], [9, 109, 109], [9, 112, 112], [9, 118, 118], [9, 129, 130], [9, 168, 171], [9, 185, 189], [9, 203, 205],
      [10, 16, 16], [10, 20, 24], [10, 77, 79], [10, 94, 94], [10, 100, 101], [10, 106, 106], [10, 109, 109], [10, 112, 112], [10, 118, 118], [10, 129, 130], [10, 137, 137], [10, 140, 140], [10, 151, 152], [10, 155, 155], [10, 168, 171], [10, 184, 189], [10, 203, 205]
    ].forEach(([y, from, to]) => fill(rows, y, from, to, 1));

    // Pipes and end stairs need explicit collision because the background is a bitmap.
    [[28, 29, 11], [38, 39, 10], [46, 47, 9], [57, 58, 9], [163, 164, 11]].forEach(([from, to, top]) => {
      for (let y = top; y <= 12; y++) fill(rows, y, from, to, 1);
    });
    for (let step = 0; step < 8; step++) {
      fill(rows, 12 - step, 182 + step, 189, 1);
    }

    [[32, 12], [53, 12], [82, 12, 7], [98, 12], [120, 12, 10], [147, 12], [160, 12, 7], [176, 12, 10]].forEach(([x, y, type = 5]) => rows[y][x] = type);
    [[16, 8], [22, 4], [64, 8], [94, 4], [109, 8], [137, 8], [169, 8]].forEach(([x, y]) => rows[y][x] = 4);
    rows[12][198] = 6;
    rows[11][198] = 6;

    return {
      rows,
      width,
      height,
      start: { x: 70, y: 360 },
      palette: { sky: "#6388ff", hills: "#55a95d", back: "#8dd27b", bgAsset: "world-one", bgScale: 2, bgOffsetY: 16 }
    };
  }

  register(() => withPowerUps(buildWorldOneAssetLevel(), [[16, 8], [22, 4], [94, 4], [109, 8], [137, 8]]));
})();
