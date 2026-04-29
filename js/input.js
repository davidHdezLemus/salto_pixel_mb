"use strict";

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

    