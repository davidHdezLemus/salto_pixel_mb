const fs = require('fs');
const content = fs.readFileSync('game.js', 'utf8');

const constantsRegex = /^"use strict";[\s\S]*?(?=function clamp)/;
const physicsRegex = /function clamp[\s\S]*?(?=const LEVELS =)/;
const levelRegex = /const LEVELS =[\s\S]*?(?=class InputManager)/;
const inputRegex = /class InputManager {[\s\S]*?(?=class SoundManager)/;
const soundRegex = /class SoundManager {[\s\S]*?(?=class Player)/;
const playerRegex = /class Player {[\s\S]*?(?=class Enemy)/;
const enemyRegex = /class Enemy {[\s\S]*?(?=class Camera)/;
const cameraRegex = /class Camera {[\s\S]*?(?=class NetworkManager)/;
const networkRegex = /(class NetworkManager {[\s\S]*?)(?=class Game)/;
const gameRegex = /class Game {[\s\S]*?(?=const game = new Game)/;

fs.writeFileSync('js/constants.js', content.match(constantsRegex)[0]);
fs.writeFileSync('js/physics.js', '"use strict";\n\n' + content.match(physicsRegex)[0]);
fs.writeFileSync('js/level.js', '"use strict";\n\n' + content.match(levelRegex)[0]);
fs.writeFileSync('js/input.js', '"use strict";\n\n' + content.match(inputRegex)[0]);
fs.writeFileSync('js/sound.js', '"use strict";\n\n' + content.match(soundRegex)[0]);

let playerCode = content.match(playerRegex)[0];
// Mario size changes
playerCode = playerCode.replace(/this\.w = 24;\s*this\.h = 30;/, 'this.w = 32;\n        this.h = 32;');
playerCode = playerCode.replace(/if \(!this\.powered\) {/, 'if (!this.powered) {\n          this.y -= 32;\n          this.h = 64;');
playerCode = playerCode.replace(/this\.powered = false;\n\s*this\.invuln = 1\.2;/, 'this.powered = false;\n          this.h = 32;\n          this.y += 32;\n          this.invuln = 1.2;');

// Draw changes
playerCode = playerCode.replace(/ctx\.translate\(drawX \+ MARIO_FRAME, drawY\);/, 'ctx.translate(drawX + this.w, drawY);');
playerCode = playerCode.replace(/const drawX = x - 4;\s*const drawY = y - 2;/, 'const drawX = x;\n        const drawY = y;\n        const sWidth = MARIO_FRAME;\n        const sHeight = MARIO_FRAME;');
playerCode = playerCode.replace(/ctx\.drawImage\(this\.spriteSheet, frame \* MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, 0, 0, MARIO_FRAME, MARIO_FRAME\);/, 'ctx.drawImage(this.spriteSheet, frame * sWidth, 0, sWidth, sHeight, 0, 0, this.w, this.h);');
playerCode = playerCode.replace(/ctx\.drawImage\(this\.spriteSheet, frame \* MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, drawX, drawY, MARIO_FRAME, MARIO_FRAME\);/, 'ctx.drawImage(this.spriteSheet, frame * sWidth, 0, sWidth, sHeight, drawX, drawY, this.w, this.h);');

fs.writeFileSync('js/player.js', '"use strict";\n\n' + playerCode);
fs.writeFileSync('js/enemy.js', '"use strict";\n\n' + content.match(enemyRegex)[0]);
fs.writeFileSync('js/camera.js', '"use strict";\n\n' + content.match(cameraRegex)[0]);
fs.writeFileSync('js/network.js', '"use strict";\n\n' + content.match(networkRegex)[0]);
fs.writeFileSync('js/engine.js', '"use strict";\n\n' + content.match(gameRegex)[0]);
fs.writeFileSync('js/main.js', '"use strict";\n\nconst game = new Game();\n');

console.log("Split successful");
