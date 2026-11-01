'use strict';
function compact(arr) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) { const o = arr[i]; if (!o.dead) arr[j++] = o; }
  arr.length = j;
}
function gemColor(v) { return v >= 6 ? '#ff5577' : v >= 3 ? '#5dff8a' : '#59b8ff'; }

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.state = 'title';
    this.player = null;
    this.tmp = [];
    this.grid = new SpatialHash(64);
    this.view = { w: 0, h: 0, r: 0 }; this.dpr = 1;
    this.vignette = null;
    this.groundPattern = this.ctx.createPattern(Sprites.ground(), 'repeat');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.last = performance.now();
    this.best = this.loadBest();
    this.announceText = ''; this.announceTimer = 0;
    requestAnimationFrame(t => this.frame(t));
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); this.dpr = dpr;
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.screen = { w, h };
    // 창 크기와 무관하게 비슷한 양의 월드가 보이도록 확대
    this.zoom = Utils.clamp(Math.min(w / 960, h / 600), 0.9, 2.2);
    this.view.w = w / this.zoom; this.view.h = h / this.zoom; this.view.r = Math.hypot(this.view.w / 2, this.view.h / 2);
    this.ctx.imageSmoothingEnabled = false;
    const v = document.createElement('canvas'); v.width = w; v.height = h;
    const g = v.getContext('2d').createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(8,8,20,0)'); g.addColorStop(1, 'rgba(8,8,20,0.75)');
    const vc = v.getContext('2d'); vc.fillStyle = g; vc.fillRect(0, 0, w, h);
    this.vignette = v;
  }

  loadBest() {
    try { return JSON.parse(localStorage.getItem('ms_best') || 'null') || { time: 0, kills: 0, level: 0, wins: 0 }; }
    catch (e) { return { time: 0, kills: 0, level: 0, wins: 0 }; }
  }
  saveBest(win) {
    const b = this.best, p = this.player;
    b.time = Math.max(b.time, this.time); b.kills = Math.max(b.kills, p.kills); b.level = Math.max(b.level, p.level);
    if (win) b.wins = (b.wins || 0) + 1;
    try { localStorage.setItem('ms_best', JSON.stringify(b)); } catch (e) {}
  }

  start(charKey) {
    this.charKey = charKey;
    this.player = new Player(charKey);
    this.heroSprite = Sprites.hero(charKey);
    this.enemies = []; this.projectiles = []; this.gems = []; this.pickups = [];
    this.particles = []; this.texts = []; this.slashes = []; this.bolts = [];
    this.time = 0; this.cam = { x: 0, y: 0 }; this.shake = 0; this.boss = null;
    this.pendingLevelUps = 0; this.hudTimer = 0; this.announceTimer = 0;
    Spawner.reset();
    this.state = 'playing';
    UI.showHud(); UI.renderSlots(this.player); UI.updateHud(this);
  }

  frame(now) {
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (this.state === 'playing') this.update(dt);
    this.render();
    requestAnimationFrame(t => this.frame(t));
  }

  // ── 상태 전환 ─────────────────────────────────────────
  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; UI.showPause(this); }
    else if (this.state === 'paused') { this.state = 'playing'; UI.hidePause(); }
  }
  end(win) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.saveBest(win);
    if (win) Audio_.win(); else Audio_.lose();
    UI.showEnd(this, win);
  }
  announce(text) { this.announceText = text; this.announceTimer = 2.6; UI.announce(text); }

  // ── 업데이트 ─────────────────────────────────────────
  update(dt) {
    this.time += dt;
    if (this.time >= CONFIG.WIN_TIME) { this.end(true); return; }
    const p = this.player;
    const v = Input.vector();
    p.moving = v.x !== 0 || v.y !== 0;
    if (p.moving) {
      p.x += v.x * p.speed * dt; p.y += v.y * p.speed * dt;
      if (v.x !== 0) p.facing = v.x > 0 ? 1 : -1;
      p.anim += dt * 10;
    }
    p.invuln = Math.max(0, p.invuln - dt); p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    const k = 1 - Math.exp(-9 * dt);
    this.cam.x += (p.x - this.cam.x) * k; this.cam.y += (p.y - this.cam.y) * k;

    Spawner.update(dt, this);
    this.grid.clear();
    for (let i = 0; i < this.enemies.length; i++) this.grid.insert(this.enemies[i]);

    this.updateEnemies(dt);
    if (this.state !== 'playing') return;
    Weapons.update(dt, this);
    this.updateProjectiles(dt);
    this.updateGems(dt);
    this.updatePickups(dt);
    this.updateEffects(dt);

    compact(this.enemies); compact(this.projectiles); compact(this.gems); compact(this.pickups);
    this.shake = Math.max(0, this.shake - 40 * dt);
    this.announceTimer = Math.max(0, this.announceTimer - dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.1; UI.updateHud(this); }
    if (this.pendingLevelUps > 0) this.openLevelUp();
  }

  spawnEnemy(type, x, y, opts) {
    const e = new Enemy(type, x, y, CONFIG.enemyScale(this.time), opts);
    this.enemies.push(e);
    return e;
  }

  nearestEnemy(x, y, maxR) {
    let best = null, bd = maxR * maxR;
    const en = this.enemies;
    for (let i = 0; i < en.length; i++) {
      const e = en[i]; if (e.dead) continue;
      const d = Utils.dist2(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  updateEnemies(dt) {
    const p = this.player, now = this.time;
    const despawnR = this.view.r * 1.7;
    const en = this.enemies;
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      let dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let mvx, mvy;
      if (e.swarm) {
        mvx = e.swarm.dx * e.speed * 1.7; mvy = e.swarm.dy * e.speed * 1.7;
        if (d > despawnR && ((e.x - p.x) * e.swarm.dx + (e.y - p.y) * e.swarm.dy) > 0) { e.dead = true; continue; }
      } else if (e.boss) {
        this.updateBoss(e, dt, dx, dy); mvx = e.bvx; mvy = e.bvy;
      } else if (e.def.wobble) {
        const w = Math.sin(now * 6 + e.phase) * 0.7;
        mvx = (dx - dy * w) * e.speed; mvy = (dy + dx * w) * e.speed;
      } else { mvx = dx * e.speed; mvy = dy * e.speed; }

      e.x += (mvx + e.kx) * dt; e.y += (mvy + e.ky) * dt;
      const kd = Math.exp(-9 * dt); e.kx *= kd; e.ky *= kd;
      if (mvx !== 0) e.facing = mvx > 0 ? 1 : -1;

      // 겹침 분리
      if (!e.def.ghost && !e.swarm) {
        const list = this.grid.query(e.x, e.y, e.radius * 2, this.tmp);
        let n = 0;
        for (let j = 0; j < list.length; j++) {
          const o = list[j];
          if (o === e || o.dead || o.def.ghost) continue;
          const ox = e.x - o.x, oy = e.y - o.y, min = e.radius + o.radius;
          const d2 = ox * ox + oy * oy;
          if (d2 < min * min && d2 > 0.01) {
            const dd = Math.sqrt(d2), push = (min - dd) * (e.boss ? 0.05 : 0.5);
            e.x += ox / dd * push; e.y += oy / dd * push;
            if (++n > 6) break;
          }
        }
      }
      // 플레이어 접촉
      const rr = e.radius + p.radius;
      if (Utils.dist2(e.x, e.y, p.x, p.y) < rr * rr) { this.hurtPlayer(e.dmg); if (this.state !== 'playing') return; }
      // 너무 멀어지면 반대편 재배치
      if (!e.boss && !e.swarm && d > despawnR) { const pos = Spawner.ringPos(this); e.x = pos.x; e.y = pos.y; }
    }
  }

  updateBoss(e, dt, dx, dy) {
    if (e.chargeState === 0) {
      e.bvx = dx * e.speed; e.bvy = dy * e.speed;
      e.chargeTimer -= dt;
      if (e.chargeTimer <= 0) { e.chargeState = 1; e.chargeT = 0.75; }
    } else if (e.chargeState === 1) {
      e.bvx = e.bvy = 0; e.cdx = dx; e.cdy = dy;
      e.chargeT -= dt;
      if (e.chargeT <= 0) { e.chargeState = 2; e.chargeT = 0.5; this.shake = Math.max(this.shake, 5); Audio_.axe(); }
    } else {
      e.bvx = e.cdx * e.speed * 5.5; e.bvy = e.cdy * e.speed * 5.5;
      e.chargeT -= dt;
      if (e.chargeT <= 0) { e.chargeState = 0; e.chargeTimer = 3.5 + Math.random() * 2; }
    }
  }

  hurtPlayer(dmg) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'playing') return;
    const real = Math.max(1, Math.round(dmg - p.armor));
    p.hp -= real; p.invuln = CONFIG.PLAYER.iframes; p.hurtFlash = 0.25;
    this.shake = Math.max(this.shake, 5);
    this.addText(p.x, p.y - 22, '-' + real, '#ff6b6b', true);
    Audio_.hurt();
    if (p.hp <= 0) { p.hp = 0; this.burst(p.x, p.y, '#ff6b6b', 30); this.end(false); }
  }

  damageEnemy(e, dmg, kx, ky, small) {
    if (e.dead) return;
    const d = Math.max(1, Math.round(dmg * Utils.rand(0.9, 1.1)));
    e.hp -= d; e.flash = 0.1;
    const km = e.boss ? 0.08 : 1;
    e.kx += kx * km; e.ky += ky * km;
    if (!small || Math.random() < 0.3) this.addText(e.x, e.y - e.radius, String(d), small ? '#bfe8c8' : '#ffffff', !small && d >= 40);
    Audio_.hit();
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true; this.player.kills++;
    this.dropGem(e.x, e.y, e.xp);
    this.burst(e.x, e.y, e.def.color, e.boss ? 40 : 6);
    Audio_.kill();
    if (e.boss) {
      if (this.boss === e) this.boss = null;
      this.pickups.push(new Pickup(e.x, e.y, 'chest'));
      this.shake = Math.max(this.shake, 14);
      this.announce(e.name + ' 처치!');
    } else if (Math.random() < CONFIG.DROP_CHANCE) {
      const r = Math.random();
      this.pickups.push(new Pickup(e.x, e.y, r < 0.5 ? 'heart' : r < 0.8 ? 'magnet' : 'bomb'));
    }
  }

  dropGem(x, y, value) {
    if (this.gems.length >= CONFIG.MAX_GEMS) {
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      g.value += value; g.color = gemColor(g.value);
      return;
    }
    this.gems.push(new Gem(x + Utils.rand(-6, 6), y + Utils.rand(-6, 6), value));
  }

  updateProjectiles(dt) {
    const p = this.player, far2 = (this.view.r * 1.5) ** 2;
    for (let i = 0; i < this.projectiles.length; i++) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) { pr.dead = true; continue; }
      pr.vy += pr.gravity * dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.kind === 'axe') pr.rot += dt * 14;
      const list = this.grid.query(pr.x, pr.y, pr.size + 36, this.tmp);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (e.dead || pr.hit.has(e.id)) continue;
        const rr = pr.size + e.radius;
        if (Utils.dist2(pr.x, pr.y, e.x, e.y) < rr * rr) {
          pr.hit.add(e.id);
          const sp = Math.hypot(pr.vx, pr.vy) || 1;
          this.damageEnemy(e, pr.damage, pr.vx / sp * 130, pr.vy / sp * 130);
          this.burst(pr.x, pr.y, pr.color, 3);
          if (--pr.pierce <= 0) { pr.dead = true; break; }
        }
      }
      if (Utils.dist2(pr.x, pr.y, p.x, p.y) > far2) pr.dead = true;
    }
  }

  updateGems(dt) {
    const p = this.player, pr2 = p.pickupRadius ** 2;
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (!g.pull && Utils.dist2(g.x, g.y, p.x, p.y) < pr2) g.pull = true;
      if (g.pull) {
        g.vel += 1500 * dt;
        const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, g.vel * dt);
        g.x += dx / d * step; g.y += dy / d * step;
        if (d < 10) { g.dead = true; this.collectXp(g.value); }
      }
    }
  }
  collectXp(v) {
    const ups = this.player.gainXp(v);
    Audio_.gem();
    if (ups > 0) this.pendingLevelUps += ups;
  }

  updatePickups(dt) {
    const p = this.player, r = p.pickupRadius * 0.6 + 14;
    for (let i = 0; i < this.pickups.length; i++) {
      const it = this.pickups[i];
      if (Utils.dist2(it.x, it.y, p.x, p.y) < r * r) { it.dead = true; this.applyPickup(it); }
    }
  }
  applyPickup(it) {
    const p = this.player;
    Audio_.pickup();
    switch (it.kind) {
      case 'heart': { const h = Math.round(p.maxHp * 0.3); p.hp = Math.min(p.maxHp, p.hp + h); this.addText(p.x, p.y - 24, '+' + h, '#ff6b8a', true); break; }
      case 'magnet': { for (const g of this.gems) g.pull = true; this.addText(p.x, p.y - 24, '자석!', '#ffd1f0', true); break; }
      case 'bomb': {
        const r2 = (this.view.r * 1.1) ** 2;
        for (const e of this.enemies) if (!e.dead && Utils.dist2(e.x, e.y, p.x, p.y) < r2) this.damageEnemy(e, e.boss ? 400 : 99999, 0, 0, true);
        this.shake = 16; Audio_.bomb(); this.addText(p.x, p.y - 24, '폭발!', '#ffb347', true);
        break;
      }
      case 'chest': {
        const pool = this.upgradePool();
        const h = Math.round(p.maxHp * 0.3); p.hp = Math.min(p.maxHp, p.hp + h);
        if (pool.length) {
          const c = Utils.pick(pool); this.applyUpgrade(c);
          const def = c.type === 'weapon' ? WEAPONS[c.key] : PASSIVES[c.key];
          this.announce(`보물상자: ${def.name} ${c.level === 1 ? '획득' : 'Lv.' + c.level}!`);
        } else this.announce('보물상자: 체력 회복!');
        this.burst(it.x, it.y, '#f2c14e', 30);
        break;
      }
    }
  }

  // ── 레벨업 ───────────────────────────────────────────
  upgradePool() {
    const p = this.player, pool = [];
    for (const w of p.weapons) if (w.level < CONFIG.MAX_WEAPON_LEVEL) pool.push({ type: 'weapon', key: w.key, level: w.level + 1 });
    if (p.weapons.length < CONFIG.MAX_WEAPONS)
      for (const k in WEAPONS) if (!p.weapons.find(w => w.key === k)) pool.push({ type: 'weapon', key: k, level: 1 });
    const nPass = Object.keys(p.passives).length;
    for (const k in PASSIVES) {
      const lv = p.passives[k] || 0;
      if (lv > 0 && lv < PASSIVES[k].max) pool.push({ type: 'passive', key: k, level: lv + 1 });
      else if (lv === 0 && nPass < CONFIG.MAX_PASSIVES) pool.push({ type: 'passive', key: k, level: 1 });
    }
    return pool;
  }
  applyUpgrade(c) {
    const p = this.player;
    if (c.type === 'weapon') p.addWeapon(c.key);
    else if (c.type === 'passive') p.addPassive(c.key);
    else if (c.type === 'heal') p.hp = Math.min(p.maxHp, p.hp + 50);
    UI.renderSlots(p);
  }
  openLevelUp() {
    this.pendingLevelUps--;
    this.state = 'levelup';
    Audio_.levelup();
    this.burst(this.player.x, this.player.y, '#ffe08a', 24);
    const choices = Utils.shuffle(this.upgradePool()).slice(0, 3);
    if (!choices.length) choices.push({ type: 'heal' });
    UI.showLevelUp(choices, this.player, c => {
      this.applyUpgrade(c);
      UI.hideLevelUp();
      this.state = 'playing';
    });
  }

  // ── 이펙트 ───────────────────────────────────────────
  addText(x, y, text, color, big) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push(new FloatText(x, y, text, color, big));
  }
  burst(x, y, color, n) {
    if (this.particles.length > 500) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Utils.rand(40, 180);
      this.particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, Utils.rand(0.25, 0.6), color, Utils.rand(2, 4)));
    }
  }
  updateEffects(dt) {
    for (const pt of this.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.92; pt.vy *= 0.92; pt.dead = pt.life <= 0; }
    for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= 0.9; t.dead = t.life <= 0; }
    for (const s of this.slashes) { s.life -= dt; s.dead = s.life <= 0; }
    for (const b of this.bolts) { b.life -= dt; b.dead = b.life <= 0; }
    compact(this.particles); compact(this.texts); compact(this.slashes); compact(this.bolts);
  }

  // ── 렌더링 ───────────────────────────────────────────
  render() {
    const ctx = this.ctx, W = this.view.w, H = this.view.h, z = this.dpr * this.zoom;
    ctx.setTransform(z, 0, 0, z, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let cx, cy;
    if (this.player) { cx = this.cam.x; cy = this.cam.y; }
    else { const t = performance.now() / 1000; cx = t * 18; cy = t * 10; }
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = Utils.rand(-this.shake, this.shake); sy = Utils.rand(-this.shake, this.shake); }
    ctx.translate(Math.round(W / 2 - cx + sx), Math.round(H / 2 - cy + sy));
    ctx.fillStyle = this.groundPattern;
    ctx.fillRect(cx - W / 2 - 40, cy - H / 2 - 40, W + 80, H + 80);

    if (this.player) {
      this.renderWorld(ctx);
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.vignette, 0, 0);
    if (this.player && this.player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,40,60,${this.player.hurtFlash * 0.6})`; ctx.fillRect(0, 0, this.screen.w, this.screen.h);
    }
    if (Input.joy.active) this.renderJoystick(ctx);
  }

  renderWorld(ctx) {
    const p = this.player, now = this.time;
    // 보석·아이템
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i], s = Sprites.item('gem', g.color);
      const bob = Math.sin(now * 4 + g.phase) * 2;
      ctx.drawImage(s.n, Math.round(g.x - s.w / 2), Math.round(g.y - s.h / 2 + bob));
    }
    for (let i = 0; i < this.pickups.length; i++) {
      const it = this.pickups[i], s = Sprites.item(it.kind);
      const bob = Math.sin(now * 3 + it.phase) * 3;
      ctx.drawImage(Sprites.shadow(10), Math.round(it.x - 11), Math.round(it.y + s.h / 2 - 4));
      ctx.drawImage(s.n, Math.round(it.x - s.w / 2), Math.round(it.y - s.h / 2 + bob));
    }
    Weapons.drawUnder(ctx, this);

    // 그림자
    const en = this.enemies;
    for (let i = 0; i < en.length; i++) {
      const e = en[i]; if (e.dead || e.def.ghost) continue;
      const sh = Sprites.shadow(e.radius);
      ctx.drawImage(sh, Math.round(e.x - e.radius - 1), Math.round(e.y + e.radius * 0.9));
    }
    ctx.drawImage(Sprites.shadow(p.radius), Math.round(p.x - p.radius - 1), Math.round(p.y + p.radius * 1.1));

    // 적 (y 정렬)
    const sorted = en.slice().sort((a, b) => a.y - b.y);
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i]; if (e.dead) continue;
      const s = Sprites.enemy(e.type);
      const img = e.flash > 0 ? (e.facing > 0 ? s.nF : s.fF) : (e.facing > 0 ? s.n : s.f);
      const bob = e.swarm ? 0 : Math.sin(now * 8 + e.phase) * 2;
      if (e.def.ghost) ctx.globalAlpha = 0.65 + 0.25 * Math.sin(now * 5 + e.phase);
      if (e.boss && e.chargeState === 1) {
        ctx.strokeStyle = 'rgba(255,80,100,0.8)'; ctx.lineWidth = 6; ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.cdx * 420, e.y + e.cdy * 420); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.drawImage(img, Math.round(e.x - s.w / 2), Math.round(e.y - s.h / 2 + bob));
      if (e.def.ghost) ctx.globalAlpha = 1;
    }

    // 플레이어
    const hs = this.heroSprite;
    const blink = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
    if (!blink) {
      const bob = p.moving ? Math.abs(Math.sin(p.anim)) * -3 : Math.sin(now * 3) * -1;
      ctx.drawImage(p.facing > 0 ? hs.n : hs.f, Math.round(p.x - hs.w / 2), Math.round(p.y - hs.h / 2 + bob));
    }
    // 머리 위 체력바
    const bw = 34, bx = p.x - bw / 2, by = p.y + hs.h / 2 + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#5dff8a' : '#ff5577'; ctx.fillRect(bx, by, bw * Math.max(0, p.hp / p.maxHp), 4);

    Weapons.draw(ctx, this);

    // 파티클
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color; ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    // 데미지 텍스트
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      ctx.globalAlpha = Math.min(1, t.life / t.maxLife * 2);
      ctx.font = (t.big ? 'bold 18px' : 'bold 13px') + ' "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
      ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  renderJoystick(ctx) {
    const j = Input.joy;
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(j.ox, j.oy, j.max, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(j.ox + j.x, j.oy + j.y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
