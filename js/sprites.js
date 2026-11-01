'use strict';
// 픽셀 스프라이트 정의 ('.' = 투명). 캔버스에 미리 렌더링해 캐시한다.
const PIXEL_ART = {
  hero: {
    rows: [
      '......HHHH......',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HSSSSSSH....',
      '....SSESSESS....',
      '.....SSSSSS.....',
      '......SSSS......',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..SBBBWWWWBBBS..',
      '..S.BBBBBBBB.S..',
      '....BBBBBBBB....',
      '....LLL..LLL....',
      '....LLL..LLL....',
      '...DDDD..DDDD...',
    ],
    colors: { S: '#f3c9a6', E: '#2b2340', L: '#2f2f44', D: '#1c1c2a' },
  },
  bat: {
    rows: [
      '1..............1',
      '11............11',
      '111...1111...111',
      '1111.122221.1111',
      '1111122222211111',
      '.11112E22E2111..',
      '..1112222222111.',
      '...11.2222.11...',
      '......2..2......',
    ],
    colors: { 1: '#6d4fcf', 2: '#3b2a6e', E: '#ff5b7a' },
  },
  zombie: {
    rows: [
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '...GGEEGGGEEG...',
      '...GGGGGGGGGG...',
      '...GGGMMMMGGG...',
      '....GGGGGGGG....',
      '..CCCCCCCCCCCC..',
      '.GGCCCCCCCCCCGG.',
      '.GG.CCCCCCCC.GG.',
      '....CCCCCCCC....',
      '....CCCCCCCC....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '...DDDD..DDDD...',
    ],
    colors: { G: '#6fbf73', E: '#b3122e', M: '#2b4a2d', C: '#6b4b3a', P: '#3a3a52', D: '#1c1c2a' },
  },
  skeleton: {
    rows: [
      '....WWWWWWWW....',
      '...WWWWWWWWWW...',
      '...WWKKWWWKKW...',
      '...WWWWWWWWWW...',
      '....WKWKWKWK....',
      '.....WWWWWW.....',
      '..W.WWWWWWWW.W..',
      '..W.W.WWWW.W.W..',
      '..W.WWWWWWWW.W..',
      '..WWW.WWWW.WWW..',
      '....WWWWWWWW....',
      '.....WW..WW.....',
      '.....WW..WW.....',
      '....WWW..WWW....',
    ],
    colors: { W: '#ece6d6', K: '#2a2538' },
  },
  ghost: {
    rows: [
      '.....AAAAAA.....',
      '....AAAAAAAA....',
      '...AAAAAAAAAA...',
      '...AAKKAAAKKA...',
      '...AAKKAAAKKA...',
      '...AAAAAAAAAA...',
      '...AAAAOOAAAA...',
      '...AAAAAAAAAA...',
      '...AAAAAAAAAA...',
      '...AAAAAAAAAA...',
      '...AAAAAAAAAA...',
      '...AA.AAAA.AA...',
      '...A...AA...A...',
    ],
    colors: { A: '#a9ddff', K: '#24346b', O: '#4d6fb8' },
  },
  golem: {
    rows: [
      '......RRRRRRRR......',
      '.....RRRRRRRRRR.....',
      '.....RRYYRRRRYY.....',
      '.....RRRRRRRRRR.....',
      '......RRRRRRRR......',
      '..RRRRRRRRRRRRRRRR..',
      '.RRRRRRRRRRRRRRRRRR.',
      '.RRRRRMMMMMMMMRRRRR.',
      '.RRRRRMMMMMMMMRRRRR.',
      '.RRR.RMMMMMMMMR.RRR.',
      '.RRR.RRRRRRRRRR.RRR.',
      '.RRR.RRRRRRRRRR.RRR.',
      'RRRR..RRRRRRRR..RRRR',
      '......RRRRRRRR......',
      '......RRR..RRR......',
      '......RRR..RRR......',
      '.....RRRR..RRRR.....',
      '.....RRRR..RRRR.....',
    ],
    colors: { R: '#8d7a66', M: '#5e7a4a', Y: '#ffd93d' },
  },
  boss: {
    rows: [
      '..HH..............HH..',
      '..HHH............HHH..',
      '...HHH..........HHH...',
      '....HHRRRRRRRRRRHH....',
      '.....RRRRRRRRRRRR.....',
      '....RRRRRRRRRRRRRR....',
      '....RRYYRRRRRRYYRR....',
      '....RRYYRRRRRRYYRR....',
      '....RRRRRRRRRRRRRR....',
      '.....RRWWRRRRWWRR.....',
      '......RRRRRRRRRR......',
      '...RRRRRRRRRRRRRRRR...',
      '..RRRRRRRRRRRRRRRRRR..',
      '.RRRRRRRRRRRRRRRRRRRR.',
      '.RRR.RRRRRRRRRRRR.RRR.',
      '.RRR.RRRRKKKKRRRR.RRR.',
      '.RRR.RRRRKKKKRRRR.RRR.',
      '.RRR..RRRRRRRRRR..RRR.',
      'RRRR..RRRRRRRRRR..RRRR',
      '......RRRRRRRRRR......',
      '......RRRR..RRRR......',
      '......RRRR..RRRR......',
      '.....RRRRR..RRRRR.....',
      '.....RRRRR..RRRRR.....',
    ],
    colors: { H: '#3a1f2e', R: '#d63a52', Y: '#ffe95c', W: '#fff4e0', K: '#7a1f33' },
  },
  gem: {
    rows: ['....G....', '...GLG...', '..GLLLG..', '.GLLLLLG.', 'GGGGGGGGG', '.GGGGGGG.', '..GGGGG..', '...GGG...', '....G....'],
    colors: {},
  },
  heart: {
    rows: ['.HH...HH.', 'HLHH.HHHH', 'HHHHHHHHH', 'HHHHHHHHH', '.HHHHHHH.', '..HHHHH..', '...HHH...', '....H....'],
    colors: { H: '#ff4d6d', L: '#ffb3c1' },
  },
  magnet: {
    rows: ['RRR...BBB', 'RRR...BBB', 'RRR...RRR', 'RRR...RRR', 'RRR...RRR', 'RRRR.RRRR', '.RRRRRRR.', '..RRRRR..'],
    colors: { R: '#ff6b6b', B: '#6bb8ff' },
  },
  bomb: {
    rows: ['......FF.', '.....F...', '....KK...', '..KKKKKK.', '.KKKKKKKK', '.KKWKKKKK', '.KKKKKKKK', '.KKKKKKKK', '..KKKKKK.', '...KKKK..'],
    colors: { F: '#ffb347', K: '#2a2a3a', W: '#8c8ca8' },
  },
  chest: {
    rows: ['.GGGGGGGGGG.', 'GBBBBBBBBBBG', 'GBBBBBBBBBBG', 'GGGGGGGGGGGG', 'GBBBBYYBBBBG', 'GBBBBYYBBBBG', 'GBBBBBBBBBBG', 'GBBBBBBBBBBG', '.GGGGGGGGGG.'],
    colors: { G: '#f2c14e', B: '#7a4b2a', Y: '#ffe95c' },
  },
};

const Sprites = {
  cache: new Map(),
  // rows + colors → 캔버스
  render(rows, colors, scale, flip = false, flash = false) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        ctx.fillStyle = flash ? '#ffffff' : (colors[ch] || '#ff00ff');
        const px = flip ? (w - 1 - x) : x;
        ctx.fillRect(px * scale, y * scale, scale, scale);
      }
    }
    return c;
  },
  // 캐릭터/적 세트: 정방향·반전·플래시 버전
  set(key, rows, colors, scale) {
    if (this.cache.has(key)) return this.cache.get(key);
    const s = {
      n: this.render(rows, colors, scale, false, false),
      f: this.render(rows, colors, scale, true, false),
      nF: this.render(rows, colors, scale, false, true),
      fF: this.render(rows, colors, scale, true, true),
    };
    s.w = s.n.width; s.h = s.n.height;
    this.cache.set(key, s);
    return s;
  },
  enemy(type) {
    const d = ENEMIES[type], art = PIXEL_ART[d.sprite];
    const scale = d.boss ? 3 : CONFIG.PIXEL;
    return this.set('enemy:' + type, art.rows, art.colors, scale);
  },
  hero(charKey) {
    const c = CHARACTERS[charKey], art = PIXEL_ART.hero;
    const colors = Object.assign({}, art.colors, { H: c.hair, B: c.body, W: c.accent });
    return this.set('hero:' + charKey, art.rows, colors, CONFIG.PIXEL);
  },
  item(key, color) {
    const art = PIXEL_ART[key];
    const colors = Object.assign({}, art.colors);
    if (key === 'gem') { colors.G = color; colors.L = '#ffffff'; }
    return this.set('item:' + key + ':' + (color || ''), art.rows, colors, CONFIG.PIXEL);
  },
  shadow(r) {
    const key = 'shadow:' + r;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas');
    c.width = r * 2 + 2; c.height = r + 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(r + 1, r / 2 + 1, r, r / 2, 0, 0, Math.PI * 2); ctx.fill();
    this.cache.set(key, c);
    return c;
  },
  // 바닥 타일 패턴
  ground() {
    if (this.cache.has('ground')) return this.cache.get('ground');
    const size = 128;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1b2233'; ctx.fillRect(0, 0, size, size);
    // 결정적 난수로 풀/돌 점 찍기
    let seed = 1337;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
      ctx.fillStyle = rnd() < 0.5 ? '#202a3f' : '#17202f';
      ctx.fillRect(x, y, 2 + Math.floor(rnd() * 3), 2);
    }
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
      ctx.fillStyle = '#28405a';
      ctx.fillRect(x, y, 2, 4); ctx.fillRect(x + 3, y + 1, 2, 3); ctx.fillRect(x - 3, y + 2, 2, 2);
    }
    this.cache.set('ground', c);
    return c;
  },
};
