"use strict";

class Player {
      constructor(id, x, y, colors) {
        this.id = id;
        this.spawn = { x, y };
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
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
        this.deaths = 0;
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
          this.y += this.h - TILE;
          this.h = TILE;
          this.invuln = 1.2;
          this.vy = -260;
          return;
        }
        this.lives -= 1;
        this.deaths += 1;
        this.invuln = 1.2;
        this.vy = -360;
        this.vx = -Math.sign(this.vx || 1) * 150;
        this.state = "Hit";
        if (this.lives <= 0) {
          this.dead = true;
          this.state = "Dead";
        } else {
          game.sound.play("lostlife");
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
        this.moveY(dt, level, game);
        if (this.y > level.pixelHeight + 140) this.hurt(game);
        if (this.y > level.pixelHeight + 210 && this.lives > 0) this.respawnNear(game.alivePartner(this), level);
        this.state = this.onGround ? (Math.abs(this.vx) > 12 ? "Running" : "Idle") : (this.vy < 0 ? "Jumping" : "Falling");
      }

      powerUp(game) {
        if (this.dead || this.powered) return;
        this.powered = true;
        this.y -= TILE;
        this.h = TILE * 2;
        this.invuln = Math.max(this.invuln, .45);
        this.score += 250;
        game.sound.play("powerup");
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

      moveY(dt, level, game) {
        const oldY = this.y;
        this.y += this.vy * dt;
        this.onGround = false;
        let hitHeadBlock = false;
        if (this.vy < 0) hitHeadBlock = this.hitHeadBlock(level, oldY, game);
        for (const tile of level.tilesNear(this.rect)) {
          if (!rectsOverlap(this.rect, tile)) continue;
          if (tile.type === 8 && !(this.vy > 0 && oldY + this.h <= tile.y + 6)) continue;
          if (this.vy > 0) {
            this.y = tile.y - this.h;
            this.onGround = true;
          } else if (this.vy < 0) {
            const tx = Math.floor(tile.x / TILE);
            const ty = Math.floor(tile.y / TILE);
            if (level.isQuestion(tx, ty)) {
              level.setTile(tx, ty, 12);
              game.spawnMushroom(tile.x, tile.y, this.facing || 1);
              game.sound.play("powerup");
              this.y = tile.y + tile.h;
            } else if (this.powered && level.isBreakable(tx, ty)) {
              level.setTile(tx, ty, 0);
              game.sound.play("stomp");
              this.vy = Math.max(this.vy, -90);
              continue;
            }
            this.y = tile.y + tile.h;
          }
          this.vy = 0;
        }
      }

      hitHeadBlock(level, oldY, game) {
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
            if (level.isQuestion(tx, ty)) {
              level.setTile(tx, ty, 12);
              game.spawnMushroom(tx * TILE, ty * TILE, this.facing || 1);
              game.sound.play("powerup");
              this.vy = Math.max(this.vy, -90);
              return true;
            }
            if (this.powered && level.isBreakable(tx, ty)) {
              level.setTile(tx, ty, 0);
              game.sound.play("stomp");
              this.vy = Math.max(this.vy, -90);
              return true;
            }
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
        if (!this.powered) {
          const sx = frame * MARIO_FRAME + 6;
          const sy = 14;
          const sw = 18;
          const sh = 18;
          ctx.save();
          if (this.facing < 0) {
            ctx.translate(x + this.w, y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.spriteSheet, sx, sy, sw, sh, 0, 0, TILE, TILE);
          } else {
            ctx.drawImage(this.spriteSheet, sx, sy, sw, sh, x, y, TILE, TILE);
          }
          ctx.restore();
          return;
        }
        const drawW = this.powered ? 64 : 40;
        const drawH = this.powered ? 64 : 40;
        const offsetX = this.powered ? -16 : -4;
        const offsetY = this.powered ? 0 : -8;
        ctx.save();
        if (this.facing < 0) {
          ctx.translate(x + this.w, y + offsetY);
          ctx.scale(-1, 1);
          ctx.drawImage(this.spriteSheet, frame * MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, offsetX, 0, drawW, drawH);
        } else {
          ctx.drawImage(this.spriteSheet, frame * MARIO_FRAME, 0, MARIO_FRAME, MARIO_FRAME, x + offsetX, y + offsetY, drawW, drawH);
        }
        ctx.restore();
      }
    }

    
