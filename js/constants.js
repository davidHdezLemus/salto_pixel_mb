"use strict";

    const TILE = 32;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const GRAVITY = 1900;
    const MAX_FALL = 980;
    const ACCEL = 1450;
    const FRICTION = 1200;
    const MAX_SPEED = 245;
    const JUMP = 760;
    const PEER_CONFIG = {
      debug: 1,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
    };

    const $ = (id) => document.getElementById(id);
    const canvas = $("gameCanvas");
    const ctx = canvas.getContext("2d");
    const ASSET_DIR = "assets/used";
    const marioSheet = new Image();
    marioSheet.src = `${ASSET_DIR}/mario.png`;
    const luigiSheet = new Image();
    luigiSheet.src = `${ASSET_DIR}/luigi.png`;
    const itemSheet = new Image();
    itemSheet.src = `${ASSET_DIR}/items.png`;
    const tileSheet = new Image();
    tileSheet.src = `${ASSET_DIR}/overworld.png`;
    const worldOneBg = new Image();
    worldOneBg.src = `${ASSET_DIR}/bg-1-1-a.png`;
    const goombaWalk1 = new Image();
    goombaWalk1.src = `${ASSET_DIR}/goomba-walk-1.png`;
    const goombaWalk2 = new Image();
    goombaWalk2.src = `${ASSET_DIR}/goomba-walk-2.png`;
    const goombaFlat = new Image();
    goombaFlat.src = `${ASSET_DIR}/goomba-flat.png`;
    const koopaSheet = new Image();
    koopaSheet.src = `${ASSET_DIR}/koopa-verde.png`;
    const rugbySheet = new Image();
    rugbySheet.src = `${ASSET_DIR}/rugby.png`;
    const flagPoleSheet = new Image();
    flagPoleSheet.src = `${ASSET_DIR}/flag-pole.png`;
    const flagSheet = new Image();
    flagSheet.src = `${ASSET_DIR}/flag.png`;
    const MARIO_FRAME = 32;
    const ITEM_FRAME = 16;

    const qBlockSheet = new Image();
    qBlockSheet.src = `${ASSET_DIR}/bloque_sorpresa.png`;

    
