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
        this.levelTime = 0;
        this.walkingMushrooms = [];
        this.showMessage("", "");
        this.menuVisible = false;
        this.renderMenu();
        this.sound.startMusic();
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
        this.sound.startMusic();
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
        if (this.state === "courseclear") {
          this._clearTimer -= dt;
          const el = document.getElementById("clearCountdown");
          if (el) el.textContent = Math.max(0, Math.ceil(this._clearTimer));
          if (this._clearTimer <= 0) this.nextLevel();
        }
        this.draw();
        this.updateHud();
        requestAnimationFrame((t) => this.loop(t));
      }

      update(dt) {
        this.levelTime += dt;
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
        if (reached && someoneAlive) this.courseClear();
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
        this.walkingMushrooms.forEach((m) => m.draw(ctx, this.camera));
        this.level.enemies.forEach((e) => e.draw(ctx, this.camera));
        this.players.forEach((p) => p.draw(ctx, this.camera));
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
            if (![1, 2, 3, 8, 11, 12].includes(type)) continue;
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
            if (type === 11 || type === 12) {
              if (qBlockSheet.complete && qBlockSheet.naturalWidth > 0) {
                const qFrame = type === 12 ? 4 : Math.floor(performance.now() / 160) % 4;
                ctx.drawImage(qBlockSheet, qFrame * 16, 0, 16, 16, sx, sy, TILE, TILE);
              } else {
                ctx.fillStyle = type === 12 ? "#888" : "#f7c548";
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.strokeStyle = "#5f321f";
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
                if (type === 11) {
                  ctx.fillStyle = "#fff";
                  ctx.font = `bold ${TILE * 0.6}px sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText("?", sx + TILE / 2, sy + TILE / 2);
                  ctx.textBaseline = "alphabetic";
                }
              }
              continue;
            }
            if (tileSheet.complete && tileSheet.naturalWidth > 0) {
              const tileMap = {
                1: [16, 0],
                2: [48, 0],
                3: [48, 0]
              };
              const [srcX, srcY] = tileMap[type] || tileMap[1];
              ctx.drawImage(tileSheet, srcX, srcY, 16, 16, sx, sy, TILE, TILE);
              continue;
            }
            ctx.fillStyle = "#b06f3c";
            ctx.fillRect(sx, sy, TILE, TILE);
            ctx.fillStyle = "#e0a15f";
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

    
