'use strict';
const Spawner = {
  credit: 0, eventIdx: 0,
  reset() { this.credit = 0; this.eventIdx = 0; },
  phase(t) { let ph = SPAWN_PHASES[0]; for (const p of SPAWN_PHASES) if (t >= p.t) ph = p; return ph; },
  update(dt, game) {
    const t = game.time, ph = this.phase(t);
    this.credit += ph.rate * dt;
    while (this.credit >= 1) {
      this.credit -= 1;
      if (game.enemies.length >= CONFIG.MAX_ENEMIES) continue;
      const pos = this.ringPos(game);
      game.spawnEnemy(Utils.weightedPick(ph.weights), pos.x, pos.y);
    }
    while (this.eventIdx < EVENTS.length && t >= EVENTS[this.eventIdx].t) {
      this.runEvent(EVENTS[this.eventIdx], game);
      this.eventIdx++;
    }
  },
  ringPos(game, angle) {
    const a = angle === undefined ? Math.random() * Math.PI * 2 : angle;
    const r = game.view.r + 60 + Math.random() * 40;
    return { x: game.player.x + Math.cos(a) * r, y: game.player.y + Math.sin(a) * r };
  },
  runEvent(ev, game) {
    game.announce(ev.text);
    const p = game.player;
    if (ev.type === 'swarm') {
      const a = Math.random() * Math.PI * 2;
      const dx = -Math.cos(a), dy = -Math.sin(a);     // 플레이어 쪽으로
      const px = -dy, py = dx;                        // 수직 방향
      for (let i = 0; i < ev.count; i++) {
        const off = (i - ev.count / 2) * 30, back = Math.random() * 140;
        const r = game.view.r + 90 + back;
        game.spawnEnemy(ev.enemy, p.x + Math.cos(a) * r + px * off, p.y + Math.sin(a) * r + py * off, { swarm: { dx, dy } });
      }
    } else if (ev.type === 'ring') {
      for (let i = 0; i < ev.count; i++) {
        const pos = this.ringPos(game, i / ev.count * Math.PI * 2);
        game.spawnEnemy(ev.enemy, pos.x, pos.y);
      }
    } else if (ev.type === 'boss') {
      const pos = this.ringPos(game);
      const b = game.spawnEnemy('boss', pos.x, pos.y, { hpMul: ev.hpMul, name: ev.name });
      game.boss = b;
      game.shake = Math.max(game.shake, 12);
      Audio_.boss();
    }
  },
};
