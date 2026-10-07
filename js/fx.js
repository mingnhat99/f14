'use strict';
// ===== Hệ hiệu ứng kỹ năng (VFX) =====
// Mỗi hiệu ứng là 1 object {type, t, tmax, layer, ...} trong G.fx.
// layer 'ground' vẽ dưới thực thể (pháp trận, vòng đất), còn lại vẽ trên thực thể.
const FX = {
  add(f) {
    f.t = 0;
    if (f.follow) { f.x = f.follow.x; f.y = f.follow.y; }
    G.fx.push(f);
    return f;
  },

  update(dt) {
    for (const f of G.fx) {
      f.t += dt;
      if (f.follow) {
        if (f.follow.alive === false) { f.t = f.tmax; continue; } // chủ nhân gục → tắt
        f.x = f.follow.x; f.y = f.follow.y;
      }
      // hạt phụ kèm theo từng loại
      if (f.type === 'aura' && Math.random() < 0.55) {
        const a = rand(TAU);
        addPart(f.x + Math.cos(a) * (f.r || 32) * 0.7, f.y + rand(-6, 10), rand(-14, 14), rand(-90, -40), f.color, rand(2, 4), 0.5);
      } else if (f.type === 'dome' && Math.random() < 0.35) {
        addPart(f.x + rand(-1, 1) * (f.r || 46) * 0.85, f.y - rand(8, 40), rand(-8, 8), rand(-26, -8), f.color, rand(1.5, 3), 0.5);
      } else if (f.type === 'charge' && Math.random() < 0.5) {
        const a = rand(TAU), rr = (f.r || 34) * 1.4;
        addPart(f.x + Math.cos(a) * rr, f.y - 8 + Math.sin(a) * rr * 0.5, -Math.cos(a) * 70, -Math.sin(a) * 34, f.color, 2, 0.35);
      } else if (f.type === 'vortex' && Math.random() < 0.4) {
        const a = rand(TAU), rr = (f.r || 30) * rand(0.4, 1);
        addPart(f.x + Math.cos(a) * rr, f.y - 12 + Math.sin(a) * rr * 0.5, 0, rand(-50, -20), f.color, rand(1.5, 3), 0.45);
      }
    }
    G.fx = G.fx.filter(f => f.t < f.tmax);
  },

  drawGround(ctx) { for (const f of G.fx) if (f.layer === 'ground') this.drawOne(ctx, f); },
  drawAir(ctx) { for (const f of G.fx) if (f.layer !== 'ground') this.drawOne(ctx, f); },

  drawOne(ctx, f) {
    const k = clamp(f.t / f.tmax, 0, 1);
    switch (f.type) {
      case 'charge': this.charge(ctx, f, k); break;
      case 'pillar': this.pillar(ctx, f, k); break;
      case 'nova': this.nova(ctx, f, k); break;
      case 'bolt': this.bolt(ctx, f, k); break;
      case 'vortex': this.vortex(ctx, f, k); break;
      case 'aura': this.aura(ctx, f, k); break;
      case 'dome': this.dome(ctx, f, k); break;
      case 'trail': this.trail(ctx, f, k); break;
      case 'icestrike': this.icestrike(ctx, f, k); break;
    }
  },

  // ---- đọc thần chú: pháp trận dưới chân + hạt mana hội tụ ----
  charge(ctx, f, k) {
    const r = (f.r || 34) * (0.45 + 0.55 * k);
    ctx.save();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([9, 7]);
    ctx.lineDashOffset = -G.t * 46;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 8, r, r * 0.55, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.28 + 0.26 * Math.sin(G.t * 12);
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 8, r * 0.6, r * 0.33, 0, 0, TAU); ctx.stroke();
    // hạt mana bay vào người
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + G.t * 4.2;
      const rr = (f.r || 34) * 1.5 * (1 - k);
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * rr, f.y - 8 + Math.sin(a) * rr * 0.6, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  // ---- cột sáng dựng đứng (Thánh Quang, heal, hồi sinh) ----
  pillar(ctx, f, k) {
    const h = f.h || 120;
    const a = clamp(k < 0.18 ? k / 0.18 : (1 - k) / 0.82, 0, 1);
    const w = (f.w || 40) * (1 - k * 0.35);
    ctx.save();
    const g = ctx.createLinearGradient(0, f.y, 0, f.y - h);
    g.addColorStop(0, f.color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = a * 0.72;
    ctx.fillStyle = g;
    ctx.fillRect(f.x - w / 2, f.y - h, w, h);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x - w * 0.12, f.y - h, w * 0.24, h);
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 4, w * 0.9, w * 0.36, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  // ---- sóng xung kích: vòng đôi + tia tóe ----
  nova(ctx, f, k) {
    const e = easeOut(k);
    const r = lerp(f.r0, f.r1, e);
    ctx.save();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = Math.max(0.5, (f.w || 6) * (1 - k * 0.6));
    ctx.globalAlpha = (1 - k) * 0.95;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.62, 0, 0, TAU); ctx.stroke();
    const r2 = lerp(f.r0 * 0.5, f.r1 * 0.8, e);
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, r2, r2 * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.globalAlpha = (1 - k) * 0.8;
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10 + 0.3;
      const r3 = r * 0.75, r4 = r3 + 14 + 16 * k;
      ctx.beginPath();
      ctx.moveTo(f.x + Math.cos(a) * r3, f.y - 6 + Math.sin(a) * r3 * 0.55);
      ctx.lineTo(f.x + Math.cos(a) * r4, f.y - 6 + Math.sin(a) * r4 * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  },

  // ---- tia sét giáng từ trời (seed cố định theo khung → giật tự nhiên) ----
  bolt(ctx, f, k) {
    const seed = Math.floor(f.t / 0.05);
    const rnd = i => { const s = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return s - Math.floor(s); };
    ctx.save();
    ctx.globalAlpha = clamp((1 - k) * (0.65 + 0.35 * Math.sin(G.t * 70)), 0, 1);
    ctx.lineJoin = 'round';
    for (const [w, col] of [[9, f.color], [3.5, '#ffffff']]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(f.x + (rnd(0) - 0.5) * 40, f.y - 430);
      for (let i = 1; i <= 6; i++) {
        const px = f.x + (rnd(i) - 0.5) * 56 * (1 - i / 7);
        const py = f.y - 430 + (430 - 8) * i / 6;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(f.x, f.y - 6);
      ctx.stroke();
    }
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 26 * (1 - k) + 8, 12 * (1 - k) + 4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // ---- vòng xoáy gió cuộn quanh mục tiêu (kèm DoT) ----
  vortex(ctx, f, k) {
    ctx.save();
    const a0 = G.t * 5.5;
    for (let i = 0; i < 7; i++) {
      const a = a0 + i * TAU / 7;
      const rr = (f.r || 30) * (0.55 + 0.45 * Math.sin(G.t * 3.4 + i * 1.7));
      const mx = f.x + Math.cos(a) * rr;
      const my = f.y - 12 + Math.sin(a) * rr * 0.5 - 6 * Math.sin(G.t * 2 + i);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.ellipse(mx, my, 4.5, 2.2, a, 0, TAU); ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = (1 - k) * 0.45;
      ctx.beginPath(); ctx.arc(f.x, f.y - 12, rr, a - 0.55, a); ctx.stroke();
    }
    ctx.restore();
  },

  // ---- aura bám theo người (Hỏa Hầu Quyền) ----
  aura(ctx, f, k) {
    const r = f.r || 32;
    const pl = 0.55 + 0.3 * Math.sin(G.t * 6);
    ctx.save();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = pl * (1 - k * 0.2);
    ctx.beginPath(); ctx.arc(f.x, f.y - 4, r, 0, TAU); ctx.stroke();
    const g = ctx.createRadialGradient(f.x, f.y - 4, 4, f.x, f.y - 4, r + 10);
    g.addColorStop(0, f.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = pl * 0.28;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y - 4, r + 10, 0, TAU); ctx.fill();
    ctx.restore();
  },

  // ---- vòm khiên bán cầu (Thánh Khiên Bất Diệt) ----
  dome(ctx, f, k) {
    const r = f.r || 46;
    const fade = clamp(k < 0.1 ? k / 0.1 : (1 - k) * 5, 0, 1);
    const pulse = 0.6 + 0.3 * Math.sin(G.t * 7);
    ctx.save();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 4.5;
    ctx.globalAlpha = fade * pulse;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 4, r, r * 0.92, 0, Math.PI, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.globalAlpha = fade * pulse * 0.6;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 4, r * 0.82, r * 0.75, 0, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = f.color;
    ctx.globalAlpha = fade * 0.1;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 4, r, r * 0.92, 0, Math.PI, TAU); ctx.fill();
    // vòng rune quay dưới chân
    ctx.globalAlpha = fade * 0.7;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = G.t * 55;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 8, r * 0.95, r * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },

  // ---- vệt lao + bóng mờ dọc đường bay (Phong Thần Cước) ----
  trail(ctx, f, k) {
    ctx.save();
    ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(f.x, f.y, f.x1, f.y1);
    g.addColorStop(0, f.color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(1, (f.w || 18) * (1 - k * 0.5));
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x1, f.y1); ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const kk = i / 5;
      ctx.globalAlpha = (1 - k) * 0.28;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(lerp(f.x, f.x1, kk), lerp(f.y, f.y1, kk) - 4, 15 - i * 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  // ---- mưa mũi băng rơi xuống mục tiêu (Băng Thuật) ----
  icestrike(ctx, f, k) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const start = i * 0.1;
      const ki = clamp((k - start) / 0.55, 0, 1);
      const bx = f.x + (i - 1) * 22;
      if (ki >= 1) {
        // vỡ băng dưới đất
        const ka = clamp(1 - (k - (start + 0.55)) / 0.3, 0, 1);
        if (ka <= 0) continue;
        ctx.globalAlpha = ka * 0.8;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.5;
        for (let s = 0; s < 4; s++) {
          const a = s * TAU / 4 + 0.4;
          ctx.beginPath();
          ctx.moveTo(bx, f.y);
          ctx.lineTo(bx + Math.cos(a) * 13, f.y + Math.sin(a) * 8 - 6);
          ctx.stroke();
        }
      } else if (ki > 0) {
        const sy = lerp(f.y - 250, f.y - 6, easeOut(ki));
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.translate(bx, sy);
        ctx.rotate(Math.PI / 4);
        const g = ctx.createLinearGradient(-8, -8, 8, 8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, f.color);
        ctx.fillStyle = g;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = '#e8f8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();
      }
    }
    ctx.restore();
  },
};
