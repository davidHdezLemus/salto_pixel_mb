"use strict";

class SoundManager {
  constructor() {
    this.enabled = true;
    this._music = new Audio("assets/sounds/theme.mp3");
    this._music.loop = true;
    this._music.volume = 0.45;

    this._sfx = {
      coin:    new Audio("assets/sounds/smw_coin.wav"),
      lose:    new Audio("assets/sounds/smw_game_over.wav"),
      jump:    new Audio("assets/sounds/smw_jump.wav"),
      pause:   new Audio("assets/sounds/smw_pause.wav"),
      powerup: new Audio("assets/sounds/smw_power-up.wav"),
      stomp:      new Audio("assets/sounds/smw_stomp_no_damage.wav"),
      courseclear: new Audio("assets/sounds/smw_course_clear.wav"),
      lostlife:   new Audio("assets/sounds/smw_lost_a_life.wav"),
    };
  }

  play(name) {
    if (!this.enabled) return;
    const src = this._sfx[name];
    if (!src) return;
    const clone = src.cloneNode();
    clone.volume = 0.75;
    clone.play().catch(() => {});
  }

  startMusic() {
    if (!this.enabled) return;
    this._music.currentTime = 0;
    this._music.play().catch(() => {});
  }

  resumeMusic() {
    if (!this.enabled) return;
    this._music.play().catch(() => {});
  }

  stopMusic() {
    this._music.pause();
  }
}
