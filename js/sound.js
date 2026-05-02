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
      pipe:    new Audio("assets/sounds/smw_pipe.wav"),
      stomp:      new Audio("assets/sounds/smw_stomp_no_damage.wav"),
      courseclear: new Audio("assets/sounds/smw_course_clear.wav"),
      lostlife:   new Audio("assets/sounds/smw_lost_a_life.wav"),
    };
    this._activeSfx = new Set();
    this._allAudio = [this._music, ...Object.values(this._sfx)];
    this._allAudio.forEach((audio) => {
      audio.preload = "auto";
      audio.load();
    });
  }

  preloadAssets() {
    return this._allAudio.map((audio) => ({
      kind: "sounds",
      src: audio.currentSrc || audio.src,
      wait: () => this.waitForAudio(audio)
    }));
  }

  waitForAudio(audio) {
    if (!audio) return Promise.resolve({ ok: false, src: "" });
    if (audio.readyState >= 3) return Promise.resolve({ ok: true, src: audio.currentSrc || audio.src });
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        audio.removeEventListener("canplaythrough", onLoad);
        audio.removeEventListener("loadeddata", onLoad);
        audio.removeEventListener("error", onError);
        resolve({ ok, src: audio.currentSrc || audio.src });
      };
      const onLoad = () => done(true);
      const onError = () => done(false);
      const timer = setTimeout(() => done(audio.readyState >= 2), 4000);
      audio.addEventListener("canplaythrough", onLoad, { once: true });
      audio.addEventListener("loadeddata", onLoad, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });
  }

  play(name) {
    if (!this.enabled) return;
    const src = this._sfx[name];
    if (!src) return;
    const clone = src.cloneNode();
    clone.volume = 0.75;
    this._activeSfx.add(clone);
    const cleanup = () => this._activeSfx.delete(clone);
    clone.addEventListener("ended", cleanup, { once: true });
    clone.addEventListener("error", cleanup, { once: true });
    clone.play().catch(cleanup);
  }

  stopSfx() {
    this._activeSfx.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this._activeSfx.clear();
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
