'use strict';
const Utils = {
  rand(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  weightedPick(weights) {
    let total = 0; for (const k in weights) total += weights[k];
    let r = Math.random() * total;
    for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  formatTime(s) {
    s = Math.max(0, Math.floor(s));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  // 원과 축정렬 사각형 교차
  circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Utils.clamp(cx, rx, rx + rw), ny = Utils.clamp(cy, ry, ry + rh);
    return Utils.dist2(cx, cy, nx, ny) <= r * r;
  },
};

// 적 충돌 가속용 공간 해시 (매 프레임 재구성)
class SpatialHash {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  insert(e) {
    const k = Math.floor(e.x / this.cell) * 100000 + Math.floor(e.y / this.cell);
    let b = this.map.get(k);
    if (!b) { b = []; this.map.set(k, b); }
    b.push(e);
  }
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const b = this.map.get(cx * 100000 + cy);
      if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
    }
    return out;
  }
}
