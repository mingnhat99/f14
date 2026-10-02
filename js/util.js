'use strict';
// ===== Tiện ích toán học & vẽ =====
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const ang = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function pointInCircle(px, py, x, y, r) { return dist2(px, py, x, y) <= r * r; }
function pointInAnnulus(px, py, x, y, r1, r2) { const d = dist(px, py, x, y); return d >= r1 && d <= r2; }
function pointInRotRect(px, py, x, y, w, h, a) {
  const c = Math.cos(-a), s = Math.sin(-a), dx = px - x, dy = py - y;
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}
function circleOverlap(x1, y1, r1, x2, y2, r2) { return dist2(x1, y1, x2, y2) <= (r1 + r2) * (r1 + r2); }

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const UI_FONT = '"Trebuchet MS","Segoe UI",Verdana,sans-serif';
const TITLE_FONT = 'Georgia,"Times New Roman",serif';

function drawEmoji(ctx, e, x, y, size, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y); ctx.restore();
}
function ttext(ctx, str, x, y, size, color, align = 'center', font = UI_FONT, alpha = 1, weight = '') {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `${weight ? weight + ' ' : ''}${size}px ${font}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y); ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function cdPie(ctx, x, y, r, frac) { // phủ tối phần cooldown còn lại
  if (frac <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x, y);
  ctx.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.closePath();
  ctx.fillStyle = 'rgba(8,11,22,0.78)'; ctx.fill(); ctx.restore();
}
// ===== Tham số URL =====
const Q = new URLSearchParams(location.search);
