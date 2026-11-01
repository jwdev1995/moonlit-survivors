'use strict';
class Player {
  constructor(charKey) {
    const c = CHARACTERS[charKey];
    this.charKey = charKey;
    this.x = 0; this.y = 0;
    this.radius = CONFIG.PLAYER.radius;
    this.maxHp = CONFIG.PLAYER.hp; this.hp = this.maxHp;
    this.baseSpeed = CONFIG.PLAYER.speed;
    this.speedMul = 1; this.dmgMul = 1; this.cdMul = 1; this.areaMul = 1; this.pickupMul = 1;
    this.armor = 0; this.regen = 0; this.extraCount = 0;
    this.level = 1; this.xp = 0; this.xpNext = CONFIG.xpForLevel(1);
    this.weapons = []; this.passives = {};
    this.facing = 1; this.moving = false; this.anim = 0;
    this.invuln = 0; this.hurtFlash = 0;
    this.kills = 0;
    c.mods(this);
    this.addWeapon(c.startWeapon);
  }
  get speed() { return this.baseSpeed * this.speedMul; }
  get pickupRadius() { return CONFIG.PLAYER.pickup * this.pickupMul; }
  addWeapon(key) {
    const w = this.weapons.find(w => w.key === key);
    if (w) { w.level = Math.min(CONFIG.MAX_WEAPON_LEVEL, w.level + 1); return w; }
    const nw = { key, level: 1, timer: 0.4, state: {} };
    this.weapons.push(nw);
    return nw;
  }
  addPassive(key) {
    this.passives[key] = (this.passives[key] || 0) + 1;
    PASSIVES[key].apply(this);
    this.hp = Math.min(this.hp, this.maxHp);
  }
  gainXp(v) {
    this.xp += v; let ups = 0;
    while (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = CONFIG.xpForLevel(this.level); ups++; }
    return ups;
  }
}

class Enemy {
  constructor(type, x, y, scale, opts = {}) {
    const d = ENEMIES[type];
    this.type = type; this.def = d;
    this.x = x; this.y = y; this.radius = d.radius;
    this.maxHp = d.hp * scale.hp * (opts.hpMul || 1); this.hp = this.maxHp;
    this.speed = d.speed * (0.9 + Math.random() * 0.2);
    this.dmg = d.dmg * scale.dmg; this.xp = d.xp;
    this.id = Enemy.nextId++;
    this.flash = 0; this.kx = 0; this.ky = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.dead = false; this.hitTimers = null;
    this.boss = !!d.boss; this.name = opts.name || d.name;
    this.chargeTimer = 4; this.chargeState = 0; this.chargeT = 0; this.cdx = 0; this.cdy = 0;
    this.facing = 1;
    this.swarm = opts.swarm || null;   // {dx, dy}: 떼 이동 (직선 돌파)
  }
  canBeHitBy(id, now, cd) {
    if (!this.hitTimers) this.hitTimers = new Map();
    const t = this.hitTimers.get(id);
    if (t !== undefined && now - t < cd) return false;
    this.hitTimers.set(id, now);
    return true;
  }
}
Enemy.nextId = 1;

class Projectile {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx; this.vy = o.vy;
    this.damage = o.damage; this.pierce = o.pierce; this.size = o.size;
    this.kind = o.kind; this.life = o.life || 2.5; this.rot = 0;
    this.gravity = o.gravity || 0; this.hit = new Set(); this.dead = false;
    this.color = o.color;
  }
}

class Gem {
  constructor(x, y, value) {
    this.x = x; this.y = y; this.value = value;
    this.color = value >= 6 ? '#ff5577' : value >= 3 ? '#5dff8a' : '#59b8ff';
    this.phase = Math.random() * Math.PI * 2;
    this.pull = false; this.vel = 0; this.dead = false;
  }
}

class Pickup {
  constructor(x, y, kind) { this.x = x; this.y = y; this.kind = kind; this.phase = Math.random() * 6; this.dead = false; }
}

class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color; this.size = size;
  }
}

class FloatText {
  constructor(x, y, text, color, big) {
    this.x = x + Utils.rand(-6, 6); this.y = y; this.text = text; this.color = color;
    this.life = 0.7; this.maxLife = 0.7; this.big = !!big; this.vy = -60;
  }
}
