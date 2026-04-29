"use strict";

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
        this._goalSet = false;
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
              if (!this._goalSet) {
                this.goal = { x: x * TILE, y: y * TILE, w: TILE, h: TILE * 2 };
                this._goalSet = true;
              }
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
        return t === 1 || t === 2 || t === 3 || t === 8 || t === 11 || t === 12;
      }

      isBreakable(tx, ty) {
        const t = this.tileAt(tx, ty);
        return t === 2 || t === 3;
      }

      isQuestion(tx, ty) {
        return this.tileAt(tx, ty) === 11;
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
            if (type === 1 || type === 2 || type === 3 || type === 8 || type === 11 || type === 12) tiles.push(new Tile(x * TILE, y * TILE, type));
          }
        }
        return tiles;
      }
    }

    