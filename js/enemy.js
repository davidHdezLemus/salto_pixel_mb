"use strict";

class Enemy {
      constructor(x, y, kind = "crawler", customAsset = null) {
        this.x = x;
        this.y = y;
        this.kind = kind;
        this.customAsset = customAsset;
        this.w = kind === "custom" ? TILE * (customAsset?.tiles?.[0] || 1) : kind === "Chargin_Chuck" ? 30 : kind === "koopa" ? 24 : 26;
        this.h = kind === "custom" ? TILE * (customAsset?.tiles?.[1] || 1) : kind === "Chargin_Chuck" ? 32 : kind === "koopa" ? 30 : 24;
        this.vx = kind === "custom" ? 55 : kind === "Chargin_Chuck" ? 88 : kind === "koopa" ? 48 : 55;
        this.vy = 0;
        this.dead = false;
        this.onGround = false;
        this.jumpClock = .35 + Math.random() * .45;
        this.flattened = 0;
        this.shell = false;
        this.shellOwner = null;
        this.shellSafeTimer = 0;
        this.shellRestingAssetId = 0;
        this.shellMovingAssetId = 0;
        this.health = kind === "custom" ? Math.max(1, Number(customAsset?.mob?.hits) || 1) : kind === "Chargin_Chuck" ? 2 : 1;
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
        if (this.shellSafeTimer > 0) this.shellSafeTimer -= dt;
        this.jumpClock -= dt;
        if (this.kind === "Chargin_Chuck" && this.onGround && this.jumpClock <= 0) {
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

      enterShell(owner = null, shellAsset = null, safeTime = 0) {
        if (this.shell) {
          this.vx = 0;
          this.shellSafeTimer = Math.max(this.shellSafeTimer, safeTime);
          if (this.kind === "custom" && shellAsset) {
            this.customAsset = shellAsset;
            this.shellRestingAssetId = Number(shellAsset.id || 0);
          }
          return;
        }
        this.shell = true;
        this.shellOwner = owner;
        this.shellSafeTimer = Math.max(0, safeTime);
        this.vx = 0;
        if (this.kind === "custom" && shellAsset) {
          this.customAsset = shellAsset;
          this.shellRestingAssetId = Number(shellAsset.id || 0);
          const oldH = this.h;
          this.w = TILE * (shellAsset?.tiles?.[0] || 1);
          this.h = TILE * (shellAsset?.tiles?.[1] || 1);
          this.y += oldH - this.h;
        } else {
          this.y += this.h - 16;
          this.w = 24;
          this.h = 16;
        }
      }

      kickShell(direction, owner = null, movingAsset = null) {
        if (!this.shell || this.dead) return;
        if (owner) this.shellOwner = owner;
        this.shellSafeTimer = 0;
        if (this.kind === "custom" && movingAsset) {
          this.customAsset = movingAsset;
          this.shellMovingAssetId = Number(movingAsset.id || 0);
          const oldH = this.h;
          this.w = TILE * (movingAsset?.tiles?.[0] || 1);
          this.h = TILE * (movingAsset?.tiles?.[1] || 1);
          this.y += oldH - this.h;
        }
        this.vx = 360 * (direction || 1);
      }

      takeStomp() {
        if (this.kind === "custom") {
          if (this.hitCooldown > 0) return false;
          this.health -= 1;
          this.hitAnim = .25;
          this.hitCooldown = .25;
          return this.health <= 0;
        }
        if (this.kind !== "Chargin_Chuck") return true;
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
        if (this.kind === "custom") {
          const image = customAssetImage(this.customAsset);
          if (image && image.complete && image.naturalWidth > 0) {
            const animation = this.customAsset.animation || {};
            const frames = animation.enabled ? Math.max(1, Number(animation.frames) || 1) : 1;
            const frameW = Math.max(1, Math.floor(image.naturalWidth / frames));
            const frame = frames > 1 ? Math.floor(performance.now() / 160) % frames : 0;
            this.drawCustomFacing(ctx, image, frame * frameW, 0, frameW, image.naturalHeight, x, y, this.w, this.h);
            return;
          }
        }
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
        if (this.kind === "Chargin_Chuck") {
          if (charginChuckSheet.complete && charginChuckSheet.naturalWidth > 0) {
            if (this.hitAnim > 0) {
              const hitFrames = [
                { x: 125, y: 110, w: 24, h: 15 },
                { x: 152, y: 107, w: 24, h: 18 },
                { x: 179, y: 103, w: 24, h: 22 },
                { x: 206, y: 112, w: 24, h: 13 },
                { x: 233, y: 103, w: 24, h: 22 }
              ];
              const frame = hitFrames[Math.floor(performance.now() / 90) % hitFrames.length];
              this.drawSheetFacing(ctx, charginChuckSheet, frame.x, frame.y, frame.w, frame.h, x - 4, y - 4, 40, 30);
              return;
            }
            if (!this.onGround) {
              this.drawSheetFacing(ctx, charginChuckSheet, 5, 98, 28, 27, x - 4, y - 8, 40, 42);
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
              this.drawSheetFacing(ctx, charginChuckSheet, frame.x, frame.y, frame.w, frame.h, x - 4, y - 6, 40, 38);
            }
            return;
          }
          return;
        }
      }

      drawCustomFacing(ctx, image, sx, sy, sw, sh, x, y, w, h) {
        const spriteFacing = this.customAsset?.mob?.spriteFacing || "left";
        const movingRight = this.vx >= 0 || this.shell;
        const spriteFacesRight = spriteFacing === "right";
        const shouldFlip = movingRight !== spriteFacesRight;
        if (!shouldFlip) {
          ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
          return;
        }
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();
      }
    }

    class WalkingMushroom {
      constructor(x, y, direction = 1) {
        this.x = x + 4;
        this.y = y - TILE;
        this.w = 24;
        this.h = 24;
        this.vx = (direction || 1) * 90;
        this.vy = 0;
        this.active = true;
      }

      get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
      }

      update(dt, level) {
        if (!this.active) return;
        this.vy = clamp(this.vy + GRAVITY * dt, -900, MAX_FALL);
        this.x += this.vx * dt;
        let hitWall = false;
        for (const tile of level.tilesNear(this.rect)) {
          if (!rectsOverlap(this.rect, tile)) continue;
          hitWall = true;
          if (this.vx > 0) this.x = tile.x - this.w;
          else this.x = tile.x + tile.w;
        }
        if (hitWall) this.vx *= -1;
        this.y += this.vy * dt;
        for (const tile of level.tilesNear(this.rect)) {
          if (!rectsOverlap(this.rect, tile)) continue;
          if (this.vy > 0) { this.y = tile.y - this.h; this.vy = 0; }
          else if (this.vy < 0) { this.y = tile.y + tile.h; this.vy = 0; }
        }
        if (this.y > level.pixelHeight + 240) this.active = false;
      }

      draw(ctx, camera) {
        if (!this.active) return;
        const x = Math.round(this.x - camera.x);
        const y = Math.round(this.y - camera.y);
        if (itemSheet.complete && itemSheet.naturalWidth > 0) {
          ctx.drawImage(itemSheet, 0, 0, ITEM_FRAME, ITEM_FRAME, x, y, 24, 24);
        }
      }
    }
