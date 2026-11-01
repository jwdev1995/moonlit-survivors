'use strict';
function applyDelta(s, d) {
  for (const k in d) {
    if (k.endsWith('Mul')) s[k.slice(0, -3)] *= d[k];
    else s[k] = (s[k] || 0) + d[k];
  }
}

const Weapons = {
  // 레벨 + 플레이어 배율이 반영된 최종 스탯
  stats(w, player) {
    const def = WEAPONS[w.key];
    const s = Object.assign({}, def.base);
    for (let i = 0; i < w.level - 1 && i < def.levels.length; i++) applyDelta(s, def.levels[i]);
    s.cooldown *= player.cdMul;
    s.damage *= player.dmgMul;
    if (s.radius) s.radius *= player.areaMul;
    if (s.width) s.width *= player.areaMul;
    if (s.height) s.height *= player.areaMul;
    if (s.size) s.size *= 1 + (player.areaMul - 1) * 0.5;
    if (s.count !== undefined && w.key !== 'whip' && w.key !== 'aura') s.count += player.extraCount;
    return s;
  },

  update(dt, game) {
    const p = game.player;
    for (const w of p.weapons) {
      const s = this.stats(w, p);
      w.timer -= dt;
      if (w.timer <= 0) { w.timer = s.cooldown; this.fire(w, s, game); }
      if (w.key === 'orbit') this.updateOrbit(w, s, game, dt);
    }
  },

  fire(w, s, game) {
    const p = game.player;
    switch (w.key) {
      case 'bolt': {
        const target = game.nearestEnemy(p.x, p.y, 900);
        const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
        for (let i = 0; i < s.count; i++) {
          const a = ang + (i - (s.count - 1) / 2) * 0.13;
          game.projectiles.push(new Projectile({ x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            damage: s.damage, pierce: s.pierce, size: s.size, kind: 'bolt', color: WEAPONS.bolt.color, life: 2.2 }));
        }
        Audio_.shoot();
        break;
      }
      case 'whip': {
        const dirs = s.count >= 2 ? [p.facing, -p.facing] : [p.facing];
        for (const dir of dirs) {
          const rx = dir > 0 ? p.x + 6 : p.x - 6 - s.width, ry = p.y - s.height / 2;
          game.slashes.push({ x: rx, y: ry, w: s.width, h: s.height, dir, life: 0.22, max: 0.22 });
          const list = game.grid.query(p.x + dir * (s.width / 2 + 6), p.y, s.width / 2 + 40, game.tmp);
          for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (!e.dead && Utils.circleRect(e.x, e.y, e.radius, rx, ry, s.width, s.height)) game.damageEnemy(e, s.damage, dir * 170, 0);
          }
        }
        Audio_.whip();
        break;
      }
      case 'aura': {
        const list = game.grid.query(p.x, p.y, s.radius + 40, game.tmp);
        const r = s.radius;
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const rr = r + e.radius * 0.5;
          if (!e.dead && Utils.dist2(e.x, e.y, p.x, p.y) < rr * rr) game.damageEnemy(e, s.damage, 0, 0, true);
        }
        break;
      }
      case 'axe': {
        for (let i = 0; i < s.count; i++) {
          const dir = i % 2 === 0 ? p.facing : -p.facing;
          game.projectiles.push(new Projectile({ x: p.x, y: p.y - 8, vx: dir * Utils.rand(70, 180), vy: -s.speed * Utils.rand(0.85, 1.05),
            damage: s.damage, pierce: s.pierce, size: s.size, kind: 'axe', color: WEAPONS.axe.color, life: 2.8, gravity: 1100 }));
        }
        Audio_.axe();
        break;
      }
      case 'orbit': {
        w.state.active = s.duration;
        w.state.angle = w.state.angle || Utils.rand(0, Math.PI * 2);
        break;
      }
      case 'lightning': {
        const targets = this.pickVisible(game, s.count);
        for (const t of targets) {
          game.bolts.push({ x: t.x, y: t.y, life: 0.3, max: 0.3, r: s.radius, seed: Math.random() });
          const list = game.grid.query(t.x, t.y, s.radius + 36, game.tmp);
          for (let i = 0; i < list.length; i++) {
            const e = list[i];
            const rr = s.radius + e.radius;
            if (!e.dead && Utils.dist2(e.x, e.y, t.x, t.y) < rr * rr) game.damageEnemy(e, s.damage, 0, 0);
          }
          game.burst(t.x, t.y, WEAPONS.lightning.color, 8);
        }
        if (targets.length) { Audio_.lightning(); game.shake = Math.max(game.shake, 3); }
        break;
      }
    }
  },

  // 화면 안의 적 중 무작위 n마리
  pickVisible(game, n) {
    const out = [], en = game.enemies, p = game.player, r2 = (game.view.r * 0.9) ** 2;
    if (!en.length) return out;
    const used = new Set();
    for (let tries = 0; tries < 40 && out.length < n; tries++) {
      const i = Math.floor(Math.random() * en.length);
      const e = en[i];
      if (e.dead || used.has(i) || Utils.dist2(e.x, e.y, p.x, p.y) > r2) continue;
      used.add(i); out.push(e);
    }
    return out;
  },

  updateOrbit(w, s, game, dt) {
    const st = w.state;
    if (!st.active || st.active <= 0) return;
    st.active -= dt;
    st.angle += s.spin * dt;
    const p = game.player;
    for (let i = 0; i < s.count; i++) {
      const a = st.angle + i * Math.PI * 2 / s.count;
      const bx = p.x + Math.cos(a) * s.radius, by = p.y + Math.sin(a) * s.radius;
      const list = game.grid.query(bx, by, s.size + 36, game.tmp);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        const rr = s.size + e.radius;
        if (!e.dead && Utils.dist2(e.x, e.y, bx, by) < rr * rr && e.canBeHitBy('orb' + i, game.time, 0.45)) {
          game.damageEnemy(e, s.damage, Math.cos(a) * 140, Math.sin(a) * 140);
          game.burst(bx, by, WEAPONS.orbit.color, 2);
        }
      }
    }
  },

  // 적 아래에 그리는 요소 (오라)
  drawUnder(ctx, game) {
    const p = game.player;
    for (const w of p.weapons) {
      if (w.key !== 'aura') continue;
      const s = this.stats(w, p);
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 5);
      ctx.beginPath(); ctx.arc(p.x, p.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(155,255,176,${0.10 + pulse * 0.06})`; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(155,255,176,${0.35 + pulse * 0.3})`; ctx.stroke();
    }
  },

  // 적 위에 그리는 요소 (투사체·칼날·채찍·번개)
  draw(ctx, game) {
    const p = game.player;
    // 채찍
    for (const sl of game.slashes) {
      const t = sl.life / sl.max;
      ctx.save();
      ctx.globalAlpha = t * 0.85;
      const grad = ctx.createLinearGradient(sl.dir > 0 ? sl.x : sl.x + sl.w, 0, sl.dir > 0 ? sl.x + sl.w : sl.x, 0);
      grad.addColorStop(0, 'rgba(255,209,102,0.9)'); grad.addColorStop(1, 'rgba(255,209,102,0.05)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const cx = sl.dir > 0 ? sl.x : sl.x + sl.w, cy = sl.y + sl.h / 2;
      ctx.moveTo(cx, cy - 4);
      ctx.quadraticCurveTo(cx + sl.dir * sl.w * 0.5, cy - sl.h * (1 - t) * 0.9 - 6, cx + sl.dir * sl.w, cy - 2);
      ctx.quadraticCurveTo(cx + sl.dir * sl.w * 0.5, cy + sl.h * (1 - t) * 0.9 + 6, cx, cy + 4);
      ctx.fill();
      ctx.restore();
    }
    // 회전 칼날
    for (const w of p.weapons) {
      if (w.key !== 'orbit' || !w.state.active || w.state.active <= 0) continue;
      const s = this.stats(w, p);
      for (let i = 0; i < s.count; i++) {
        const a = w.state.angle + i * Math.PI * 2 / s.count;
        const bx = p.x + Math.cos(a) * s.radius, by = p.y + Math.sin(a) * s.radius;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = '#e0e0ff';
        ctx.beginPath(); ctx.moveTo(0, -s.size * 1.6); ctx.lineTo(s.size * 0.55, s.size * 0.6); ctx.lineTo(0, s.size * 1.1); ctx.lineTo(-s.size * 0.55, s.size * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a6bff'; ctx.fillRect(-2, s.size * 0.6, 4, s.size * 0.7);
        ctx.restore();
      }
    }
    // 투사체
    for (const pr of game.projectiles) {
      if (pr.kind === 'bolt') {
        ctx.fillStyle = 'rgba(138,215,255,0.35)';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size * 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dff4ff';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size, 0, Math.PI * 2); ctx.fill();
      } else if (pr.kind === 'axe') {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot);
        const s = pr.size;
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-2, -s * 1.3, 4, s * 2.6);
        ctx.fillStyle = '#d9d9e8';
        ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 1.1, -s * 0.9); ctx.lineTo(s * 1.0, s * 0.1); ctx.lineTo(0, -s * 0.1); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    // 번개
    for (const b of game.bolts) {
      const t = b.life / b.max;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(b.x, b.y - 520);
      let seed = b.seed * 1000;
      for (let y = b.y - 480; y < b.y; y += 40) { seed = (seed * 9301 + 49297) % 233280; ctx.lineTo(b.x + (seed / 233280 - 0.5) * 36, y); }
      ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = `rgba(255,243,160,${0.35 * t})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.3 - t * 0.3), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },
};
