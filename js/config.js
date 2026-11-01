'use strict';
// ─────────────────────────────────────────────────────────────
//  게임 밸런스 단일 진실 원천. 수치 튜닝은 이 파일에서만 한다.
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  WIN_TIME: 15 * 60,          // 생존 목표 (초)
  MAX_ENEMIES: 420,
  MAX_WEAPONS: 5,
  MAX_PASSIVES: 4,
  MAX_WEAPON_LEVEL: 6,
  MAX_GEMS: 260,
  PIXEL: 2,                   // 스프라이트 확대 배율
  PLAYER: { hp: 100, speed: 170, radius: 11, pickup: 75, iframes: 0.4 },
  DROP_CHANCE: 0.015,
  xpForLevel(level) { return Math.floor(10 + level * 8 + Math.pow(level, 1.8) * 3); },
  // 시간에 따른 적 강화 배율
  enemyScale(t) {
    const m = t / 60;
    return { hp: 1 + m * 0.12 + Math.pow(m / 10, 2) * 0.5, dmg: 1 + m * 0.05 };
  },
};

const CHARACTERS = {
  knight: { name: '기사 로렌', title: '방패의 수호자', desc: '채찍으로 시작. 최대 체력 +25, 방어력 +1',
    startWeapon: 'whip', hair: '#cfd6e6', body: '#4f7cff', accent: '#ffd166',
    mods: p => { p.maxHp += 25; p.hp = p.maxHp; p.armor += 1; } },
  mage:   { name: '마법사 이든', title: '달빛 서클 수석', desc: '마법 화살로 시작. 쿨다운 -12%, 공격 범위 +10%',
    startWeapon: 'bolt', hair: '#8b4cf0', body: '#3d2a7a', accent: '#8ad7ff',
    mods: p => { p.cdMul *= 0.88; p.areaMul += 0.1; } },
  rogue:  { name: '도적 세라', title: '그림자 길드', desc: '회전 칼날로 시작. 이동 속도 +15%, 획득 범위 +20%',
    startWeapon: 'orbit', hair: '#2a2a3c', body: '#2f7a53', accent: '#e0e0ff',
    mods: p => { p.speedMul += 0.15; p.pickupMul += 0.2; } },
};

// levels[i] : (i+2)레벨이 될 때 적용되는 증분. 키가 Mul로 끝나면 곱연산.
const WEAPONS = {
  bolt: { name: '마법 화살', icon: '✦', color: '#8ad7ff', desc: '가장 가까운 적을 향해 마력탄을 발사합니다.',
    base: { cooldown: 1.1, damage: 10, count: 1, speed: 440, pierce: 1, size: 5 },
    levels: [{ count: 1 }, { damage: 6 }, { cooldownMul: 0.8 }, { count: 1 }, { pierce: 1, damage: 10 }],
    levelText: ['마력탄 +1', '피해 +6', '쿨다운 -20%', '마력탄 +1', '관통 +1, 피해 +10'] },
  whip: { name: '채찍', icon: '〰', color: '#ffd166', desc: '바라보는 방향을 크게 휘둘러 넓은 범위를 베어냅니다.',
    base: { cooldown: 1.35, damage: 15, count: 1, width: 170, height: 46 },
    levels: [{ damage: 8 }, { count: 1 }, { widthMul: 1.25, heightMul: 1.2 }, { damage: 12 }, { cooldownMul: 0.75 }],
    levelText: ['피해 +8', '뒤쪽도 함께 공격', '범위 +25%', '피해 +12', '쿨다운 -25%'] },
  aura: { name: '성수 오라', icon: '◎', color: '#9bffb0', desc: '주변의 적에게 지속적으로 피해를 줍니다.',
    base: { cooldown: 0.5, damage: 4, radius: 72 },
    levels: [{ radiusMul: 1.2 }, { damage: 3 }, { radiusMul: 1.2 }, { damage: 4 }, { cooldownMul: 0.65 }],
    levelText: ['범위 +20%', '피해 +3', '범위 +20%', '피해 +4', '공격 속도 +50%'] },
  axe: { name: '투척 도끼', icon: '⚒', color: '#ffb86b', desc: '위로 던진 도끼가 포물선을 그리며 적을 관통합니다.',
    base: { cooldown: 1.7, damage: 26, count: 1, speed: 520, pierce: 99, size: 10 },
    levels: [{ count: 1 }, { damage: 12 }, { cooldownMul: 0.8 }, { count: 1 }, { damage: 22 }],
    levelText: ['도끼 +1', '피해 +12', '쿨다운 -20%', '도끼 +1', '피해 +22'] },
  orbit: { name: '회전 칼날', icon: '✧', color: '#e0e0ff', desc: '주위를 도는 칼날이 닿는 적을 베어냅니다.',
    base: { cooldown: 4.0, damage: 12, count: 2, radius: 78, duration: 2.6, spin: 3.4, size: 9 },
    levels: [{ count: 1 }, { damage: 8 }, { durationMul: 1.4 }, { count: 1 }, { damage: 14, radiusMul: 1.2 }],
    levelText: ['칼날 +1', '피해 +8', '지속시간 +40%', '칼날 +1', '피해 +14, 반경 +20%'] },
  lightning: { name: '번개', icon: '⚡', color: '#fff3a0', desc: '화면 안의 무작위 적에게 하늘에서 번개를 내리칩니다.',
    base: { cooldown: 2.3, damage: 32, count: 1, radius: 48 },
    levels: [{ count: 1 }, { damage: 16 }, { cooldownMul: 0.78 }, { count: 1 }, { damage: 28, radiusMul: 1.3 }],
    levelText: ['번개 +1', '피해 +16', '쿨다운 -22%', '번개 +1', '피해 +28, 범위 +30%'] },
};

const PASSIVES = {
  heart:  { name: '생명의 심장', icon: '♥', color: '#ff6b8a', desc: '최대 체력 +20', max: 5, apply: p => { p.maxHp += 20; p.hp += 20; } },
  boots:  { name: '질주 장화',   icon: '➤', color: '#8affd0', desc: '이동 속도 +10%', max: 5, apply: p => { p.speedMul += 0.10; } },
  power:  { name: '힘의 룬',     icon: '⚔', color: '#ff9f6b', desc: '모든 피해 +12%', max: 5, apply: p => { p.dmgMul += 0.12; } },
  haste:  { name: '시간의 모래', icon: '⌛', color: '#c9b8ff', desc: '쿨다운 -8%', max: 5, apply: p => { p.cdMul *= 0.92; } },
  lens:   { name: '확장의 렌즈', icon: '◉', color: '#9bd9ff', desc: '공격 범위 +12%', max: 5, apply: p => { p.areaMul += 0.12; } },
  magnet: { name: '자석',        icon: '⊕', color: '#ffd1f0', desc: '획득 범위 +35%', max: 4, apply: p => { p.pickupMul += 0.35; } },
  armor:  { name: '강철 갑옷',   icon: '▣', color: '#cfd6e6', desc: '받는 피해 -2', max: 4, apply: p => { p.armor += 2; } },
  regen:  { name: '회복의 꽃',   icon: '✿', color: '#b0ffb8', desc: '초당 체력 +0.5', max: 5, apply: p => { p.regen += 0.5; } },
  amount: { name: '마력 증폭',   icon: '✚', color: '#ffe08a', desc: '모든 무기 투사체 +1', max: 2, apply: p => { p.extraCount += 1; } },
};

const ENEMIES = {
  bat:      { name: '박쥐',  hp: 9,   speed: 100, dmg: 6,  radius: 9,  xp: 1,  sprite: 'bat',      color: '#6d4fcf', wobble: true },
  zombie:   { name: '좀비',  hp: 24,  speed: 52,  dmg: 10, radius: 12, xp: 2,  sprite: 'zombie',   color: '#6fbf73' },
  skeleton: { name: '해골',  hp: 42,  speed: 68,  dmg: 12, radius: 12, xp: 3,  sprite: 'skeleton', color: '#ece6d6' },
  ghost:    { name: '유령',  hp: 30,  speed: 125, dmg: 8,  radius: 11, xp: 4,  sprite: 'ghost',    color: '#a9ddff', ghost: true },
  golem:    { name: '골렘',  hp: 170, speed: 38,  dmg: 22, radius: 18, xp: 12, sprite: 'golem',    color: '#8d7a66' },
  boss:     { name: '심연의 군주', hp: 2200, speed: 62, dmg: 32, radius: 32, xp: 120, sprite: 'boss',     color: '#d63a52', boss: true },
};

const SPAWN_PHASES = [
  { t: 0,   rate: 1.2, weights: { bat: 6, zombie: 2 } },
  { t: 60,  rate: 2.0, weights: { bat: 5, zombie: 4, skeleton: 1 } },
  { t: 150, rate: 2.8, weights: { bat: 3, zombie: 4, skeleton: 3, ghost: 1 } },
  { t: 300, rate: 3.5, weights: { bat: 1, zombie: 4, skeleton: 4, ghost: 2, golem: 1 } },
  { t: 450, rate: 4.5, weights: { bat: 2, zombie: 3, skeleton: 4, ghost: 3, golem: 2 } },
  { t: 600, rate: 5.5, weights: { zombie: 2, skeleton: 4, ghost: 4, golem: 3 } },
  { t: 780, rate: 7.0, weights: { skeleton: 3, ghost: 4, golem: 4 } },
];

const EVENTS = [
  { t: 90,  type: 'swarm', enemy: 'bat',      count: 40, text: '박쥐 떼가 몰려옵니다!' },
  { t: 240, type: 'swarm', enemy: 'ghost',    count: 30, text: '유령 떼가 몰려옵니다!' },
  { t: 300, type: 'boss',  name: '심연의 군주', hpMul: 1,   text: '보스 출현 — 심연의 군주' },
  { t: 420, type: 'ring',  enemy: 'skeleton', count: 36, text: '해골 군단이 포위합니다!' },
  { t: 600, type: 'boss',  name: '심연의 군주', hpMul: 1.8, text: '보스 출현 — 심연의 군주' },
  { t: 720, type: 'ring',  enemy: 'golem',    count: 14, text: '골렘 군단이 포위합니다!' },
  { t: 810, type: 'boss',  name: '파멸의 공작', hpMul: 3,   text: '최종 보스 출현 — 파멸의 공작' },
];
