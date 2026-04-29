"use strict";

    const TILE = 32;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const GRAVITY = 1900;
    const MAX_FALL = 980;
    const ACCEL = 1450;
    const FRICTION = 1200;
    const MAX_SPEED = 245;
    const JUMP = 760;
    const PEER_CONFIG = {
      debug: 1,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
    };

    const $ = (id) => document.getElementById(id);
    const canvas = $("gameCanvas");
    const ctx = canvas.getContext("2d");
    const ASSET_DIR = "assets/used";
    const marioSheet = new Image();
    marioSheet.src = `${ASSET_DIR}/mario.png`;
    const luigiSheet = new Image();
    luigiSheet.src = `${ASSET_DIR}/luigi.png`;
    const itemSheet = new Image();
    itemSheet.src = `${ASSET_DIR}/items.png`;
    const tileSheet = new Image();
    tileSheet.src = `${ASSET_DIR}/overworld.png`;
    const worldOneBg = new Image();
    worldOneBg.src = `${ASSET_DIR}/bg-1-1-a.png`;
    const goombaWalk1 = new Image();
    goombaWalk1.src = `${ASSET_DIR}/goomba-walk-1.png`;
    const goombaWalk2 = new Image();
    goombaWalk2.src = `${ASSET_DIR}/goomba-walk-2.png`;
    const goombaFlat = new Image();
    goombaFlat.src = `${ASSET_DIR}/goomba-flat.png`;
    const koopaSheet = new Image();
    koopaSheet.src = `${ASSET_DIR}/koopa-verde.png`;
    const rugbySheet = new Image();
    rugbySheet.src = `${ASSET_DIR}/rugby.png`;
    const flagPoleSheet = new Image();
    flagPoleSheet.src = `${ASSET_DIR}/flag-pole.png`;
    const flagSheet = new Image();
    flagSheet.src = `${ASSET_DIR}/flag.png`;
    const MARIO_FRAME = 32;
    const ITEM_FRAME = 16;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function rectsOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    const LEVELS = (window.MARIO_LEVEL_FACTORIES || []).map((factory) => factory());
    if (!LEVELS.length) {
      throw new Error("No hay fases registradas. Revisa los scripts de la carpeta levels/ antes de game.js.");
    }

    class Tile {
      constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.w = TILE;
        this.h = TILE;
      }
    }

    class Level {
      constructor(index) {
        const data = LEVELS[index];
        this.index = index;
        this.rows = data.rows.map((row) => row.slice());
        this.width = data.width;
        this.height = data.height;
        this.pixelWidth = this.width * TILE;
        this.pixelHeight = this.height * TILE;
        this.start = { ...data.start };
        this.palette = data.palette;
        this.enemies = [];
        this.coins = [];
        this.powerUps = [];
        this.goal = { x: 0, y: 0, w: TILE, h: TILE * 2 };
        this.extractActors();
      }

      extractActors() {
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const type = this.rows[y][x];
            if (type === 5 || type === 7 || type === 10) {
              this.enemies.push(new Enemy(x * TILE, y * TILE + 4, type === 7 ? "hopper" : type === 10 ? "koopa" : "crawler"));
              this.rows[y][x] = 0;
            }
            if (type === 4) {
              this.coins.push({ x: x * TILE + 8, y: y * TILE + 8, w: 16, h: 16, taken: false });
              this.rows[y][x] = 0;
            }
            if (type === 9) {
              this.powerUps.push({ x: x * TILE + 4, y: y * TILE + 2, w: 24, h: 24, taken: false });
              this.rows[y][x] = 0;
            }
            if (type === 6) {
              this.goal = { x: x * TILE, y: y * TILE, w: TILE, h: TILE * 2 };
              this.rows[y][x] = 0;
            }
          }
        }
      }

      tileAt(tx, ty) {
        if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return 0;
        return this.rows[ty][tx];
      }

      setTile(tx, ty, value) {
        if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return;
        this.rows[ty][tx] = value;
      }

      isSolid(tx, ty) {
        const t = this.tileAt(tx, ty);
        return t === 1 || t === 2 || t === 3 || t === 8;
      }

      isBreakable(tx, ty) {
        const t = this.tileAt(tx, ty);
        return t === 2 || t === 3;
      }

      tilesNear(rect) {
        const minX = Math.floor(rect.x / TILE) - 1;
        const maxX = Math.floor((rect.x + rect.w) / TILE) + 1;
        const minY = Math.floor(rect.y / TILE) - 1;
        const maxY = Math.floor((rect.y + rect.h) / TILE) + 1;
        const tiles = [];
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const type = this.tileAt(x, y);
            if (type === 1 || type === 2 || type === 3 || type === 8) tiles.push(new Tile(x * TILE, y * TILE, type));
          }
        }
        return tiles;
      }
    }

    class InputManager {
      constructor() {
        this.keys = new Set();
        this.touch = { left: false, right: false, jump: false };
        window.addEventListener("keydown", (e) => {
          this.keys.add(e.code);
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
          if (e.code === "KeyP") game.togglePause();
          if (e.code === "KeyM") game.toggleMenu();
          if (e.code === "KeyS") game.toggleSound();
        });
        window.addEventListener("keyup", (e) => this.keys.delete(e.code));
        document.querySelectorAll("[data-touch]").forEach((button) => {
          const name = button.dataset.touch;
          const set = (value) => {
            this.touch[name] = value;
          };
          button.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
          button.addEventListener("pointerup", () => set(false));
          button.addEventListener("pointercancel", () => set(false));
          button.addEventListener("pointerleave", () => set(false));
        });
        document.querySelector("[data-action='pause']").addEventListener("click", () => game.togglePause());
      }

      playerControls(playerId) {
        if (playerId === 2) {
          return {
            left: this.keys.has("KeyJ"),
            right: this.keys.has("KeyL"),
            jump: this.keys.has("KeyI")
          };
        }
        return {
          left: this.keys.has("ArrowLeft") || this.keys.has("KeyA") || this.touch.left,
          right: this.keys.has("ArrowRight") || this.keys.has("KeyD") || this.touch.right,
          jump: this.keys.has("Space") || this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.touch.jump
        };
      }
    }

    class SoundManager {
      constructor() {
        this.enabled = true;
        this.ctx = null;
        this.musicTimer = null;
        this.musicStep = 0;
        this.musicPattern = [262, 330, 392, 330, 294, 370, 440, 370, 330, 392, 494, 392, 349, 440, 523, 440];
      }

      ensure() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume();
      }

      tone(a, b, dur, type = "square", volume = .12) {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(a, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, b), now + dur);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      }

      play(type) {
        if (!this.enabled) return;
        const map = {
          jump: [440, 660, .09],
          stomp: [180, 90, .12],
          hurt: [150, 80, .18],
          level: [520, 880, .18],
          win: [660, 990, .25],
          lose: [120, 70, .35],
          coin: [760, 1050, .08]
        };
        const [a, b, dur] = map[type] || map.jump;
        this.tone(a, b, dur);
      }

      startMusic() {
        if (!this.enabled || this.musicTimer) return;
        this.ensure();
        this.musicTimer = setInterval(() => {
          if (!this.enabled) return;
          const note = this.musicPattern[this.musicStep % this.musicPattern.length];
          const harmony = this.musicStep % 4 === 0 ? note / 2 : note * 1.25;
          this.tone(note, note * 1.01, .14, "triangle", .035);
          this.tone(harmony, harmony * 1.01, .12, "square", .018);
          this.musicStep++;
        }, 170);
      }

      stopMusic() {
        if (!this.musicTimer) return;
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    class Player {
      constructor(id, x, y, colors) {
        this.id = id;
        this.spawn = { x, y };
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 30;
        this.vx = 0;
        this.vy = 0;
        this.lives = 3;
        this.score = 0;
        this.coins = 0;
        this.onGround = false;
        this.jumpHeld = false;
        this.invuln = 0;
        this.dead = false;
        this.state = "Idle";
        this.colors = colors;
        this.facing = 1;
        this.animTime = 0;
        this.spriteSheet = id === 1 ? marioSheet : luigiSheet;
        this.useCharacterSprite = true;
        this.powered = false;
      }

      get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
      }

      respawnNear(target, level) {
        const x = target ? target.x - 44 : level.start.x + (this.id - 1) * 34;
        this.x = clamp(x, 10, level.pixelWidth - 80);
        this.y = target ? target.y - 10 : level.start.y;
        this.vx = 0;
        this.vy = 0;
        this.invuln = 1.4;
        this.dead = false;
      }

      hurt(game) {
        if (this.invuln > 0 || this.dead) return;
        if (this.powered) {
          this.powered = false;
          this.invuln = 1.2;
          this.vy = -260;
          game.sound.play("hurt");
          return;
        }
        this.lives -= 1;
        this.invuln = 1.2;
        this.vy = -360;
        this.vx = -Math.sign(this.vx || 1) * 150;
        this.state = "Hit";
        game.sound.play("hurt");
        if (this.lives <= 0) {
          this.dead = true;
          this.state = "Dead";
        }
      }

      update(dt, controls, level, game) {
        if (this.dead) return;
        this.invuln = Math.max(0, this.invuln - dt);
        if (controls.left) this.vx -= ACCEL * dt;
        if (controls.right) this.vx += ACCEL * dt;
        if (controls.left) this.facing = -1;
        if (controls.right) this.facing = 1;
        this.animTime += dt;
        if (!controls.left && !controls.right) {
          const slow = FRICTION * dt;
          if (Math.abs(this.vx) <= slow) this.vx = 0;
          else this.vx -= Math.sign(this.vx) * slow;
        }
        this.vx = clamp(this.vx, -MAX_SPEED, MAX_SPEED);
        if (controls.jump && this.onGround && !this.jumpHeld) {
          this.vy = -(this.powered ? JUMP * 1.12 : JUMP);
          this.onGround = false;
          this.jumpHeld = true;
          game.sound.play("jump");
        }
        if (!controls.jump) this.jumpHeld = false;
        if (!controls.jump && this.vy < -180) this.vy = -180;
        this.vy = clamp(this.vy + GRAVITY * dt, -900, MAX_FALL);
        this.moveX(dt, level);
        this.moveY(dt, level);
        if (this.y > level.pixelHeight + 140) this.hurt(game);
        if (this.y > level.pixelHeight + 210 && this.lives > 0) this.respawnNear(game.alivePartner(this), level);
        this.state = this.onGround ? (Math.abs(this.vx) > 12 ? "Running" : "Idle") : (this.vy < 0 ? "Jumping" : "Falling");
      }

      powerUp(game) {
        if (this.dead) return;
        this.powered = true;
        this.invuln = Math.max(this.invuln, .45);
        this.score += 250;
        game.sound.play("level");
      }

      moveX(dt, level) {
        this.x += this.vx * dt;
        this.x = clamp(this.x, 0, level.pixelWidth - this.w);
        for (const tile of level.tilesNear(this.rect)) {
          if (tile.type === 8) continue;
          if (!rectsOverlap(this.rect, tile)) continue;
          if (this.vx > 0) this.x = tile.x - this.w;
          if (this.vx < 0) this.x = tile.x + tile.w;
          this.vx = 0;
        }
      }

      moveY(dt, level) {
        const oldY = this.y;
        this.y += this.vy * dt;
        this.onGround = false;
        let brokeHeadBlock = false;
        if (this.powered && this.vy < 0) {
          brokeHeadBlock = this.breakHeadBlock(level, oldY);
        }
        for (const tile of level.tilesNear(this.rect)) {
          if (!rectsOverlap(this.rect, tile)) continue;
          if (tile.type === 8 && !(this.vy > 0 && oldY + this.h <= tile.y + 6)) continue;
          if (this.vy > 0) {
            this.y = tile.y - this.h;
            this.onGround = true;
          } else if (this.vy < 0) {
            if (this.powered && level.isBreakable(Math.floor(tile.x / TILE), Math.floor(tile.y / TILE))) {
              level.setTile(Math.floor(tile.x / TILE), Math.floor(tile.y / TILE), 0);
              game.sound.play("stomp");
              this.vy = Math.max(this.vy, -90);
              continue;
            }
            this.y = tile.y + tile.h;
          }
          this.vy = 0;
        }
      }

      breakHeadBlock(level, oldY) {
        const oldHead = oldY;
        const newHead = this.y;
        const left = Math.floor((this.x + 4) / TILE);
        const right = Math.floor((this.x + this.w - 5) / TILE);
        const minRow = Math.floor(newHead / TILE);
        const maxRow = Math.floor(oldHead / TILE);
        for (let ty = minRow; ty <= maxRow; ty++) {
          const tileBottom = (ty + 1) * TILE;
          const crossedFromBelow = oldHead >= tileBottom - 2 && newHead < tileBottom;
          if (!crossedFromBelow) continue;
          for (let tx = left; tx <= right; tx++) {
            if (!level.isBreakable(tx, ty)) continue;
            level.setTile(tx, ty, 0);
            game.sound.play("stomp");
            this.vy = Math.max(this.vy, -90);
            return true;
          }
        }
        return false;
      }

      draw(ctx, camera) {
        if (!this.dead && this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
        const x = Math.round(this.x - camera.x);
        const y = Math.round(this.y - camera.y);
        if (this.useCharacterSprite && this.spriteSheet.complete && this.spriteSheet.naturalWidth > 0) {
          this.drawCharacterSprite(ctx, x, y);
          return;
        }
        if (this.dead) return;
        ctx.fillStyle = this.colors.body;
        ctx.fillRect(x + 4, y + 10, 16, 18);
        ctx.fillStyle = this.colors.cap;
        ctx.fillRect(x + 2, y + 4, 20, 8);
        ctx.fillStyle = "#ffd5a3";
        ctx.fillRect(x + 6, y + 10, 13, 8);
        ctx.fillStyle = "#1b1b24";
        ctx.fillRect(x + 15, y + 12, 3, 3);
        ctx.fillStyle = this.colors.legs;
        ctx.fillRect(x + 4, y + 26, 7, 4);
        ctx.fillRect(x + 14, y + 26, 7, 4);
      }

      drawCharacterSprite(ctx, x, y) {
        const base = this.powered ? 8 : 0;
        let frame = base;
        if (this.dead || this.state === "Dead") frame = 6;
        else if (!this.onGround) frame = this.powered ? 13 : 5;
        else if (Math.abs(this.vx) > 18) frame = base + 1 + Math.floor(this.animTime * 11) % 3;
        const drawX = x - 4;
        const drawY = y - 2;
        ctx.save();
        if (this.facing < 0) {
          ctx.translate(drawX + MARIO_FRAME, drawY);
          ctx.scale(-1, 1);
          ctx.drawImage(this.spriteSheet, frame * MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, 0, 0, MARIO_FRAME, MARIO_FRAME);
        } else {
          ctx.drawImage(this.spriteSheet, frame * MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, drawX, drawY, MARIO_FRAME, MARIO_FRAME);
        }
        ctx.restore();
      }
    }

    class Enemy {
      constructor(x, y, kind = "crawler") {
        this.x = x;
        this.y = y;
        this.kind = kind;
        this.w = kind === "hopper" ? 30 : kind === "koopa" ? 24 : 26;
        this.h = kind === "hopper" ? 32 : kind === "koopa" ? 30 : 24;
        this.vx = kind === "hopper" ? 88 : kind === "koopa" ? 48 : 55;
        this.vy = 0;
        this.dead = false;
        this.onGround = false;
        this.jumpClock = .35 + Math.random() * .45;
        this.flattened = 0;
        this.shell = false;
        this.shellOwner = null;
        this.health = kind === "hopper" ? 2 : 1;
        this.hitAnim = 0;
        this.hitCooldown = 0;
      }

      get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
      }

      update(dt, level) {
        if (this.dead) return;
        if (this.flattened > 0) {
          this.flattened -= dt;
          if (this.flattened <= 0) this.dead = true;
          return;
        }
        if (this.hitAnim > 0) this.hitAnim -= dt;
        if (this.hitCooldown > 0) this.hitCooldown -= dt;
        this.jumpClock -= dt;
        if (this.kind === "hopper" && this.onGround && this.jumpClock <= 0) {
          this.vy = -520;
          this.jumpClock = 1.05 + Math.random() * .55;
        }
        this.vy = clamp(this.vy + GRAVITY * dt, -900, MAX_FALL);
        if (!this.shell || Math.abs(this.vx) > 1) {
          this.x += this.vx * dt;
          let hitWall = false;
          for (const tile of level.tilesNear(this.rect)) {
            if (tile.type === 8) continue;
            if (!rectsOverlap(this.rect, tile)) continue;
            hitWall = true;
            if (this.vx > 0) this.x = tile.x - this.w;
            else this.x = tile.x + tile.w;
          }
          const footX = Math.floor((this.x + (this.vx > 0 ? this.w + 2 : -2)) / TILE);
          const footY = Math.floor((this.y + this.h + 3) / TILE);
          if (!this.shell && (hitWall || !level.isSolid(footX, footY))) this.vx *= -1;
          if (this.shell && hitWall) this.vx *= -1;
        }
        const oldY = this.y;
        this.y += this.vy * dt;
        this.onGround = false;
        for (const tile of level.tilesNear(this.rect)) {
          if (!rectsOverlap(this.rect, tile)) continue;
          if (tile.type === 8 && !(this.vy > 0 && oldY + this.h <= tile.y + 6)) continue;
          if (this.vy > 0) {
            this.y = tile.y - this.h;
            this.onGround = true;
          } else {
            this.y = tile.y + tile.h;
          }
          this.vy = 0;
        }
      }

      enterShell(owner = null) {
        if (this.shell) {
          this.dead = true;
          return;
        }
        this.shell = true;
        this.shellOwner = owner;
        this.vx = 0;
        this.y += this.h - 16;
        this.w = 24;
        this.h = 16;
      }

      kickShell(direction, owner = null) {
        if (!this.shell || this.dead) return;
        if (owner) this.shellOwner = owner;
        this.vx = 360 * (direction || 1);
      }

      takeStomp() {
        if (this.kind !== "hopper") return true;
        if (this.hitCooldown > 0) return false;
        this.health -= 1;
        this.hitAnim = .55;
        this.hitCooldown = .35;
        this.vx = 0;
        return this.health <= 0;
      }

      drawFacing(ctx, image, x, y, w, h) {
        if (this.vx >= 0 || this.shell) {
          ctx.drawImage(image, x, y, w, h);
          return;
        }
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, w, h);
        ctx.restore();
      }

      drawSheetFacing(ctx, image, sx, sy, sw, sh, x, y, w, h) {
        if (this.vx >= 0 || this.shell) {
          ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
          return;
        }
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();
      }

      draw(ctx, camera) {
        if (this.dead) return;
        const x = Math.round(this.x - camera.x);
        const y = Math.round(this.y - camera.y);
        if (this.kind === "koopa" && koopaSheet.complete && koopaSheet.naturalWidth > 0) {
          if (this.shell) {
            const shellFrames = [265, 284, 303, 322];
            const frameX = Math.abs(this.vx) > 1 ? shellFrames[Math.floor(performance.now() / 110) % shellFrames.length] : 265;
            ctx.drawImage(koopaSheet, frameX, 18, 16, 16, x - 2, y - 4, 28, 22);
            return;
          }
          const frame = Math.floor(performance.now() / 180) % 2 === 0
            ? { x: 21, y: 3, w: 16, h: 27 }
            : { x: 40, y: 4, w: 16, h: 26 };
          this.drawSheetFacing(ctx, koopaSheet, frame.x, frame.y, frame.w, frame.h, x - 3, y - 6, 30, 36);
          return;
        }
        if (this.kind === "crawler" && goombaWalk1.complete && goombaWalk1.naturalWidth > 0) {
          if (this.flattened > 0 && goombaFlat.complete && goombaFlat.naturalWidth > 0) {
            ctx.drawImage(goombaFlat, x + 2, y + this.h - 10, 24, 10);
            return;
          }
          const sprite = Math.floor(performance.now() / 180) % 2 === 0 ? goombaWalk1 : goombaWalk2;
          ctx.drawImage(sprite, x - 1, y + this.h - 25, 28, 28);
          return;
        }
        if (this.kind === "hopper") {
          if (rugbySheet.complete && rugbySheet.naturalWidth > 0) {
            if (this.hitAnim > 0) {
              const hitFrames = [
                { x: 125, y: 110, w: 24, h: 15 },
                { x: 152, y: 107, w: 24, h: 18 },
                { x: 179, y: 103, w: 24, h: 22 },
                { x: 206, y: 112, w: 24, h: 13 },
                { x: 233, y: 103, w: 24, h: 22 }
              ];
              const frame = hitFrames[Math.floor(performance.now() / 90) % hitFrames.length];
              this.drawSheetFacing(ctx, rugbySheet, frame.x, frame.y, frame.w, frame.h, x - 4, y - 4, 40, 30);
              return;
            }
            if (!this.onGround) {
              this.drawSheetFacing(ctx, rugbySheet, 5, 98, 28, 27, x - 4, y - 8, 40, 42);
            } else {
              const prepFrames = [
                { x: 346, y: 43, w: 24, h: 24 },
                { x: 375, y: 44, w: 24, h: 23 },
                { x: 405, y: 48, w: 24, h: 19 }
              ];
              const runFrames = [
                { x: 250, y: 7, w: 25, h: 26 },
                { x: 249, y: 37, w: 25, h: 27 },
                { x: 249, y: 70, w: 24, h: 25 }
              ];
              let frame = runFrames[Math.floor(performance.now() / 130) % runFrames.length];
              if (this.jumpClock < .12) frame = { x: 67, y: 11, w: 24, h: 23 };
              else if (this.jumpClock < .42) frame = prepFrames[Math.floor(performance.now() / 150) % prepFrames.length];
              this.drawSheetFacing(ctx, rugbySheet, frame.x, frame.y, frame.w, frame.h, x - 4, y - 6, 40, 38);
            }
            return;
          }
          ctx.fillStyle = "#1fb6a6";
          ctx.fillRect(x + 3, y + 9, 18, 17);
          ctx.fillStyle = "#8ff0d3";
          ctx.fillRect(x + 6, y + 2, 12, 9);
          ctx.fillStyle = "#0b2831";
          ctx.fillRect(x + 8, y + 6, 3, 3);
          ctx.fillRect(x + 15, y + 6, 3, 3);
          ctx.fillStyle = "#f7c548";
          ctx.fillRect(x, y + 23, 8, 5);
          ctx.fillRect(x + 16, y + 23, 8, 5);
          return;
        }
        ctx.fillStyle = "#7d3c98";
        ctx.fillRect(x + 2, y + 7, 22, 15);
        ctx.fillStyle = "#b565d9";
        ctx.fillRect(x + 5, y + 3, 16, 8);
        ctx.fillStyle = "#f7f1d4";
        ctx.fillRect(x + 7, y + 8, 4, 4);
        ctx.fillRect(x + 16, y + 8, 4, 4);
        ctx.fillStyle = "#141414";
        ctx.fillRect(x + 8, y + 9, 2, 2);
        ctx.fillRect(x + 17, y + 9, 2, 2);
      }
    }

    class Camera {
      constructor() {
        this.x = 0;
        this.y = 0;
      }

      update(players, level, dt) {
        const alive = players.filter((p) => !p.dead);
        if (!alive.length) return;
        const minX = Math.min(...alive.map((p) => p.x));
        const maxX = Math.max(...alive.map((p) => p.x));
        const minY = Math.min(...alive.map((p) => p.y));
        const maxY = Math.max(...alive.map((p) => p.y));
        const targetX = (minX + maxX) / 2 - VIEW_W * .42;
        const targetY = (minY + maxY) / 2 - VIEW_H * .55;
        this.x += (clamp(targetX, 0, Math.max(0, level.pixelWidth - VIEW_W)) - this.x) * Math.min(1, dt * 5);
        this.y += (clamp(targetY, 0, Math.max(0, level.pixelHeight - VIEW_H)) - this.y) * Math.min(1, dt * 5);
      }
    }

    class NetworkManager {
      constructor() {
        this.peer = null;
        this.conn = null;
        this.onMessage = null;
        this.onGuestConnect = null;
      }

      _roomCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        return `${part()}-${part()}-${part()}`;
      }

      _waitOpen(peer) {
        return new Promise((res, rej) => {
          if (peer.open) { res(peer.id); return; }
          peer.once("open", res);
          peer.once("error", rej);
        });
      }

      _waitConn(conn) {
        return new Promise((res, rej) => {
          if (conn.open) { res(); return; }
          conn.once("open", res);
          conn.once("error", rej);
        });
      }

      _attach(conn) {
        this.conn = conn;
        conn.on("data", (data) => {
          if (!this.onMessage) return;
          try {
            const msg = typeof data === "string" ? JSON.parse(data) : data;
            this.onMessage(msg);
          } catch {}
        });
        conn.on("close", () => { if (this.onMessage) this.onMessage({ t: "disconnect" }); });
      }

      async openRoom() {
        if (!window.Peer) throw new Error("PeerJS no disponible. Necesitas conexión a internet.");
        this.destroy();
        const code = this._roomCode();
        this.peer = new Peer(code, PEER_CONFIG);
        await this._waitOpen(this.peer);
        this.peer.on("connection", async (conn) => {
          if (this.conn) { conn.close(); return; }
          try {
            await this._waitConn(conn);
            this._attach(conn);
            if (this.onGuestConnect) this.onGuestConnect();
          } catch {}
        });
        this.peer.on("error", () => { if (this.onMessage) this.onMessage({ t: "disconnect" }); });
        return this.peer.id;
      }

      async joinRoom(code) {
        if (!window.Peer) throw new Error("PeerJS no disponible. Necesitas conexión a internet.");
        this.destroy();
        const clean = String(code).trim().toLowerCase();
        this.peer = new Peer(undefined, PEER_CONFIG);
        await this._waitOpen(this.peer);
        const conn = this.peer.connect(clean, { reliable: true });
        await this._waitConn(conn);
        this._attach(conn);
      }

      send(msg) {
        if (this.conn && this.conn.open) this.conn.send(JSON.stringify(msg));
      }

      destroy() {
        if (this.peer) { try { this.peer.destroy(); } catch {} }
        this.peer = null;
        this.conn = null;
      }
    }

    class MultiplayerManager {
      constructor(game) {
        this.game = game;
      }

      enforceCoopBounds() {
        if (this.game.players.length < 2) return;
        const [a, b] = this.game.players;
        if (a.dead || b.dead) return;
        const distance = Math.abs(a.x - b.x);
        if (distance > VIEW_W * .78) {
          const left = a.x < b.x ? a : b;
          const right = left === a ? b : a;
          left.x = right.x - VIEW_W * .74;
          left.x = clamp(left.x, this.game.camera.x + 10, this.game.level.pixelWidth - left.w);
        }
      }

      syncNetwork() {
        if (this.game.mode !== "network" || !this.game.netToken) return;
        if (this.game.netRole === "host") {
          this.game.network.send({ t: "snapshot", data: this.game.snapshot() });
        }
      }
    }

    class Game {
      constructor() {
        this.input = new InputManager();
        this.sound = new SoundManager();
        this.network = new NetworkManager();
        this.multi = new MultiplayerManager(this);
        this.camera = new Camera();
        this.levelIndex = 0;
        this.level = new Level(0);
        this.players = [];
        this.mode = "solo";
        this.netRole = null;
        this.netToken = "";
        this.netGuestConnected = false;
        this.netError = "";
        this._guestInput = null;
        this.state = "start";
        this.menuView = "main";
        this.menuVisible = true;
        this.last = performance.now();
        this.message = null;
        this.resetPlayers(1);
        this.bindMenu();
        this.renderMenu();
        this.showMessage("SALTO PIXEL", "Pulsa Iniciar juego o entra en Cooperativo. M para ocultar el menú.");
        requestAnimationFrame((t) => this.loop(t));
      }

      bindMenu() {
        $("menuBody").addEventListener("click", (e) => {
          const action = e.target.dataset.action;
          if (!action) return;
          this.handleAction(action);
        });
        $("menuBody").addEventListener("input", (e) => {
          if (e.target.id === "joinToken") e.target.value = e.target.value.toUpperCase();
        });
      }

      resetPlayers(count) {
        this.players = [
          new Player(1, this.level.start.x, this.level.start.y, { cap: "#e94b3c", body: "#2e86de", legs: "#1b4f9c" })
        ];
        if (count === 2) {
          this.players.push(new Player(2, this.level.start.x + 38, this.level.start.y, { cap: "#52c66f", body: "#f4d03f", legs: "#1e8449" }));
        }
      }

      start(mode = "solo") {
        this.mode = mode;
        this.state = "playing";
        this.levelIndex = 0;
        this.level = new Level(0);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(mode === "solo" ? 1 : 2);
        this.showMessage("", "");
        this.menuVisible = false;
        this.renderMenu();
        this.sound.startMusic();
      }

      nextLevel() {
        if (this.levelIndex >= LEVELS.length - 1) {
          this.state = "victory";
          this.sound.stopMusic();
          this.sound.play("win");
          this.showMessage("VICTORIA", `Has completado los ${LEVELS.length} niveles.`);
          this.menuVisible = true;
          this.renderMenu();
          return;
        }
        this.levelIndex++;
        const lives = this.players.map((p) => p.lives);
        const score = this.totalScore();
        const coins = this.totalCoins();
        const powered = this.players.map((p) => p.powered);
        this.level = new Level(this.levelIndex);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(this.players.length);
        this.players.forEach((p, i) => {
          p.lives = lives[i] || 3;
          p.score = i === 0 ? score : 0;
          p.coins = i === 0 ? coins : 0;
          p.powered = powered[i] || false;
        });
        this.sound.play("level");
      }

      alivePartner(player) {
        return this.players.find((p) => p !== player && !p.dead) || null;
      }

      totalScore() {
        return this.players.reduce((sum, p) => sum + p.score, 0);
      }

      totalCoins() {
        return this.players.reduce((sum, p) => sum + p.coins, 0);
      }

      togglePause() {
        if (!["playing", "paused"].includes(this.state)) return;
        this.state = this.state === "paused" ? "playing" : "paused";
        if (this.state === "paused") this.sound.stopMusic();
        else this.sound.startMusic();
        this.showMessage(this.state === "paused" ? "PAUSA" : "", this.state === "paused" ? "Pulsa P para continuar." : "");
      }

      toggleMenu() {
        this.menuVisible = !this.menuVisible;
        $("menu").classList.toggle("hidden", !this.menuVisible);
      }

      toggleSound() {
        this.sound.enabled = !this.sound.enabled;
        if (!this.sound.enabled) this.sound.stopMusic();
        else if (this.state === "playing") this.sound.startMusic();
        this.updateHud();
        this.renderMenu();
      }

      showMessage(title, text) {
        if (!title) {
          $("overlay").innerHTML = "";
          return;
        }
        $("overlay").innerHTML = `<div><h1>${title}</h1><p>${text}</p></div>`;
      }

      handleAction(action) {
        if (action === "start") this.start("solo");
        if (action === "coop") this.menuView = "coop";
        if (action === "coopLocal") this.menuView = "local";
        if (action === "startLocal") this.start("local");
        if (action === "coopNet") this.menuView = "network";
        if (action === "network") {
          if (this.state !== "playing") {
            this.network.destroy();
            this.netRole = null;
            this.netToken = "";
            this.netGuestConnected = false;
            this.mode = "solo";
          }
          this.menuView = "network";
        }
        if (action === "host") this.menuView = "createHost";
        if (action === "generateToken") {
          this.netRole = "host";
          this.mode = "network";
          this.netGuestConnected = false;
          this.netError = "";
          this.menuView = "hostConnecting";
          this.renderMenu();
          this.network.openRoom()
            .then((code) => {
              this.netToken = code;
              this.network.onGuestConnect = () => {
                this.netGuestConnected = true;
                this.network.onMessage = (msg) => this.handleNetMessage(msg);
                this.renderMenu();
              };
              this.menuView = "hostLobby";
              this.renderMenu();
            })
            .catch((err) => {
              this.netError = err.message || "Error de conexión";
              this.netRole = null;
              this.mode = "solo";
              this.menuView = "network";
              this.renderMenu();
            });
          return;
        }
        if (action === "join") this.menuView = "join";
        if (action === "joinSubmit") {
          const token = $("joinToken").value.trim().toUpperCase();
          if (!token) return;
          this.netError = "";
          this.menuView = "guestConnecting";
          this.renderMenu();
          this.network.joinRoom(token.toLowerCase())
            .then(() => {
              this.netToken = token;
              this.netRole = "guest";
              this.mode = "network";
              this.network.onMessage = (msg) => this.handleNetMessage(msg);
              this.menuView = "guestLobby";
              this.renderMenu();
            })
            .catch((err) => {
              this.netError = err.message || "No se pudo conectar. Verifica el código.";
              this.menuView = "join";
              this.renderMenu();
            });
          return;
        }
        if (action === "startNetwork") {
          this.network.send({ t: "start" });
          this.start("network");
        }
        if (action === "reset") this.start(this.mode);
        if (action === "pause") this.togglePause();
        if (action === "sound") this.toggleSound();
        if (action === "controls") this.menuView = "controls";
        if (action === "hide") this.toggleMenu();
        if (action === "main") this.menuView = "main";
        this.renderMenu();
      }

      startGuestNetwork() {
        this.state = "playing";
        this.levelIndex = 0;
        this.level = new Level(0);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(2);
        this.showMessage("", "");
        this.menuVisible = false;
        this.renderMenu();
        this.sound.startMusic();
      }

      handleNetMessage(msg) {
        if (msg.t === "start" && this.netRole === "guest") {
          this.startGuestNetwork();
        } else if (msg.t === "snapshot" && this.state === "playing" && this.netRole === "guest") {
          this.applyGuestSnapshot(msg.data);
        } else if (msg.t === "input" && this.netRole === "host") {
          this._guestInput = msg.input;
        } else if (msg.t === "disconnect") {
          this.showMessage("Desconectado", "El otro jugador se desconectó.");
          if (this.state === "playing") { this.state = "paused"; this.sound.stopMusic(); }
        }
      }

      renderMenu() {
        $("menu").classList.toggle("hidden", !this.menuVisible);
        const body = $("menuBody");
        const mainItems = [
          ["start", "Iniciar juego"],
          ["coop", "Cooperativo"],
          ["reset", "Reiniciar nivel"],
          ["pause", this.state === "paused" ? "Continuar" : "Pausar"],
          ["sound", this.sound.enabled ? "Desactivar sonido" : "Activar sonido"]
        ];
        mainItems.push(["controls", "Mostrar controles"], ["hide", "Ocultar menú"]);
        const templates = {
          main: mainItems,
          coop: [["coopLocal", "Local"], ["coopNet", "En red"], ["main", "Volver"]],
          local: [["startLocal", "Empezar cooperativo local"], ["coop", "Volver"]],
          network: [["host", "Crear partida"], ["join", "Unirse a partida"], ["coop", "Volver"]],
          controls: [["main", "Volver"]]
        };
        $("menuTitle").textContent = {
          main: "Menú",
          coop: "Cooperativo",
          local: "Coop local",
          network: "Coop en red",
          createHost: "Crear partida",
          hostConnecting: "Creando sala…",
          hostLobby: "Lobby anfitrión",
          guestConnecting: "Conectando…",
          guestLobby: "Lobby invitado",
          join: "Unirse",
          controls: "Controles"
        }[this.menuView] || "Menú";

        if (this.menuView === "local") {
          body.innerHTML = `<p class="muted">Jugador 1: A/D o flechas, W/espacio para saltar.<br>Jugador 2: J/L para moverse, I para saltar.</p>${this.buttons(templates.local)}`;
          return;
        }
        if (this.menuView === "controls") {
          body.innerHTML = `<p class="muted">P pausa, M menú, S sonido. En cooperativo local J/L/I controlan al Jugador 2.</p>${this.buttons(templates.controls)}`;
          return;
        }
        if (this.menuView === "join") {
          const error = this.netError ? `<p class="muted" style="color: var(--danger)">${this.netError}</p>` : "";
          body.innerHTML = `<input id="joinToken" maxlength="14" placeholder="A7F3-K9P2-Q4LM">${error}${this.buttons([["joinSubmit", "Entrar al lobby"], ["network", "Volver"]])}`;
          return;
        }
        if (this.menuView === "createHost") {
          body.innerHTML = `<p class="muted">Genera un código de sala y compártelo con el segundo jugador.</p>${this.buttons([["generateToken", "Generar sala"], ["network", "Volver"]])}`;
          return;
        }
        if (this.menuView === "hostConnecting") {
          body.innerHTML = `<p class="muted">Creando sala con PeerJS…</p>${this.buttons([["network", "Cancelar"]])}`;
          return;
        }
        if (this.menuView === "hostLobby") {
          const guest = this.netGuestConnected;
          body.innerHTML = `<p class="muted">Anfitrión: Jugador 1</p><span class="token">${this.netToken}</span><p class="muted">Invitado: ${guest ? "conectado ✓" : "esperando…"}</p><button data-action="startNetwork" ${guest ? "" : "disabled"}>Empezar partida</button><button data-action="network">Volver</button>`;
          return;
        }
        if (this.menuView === "guestConnecting") {
          body.innerHTML = `<p class="muted">Conectando con el anfitrión…</p>${this.buttons([["network", "Cancelar"]])}`;
          return;
        }
        if (this.menuView === "guestLobby") {
          body.innerHTML = `<p class="muted">Conectado como Jugador 2.</p><span class="token">${this.netToken}</span><p class="muted">Esperando a que el anfitrión pulse empezar…</p>${this.buttons([["network", "Volver"]])}`;
          return;
        }
        body.innerHTML = this.buttons(templates[this.menuView] || templates.main);
      }

      buttons(items) {
        return items.map(([action, label]) => `<button data-action="${action}">${label}</button>`).join("");
      }

      loop(now) {
        const dt = Math.min(.033, (now - this.last) / 1000);
        this.last = now;
        if (this.state === "playing") this.update(dt);
        this.draw();
        this.updateHud();
        requestAnimationFrame((t) => this.loop(t));
      }

      update(dt) {
        const controls = this.players.map((p) => {
          return this.input.playerControls(p.id);
        });
        if (this.mode === "network") {
          if (this.netRole === "host") {
            controls[1] = this._guestInput || { left: false, right: false, jump: false };
          }
          if (this.netRole === "guest") {
            this.network.send({ t: "input", input: controls[1] });
            controls[0] = { left: false, right: false, jump: false };
          }
        }
        this.players.forEach((p, i) => p.update(dt, controls[i] || {}, this.level, this));
        this.level.enemies.forEach((e) => e.update(dt, this.level));
        this.handleCoins();
        this.handlePowerUps();
        this.handleShellHits();
        this.handleEnemyHits();
        this.handleGoal();
        this.multi.enforceCoopBounds();
        this.camera.update(this.players, this.level, dt);
        this.multi.syncNetwork();
        if (this.players.every((p) => p.dead)) {
          this.state = "gameover";
          this.sound.stopMusic();
          this.sound.play("lose");
          this.showMessage("GAME OVER", "Todos los jugadores se quedaron sin vidas.");
          this.menuVisible = true;
          this.renderMenu();
        }
      }

      handleCoins() {
        for (const coin of this.level.coins) {
          if (coin.taken) continue;
          for (const player of this.players) {
            if (!player.dead && rectsOverlap(player.rect, coin)) {
              coin.taken = true;
              player.coins += 1;
              player.score += 50;
              this.sound.play("coin");
            }
          }
        }
      }

      handlePowerUps() {
        for (const powerUp of this.level.powerUps) {
          if (powerUp.taken) continue;
          for (const player of this.players) {
            if (!player.dead && rectsOverlap(player.rect, powerUp)) {
              powerUp.taken = true;
              player.powerUp(this);
            }
          }
        }
      }

      rewardEnemyDefeat(player, enemy) {
        if (!player) return;
        player.coins += 1;
        player.score += enemy.kind === "hopper" || enemy.kind === "koopa" ? 180 : 120;
      }

      handleEnemyHits() {
        for (const enemy of this.level.enemies) {
          if (enemy.dead) continue;
          if (enemy.flattened > 0) continue;
          for (const player of this.players) {
            if (player.dead || !rectsOverlap(player.rect, enemy.rect)) continue;
            const stomp = player.vy > 120 && player.y + player.h - enemy.y < 18;
            if (stomp) {
              if (enemy.kind === "koopa") {
                enemy.enterShell(player);
              } else if (enemy.kind === "hopper") {
                if (!enemy.takeStomp()) {
                  player.vy = -620;
                  player.jumpHeld = true;
                  this.sound.play("stomp");
                  continue;
                }
                enemy.flattened = .25;
              } else {
                enemy.flattened = .45;
                enemy.vx = 0;
              }
              player.vy = enemy.kind === "hopper" ? -620 : -560;
              player.jumpHeld = true;
              this.rewardEnemyDefeat(player, enemy);
              this.sound.play("stomp");
            } else {
              if (enemy.kind === "koopa" && enemy.shell) {
                if (Math.abs(enemy.vx) <= 1) {
                  const playerCenter = player.x + player.w / 2;
                  const shellCenter = enemy.x + enemy.w / 2;
                  enemy.kickShell(playerCenter <= shellCenter ? 1 : -1, player);
                  this.sound.play("stomp");
                }
                continue;
              }
              player.hurt(this);
            }
          }
        }
      }

      handleShellHits() {
        const shells = this.level.enemies.filter((e) => !e.dead && e.kind === "koopa" && e.shell && Math.abs(e.vx) > 1);
        for (const shell of shells) {
          for (const enemy of this.level.enemies) {
            if (enemy === shell || enemy.dead || enemy.flattened > 0) continue;
            if (!rectsOverlap(shell.rect, enemy.rect)) continue;
            enemy.dead = true;
            this.rewardEnemyDefeat(shell.shellOwner, enemy);
            this.sound.play("stomp");
          }
        }
      }

      handleGoal() {
        const reached = this.players.some((p) => !p.dead && rectsOverlap(p.rect, this.level.goal));
        const someoneAlive = this.players.some((p) => !p.dead);
        if (reached && someoneAlive) this.nextLevel();
      }

      snapshot() {
        return {
          levelIndex: this.levelIndex,
          state: this.state,
          score: this.totalScore(),
          players: this.players.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, lives: p.lives, dead: p.dead, state: p.state, powered: p.powered, coins: p.coins })),
          enemies: this.level.enemies.map((e) => ({
            x: e.x, y: e.y, vx: e.vx, vy: e.vy,
            dead: e.dead, shell: e.shell, flattened: e.flattened,
            health: e.health, hitAnim: e.hitAnim, hitCooldown: e.hitCooldown
          })),
          coins: this.level.coins.map((c) => c.taken),
          powerUps: this.level.powerUps.map((p) => p.taken)
        };
      }

      applyGuestSnapshot(snapshot) {
        if (snapshot.levelIndex !== this.levelIndex) {
          this.levelIndex = snapshot.levelIndex;
          this.level = new Level(this.levelIndex);
          this.resetPlayers(2);
        }
        snapshot.players.forEach((data, i) => {
          if (!this.players[i]) return;
          if (i === 0) Object.assign(this.players[i], data);
          else {
            this.players[i].lives = data.lives;
            this.players[i].dead = data.dead;
            this.players[i].powered = data.powered;
            this.players[i].coins = data.coins || 0;
          }
        });
        snapshot.enemies.forEach((data, i) => {
          if (!this.level.enemies[i]) return;
          if (typeof data === "boolean") {
            this.level.enemies[i].dead = data;
            return;
          }
          Object.assign(this.level.enemies[i], data);
        });
        snapshot.coins.forEach((taken, i) => { if (this.level.coins[i]) this.level.coins[i].taken = taken; });
        if (snapshot.powerUps) snapshot.powerUps.forEach((taken, i) => { if (this.level.powerUps[i]) this.level.powerUps[i].taken = taken; });
      }

      updateHud() {
        $("hudLevel").textContent = `Nivel ${this.levelIndex + 1}`;
        $("hudLives").textContent = this.players.map((p) => `J${p.id}:${p.lives}`).join(" ");
        $("hudScore").textContent = `Puntos ${this.totalScore()}`;
        $("hudCoins").textContent = `Monedas ${this.totalCoins()}`;
        $("hudSound").textContent = `Sonido ${this.sound.enabled ? "ON" : "OFF"}`;
        $("hudMode").textContent = this.mode === "solo" ? "Solo" : (this.mode === "local" ? "Coop local" : `Red ${this.netRole || ""}`);
      }

      draw() {
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        this.drawBackground();
        this.drawTiles();
        this.drawGoal();
        this.drawCoins();
        this.drawPowerUps();
        this.level.enemies.forEach((e) => e.draw(ctx, this.camera));
        this.players.forEach((p) => p.draw(ctx, this.camera));
      }

      drawBackground() {
        const p = this.level.palette;
        if (p.bgAsset === "world-one" && worldOneBg.complete && worldOneBg.naturalWidth > 0) {
          const sx = clamp(this.camera.x, 0, Math.max(0, worldOneBg.naturalWidth - VIEW_W));
          ctx.drawImage(worldOneBg, sx, 0, VIEW_W, 227, 0, 0, VIEW_W, VIEW_H);
          return;
        }
        ctx.fillStyle = p.sky;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#ffffffaa";
        const cloudCount = p.vertical ? 14 : 7;
        for (let i = 0; i < cloudCount; i++) {
          const x = (i * 210 - this.camera.x * .25) % (VIEW_W + 180) - 80;
          const y = p.vertical ? ((i * 160 - this.camera.y * .35) % (VIEW_H + 220) - 80) : 50 + (i % 3) * 34;
          ctx.fillRect(x, y, 70, 18);
          ctx.fillRect(x + 18, y - 12, 34, 12);
        }
        ctx.fillStyle = p.back;
        for (let i = 0; i < 8; i++) {
          const x = (i * 180 - this.camera.x * .12) % (VIEW_W + 220) - 120;
          ctx.beginPath();
          ctx.moveTo(x, 390);
          ctx.lineTo(x + 90, 240);
          ctx.lineTo(x + 180, 390);
          ctx.fill();
        }
        ctx.fillStyle = p.hills;
        ctx.fillRect(0, p.vertical ? 430 : 390, VIEW_W, 170);
        if (tileSheet.complete && tileSheet.naturalWidth > 0 && !p.vertical) {
          for (let i = 0; i < 8; i++) {
            const x = (i * 260 - this.camera.x * .18) % (VIEW_W + 240) - 120;
            ctx.drawImage(tileSheet, 64, 80, 48, 40, x, 272, 144, 120);
          }
        }
      }

      drawTiles() {
        const startX = Math.floor(this.camera.x / TILE) - 1;
        const endX = Math.floor((this.camera.x + VIEW_W) / TILE) + 1;
        const startY = Math.floor(this.camera.y / TILE) - 1;
        const endY = Math.floor((this.camera.y + VIEW_H) / TILE) + 1;
        for (let y = startY; y <= endY; y++) {
          for (let x = startX; x <= endX; x++) {
            const type = this.level.tileAt(x, y);
            if (![1, 2, 3, 8].includes(type)) continue;
            if (this.level.palette.bgAsset === "world-one" && type === 1) continue;
            const sx = x * TILE - this.camera.x;
            const sy = y * TILE - this.camera.y;
            if (type === 8) {
              ctx.fillStyle = "#eefaff";
              ctx.fillRect(sx, sy + 8, TILE, 16);
              ctx.fillStyle = "#c6ecff";
              ctx.fillRect(sx + 3, sy + 4, TILE - 6, 8);
              ctx.strokeStyle = "#8bcff2";
              ctx.strokeRect(sx + .5, sy + 8.5, TILE - 1, 15);
              continue;
            }
            if (tileSheet.complete && tileSheet.naturalWidth > 0) {
              const tileMap = {
                1: [16, 0],
                2: [32, 0],
                3: [0, 0]
              };
              const [srcX, srcY] = tileMap[type] || tileMap[1];
              ctx.drawImage(tileSheet, srcX, srcY, 16, 16, sx, sy, TILE, TILE);
              continue;
            }
            ctx.fillStyle = type === 3 ? "#b06f3c" : "#8f4f2c";
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = type === 3 ? "#e0a15f" : "#c97a42";
            ctx.fillRect(sx, sy, TILE, 7);
            ctx.strokeStyle = "#5f321f";
            ctx.strokeRect(sx + .5, sy + .5, TILE - 1, TILE - 1);
          }
        }
      }

      drawGoal() {
        const g = this.level.goal;
        const x = g.x - this.camera.x;
        const y = g.y - this.camera.y;
        if (flagPoleSheet.complete && flagPoleSheet.naturalWidth > 0 && flagSheet.complete && flagSheet.naturalWidth > 0) {
          const poleH = 160;
          const poleW = 16;
          const poleX = Math.round(x + (TILE - poleW) / 2);
          const groundY = Math.round(y + g.h);
          const poleY = groundY - poleH;
          ctx.drawImage(flagPoleSheet, poleX, poleY, poleW, poleH);
          const flagX = poleX + Math.floor(poleW / 2);
          const flagY = poleY + 18;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(flagX, flagY);
          ctx.lineTo(flagX + 44, flagY + 12);
          ctx.lineTo(flagX, flagY + 30);
          ctx.closePath();
          ctx.fillStyle = "#f7fff2";
          ctx.fill();
          ctx.strokeStyle = "#32b54a";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.drawImage(flagSheet, flagX + 10, flagY + 7, 16, 16);
          ctx.restore();
          return;
        }
        if (this.level.palette.vertical) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 44, y + 36, 116, 22);
          ctx.fillRect(x - 20, y + 18, 66, 24);
          ctx.fillRect(x + 18, y + 8, 48, 18);
        }
        ctx.fillStyle = "#f7f1d4";
        ctx.fillRect(x + 4, y - 28, 6, 92);
        ctx.fillStyle = "#ef5a4f";
        ctx.fillRect(x + 10, y - 26, 34, 22);
        ctx.fillStyle = "#f7c548";
        ctx.fillRect(x + 16, y - 20, 12, 10);
      }

      drawCoins() {
        const frame = Math.floor(performance.now() / 130) % 4;
        for (const coin of this.level.coins) {
          if (coin.taken) continue;
          const x = coin.x - this.camera.x;
          const y = coin.y - this.camera.y;
          if (itemSheet.complete && itemSheet.naturalWidth > 0) {
            ctx.drawImage(itemSheet, frame * ITEM_FRAME, 16, ITEM_FRAME, ITEM_FRAME, x, y, 18, 18);
            continue;
          }
          ctx.fillStyle = "#f7c548";
          ctx.fillRect(x + 4, y, 8, 16);
          ctx.fillStyle = "#fff2a0";
          ctx.fillRect(x + 6, y + 2, 3, 10);
        }
      }

      drawPowerUps() {
        for (const powerUp of this.level.powerUps) {
          if (powerUp.taken) continue;
          const x = powerUp.x - this.camera.x;
          const y = powerUp.y - this.camera.y;
          if (itemSheet.complete && itemSheet.naturalWidth > 0) {
            ctx.drawImage(itemSheet, 0, 0, ITEM_FRAME, ITEM_FRAME, x, y, 24, 24);
          } else {
            ctx.fillStyle = "#d82d2d";
            ctx.fillRect(x + 2, y + 2, 20, 10);
            ctx.fillStyle = "#f7f1d4";
            ctx.fillRect(x + 5, y + 12, 14, 10);
          }
        }
      }
    }

    const game = new Game();
