"use strict";

class NetworkManager {
      constructor() {
        this.peer = null;
        this.conn = null;
        this.onMessage = null;
        this.onGuestConnect = null;
      }

      _roomCode() {
        const chars = "abcdefghjklmnpqrstuvwxyz23456789";
        const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        return `${part()}-${part()}-${part()}`;
      }

      _waitOpen(peer) {
        return new Promise((res, rej) => {
          if (peer.open) { res(peer.id); return; }
          peer.once("open", res);
          peer.once("error", rej);
        });
      }

      _waitConn(conn) {
        return new Promise((res, rej) => {
          if (conn.open) { res(); return; }
          conn.once("open", res);
          conn.once("error", rej);
        });
      }

      _attach(conn) {
        this.conn = conn;
        conn.on("data", (data) => {
          if (!this.onMessage) return;
          try {
            const msg = typeof data === "string" ? JSON.parse(data) : data;
            this.onMessage(msg);
          } catch {}
        });
        conn.on("close", () => { if (this.onMessage) this.onMessage({ t: "disconnect" }); });
      }

      async openRoom() {
        if (!window.Peer) throw new Error("PeerJS no disponible. Necesitas conexión a internet.");
        this.destroy();
        const code = this._roomCode();
        this.peer = new Peer(code, PEER_CONFIG);
        await this._waitOpen(this.peer);
        this.peer.on("connection", async (conn) => {
          if (this.conn) { conn.close(); return; }
          try {
            await this._waitConn(conn);
            this._attach(conn);
            if (this.onGuestConnect) this.onGuestConnect();
          } catch {}
        });
        this.peer.on("error", () => { if (this.onMessage) this.onMessage({ t: "disconnect" }); });
        return this.peer.id;
      }

      async joinRoom(code) {
        if (!window.Peer) throw new Error("PeerJS no disponible. Necesitas conexión a internet.");
        this.destroy();
        const clean = String(code).trim().toLowerCase();
        this.peer = new Peer(undefined, PEER_CONFIG);
        await this._waitOpen(this.peer);
        const conn = this.peer.connect(clean, { reliable: true });
        await this._waitConn(conn);
        this._attach(conn);
      }

      send(msg) {
        if (this.conn && this.conn.open) this.conn.send(JSON.stringify(msg));
      }

      destroy() {
        if (this.peer) { try { this.peer.destroy(); } catch {} }
        this.peer = null;
        this.conn = null;
      }
    }

    class MultiplayerManager {
      constructor(game) {
        this.game = game;
      }

      enforceCoopBounds() {
        if (this.game.players.length < 2) return;
        const [a, b] = this.game.players;
        if (a.dead || b.dead) return;
        const distance = Math.abs(a.x - b.x);
        if (distance > VIEW_W * .78) {
          const left = a.x < b.x ? a : b;
          const right = left === a ? b : a;
          left.x = right.x - VIEW_W * .74;
          left.x = clamp(left.x, this.game.camera.x + 10, this.game.level.pixelWidth - left.w);
        }
      }

      syncNetwork() {
        if (this.game.mode !== "network" || !this.game.netToken) return;
        if (this.game.netRole === "host") {
          this.game.network.send({ t: "snapshot", data: this.game.snapshot() });
        }
      }
    }

    