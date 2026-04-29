"use strict";

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

    