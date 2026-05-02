"use strict";

const LEVELS = (window.MARIO_LEVEL_FACTORIES || []).map((factory) => factory());
    if (!LEVELS.length) {
      throw new Error("No hay fases registradas. Revisa los scripts de la carpeta levels/ antes de game.js.");
    }

    class Tile {
      constructor(x, y, type, w = TILE, h = TILE) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.w = w;
        this.h = h;
      }
    }

    class Level {
      constructor(index) {
        const data = LEVELS[index];
        this.index = index;
        this.rows = data.rows.map((row) => row.slice());
        this.customPole = this.rows.some((row) => row.includes(14));
        this.width = data.width;
        this.height = data.height;
        this.pixelWidth = this.width * TILE;
        this.pixelHeight = this.height * TILE;
        this.start = { ...data.start };
        this.palette = data.palette;
        this.backgroundZones = Array.isArray(data.backgroundZones) ? data.backgroundZones : [];
        this.tileRotations = data.tileRotations || {};
        this.teleports = this.normalizeTeleports(data.teleports);
        this.customAssets = Array.isArray(data.customAssets) ? data.customAssets : [];
        this.customAssetMap = new Map(this.customAssets.map((asset) => [asset.id, asset]));
        this.enemies = [];
        this.coins = [];
        this.powerUps = [];
        this.goal = { x: 0, y: 0, w: TILE, h: TILE * 2 };
        this._goalSet = false;
        this.extractActors();
      }

      extractActors() {
        const poleTiles = [];
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const type = this.rows[y][x];
            if (type === 14) poleTiles.push({ x, y });
            const customAsset = this.customAssetFor(type);
            if (customAsset?.mob?.enabled) {
              this.enemies.push(new Enemy(x * TILE, y * TILE + 4, "custom", customAsset));
              this.rows[y][x] = 0;
              continue;
            }
            if (type === 5 || type === 7 || type === 10) {
              this.enemies.push(new Enemy(x * TILE, y * TILE + 4, type === 7 ? "Chargin_Chuck" : type === 10 ? "koopa" : "crawler"));
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
        if (this.customPole && poleTiles.length) {
          const byColumn = new Map();
          poleTiles.forEach((tile) => {
            if (!byColumn.has(tile.x)) byColumn.set(tile.x, []);
            byColumn.get(tile.x).push(tile.y);
          });
          let poleX = poleTiles[0].x;
          let poleRows = byColumn.get(poleX);
          byColumn.forEach((rows, x) => {
            if (rows.length > poleRows.length || (rows.length === poleRows.length && x > poleX)) {
              poleX = x;
              poleRows = rows;
            }
          });
          const minY = Math.min(...poleRows);
          const maxY = Math.max(...poleRows);
          const visualPoleX = poleX * TILE + TILE - 4;
          this.goal = {
            x: visualPoleX - 14,
            y: minY * TILE,
            w: 28,
            h: (maxY - minY + 1) * TILE,
            poleX: visualPoleX
          };
          this._goalSet = true;
        }
      }

      normalizeTeleports(teleports) {
        if (!Array.isArray(teleports)) return [];
        return teleports.map((teleport) => {
          const x = Math.max(0, Number(teleport.x) || 0);
          const y = Math.max(0, Number(teleport.y) || 0);
          const w = Math.max(1, Number(teleport.w) || 1);
          const h = Math.max(1, Number(teleport.h) || 1);
          const toX = Math.max(0, Number(teleport.toX) || 0);
          const toY = Math.max(0, Number(teleport.toY) || 0);
          const sound = String(teleport.sound || "pipe").trim() || "pipe";
          return {
            x: x * TILE,
            y: y * TILE,
            w: w * TILE,
            h: h * TILE,
            toX: toX * TILE,
            toY: toY * TILE,
            sound
          };
        });
      }

      tileAt(tx, ty) {
        if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return 0;
        return this.rows[ty][tx];
      }

      customAssetFor(tileId) {
        return this.customAssetMap.get(tileId) || null;
      }

      isCustomSolid(tileId) {
        const asset = this.customAssetFor(tileId);
        if (!asset || asset.mob?.enabled) return false;
        const collision = asset.physics?.collision;
        if (collision) return collision === "solid" || collision === "breakable";
        if (asset.physics && typeof asset.physics.solid === "boolean") return asset.physics.solid;
        return asset.group === "Bloques" || asset.group === "Colectivos";
      }

      setTile(tx, ty, value) {
        if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return;
        this.rows[ty][tx] = value;
        delete this.tileRotations[`${tx},${ty}`];
      }

      tileRotationAt(tx, ty) {
        return Number(this.tileRotations[`${tx},${ty}`] || 0) % 360;
      }

      isSolid(tx, ty) {
        const t = this.tileAt(tx, ty);
        if (this.isCustomSolid(t)) return true;
        return t === 1 || t === 2 || t === 3 || t === 8 || t === 11 || t === 12 || t === 15 || t === 20;
      }

      isBreakable(tx, ty) {
        const t = this.tileAt(tx, ty);
        const physics = this.customAssetFor(t)?.physics;
        if (physics?.collision === "breakable" || physics?.breakable) return true;
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
            if (this.isCustomSolid(type)) {
              const asset = this.customAssetFor(type);
              const [tilesW = 1, tilesH = 1] = asset.tiles || [1, 1];
              tiles.push(new Tile(x * TILE, y * TILE, type, TILE * tilesW, TILE * tilesH));
            }
            else if (type === 15) tiles.push(new Tile(x * TILE, y * TILE, type, TILE * 2, TILE * 2));
            else if (type === 20) tiles.push(new Tile(x * TILE, y * TILE, type, TILE * 2, TILE));
            else if (type === 1 || type === 2 || type === 3 || type === 8 || type === 11 || type === 12) tiles.push(new Tile(x * TILE, y * TILE, type));
          }
        }
        return tiles;
      }
    }

    
