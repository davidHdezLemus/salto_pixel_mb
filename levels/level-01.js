"use strict";

(function () {
  const { buildLevel, generateBonusCoins, register, withPowerUps } = window.MarioLevelTools;

  register(() => withPowerUps(buildLevel(
    118,
    [[38, 40], [76, 78]],
    [[3, 12, 3], [6, 11, 3], [9, 10, 5], [18, 10, 5], [30, 9, 4], [50, 10, 5], [64, 8, 4], [90, 9, 6]],
    [[23, 12], [42, 12, 10], [55, 12], [70, 12], [88, 12, 10], [96, 12]],
    [[5, 10], [9, 8], [19, 8], [31, 7], [51, 8], [65, 6], [91, 7]].concat(generateBonusCoins(118, [[38, 40], [76, 78]], 17)),
    110,
    { sky: "#69b8ff", hills: "#55a95d", back: "#8dd27b" }
  ), [[13, 9], [52, 9]]));
})();
