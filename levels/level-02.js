"use strict";

(function () {
  const { buildLevel, generateBonusCoins, register, withPowerUps } = window.MarioLevelTools;

  register(() => withPowerUps(buildLevel(
    138,
    [[18, 21], [42, 44], [66, 69], [98, 101]],
    [[8, 10, 4], [28, 8, 3], [35, 6, 5], [53, 10, 4], [76, 7, 6], [88, 9, 4], [112, 8, 6]],
    [[14, 12], [31, 12], [47, 12, 10], [57, 12], [84, 12], [91, 12], [108, 12, 10], [117, 12]],
    [[9, 8], [36, 4], [54, 8], [78, 5], [89, 7], [113, 6], [128, 11]].concat(generateBonusCoins(138, [[18, 21], [42, 44], [66, 69], [98, 101]], 15)),
    130,
    { sky: "#78c2d4", hills: "#6f9d68", back: "#c2d879" }
  ), [[36, 5], [90, 8]]));
})();
