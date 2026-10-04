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
function angDiff(a, b) { return Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI); }
function pointInSector(px, py, x, y, r, ang, spread) {
  if (dist2(px, py, x, y) > r * r) return false;
  return angDiff(Math.atan2(py - y, px - x), ang) <= spread / 2;
}
function pointInRotRect(px, py, x, y, w, h, a) {
  const c = Math.cos(-a), s = Math.sin(-a), dx = px - x, dy = py - y;
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}
function circleOverlap(x1, y1, r1, x2, y2, r2) { return dist2(x1, y1, x2, y2) <= (r1 + r2) * (r1 + r2); }

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const UI_FONT = '"Trebuchet MS","Segoe UI",Verdana,sans-serif';
const TITLE_FONT = 'Georgia,"Times New Roman",serif';
let FS = 1; // hệ số phóng chữ UI trên màn hình nhỏ (điện thoại) — đặt trong resize()

function drawEmoji(ctx, e, x, y, size, alpha = 1, label = null) {
  const ch = IconLib.pick(e);
  ctx.save(); ctx.globalAlpha *= alpha;
  if (ch) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  } else {
    drawFallbackIcon(ctx, x, y, size, label);
  }
  ctx.restore();
}

// ===== Emoji fallback: một số máy (WebView Android cũ, trình duyệt in-app) không có
// font emoji màu → fillText vẽ ra ô trống. Kiểm tra từng glyph một lần, nếu thiếu
// thì thay bằng emoji cổ hơn (EMOJI_ALT) hoặc huy hiệu chữ (drawFallbackIcon).
const EMOJI_ALT = { '🪨': '⛰️' }; // 🪨 là emoji 2020 — máy cũ hay thiếu
const IconLib = {
  checked: new Map(),
  ctx2d: null,
  // vẽ glyph so với ký tự PUA (chắc chắn không có font) — giống hệt = thiếu glyph
  renders(ch) {
    if (this.checked.has(ch)) return this.checked.get(ch);
    let ok = true;
    try {
      if (!this.ctx2d) {
        const c = document.createElement('canvas'); c.width = c.height = 36;
        this.ctx2d = c.getContext('2d', { willReadFrequently: true });
      }
      const x = this.ctx2d, S = 36;
      const snap = () => x.getImageData(0, 0, S, S).data;
      x.font = '28px ' + EMOJI_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.clearRect(0, 0, S, S);
      x.fillText(ch, S / 2, S / 2);
      const a = snap();
      x.clearRect(0, 0, S, S);
      x.fillText('\uE0A0', S / 2, S / 2); // Private Use Area → luôn tofu/trống
      const b = snap();
      let px = 0, diff = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] > 50) px++;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 40) diff++;
      }
      ok = px > 4 && diff > 4;
    } catch (err) { ok = true; }
    this.checked.set(ch, ok);
    return ok;
  },
  pick(ch) {
    if (!ch) return null;
    if (this.renders(ch)) return ch;
    const alt = EMOJI_ALT[ch];
    if (alt && this.renders(alt)) return alt;
    return null;
  },
};
function initials(name) {
  const w = String(name).split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[1][0] : String(name).slice(0, 2)).toUpperCase();
}
function drawFallbackIcon(ctx, x, y, size, label) {
  const r = size * 0.52;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.3);
  const g = ctx.createRadialGradient(0, -r * 0.4, 2, 0, 0, r * 1.4);
  g.addColorStop(0, '#3a4a80'); g.addColorStop(1, '#141a30');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(1.5, size * 0.05); ctx.stroke();
  ctx.restore();
  const txt = label ? String(label) : '';
  if (txt) ttext(ctx, txt.length <= 3 ? txt.toUpperCase() : initials(txt), x, y + 1, size * 0.42, '#e8ecf5', 'center', UI_FONT, 1, 'bold');
}
function ttext(ctx, str, x, y, size, color, align = 'center', font = UI_FONT, alpha = 1, weight = '') {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `${weight ? weight + ' ' : ''}${size * FS}px ${font}`;
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
