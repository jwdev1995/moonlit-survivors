'use strict';
// DOM 기반 HUD / 화면 전환
const UI = {
  game: null, el: {}, selectedChar: 'knight', cardHandler: null, cards: [],
  $(id) { return document.getElementById(id); },
  init(game) {
    this.game = game;
    ['hud', 'xp-fill', 'xp-level', 'timer', 'kills', 'hp-fill', 'hp-text', 'weapon-slots', 'passive-slots',
     'boss-bar', 'boss-fill', 'boss-name', 'announce', 'screen-title', 'screen-levelup', 'screen-pause', 'screen-end',
     'cards', 'char-list', 'best-record', 'end-title', 'end-stats', 'pause-build', 'btn-mute', 'btn-pause']
      .forEach(id => this.el[id] = this.$(id));
    this.buildTitle();
    this.$('btn-start').addEventListener('click', () => this.startGame());
    this.$('btn-resume').addEventListener('click', () => game.togglePause());
    this.$('btn-pause-title').addEventListener('click', () => this.toTitle());
    this.$('btn-retry').addEventListener('click', () => this.startGame());
    this.$('btn-end-title').addEventListener('click', () => this.toTitle());
    this.el['btn-pause'].addEventListener('click', () => game.togglePause());
    this.el['btn-mute'].addEventListener('click', () => this.toggleMute());
    try { if (localStorage.getItem('ms_muted') === '1') this.el['btn-mute'].classList.add('off'); } catch (e) {}
    // 버튼 포커스가 남아 Space/Enter가 버튼을 다시 누르는 것을 방지
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  },
  startGame() {
    Audio_.init(); Audio_.resume();
    this.hideScreens();
    this.game.start(this.selectedChar);
  },
  toTitle() {
    this.hideScreens();
    this.game.state = 'title'; this.game.player = null;
    this.el.hud.classList.add('hidden');
    this.buildTitle();
    this.el['screen-title'].classList.remove('hidden');
  },
  hideScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); },
  toggleMute() {
    Audio_.init();
    const m = Audio_.toggleMute();
    this.el['btn-mute'].classList.toggle('off', m);
  },

  buildTitle() {
    const list = this.el['char-list']; list.innerHTML = '';
    for (const key in CHARACTERS) {
      const c = CHARACTERS[key];
      const card = document.createElement('button');
      card.className = 'char-card' + (key === this.selectedChar ? ' selected' : '');
      card.innerHTML = `<canvas class="char-portrait" width="64" height="64"></canvas>
        <div class="char-name">${c.name}</div><div class="char-title">${c.title}</div><div class="char-desc">${c.desc}</div>`;
      const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
      const s = Sprites.hero(key); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(s.n, 0, 0, s.w, s.h, 32 - s.w, 32 - s.h, s.w * 2, s.h * 2);
      card.addEventListener('click', () => {
        this.selectedChar = key;
        list.querySelectorAll('.char-card').forEach(e => e.classList.remove('selected'));
        card.classList.add('selected');
      });
      list.appendChild(card);
    }
    const b = this.game.best;
    this.el['best-record'].textContent = b.time > 0
      ? `최고 기록 — 생존 ${Utils.formatTime(b.time)} · 처치 ${b.kills} · Lv.${b.level}${b.wins ? ` · 승리 ${b.wins}회` : ''}`
      : '아직 기록이 없습니다. 15분을 버텨보세요!';
  },

  showHud() { this.el.hud.classList.remove('hidden'); this.el['boss-bar'].classList.add('hidden'); },
  updateHud(game) {
    const p = game.player;
    this.el.timer.textContent = Utils.formatTime(game.time);
    this.el.kills.textContent = '☠ ' + p.kills;
    this.el['xp-fill'].style.width = Math.min(100, p.xp / p.xpNext * 100) + '%';
    this.el['xp-level'].textContent = 'Lv.' + p.level;
    this.el['hp-fill'].style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    this.el['hp-text'].textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const bb = this.el['boss-bar'];
    if (game.boss && !game.boss.dead) {
      bb.classList.remove('hidden');
      this.el['boss-fill'].style.width = Math.max(0, game.boss.hp / game.boss.maxHp * 100) + '%';
      this.el['boss-name'].textContent = game.boss.name;
    } else bb.classList.add('hidden');
  },
  renderSlots(p) {
    const ws = this.el['weapon-slots'], ps = this.el['passive-slots'];
    ws.innerHTML = p.weapons.map(w => {
      const d = WEAPONS[w.key];
      return `<div class="slot" style="--c:${d.color}" title="${d.name}"><span class="icon">${d.icon}</span><span class="lv">${w.level}</span></div>`;
    }).join('');
    ps.innerHTML = Object.keys(p.passives).map(k => {
      const d = PASSIVES[k];
      return `<div class="slot passive" style="--c:${d.color}" title="${d.name}"><span class="icon">${d.icon}</span><span class="lv">${p.passives[k]}</span></div>`;
    }).join('');
  },
  announce(text) {
    const a = this.el.announce;
    a.textContent = text; a.classList.remove('hidden');
    a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop');
    clearTimeout(this._annT);
    this._annT = setTimeout(() => a.classList.add('hidden'), 2600);
  },

  showLevelUp(choices, player, onPick) {
    const box = this.el.cards; box.innerHTML = '';
    this.cardHandler = onPick; this.cards = [];
    choices.forEach((c, i) => {
      let icon, name, tag, desc, color;
      if (c.type === 'weapon') {
        const d = WEAPONS[c.key]; icon = d.icon; name = d.name; color = d.color;
        tag = c.level === 1 ? 'NEW' : `Lv.${c.level - 1} → ${c.level}`;
        desc = c.level === 1 ? d.desc : d.levelText[c.level - 2];
      } else if (c.type === 'passive') {
        const d = PASSIVES[c.key]; icon = d.icon; name = d.name; color = d.color;
        tag = c.level === 1 ? 'NEW' : `Lv.${c.level - 1} → ${c.level}`; desc = d.desc;
      } else { icon = '♥'; name = '응급 치료'; tag = ''; desc = '체력 +50'; color = '#ff6b8a'; }
      const card = document.createElement('button');
      card.className = 'card' + (c.type === 'passive' ? ' passive' : '');
      card.style.setProperty('--c', color);
      card.innerHTML = `<div class="card-key">${i + 1}</div><div class="card-icon">${icon}</div>
        <div class="card-name">${name}</div><div class="card-tag">${tag}</div><div class="card-desc">${desc}</div>`;
      card.addEventListener('click', () => this.chooseCard(i));
      box.appendChild(card); this.cards.push(c);
    });
    this.el['screen-levelup'].classList.remove('hidden');
  },
  chooseCard(i) {
    if (this.game.state !== 'levelup' || !this.cardHandler || !this.cards[i]) return;
    const h = this.cardHandler; this.cardHandler = null;
    h(this.cards[i]);
  },
  hideLevelUp() { this.el['screen-levelup'].classList.add('hidden'); },
  confirm() {
    if (this.game.state === 'title') this.startGame();
    else if (this.game.state === 'gameover') this.startGame();
  },

  showPause(game) {
    const p = game.player;
    this.el['pause-build'].innerHTML =
      p.weapons.map(w => `<li><span style="color:${WEAPONS[w.key].color}">${WEAPONS[w.key].icon}</span> ${WEAPONS[w.key].name} Lv.${w.level}</li>`).join('') +
      Object.keys(p.passives).map(k => `<li><span style="color:${PASSIVES[k].color}">${PASSIVES[k].icon}</span> ${PASSIVES[k].name} Lv.${p.passives[k]}</li>`).join('');
    this.el['screen-pause'].classList.remove('hidden');
  },
  hidePause() { this.el['screen-pause'].classList.add('hidden'); },

  showEnd(game, win) {
    const p = game.player, b = game.best;
    this.el['end-title'].textContent = win ? '🌙 새벽이 밝았다 — 승리!' : '쓰러졌다…';
    this.el['end-title'].className = win ? 'win' : 'lose';
    this.el['end-stats'].innerHTML = `
      <div><span>생존 시간</span><b>${Utils.formatTime(game.time)}</b></div>
      <div><span>처치</span><b>${p.kills}</b></div>
      <div><span>레벨</span><b>${p.level}</b></div>
      <div><span>캐릭터</span><b>${CHARACTERS[p.charKey].name}</b></div>
      <div class="wide"><span>최고 기록</span><b>${Utils.formatTime(b.time)} · ${b.kills}킬 · Lv.${b.level}</b></div>`;
    this.el['screen-end'].classList.remove('hidden');
  },
};
