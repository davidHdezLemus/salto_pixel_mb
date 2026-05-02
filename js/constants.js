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
    const charginChuckSheet = new Image();
    charginChuckSheet.src = `${ASSET_DIR}/rugby.png`;
    const flagPoleSheet = new Image();
    flagPoleSheet.src = `${ASSET_DIR}/flag-pole.png`;
    const flagSheet = new Image();
    flagSheet.src = `${ASSET_DIR}/flag.png`;
    const castleSheet = new Image();
    castleSheet.src = `${ASSET_DIR}/Castle.png`;
    const MARIO_FRAME = 32;
    const ITEM_FRAME = 16;

    const qBlockSheet = new Image();
    qBlockSheet.src = `${ASSET_DIR}/bloque_sorpresa.png`;
    const customAssetImages = new Map();
    const builtInImages = [
      marioSheet,
      luigiSheet,
      itemSheet,
      tileSheet,
      worldOneBg,
      goombaWalk1,
      goombaWalk2,
      goombaFlat,
      koopaSheet,
      charginChuckSheet,
      flagPoleSheet,
      flagSheet,
      castleSheet,
      qBlockSheet
    ];

    function customAssetImage(asset) {
      if (!asset || !asset.path) return null;
      const key = `${asset.id || "asset"}:${asset.path.replaceAll("\\", "/")}`;
      if (!customAssetImages.has(key)) {
        const image = new Image();
        image.src = asset.path.replaceAll("\\", "/");
        customAssetImages.set(key, image);
      }
      return customAssetImages.get(key);
    }

    function imageReady(image) {
      return !!image && image.complete && image.naturalWidth > 0;
    }

    function waitForImage(image) {
      if (!image) return Promise.resolve({ ok: false, src: "" });
      if (imageReady(image)) return Promise.resolve({ ok: true, src: image.currentSrc || image.src });
      if (image.complete && image.naturalWidth === 0) {
        return Promise.resolve({ ok: false, src: image.currentSrc || image.src });
      }
      return new Promise((resolve) => {
        const done = (ok) => {
          image.removeEventListener("load", onLoad);
          image.removeEventListener("error", onError);
          resolve({ ok, src: image.currentSrc || image.src });
        };
        const onLoad = () => done(true);
        const onError = () => done(false);
        image.addEventListener("load", onLoad, { once: true });
        image.addEventListener("error", onError, { once: true });
      });
    }

    function levelImages(level) {
      const images = new Set(builtInImages);
      for (const asset of level?.customAssets || []) {
        const image = customAssetImage(asset);
        if (image) images.add(image);
      }
      return Array.from(images);
    }

    
