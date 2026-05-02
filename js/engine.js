"use strict";

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
        this.levelTime = 0;
        this._clearTimer = 0;
        this.walkingMushrooms = [];
        this.loadingAssets = { done: 0, total: 0, errors: [] };
        this._loadToken = null;
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

      beginLevelLoading(nextState = "playing", afterLoad = null) {
        const token = Symbol("level-load");
        this._loadToken = token;
        this.sound.stopSfx();
        const imageAssets = levelImages(this.level).map((image) => ({
          kind: "sprites",
          src: image?.currentSrc || image?.src || "",
          wait: () => waitForImage(image)
        }));
        const soundAssets = this.sound.preloadAssets();
        const assets = [...imageAssets, ...soundAssets];
        this.loadingAssets = {
          done: 0,
          total: assets.length,
          spritesDone: 0,
          spritesTotal: imageAssets.length,
          soundsDone: 0,
          soundsTotal: soundAssets.length,
          current: "",
          errors: []
        };
        this.state = "loading";
        $("overlay").innerHTML = "";
        if (!assets.length) {
          this.finishLevelLoading(token, nextState, afterLoad);
          return;
        }
        Promise.all(assets.map((asset) => asset.wait().then((result) => {
          if (this._loadToken !== token) return result;
          const kind = asset.kind === "sounds" ? "sounds" : "sprites";
          this.loadingAssets.done += 1;
          this.loadingAssets.current = result.src || asset.src || "";
          if (kind === "sounds") this.loadingAssets.soundsDone += 1;
          else this.loadingAssets.spritesDone += 1;
          if (!result.ok) this.loadingAssets.errors.push(result.src);
          return result;
        }))).then(() => this.finishLevelLoading(token, nextState, afterLoad));
      }

      finishLevelLoading(token, nextState, afterLoad) {
        if (this._loadToken !== token) return;
        this._loadToken = null;
        if (this.loadingAssets.errors.length) {
          console.warn("No se pudieron cargar algunos recursos del nivel:", this.loadingAssets.errors);
        }
        this.state = nextState;
        this.showMessage("", "");
        if (afterLoad) afterLoad();
      }

      start(mode = "solo") {
        this.mode = mode;
        this.levelIndex = 0;
        this.level = new Level(0);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(mode === "solo" ? 1 : 2);
        this.levelTime = 0;
        this.walkingMushrooms = [];
        this.menuVisible = false;
        this.renderMenu();
        this.beginLevelLoading("playing", () => this.sound.startMusic());
      }

      nextLevel() {
        this.state = "playing";
        $("overlay").innerHTML = "";
        if (this.levelIndex >= LEVELS.length - 1) {
          this.state = "victory";
          this.sound.stopMusic();
          this.showMessage("VICTORIA", `Has completado los ${LEVELS.length} niveles.`);
          this.menuVisible = true;
          this.renderMenu();
          return;
        }
        this.levelIndex++;
        this.levelTime = 0;
        this.walkingMushrooms = [];
        const lives = this.players.map((p) => p.lives);
        const score = this.totalScore();
        const coins = this.totalCoins();
        const powered = this.players.map((p) => p.powered);
        const deaths = this.players.map((p) => p.deaths || 0);
        this.level = new Level(this.levelIndex);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(this.players.length);
        this.players.forEach((p, i) => {
          p.lives = lives[i] || 3;
          p.score = i === 0 ? score : 0;
          p.coins = i === 0 ? coins : 0;
          p.powered = powered[i] || false;
          p.h = p.powered ? TILE * 2 : TILE;
          p.deaths = deaths[i] || 0;
        });
        this.beginLevelLoading("playing", () => this.sound.startMusic());
      }

      courseClear() {
        if (this.state === "courseclear") return;
        this.state = "courseclear";
        this.sound.stopMusic();
        this.sound.play("courseclear");
        this._clearTimer = 5;
        const mins = String(Math.floor(this.levelTime / 60)).padStart(2, "0");
        const secs = String(Math.floor(this.levelTime % 60)).padStart(2, "0");
        const rows = this.players.map((p) =>
          `<tr><td>J${p.id}</td><td>${p.lives}</td><td>${p.deaths}</td><td>${p.coins}</td></tr>`
        ).join("");
        $("overlay").innerHTML = `<div>
          <h1>¡Nivel ${this.levelIndex + 1} completado!</h1>
          <p>Tiempo: ${mins}:${secs}</p>
          <table style="margin:8px auto;border-collapse:collapse">
            <tr><th style="padding:4px 12px"></th><th style="padding:4px 12px">Vidas</th><th style="padding:4px 12px">Muertes</th><th style="padding:4px 12px">Monedas</th></tr>
            ${rows}
          </table>
          <p style="opacity:0.6;font-size:0.85em;margin-top:10px">Siguiente nivel en <span id="clearCountdown">5</span>s…</p>
        </div>`;
      }

      spawnMushroom(x, y, direction = 1) {
        this.walkingMushrooms.push(new WalkingMushroom(x, y, direction));
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
        this.sound.play("pause");
        if (this.state === "paused") this.sound.stopMusic();
        else this.sound.resumeMusic();
        this.showMessage(this.state === "paused" ? "PAUSA" : "", this.state === "paused" ? "Pulsa P para continuar." : "");
      }

      toggleMenu() {
        this.menuVisible = !this.menuVisible;
        $("menu").classList.toggle("hidden", !this.menuVisible);
      }

      toggleSound() {
        this.sound.enabled = !this.sound.enabled;
        if (!this.sound.enabled) this.sound.stopMusic();
        else if (this.state === "playing") this.sound.resumeMusic();
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
          this.network.onMessage = (msg) => this.handleNetMessage(msg);
          this.network.onGuestConnect = () => {
            this.netGuestConnected = true;
            this.renderMenu();
          };
          this.menuView = "hostConnecting";
          this.renderMenu();
          this.network.openRoom()
            .then((code) => {
              this.netToken = code;
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
          this.netToken = token;
          this.netRole = "guest";
          this.mode = "network";
          this.menuView = "guestConnecting";
          this.renderMenu();
          this.network.onMessage = (msg) => this.handleNetMessage(msg);
          this.network.joinRoom(token.toLowerCase())
            .then(() => {
              this.menuView = "guestLobby";
              this.renderMenu();
            })
            .catch((err) => {
              this.netError = err.message || "No se pudo conectar. Verifica el código.";
              this.netRole = null;
              this.mode = "solo";
              this.netToken = "";
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
        this.levelIndex = 0;
        this.level = new Level(0);
        this.camera.x = 0;
        this.camera.y = 0;
        this.resetPlayers(2);
        this.menuVisible = false;
        this.renderMenu();
        this.beginLevelLoading("playing", () => this.sound.startMusic());
      }

      handleNetMessage(msg) {
        if (msg.t === "start" && this.netRole === "guest") {
          this.startGuestNetwork();
        } else if (msg.t === "snapshot" && this.netRole === "guest") {
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
        if (this.state === "courseclear") {
          if (!(this.mode === "network" && this.netRole === "guest")) {
            this._clearTimer -= dt;
            const el = document.getElementById("clearCountdown");
            if (el) el.textContent = Math.max(0, Math.ceil(this._clearTimer));
            if (this._clearTimer <= 0) this.nextLevel();
          }
          if (this.mode === "network" && this.netRole === "host") this.multi.syncNetwork();
        }
        this.draw();
        this.updateHud();
        requestAnimationFrame((t) => this.loop(t));
      }

      update(dt) {
        if (this.mode === "network" && this.netRole === "guest") {
          this.network.send({ t: "input", input: this.input.playerControls(1) });
          return;
        }
        this.levelTime += dt;
        const controls = this.players.map((p) => {
          return this.input.playerControls(p.id);
        });
        if (this.mode === "network") {
          if (this.netRole === "host") {
            controls[1] = this._guestInput || { left: false, right: false, jump: false };
          }
        }
        this.players.forEach((p, i) => p.update(dt, controls[i] || {}, this.level, this));
        this.handleTeleports();
        this.level.enemies.forEach((e) => e.update(dt, this.level));
        this.handleEnemyBodyCollisions();
        this.handleCoins();
        this.handlePowerUps();
        this.handleShellHits();
        this.handleEnemyHits();
        this.handleGoal();
        this.walkingMushrooms = this.walkingMushrooms.filter((m) => m.active);
        this.walkingMushrooms.forEach((m) => {
          m.update(dt, this.level);
          for (const p of this.players) {
            if (!p.dead && rectsOverlap(p.rect, m.rect)) {
              m.active = false;
              p.powerUp(this);
            }
          }
        });
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
          if (this.mode === "network" && this.netRole === "host") this.multi.syncNetwork();
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

      handleTeleports() {
        if (!this.level.teleports?.length) return;
        for (const player of this.players) {
          if (player.dead || player.teleportCooldown > 0) continue;
          const touchRect = {
            x: player.x - 4,
            y: player.y - 4,
            w: player.w + 8,
            h: player.h + 8
          };
          for (const teleport of this.level.teleports) {
            if (!rectsOverlap(touchRect, teleport)) continue;
            player.x = clamp(teleport.toX, 0, this.level.pixelWidth - player.w);
            player.y = clamp(teleport.toY, 0, this.level.pixelHeight - player.h);
            player.vx = 0;
            player.vy = 0;
            player.teleportCooldown = .55;
            player.invuln = Math.max(player.invuln || 0, .35);
            if (teleport.sound !== "none") this.sound.play(teleport.sound || "pipe");
            break;
          }
        }
      }

      rewardEnemyDefeat(player, enemy) {
        if (!player) return;
        player.coins += 1;
        player.score += enemy.kind === "Chargin_Chuck" || enemy.kind === "koopa" ? 180 : 120;
      }

      customAssetById(id) {
        return this.level.customAssetFor(Number(id));
      }

      customShellAsset(enemy) {
        return this.customAssetById(enemy.customAsset?.mob?.defeatedAsset);
      }

      customMovingShellAsset(enemy) {
        return this.customAssetById(enemy.customAsset?.mob?.movingAsset);
      }

      isShellEnemy(enemy) {
        return (enemy.kind === "koopa" || enemy.kind === "custom") && enemy.shell;
      }

      isMovingShell(enemy) {
        return this.isShellEnemy(enemy) && this.shellCanHurtPlayer(enemy);
      }

      shellContactIsSafe(enemy) {
        return this.isShellEnemy(enemy) && enemy.shellSafeTimer > 0;
      }

      shellUsesRestingSprite(enemy) {
        if (!this.isShellEnemy(enemy)) return false;
        if (enemy.kind !== "custom") return Math.abs(enemy.vx) < 90;
        const restingAssetId = Number(enemy.shellRestingAssetId || enemy.customAsset?.mob?.defeatedAsset || 0);
        if (!restingAssetId) return Math.abs(enemy.vx) < 90;
        return Number(enemy.customAsset?.id) === restingAssetId;
      }

      shellCanHurtPlayer(enemy) {
        if (!this.isShellEnemy(enemy) || this.shellContactIsSafe(enemy)) return false;
        if (this.shellUsesRestingSprite(enemy)) return false;
        const movingAssetId = Number(enemy.shellMovingAssetId || enemy.customAsset?.mob?.movingAsset || 0);
        if (enemy.kind === "custom" && movingAssetId) {
          return Number(enemy.customAsset?.id) === movingAssetId && Math.abs(enemy.vx) >= 90;
        }
        return Math.abs(enemy.vx) >= 90;
      }

      kickRestingShell(enemy, player) {
        player.invuln = Math.max(player.invuln || 0, 1);
        const playerCenter = player.x + player.w / 2;
        const shellCenter = enemy.x + enemy.w / 2;
        const direction = playerCenter <= shellCenter ? 1 : -1;
        if (enemy.kind === "custom") enemy.kickShell(direction, player, this.customMovingShellAsset(enemy));
        else enemy.kickShell(direction, player);
        this.sound.play("stomp");
      }

      destroyShell(enemy, player = null) {
        if (!this.isShellEnemy(enemy)) return false;
        enemy.dead = true;
        enemy.vx = 0;
        this.rewardEnemyDefeat(player, enemy);
        return true;
      }

      stompCustomEnemy(player, enemy) {
        if (enemy.shell) {
          return this.destroyShell(enemy, player);
        }
        if (!enemy.takeStomp()) return false;
        const mob = enemy.customAsset?.mob || {};
        if (mob.defeatAction === "shell") {
          const shellAsset = this.customShellAsset(enemy);
          if (shellAsset) {
            enemy.enterShell(player, shellAsset);
            return true;
          }
        }
        enemy.flattened = .45;
        enemy.vx = 0;
        return true;
      }

      damageEnemyFromBlock(enemy, player = null) {
        if (enemy.dead || enemy.flattened > 0 || enemy.hitCooldown > 0) return false;
        if (enemy.kind === "koopa") {
          enemy.enterShell(player, null, .55);
          return true;
        }
        if (enemy.kind === "custom") {
          if (!enemy.takeStomp()) return true;
          const mob = enemy.customAsset?.mob || {};
          if (mob.defeatAction === "shell") {
            const shellAsset = this.customShellAsset(enemy);
            if (shellAsset) {
              enemy.enterShell(player, shellAsset, .55);
              return true;
            }
          }
          enemy.flattened = .35;
          enemy.vx = 0;
          return true;
        }
        if (enemy.kind === "Chargin_Chuck") {
          if (!enemy.takeStomp()) return true;
          enemy.flattened = .35;
          return true;
        }
        enemy.flattened = .35;
        enemy.vx = 0;
        return true;
      }

      bumpEnemiesAboveBlock(tx, ty, player = null) {
        const block = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
        let hitAny = false;
        for (const enemy of this.level.enemies) {
          if (enemy.dead || enemy.flattened > 0) continue;
          const overlapsX = enemy.x + enemy.w > block.x + 2 && enemy.x < block.x + block.w - 2;
          const onTop = enemy.y + enemy.h >= block.y - 8 && enemy.y + enemy.h <= block.y + 10;
          if (!overlapsX || !onTop) continue;
          if (this.damageEnemyFromBlock(enemy, player)) {
            enemy.vy = -260;
            hitAny = true;
            if (enemy.dead || enemy.flattened > 0 || enemy.shell) {
              this.rewardEnemyDefeat(player, enemy);
            }
          }
        }
        if (hitAny) this.sound.play("stomp");
      }

      handleEnemyBodyCollisions() {
        const enemies = this.level.enemies;
        for (let i = 0; i < enemies.length; i++) {
          const a = enemies[i];
          if (a.dead || a.flattened > 0) continue;
          for (let j = i + 1; j < enemies.length; j++) {
            const b = enemies[j];
            if (b.dead || b.flattened > 0) continue;
            if (!rectsOverlap(a.rect, b.rect)) continue;
            if (this.isMovingShell(a) || this.isMovingShell(b)) continue;
            const aCenter = a.x + a.w / 2;
            const bCenter = b.x + b.w / 2;
            const aLeft = aCenter <= bCenter;
            const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
            const separate = Math.max(1, overlap / 2 + 1);
            a.x += aLeft ? -separate : separate;
            b.x += aLeft ? separate : -separate;
            if (!a.shell) a.vx = (aLeft ? -1 : 1) * Math.max(45, Math.abs(a.vx || 55));
            if (!b.shell) b.vx = (aLeft ? 1 : -1) * Math.max(45, Math.abs(b.vx || 55));
          }
        }
      }

      handleEnemyHits() {
        for (const enemy of this.level.enemies) {
          if (enemy.dead) continue;
          if (enemy.flattened > 0) continue;
          for (const player of this.players) {
            if (player.dead || !rectsOverlap(player.rect, enemy.rect)) continue;
            const playerBottom = player.y + player.h;
            const enemyTop = enemy.y;
            const overlapFromTop = playerBottom - enemyTop;
            const stompWindow = this.isShellEnemy(enemy)
              ? Math.max(18, Math.min(30, enemy.h * .85))
              : Math.max(18, Math.min(34, enemy.h * .7));
            const stomp = player.vy > 70 && player.y < enemy.y + enemy.h * .5 && overlapFromTop >= -4 && overlapFromTop <= stompWindow;
            if (stomp) {
              if (this.isShellEnemy(enemy)) {
                this.destroyShell(enemy, player);
                player.vy = -560;
                player.jumpHeld = true;
                this.sound.play("stomp");
                continue;
              } else if (enemy.kind === "koopa") {
                enemy.enterShell(player);
              } else if (enemy.kind === "custom") {
                if (!this.stompCustomEnemy(player, enemy)) {
                  player.vy = -560;
                  player.jumpHeld = true;
                  this.sound.play("stomp");
                  continue;
                }
              } else if (enemy.kind === "Chargin_Chuck") {
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
              player.vy = enemy.kind === "Chargin_Chuck" ? -620 : -560;
              player.jumpHeld = true;
              this.rewardEnemyDefeat(player, enemy);
              this.sound.play("stomp");
            } else {
              if (this.shellContactIsSafe(enemy)) continue;
              if (enemy.kind === "custom" && enemy.shell) {
                if (this.shellCanHurtPlayer(enemy)) {
                  player.hurt(this);
                } else {
                  this.kickRestingShell(enemy, player);
                }
                continue;
              }
              if (enemy.kind === "koopa" && enemy.shell) {
                if (this.shellCanHurtPlayer(enemy)) {
                  player.hurt(this);
                } else {
                  this.kickRestingShell(enemy, player);
                }
                continue;
              }
              player.hurt(this);
            }
          }
        }
      }

      handleShellHits() {
        const shells = this.level.enemies.filter((e) => !e.dead && this.shellCanHurtPlayer(e));
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
        if (reached && someoneAlive) this.courseClear();
      }

      snapshot() {
        return {
          levelIndex: this.levelIndex,
          state: this.state,
          score: this.totalScore(),
          levelTime: this.levelTime,
          clearTimer: this._clearTimer,
          camera: { x: this.camera.x, y: this.camera.y },
          rows: this.level.rows.map((row) => row.slice()),
          players: this.players.map((p) => ({
            x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy,
            lives: p.lives, dead: p.dead, state: p.state, powered: p.powered,
            coins: p.coins, score: p.score, deaths: p.deaths, facing: p.facing,
            onGround: p.onGround, invuln: p.invuln, teleportCooldown: p.teleportCooldown
          })),
          enemies: this.level.enemies.map((e) => ({
            x: e.x, y: e.y, vx: e.vx, vy: e.vy,
            dead: e.dead, shell: e.shell, flattened: e.flattened,
            health: e.health, hitAnim: e.hitAnim, hitCooldown: e.hitCooldown, shellSafeTimer: e.shellSafeTimer,
            shellRestingAssetId: e.shellRestingAssetId, shellMovingAssetId: e.shellMovingAssetId
          })),
          coins: this.level.coins.map((c) => c.taken),
          powerUps: this.level.powerUps.map((p) => p.taken),
          walkingMushrooms: this.walkingMushrooms.map((m) => ({
            x: m.x, y: m.y, w: m.w, h: m.h, vx: m.vx, vy: m.vy, active: m.active
          }))
        };
      }

      applyGuestSnapshot(snapshot) {
        if (snapshot.levelIndex !== this.levelIndex) {
          this.levelIndex = snapshot.levelIndex;
          this.level = new Level(this.levelIndex);
          this.resetPlayers(2);
          this.walkingMushrooms = [];
          this.beginLevelLoading(snapshot.state || "playing");
        }
        const prevState = this.state;
        if (this.state !== "loading") this.state = snapshot.state || this.state;
        this.levelTime = snapshot.levelTime || 0;
        this._clearTimer = snapshot.clearTimer || 0;
        if (snapshot.camera) Object.assign(this.camera, snapshot.camera);
        if (snapshot.rows) this.level.rows = snapshot.rows.map((row) => row.slice());
        snapshot.players.forEach((data, i) => {
          if (!this.players[i]) return;
          Object.assign(this.players[i], data);
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
        if (snapshot.walkingMushrooms) {
          this.walkingMushrooms = snapshot.walkingMushrooms.map((data) => {
            const m = new WalkingMushroom(data.x - 4, data.y + TILE, data.vx < 0 ? -1 : 1);
            Object.assign(m, data);
            return m;
          });
        }
        if (this.state === "courseclear") this.renderCourseClearOverlay();
        else if (prevState === "courseclear") $("overlay").innerHTML = "";
        if (this.state === "victory") {
          this.sound.stopMusic();
          this.showMessage("VICTORIA", `Has completado los ${LEVELS.length} niveles.`);
          this.menuVisible = true;
          this.renderMenu();
        } else if (this.state === "gameover") {
          this.sound.stopMusic();
          this.showMessage("GAME OVER", "Todos los jugadores se quedaron sin vidas.");
          this.menuVisible = true;
          this.renderMenu();
        }
      }

      renderCourseClearOverlay() {
        const mins = String(Math.floor(this.levelTime / 60)).padStart(2, "0");
        const secs = String(Math.floor(this.levelTime % 60)).padStart(2, "0");
        const rows = this.players.map((p) =>
          `<tr><td>J${p.id}</td><td>${p.lives}</td><td>${p.deaths || 0}</td><td>${p.coins || 0}</td></tr>`
        ).join("");
        $("overlay").innerHTML = `<div>
          <h1>¡Nivel ${this.levelIndex + 1} completado!</h1>
          <p>Tiempo: ${mins}:${secs}</p>
          <table style="margin:8px auto;border-collapse:collapse">
            <tr><th style="padding:4px 12px"></th><th style="padding:4px 12px">Vidas</th><th style="padding:4px 12px">Muertes</th><th style="padding:4px 12px">Monedas</th></tr>
            ${rows}
          </table>
          <p style="opacity:0.6;font-size:0.85em;margin-top:10px">Siguiente nivel en <span id="clearCountdown">${Math.max(0, Math.ceil(this._clearTimer))}</span>s…</p>
        </div>`;
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
        if (this.state === "loading") {
          this.drawLoading();
          return;
        }
        this.drawBackground();
        this.drawTiles();
        this.drawGoal();
        this.drawCoins();
        this.drawPowerUps();
        this.walkingMushrooms.forEach((m) => m.draw(ctx, this.camera));
        this.level.enemies.forEach((e) => e.draw(ctx, this.camera));
        this.players.forEach((p) => p.draw(ctx, this.camera));
      }

      drawLoading() {
        const p = this.level?.palette || { sky: "#6b8cff" };
        ctx.fillStyle = p.sky || "#6b8cff";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "rgba(7, 12, 28, 0.9)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const total = Math.max(1, this.loadingAssets.total || 1);
        const done = Math.min(total, this.loadingAssets.done || 0);
        const progress = done / total;
        const barW = 460;
        const barH = 22;
        const x = Math.round((VIEW_W - barW) / 2);
        const y = Math.round(VIEW_H / 2 + 24);
        const pulse = .55 + Math.sin(performance.now() / 180) * .18;
        ctx.fillStyle = "#f7f1d4";
        ctx.font = "bold 30px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CARGANDO NIVEL", VIEW_W / 2, VIEW_H / 2 - 36);
        ctx.fillStyle = "#dfe7ff";
        ctx.font = "14px monospace";
        ctx.fillText("sprites + sonidos", VIEW_W / 2, VIEW_H / 2 - 8);

        ctx.save();
        ctx.shadowColor = `rgba(247, 197, 72, ${pulse})`;
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#10182d";
        ctx.fillRect(x - 4, y - 4, barW + 8, barH + 8);
        ctx.restore();
        ctx.fillStyle = "#25314d";
        ctx.fillRect(x, y, barW, barH);
        const fillW = Math.round(barW * progress);
        const gradient = ctx.createLinearGradient(x, y, x + barW, y);
        gradient.addColorStop(0, "#40c057");
        gradient.addColorStop(.55, "#f7c548");
        gradient.addColorStop(1, "#ff8c42");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, fillW, barH);
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.fillRect(x, y + 2, fillW, 5);
        ctx.strokeStyle = "#f7f1d4";
        ctx.strokeRect(x + .5, y + .5, barW - 1, barH - 1);
        for (let i = 1; i < 10; i++) {
          const px = x + Math.round((barW / 10) * i);
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.moveTo(px, y);
          ctx.lineTo(px, y + barH);
          ctx.stroke();
        }
        const spritesDone = this.loadingAssets.spritesDone || 0;
        const spritesTotal = this.loadingAssets.spritesTotal || 0;
        const soundsDone = this.loadingAssets.soundsDone || 0;
        const soundsTotal = this.loadingAssets.soundsTotal || 0;
        ctx.font = "14px monospace";
        ctx.fillStyle = "#dfe7ff";
        ctx.fillText(`${done}/${total} recursos`, VIEW_W / 2, y + 42);
        ctx.fillText(`sprites ${spritesDone}/${spritesTotal}   sonidos ${soundsDone}/${soundsTotal}`, VIEW_W / 2, y + 62);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      drawBackground() {
        const p = this.level.palette;
        if (p.bgAsset === "world-one" && worldOneBg.complete && worldOneBg.naturalWidth > 0) {
          const scale = p.bgScale || 2;
          const sourceW = VIEW_W / scale;
          const sx = clamp(this.camera.x / scale, 0, Math.max(0, worldOneBg.naturalWidth - sourceW));
          ctx.drawImage(worldOneBg, sx, 0, sourceW, 224, 0, p.bgOffsetY || 0, VIEW_W, 224 * scale);
          return;
        }
        ctx.fillStyle = p.sky;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        for (const zone of this.level.backgroundZones || []) {
          const x = zone.x * TILE - this.camera.x;
          const y = zone.y * TILE - this.camera.y;
          const w = zone.w * TILE;
          const h = zone.h * TILE;
          if (x + w < 0 || y + h < 0 || x > VIEW_W || y > VIEW_H) continue;
          ctx.fillStyle = zone.color || p.sky;
          ctx.fillRect(x, y, w, h);
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
            const customAsset = this.level.customAssetFor(type);
            if (![1, 2, 3, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20].includes(type) && !customAsset) continue;
            const sx = x * TILE - this.camera.x;
            const sy = y * TILE - this.camera.y;
            const rotation = this.level.tileRotationAt(x, y);
            if (customAsset) {
              this.drawCustomAsset(customAsset, sx, sy, rotation);
              continue;
            }
            if (type === 19 && castleSheet.complete && castleSheet.naturalWidth > 0) {
              this.drawRotated(rotation, sx, sy, TILE * 5, TILE * 5, () => {
                ctx.drawImage(castleSheet, sx, sy, TILE * 5, TILE * 5);
              });
              continue;
            }
            if ([14, 15, 16, 17, 18, 20].includes(type) && tileSheet.complete && tileSheet.naturalWidth > 0) {
              if (type === 14 && flagPoleSheet.complete && flagPoleSheet.naturalWidth > 0) {
                this.drawRotated(rotation, sx, sy, TILE, TILE, () => {
                  ctx.drawImage(flagPoleSheet, 7, 16, 2, 16, sx + TILE - 4, sy, 4, TILE);
                });
                continue;
              }
              const decorMap = {
                15: { sx: 96, sy: 0, sw: 32, sh: 32, dw: TILE * 2, dh: TILE * 2 },
                16: { sx: 89, sy: 32, sw: 30, sh: 22, dx: 0, dy: 9, dw: TILE * 2, dh: 46 },
                17: { sx: 48, sy: 77, sw: 80, sh: 35, dw: TILE * 5, dh: TILE * 2 },
                18: { sx: 8, sy: 96, sw: 32, sh: 16, dw: TILE * 2, dh: TILE },
                20: { sx: 96, sy: 16, sw: 32, sh: 16, dw: TILE * 2, dh: TILE }
              };
              const d = decorMap[type];
              if (d) {
                this.drawRotated(rotation, sx, sy, d.dw, d.dh, () => {
                  ctx.drawImage(tileSheet, d.sx, d.sy, d.sw, d.sh, sx + (d.dx || 0), sy + (d.dy || 0), d.dw, d.dh);
                });
              }
              continue;
            }
            if (type === 8) {
              this.drawRotated(rotation, sx, sy, TILE, TILE, () => {
                ctx.fillStyle = "#eefaff";
                ctx.fillRect(sx, sy + 8, TILE, 16);
                ctx.fillStyle = "#c6ecff";
                ctx.fillRect(sx + 3, sy + 4, TILE - 6, 8);
                ctx.strokeStyle = "#8bcff2";
                ctx.strokeRect(sx + .5, sy + 8.5, TILE - 1, 15);
              });
              continue;
            }
            if (type === 11 || type === 12) {
              this.drawRotated(rotation, sx, sy, TILE, TILE, () => {
                if (qBlockSheet.complete && qBlockSheet.naturalWidth > 0) {
                  const qFrame = type === 12 ? 4 : Math.floor(performance.now() / 160) % 4;
                  ctx.drawImage(qBlockSheet, qFrame * 16, 0, 16, 16, sx, sy, TILE, TILE);
                }
              });
              continue;
            }
            if (tileSheet.complete && tileSheet.naturalWidth > 0) {
              const tileMap = {
                1: [16, 0],
                2: [48, 0],
                3: [48, 0]
              };
              const [srcX, srcY] = tileMap[type] || tileMap[1];
              this.drawRotated(rotation, sx, sy, TILE, TILE, () => {
                ctx.drawImage(tileSheet, srcX, srcY, 16, 16, sx, sy, TILE, TILE);
              });
              continue;
            }
          }
        }
      }

      drawRotated(rotation, x, y, w, h, draw) {
        if (!rotation) {
          draw();
          return;
        }
        if (rotation === 180) {
          draw();
          return;
        }
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
        draw();
        ctx.restore();
      }

      drawCustomAsset(asset, x, y, rotation = 0) {
        const image = customAssetImage(asset);
        const [tilesW = 1, tilesH = 1] = asset.tiles || [1, 1];
        const drawW = TILE * tilesW;
        const drawH = TILE * tilesH;
        if (image && image.complete && image.naturalWidth > 0) {
          const animation = asset.animation || {};
          const frames = animation.enabled ? Math.max(1, Number(animation.frames) || 1) : 1;
          const frameW = Math.max(1, Math.floor(image.naturalWidth / frames));
          const frame = frames > 1 ? Math.floor(performance.now() / 160) % frames : 0;
          this.drawRotated(rotation, x, y, drawW, drawH, () => {
            ctx.drawImage(image, frame * frameW, 0, frameW, image.naturalHeight, x, y, drawW, drawH);
          });
          return;
        }
      }

      drawGoal() {
        const g = this.level.goal;
        const x = g.x - this.camera.x;
        const y = g.y - this.camera.y;
        if (this.level.customPole && flagSheet.complete && flagSheet.naturalWidth > 0) {
          const poleX = (g.poleX ?? (g.x + TILE / 2)) - this.camera.x;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(poleX, y + 6);
          ctx.lineTo(poleX + 52, y + 18);
          ctx.lineTo(poleX, y + 36);
          ctx.closePath();
          ctx.fillStyle = "#f7fff2";
          ctx.fill();
          ctx.strokeStyle = "#32b54a";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.drawImage(flagSheet, poleX + 18, y + 12, 16, 16);
          ctx.restore();
          return;
        }
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
        }
      }

      drawPowerUps() {
        for (const powerUp of this.level.powerUps) {
          if (powerUp.taken) continue;
          const x = powerUp.x - this.camera.x;
          const y = powerUp.y - this.camera.y;
          if (itemSheet.complete && itemSheet.naturalWidth > 0) {
            ctx.drawImage(itemSheet, 0, 0, ITEM_FRAME, ITEM_FRAME, x, y, 24, 24);
          }
        }
      }
    }

    
