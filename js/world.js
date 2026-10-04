'use strict';
// ===== Thế giới: địa hình, chướng ngại, cổng, camera, minimap, vẽ thực thể =====
const World = {
  obstacles: [], lavas: [], cracks: [], decor: [], groundPattern: null, embers: [],
  npc: { x: 250, y: 640, icon: '👩', name: 'Minfilia' },

  build() {
    // đá chướng ngại (né trục đường chính)
    const O = [
      [380, 380, 46], [300, 1180, 52], [470, 1420, 38], [170, 900, 34],
      [700, 300, 40], [640, 1300, 44], [900, 1180, 34], [960, 260, 46],
      [1180, 420, 38], [1240, 1240, 42], [1420, 300, 34], [1560, 1350, 40],
      [1900, 380, 44], [1950, 1250, 38], [2380, 300, 36], [2380, 1300, 36],
      [2920, 300, 40], [2920, 1300, 40], [3050, 700, 36], [3050, 900, 36],
      [2700, 380, 30], [2600, 1220, 30],
    ];
    // vòng đá quanh đấu trường
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + 0.12;
      O.push([MAP.arena.x + Math.cos(a) * (MAP.arena.r + 40), MAP.arena.y + Math.sin(a) * (MAP.arena.r + 40), randi(34, 52)]);
    }
    // vòng đá quanh đấu trường Titan + hầm dẫn vào
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + 0.3;
      O.push([MAP.titanArena.x + Math.cos(a) * (MAP.titanArena.r + 40), MAP.titanArena.y + Math.sin(a) * (MAP.titanArena.r + 40), randi(34, 52)]);
    }
    O.push([3260, 380, 42], [3260, 1220, 42], [3420, 300, 36], [3420, 1300, 36],
           [3560, 380, 38], [3560, 1220, 38], [3820, 240, 34], [3820, 1360, 34]);
    this.obstacles = O.map(([x, y, r]) => ({ x, y, r }));

    this.lavas = [
      { x: 830, y: 950, r: 60 }, { x: 1290, y: 520, r: 48 }, { x: 1650, y: 320, r: 66 },
      { x: 1870, y: 1180, r: 52 }, { x: 2320, y: 800, r: 40 }, { x: 2850, y: 1050, r: 58 },
    ];
    this.cracks = [
      [560, 200, 900, 480], [1100, 1400, 1500, 1150], [1700, 100, 2000, 500],
      [2150, 1500, 2600, 1350], [2450, 250, 2900, 420], [700, 900, 520, 1400],
    ];
    this.decor = [
      { icon: '🦴', x: 620, y: 760, s: 22 }, { icon: '🦴', x: 1340, y: 900, s: 18 },
      { icon: '🥀', x: 1000, y: 620, s: 20 }, { icon: '🥀', x: 1520, y: 1100, s: 20 },
      { icon: '⛰️', x: 120, y: 500, s: 40 }, { icon: '⛰️', x: 3100, y: 1450, s: 44 },
      { icon: '🔥', x: 2520, y: 620, s: 24 }, { icon: '🔥', x: 2780, y: 1000, s: 24 },
      { icon: '⛰️', x: 3350, y: 800, s: 40 }, { icon: '⛰️', x: 4560, y: 1450, s: 44 },
    ];
    // pattern nền
    const tile = document.createElement('canvas');
    tile.width = 256; tile.height = 256;
    const t = tile.getContext('2d');
    t.fillStyle = '#46281f'; t.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 130; i++) {
      t.fillStyle = Math.random() < 0.5 ? 'rgba(30,15,12,0.35)' : 'rgba(90,52,40,0.3)';
      const s = rand(2, 7);
      t.fillRect(rand(256), rand(256), s, s * 0.7);
    }
    t.strokeStyle = 'rgba(25,12,10,0.4)'; t.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      t.beginPath();
      let x = rand(256), y = rand(256);
      t.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += rand(-50, 50); y += rand(-50, 50); t.lineTo(x, y); }
      t.stroke();
    }
    this.groundPattern = G.ctx.createPattern(tile, 'repeat');

    this.embers = [];
    for (let i = 0; i < 36; i++) this.embers.push({ x: rand(MAP.w), y: rand(MAP.h), s: rand(1.5, 3.5), v: rand(12, 34), ph: rand(TAU) });

    // cổng
    G.gates = [
      { id: 'start', x: MAP.barrierX, closed: true, anim: 1 },
      { id: 'boss', x: MAP.arenaGateX, closed: true, anim: 1 },
      { id: 'titan', x: MAP.titanGateX, closed: true, anim: 1 },
    ];
  },

  update(dt) {
    for (const e of this.embers) {
      e.y -= e.v * dt; e.x += Math.sin(G.t * 1.5 + e.ph) * 10 * dt;
      if (e.y < -10) { e.y = MAP.h + 10; e.x = rand(MAP.w); }
    }
    for (const g of G.gates) g.anim = clamp(g.anim + (g.closed ? dt * 2 : -dt * 2), 0, 1);
  },

  drawGround(ctx) {
    const cam = G.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = this.groundPattern;
    ctx.fillRect(cam.x, cam.y, G.VW, G.VH);
    // đấu trường boss
    const A = MAP.arena;
    const g1 = ctx.createRadialGradient(A.x, A.y, A.r * 0.2, A.x, A.y, A.r);
    g1.addColorStop(0, 'rgba(70,18,10,0.75)');
    g1.addColorStop(1, 'rgba(30,10,8,0.4)');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.ellipse(A.x, A.y, A.r, A.r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,50,0.35)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(A.x, A.y, A.r - 22, (A.r - 22) * 0.9, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(217,196,143,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(A.x, A.y, A.r * 0.55, A.r * 0.5, 0, 0, TAU); ctx.stroke();
    // đấu trường Titan
    const TA = MAP.titanArena;
    const gt = ctx.createRadialGradient(TA.x, TA.y, TA.r * 0.2, TA.x, TA.y, TA.r);
    gt.addColorStop(0, 'rgba(72,64,52,0.75)');
    gt.addColorStop(1, 'rgba(30,26,20,0.4)');
    ctx.fillStyle = gt;
    ctx.beginPath(); ctx.ellipse(TA.x, TA.y, TA.r, TA.r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(217,196,143,0.3)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(TA.x, TA.y, TA.r - 22, (TA.r - 22) * 0.9, 0, 0, TAU); ctx.stroke();
    // FATE zone
    if (G.fate.active || G.fate.cooldown < 12) {
      const F = MAP.fateZone;
      const a = G.fate.active ? 0.5 : 0.2;
      ctx.strokeStyle = `rgba(110,160,255,${a})`;
      ctx.setLineDash([16, 12]); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(F.x, F.y, F.r, F.r * 0.7, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // vết nứt nóng
    ctx.lineWidth = 3;
    for (const [x1, y1, x2, y2] of this.cracks) {
      const gl = 0.5 + 0.3 * Math.sin(G.t * 2 + x1);
      ctx.strokeStyle = `rgba(255,110,40,${gl * 0.5})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // hồ dung nham
    for (const l of this.lavas) {
      const gl = 0.65 + 0.25 * Math.sin(G.t * 1.7 + l.x);
      const g2 = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      g2.addColorStop(0, `rgba(255,190,60,${gl})`);
      g2.addColorStop(0.6, `rgba(255,100,30,${gl * 0.8})`);
      g2.addColorStop(1, 'rgba(120,30,10,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.62, 0, 0, TAU); ctx.fill();
    }
    // trang trí
    for (const d of this.decor) drawEmoji(ctx, d.icon, d.x, d.y, d.s, 0.85);
    // đá
    for (const o of this.obstacles) this.drawRock(ctx, o);
    ctx.restore();
  },
  drawRock(ctx, o) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(o.x + 4, o.y + o.r * 0.42, o.r * 1.05, o.r * 0.42, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r);
    g.addColorStop(0, '#7d6355'); g.addColorStop(1, '#4a382f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(o.x - o.r, o.y + o.r * 0.3);
    ctx.lineTo(o.x - o.r * 0.7, o.y - o.r * 0.55);
    ctx.lineTo(o.x - o.r * 0.1, o.y - o.r);
    ctx.lineTo(o.x + o.r * 0.75, o.y - o.r * 0.45);
    ctx.lineTo(o.x + o.r, o.y + o.r * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,8,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  },

  drawGates(ctx) {
    for (const g of G.gates) {
      if (g.anim <= 0.01) continue;
      const h = 1440, y = 80;
      ctx.save();
      ctx.globalAlpha = g.anim;
      const grd = ctx.createLinearGradient(g.x - 18, 0, g.x + 18, 0);
      grd.addColorStop(0, 'rgba(160,30,50,0.05)');
      grd.addColorStop(0.5, `rgba(190,40,60,${0.4 + 0.15 * Math.sin(G.t * 3)})`);
      grd.addColorStop(1, 'rgba(160,30,50,0.05)');
      ctx.fillStyle = grd;
      ctx.fillRect(g.x - 18, y, 36, h);
      ctx.strokeStyle = 'rgba(255,120,120,0.6)'; ctx.lineWidth = 3;
      ctx.setLineDash([22, 14]);
      ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x, y + h); ctx.stroke();
      ctx.setLineDash([]);
      // cột cổng
      for (const cy of [y, y + h]) {
        ctx.fillStyle = '#3a2a22';
        ctx.fillRect(g.x - 30, cy - 16, 60, 32);
        ctx.strokeStyle = '#d9c48f'; ctx.lineWidth = 2;
        ctx.strokeRect(g.x - 30, cy - 16, 60, 32);
      }
      drawEmoji(ctx, '⛓️', g.x, 380, 26, g.anim);
      drawEmoji(ctx, '⛓️', g.x, 1160, 26, g.anim);
      ctx.restore();
    }
  },

  // ===== vẽ thực thể trong thế giới =====
  drawEntities(ctx) {
    const cam = G.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    // NPC
    this.drawNPC(ctx);
    // bóng + telegraph dưới chân vẽ ở tầng khác; đây là thân
    const drawables = [];
    for (const e of G.enemies) if (e.alive) {
      drawables.push({ y: e.y, kind: e.def.titan ? 'titan' : e.def.isBoss ? 'boss' : e.def.gaol ? 'gaol' : e.def.heart ? 'heart' : e.def.nail ? 'nail' : 'enemy', o: e });
    }
    for (const a of G.allies || []) {
      if (a.alive) drawables.push({ y: a.y, kind: 'ally', o: a });
      else drawables.push({ y: a.y, kind: 'allyDead', o: a });
    }
    const p = G.player;
    if (p && p.alive) drawables.push({ y: p.y, kind: 'player', o: p });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      if (d.kind === 'titan') this.drawTitan(ctx, d.o);
      if (d.kind === 'boss') this.drawIfrit(ctx, d.o);
      else if (d.kind === 'gaol') this.drawGaol(ctx, d.o);
      else if (d.kind === 'heart') this.drawHeart(ctx, d.o);
      else if (d.kind === 'nail') this.drawNail(ctx, d.o);
      else if (d.kind === 'enemy') this.drawEnemy(ctx, d.o);
      else if (d.kind === 'ally') this.drawAlly(ctx, d.o);
      else if (d.kind === 'allyDead') this.drawAllyDead(ctx, d.o);
      else if (d.kind === 'player') this.drawPlayer(ctx, d.o);
    }
    drawMarkers(ctx);
    drawPickups(ctx);
    drawProjs(ctx);
    drawParts(ctx);
    drawTexts(ctx);
    ctx.restore();
  },

  drawShadow(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.45, r * 1.05, r * 0.4, 0, 0, TAU); ctx.fill();
  },
  drawNPC(ctx) {
    const n = this.npc;
    this.drawShadow(ctx, n.x, n.y, 18);
    drawEmoji(ctx, n.icon, n.x, n.y - 4, 40, 1, n.name);
    ttext(ctx, n.name, n.x, n.y - 36, 13, GOLD, 'center', UI_FONT, 0.9);
    const b = 0.5 + 0.5 * Math.sin(G.t * 3);
    drawEmoji(ctx, '❗', n.x + 20, n.y - 26 + Math.sin(G.t * 2.5) * 3, 15, b);
  },
  drawPlayer(ctx, p) {
    // vòng chỉ mục tiêu của ta
    this.drawShadow(ctx, p.x, p.y, p.r);
    ctx.strokeStyle = 'rgba(159,208,255,0.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.45, p.r * 1.15, p.r * 0.45, 0, 0, TAU); ctx.stroke();
    // khiên manaward / hallowed
    const inv = getBuff(p, 'invuln'), mw = getBuff(p, 'manaward');
    if (inv || mw) {
      ctx.strokeStyle = inv ? `rgba(255,233,160,${0.6 + 0.3 * Math.sin(G.t * 8)})` : 'rgba(124,199,255,0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, p.r + 12, 0, TAU); ctx.stroke();
    }
    // thân: vòng màu role + emoji
    const rc = ROLE_COLORS[p.job.role];
    const g = ctx.createRadialGradient(p.x - 5, p.y - 12, 3, p.x, p.y - 4, p.r + 4);
    g.addColorStop(0, '#e8ecf5'); g.addColorStop(1, rc);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, p.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,25,40,0.65)'; ctx.lineWidth = 2; ctx.stroke();
    drawEmoji(ctx, p.job.icon, p.x, p.y - 4, p.r * 1.35, 1, p.job.id.toUpperCase());
    if (p.hitFxT > 0) {
      ctx.globalAlpha = p.hitFxT * 3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, p.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // hướng nhìn
    const fx = p.x + Math.cos(p.face) * (p.r + 8), fy = p.y - 4 + Math.sin(p.face) * (p.r + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(fx, fy, 3, 0, TAU); ctx.fill();
    // thanh cast của mình
    if (p.cast) {
      const w = 64, k = p.cast.t / p.cast.tmax;
      ctx.fillStyle = 'rgba(10,14,26,0.8)';
      ctx.fillRect(p.x - w / 2, p.y - 52, w, 8);
      ctx.fillStyle = '#ffd75e';
      ctx.fillRect(p.x - w / 2 + 1, p.y - 51, (w - 2) * k, 6);
    }
    // debuff weakness
    if (p.weaknessT > 0) drawEmoji(ctx, '💧', p.x - 26, p.y - 40, 16, 0.9);
  },
  drawEnemy(ctx, e) {
    const targeted = (G.player.target === e);
    this.drawShadow(ctx, e.x, e.y, e.r);
    // hướng nhìn của quái (để biết đâu là sau lưng — dùng cho positional MNK)
    if (e.aggro || targeted) {
      const nx = e.x + Math.cos(e.face || 0) * (e.r + 6), ny = e.y - 3 + Math.sin(e.face || 0) * (e.r + 6);
      ctx.fillStyle = 'rgba(255,240,220,0.9)';
      ctx.beginPath();
      ctx.moveTo(nx + Math.cos(e.face || 0) * 5, ny + Math.sin(e.face || 0) * 5);
      ctx.lineTo(nx + Math.cos((e.face || 0) + 2.5) * 4, ny + Math.sin((e.face || 0) + 2.5) * 4);
      ctx.lineTo(nx + Math.cos((e.face || 0) - 2.5) * 4, ny + Math.sin((e.face || 0) - 2.5) * 4);
      ctx.closePath(); ctx.fill();
    }
    if (targeted) {
      ctx.strokeStyle = `rgba(255,80,80,${0.6 + 0.3 * Math.sin(G.t * 6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.45, e.r * 1.2, e.r * 0.5, 0, 0, TAU); ctx.stroke();
    } else if (e.aggro) {
      drawEmoji(ctx, '🔺', e.x, e.y - e.r - 22, 13, 0.95);
    }
    const lx = e.lungeT > 0 ? Math.cos(ang(e.x, e.y, G.player.x, G.player.y)) * 10 * (e.lungeT / 0.22) : 0;
    const ly = e.lungeT > 0 ? Math.sin(ang(e.x, e.y, G.player.x, G.player.y)) * 10 * (e.lungeT / 0.22) : 0;
    const bob = Math.sin(G.t * 3 + e.x) * 2;
    const g = ctx.createRadialGradient(e.x - 4, e.y - e.r, 2, e.x, e.y, e.r + 3);
    g.addColorStop(0, '#f0e8e0'); g.addColorStop(1, e.def.color);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x + lx, e.y + ly + bob - 3, e.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(15,10,10,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    drawEmoji(ctx, e.def.icon, e.x + lx, e.y + ly + bob - 3, e.r * 1.4, 1, e.def.name);
    if (e.flashT > 0) {
      ctx.globalAlpha = e.flashT * 6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x + lx, e.y + ly - 3, e.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // HP bar
    if (e.hp < e.maxhp || targeted || e.aggro) {
      const w = Math.max(40, e.r * 2.2);
      const hpk = clamp(e.hp / e.maxhp, 0, 1);
      ctx.fillStyle = 'rgba(10,14,26,0.8)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 20, w, 7);
      ctx.fillStyle = e.fate ? '#6ea0ff' : '#ff6b6b';
      ctx.fillRect(e.x - w / 2 + 1, e.y - e.r - 19, (w - 2) * hpk, 5);
    }
    // cast bar
    if (e.cast) {
      const w = 60, k = e.cast.t / e.cast.tmax;
      ctx.fillStyle = 'rgba(10,14,26,0.85)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 32, w, 8);
      ctx.fillStyle = e.cast.color || '#ffd75e';
      ctx.fillRect(e.x - w / 2 + 1, e.y - e.r - 31, (w - 2) * clamp(k, 0, 1), 6);
      ttext(ctx, e.cast.name, e.x, e.y - e.r - 40, 11, '#ffd9a0', 'center', UI_FONT, 0.95);
    }
    // dot icon
    if (e.dots.length) drawEmoji(ctx, e.dots[0].icon, e.x + e.r + 8, e.y - e.r - 8, 13);
  },
  drawAlly(ctx, a) {
    this.drawShadow(ctx, a.x, a.y, a.r);
    const lx = a.lungeT > 0 ? Math.cos(a.face) * 8 * (a.lungeT / 0.2) : 0;
    const ly = a.lungeT > 0 ? Math.sin(a.face) * 8 * (a.lungeT / 0.2) : 0;
    const g = ctx.createRadialGradient(a.x - 4, a.y - a.r, 2, a.x, a.y, a.r + 3);
    g.addColorStop(0, '#f0e8e0'); g.addColorStop(1, a.def.color);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(a.x + lx, a.y + ly - 3, a.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(15,10,10,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    drawEmoji(ctx, a.def.icon, a.x + lx, a.y + ly - 3, a.r * 1.35, 1, a.def.name);
    if (a.hitFxT > 0) {
      ctx.globalAlpha = a.hitFxT * 3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(a.x + lx, a.y + ly - 3, a.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // tên + HP
    const w = 52, hpk = clamp(a.hp / a.maxhp, 0, 1);
    ttext(ctx, a.def.name, a.x, a.y - a.r - 24, 11, '#d9c48f', 'center', UI_FONT, 0.95);
    ctx.fillStyle = 'rgba(10,14,26,0.8)';
    ctx.fillRect(a.x - w / 2, a.y - a.r - 17, w, 6);
    ctx.fillStyle = hpk > 0.4 ? '#7de08a' : '#ff6b6b';
    ctx.fillRect(a.x - w / 2 + 1, a.y - a.r - 16, (w - 2) * hpk, 4);
    // đang là mục tiêu của tank buster / marker khác vẽ ở drawMarkers
  },
  drawAllyDead(ctx, a) {
    ctx.globalAlpha = 0.5;
    this.drawShadow(ctx, a.x, a.y, 14);
    drawEmoji(ctx, '💀', a.x, a.y - 2, 26);
    ttext(ctx, `${a.def.name} (${Math.ceil(a.deadT)}s)`, a.x, a.y - 26, 11, 'rgba(255,140,140,0.9)');
    ctx.globalAlpha = 1;
  },
  drawNail(ctx, e) {
    this.drawShadow(ctx, e.x, e.y, 14);
    const gl = 0.6 + 0.4 * Math.sin(G.t * 7);
    ctx.save();
    ctx.translate(e.x, e.y - 6);
    ctx.rotate(Math.PI / 4);
    const g = ctx.createLinearGradient(-14, -14, 14, 14);
    g.addColorStop(0, '#ffb060'); g.addColorStop(1, '#c03018');
    ctx.fillStyle = g;
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = `rgba(255,220,150,${gl})`; ctx.lineWidth = 3;
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    drawEmoji(ctx, '🔥', e.x, e.y - 22, 18, gl);
    // hp + fuse
    const w = 44, hpk = clamp(e.hp / e.maxhp, 0, 1), fk = clamp(e.fuse / 13, 0, 1);
    ctx.fillStyle = 'rgba(10,14,26,0.8)';
    ctx.fillRect(e.x - w / 2, e.y - 44, w, 6);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(e.x - w / 2 + 1, e.y - 43, (w - 2) * hpk, 4);
    ctx.fillStyle = 'rgba(10,14,26,0.8)';
    ctx.fillRect(e.x - w / 2, e.y - 52, w, 4);
    ctx.fillStyle = fk < 0.3 ? '#ff3b3b' : '#ffd75e';
    ctx.fillRect(e.x - w / 2 + 1, e.y - 51.5, (w - 2) * fk, 3);
    ttext(ctx, 'Infernal Nail', e.x, e.y - 60, 11, '#ff9c6b');
  },
  drawHeart(ctx, e) {
    this.drawShadow(ctx, e.x, e.y, 18);
    const gl = 0.6 + 0.4 * Math.sin(G.t * 8);
    ctx.save();
    ctx.translate(e.x, e.y - 8);
    ctx.rotate(Math.PI / 4);
    const g = ctx.createLinearGradient(-18, -18, 18, 18);
    g.addColorStop(0, '#e8dcff'); g.addColorStop(1, '#8a72c8');
    ctx.fillStyle = g;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = `rgba(220,200,255,${gl})`; ctx.lineWidth = 3;
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.restore();
    const w = 56, hpk = clamp(e.hp / e.maxhp, 0, 1), fk = clamp(e.fuse / 12, 0, 1);
    ctx.fillStyle = 'rgba(10,14,26,0.8)'; ctx.fillRect(e.x - w / 2, e.y - 44, w, 6);
    ctx.fillStyle = '#c8b8ff'; ctx.fillRect(e.x - w / 2 + 1, e.y - 43, (w - 2) * hpk, 4);
    ctx.fillStyle = 'rgba(10,14,26,0.8)'; ctx.fillRect(e.x - w / 2, e.y - 52, w, 4);
    ctx.fillStyle = fk < 0.3 ? '#ff3b3b' : '#ffd75e';
    ctx.fillRect(e.x - w / 2 + 1, e.y - 51.5, (w - 2) * fk, 3);
    ttext(ctx, 'Heart of Stone', e.x, e.y - 62, 12, '#c8b8ff', 'center', UI_FONT, 1, 'bold');
  },
  drawGaol(ctx, e) {
    const m = e.member;
    // vẽ người bị giam bên trong
    if (m && m.alive && m !== G.player) this.drawAlly(ctx, m);
    const gl = 0.6 + 0.4 * Math.sin(G.t * 6);
    ctx.save();
    ctx.translate(e.x, e.y - 6);
    ctx.strokeStyle = `rgba(190,170,130,${gl})`;
    ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r * 0.7);
      ctx.lineTo(Math.cos(a + Math.PI) * e.r, Math.sin(a + Math.PI) * e.r * 0.7);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, e.r + 4, (e.r + 4) * 0.72, 0, 0, TAU);
    ctx.strokeStyle = 'rgba(120,100,70,0.9)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    const w = 56, hpk = clamp(e.hp / e.maxhp, 0, 1), fk = clamp(e.fuse / 10, 0, 1);
    ctx.fillStyle = 'rgba(10,14,26,0.8)'; ctx.fillRect(e.x - w / 2, e.y - 48, w, 6);
    ctx.fillStyle = '#d9c48f'; ctx.fillRect(e.x - w / 2 + 1, e.y - 47, (w - 2) * hpk, 4);
    ctx.fillStyle = fk < 0.3 ? '#ff3b3b' : '#ffd75e';
    ttext(ctx, `${Math.ceil(e.fuse)}s`, e.x, e.y - 60, 15, fk < 0.3 ? '#ff5b5b' : '#ffd75e', 'center', UI_FONT, 1, 'bold');
    ttext(ctx, 'Granite Gaol', e.x, e.y - 74, 11, '#d9c48f', 'center', UI_FONT, 0.95);
  },
  drawIfrit(ctx, e) {
    const t = G.t;
    this.drawShadow(ctx, e.x, e.y, e.r * 1.1);
    // aura lửa
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.4) addPart(e.x + rand(-e.r, e.r), e.y + rand(-e.r / 2, e.r / 3), rand(-20, 20), rand(-120, -50), choice(['#ff7a3d', '#ffd75e', '#c9402a']), rand(3, 7), 0.7);
    }
    ctx.save();
    ctx.translate(e.x, e.y - 10);
    // thân
    const g = ctx.createRadialGradient(-14, -18, 10, 0, 0, e.r + 16);
    g.addColorStop(0, '#ffb060');
    g.addColorStop(0.55, '#c9402a');
    g.addColorStop(1, '#5a1408');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.92, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,8,4,0.8)'; ctx.lineWidth = 4; ctx.stroke();
    // sừng
    ctx.fillStyle = '#3a1810';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 18, -e.r * 0.72);
      ctx.lineTo(s * 52, -e.r * 1.28);
      ctx.lineTo(s * 30, -e.r * 0.5);
      ctx.closePath(); ctx.fill();
    }
    // mắt phát sáng
    const gl = 0.7 + 0.3 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(255,230,120,${gl})`;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 16, -e.r * 0.22, 8, 5 * gl, 0, 0, TAU); ctx.fill();
    }
    // miệng
    ctx.strokeStyle = 'rgba(255,180,80,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, e.r * 0.18, 20, 0.25, Math.PI - 0.25); ctx.stroke();
    if (e.engaged && e.atkBuff > 1) {
      ctx.strokeStyle = `rgba(255,60,30,${0.4 + 0.3 * Math.sin(t * 9)})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 14, 0, TAU); ctx.stroke();
    }
    if (e.flashT > 0) {
      ctx.globalAlpha = e.flashT * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.92, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (!e.engaged) {
      ttext(ctx, 'ZZZ...', e.x, e.y - e.r - 26, 15, 'rgba(200,200,220,0.75)');
      drawEmoji(ctx, '💤', e.x + 34, e.y - e.r - 26, 18, 0.8);
    }
  },
  drawTitan(ctx, e) {
    const t = G.t;
    this.drawShadow(ctx, e.x, e.y, e.r * 1.1);
    ctx.save();
    ctx.translate(e.x, e.y - 10);
    const g = ctx.createRadialGradient(-16, -20, 12, 0, 0, e.r + 18);
    g.addColorStop(0, '#c9b896'); g.addColorStop(0.55, '#8a7458'); g.addColorStop(1, '#3d3226');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.95, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,10,0.8)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#6e5c44';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 20, -e.r * 0.55); ctx.lineTo(s * 58, -e.r * 0.95); ctx.lineTo(s * 40, -e.r * 0.3);
      ctx.closePath(); ctx.fill();
    }
    const gl = 0.5 + 0.4 * Math.sin(t * 3);
    ctx.strokeStyle = `rgba(255,180,90,${gl * 0.8})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-e.r * 0.5, e.r * 0.1); ctx.lineTo(-e.r * 0.1, -e.r * 0.2); ctx.lineTo(e.r * 0.3, e.r * 0.25); ctx.stroke();
    ctx.fillStyle = `rgba(255,210,90,${gl})`;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 17, -e.r * 0.25, 7, 4.5, 0, 0, TAU); ctx.fill(); }
    if ((e.staggeredT || 0) > 0) drawEmoji(ctx, '💫', 0, -e.r - 34, 30);
    if (e.flashT > 0) {
      ctx.globalAlpha = e.flashT * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.95, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.cast && e.cast.counterable) {
      const pl = 0.6 + 0.4 * Math.sin(G.t * 12);
      ctx.strokeStyle = `rgba(180,240,255,${pl})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0, 0, e.r + 16, (e.r + 16) * 0.95, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    if (!e.engaged) {
      ttext(ctx, 'ZZZ...', e.x, e.y - e.r - 26, 15, 'rgba(200,200,220,0.75)');
      drawEmoji(ctx, '💤', e.x + 38, e.y - e.r - 26, 18, 0.8);
    }
    if (e.cast) {
      const w = 90, k = e.cast.t / e.cast.tmax;
      ctx.fillStyle = 'rgba(10,14,26,0.85)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 44, w, 9);
      ctx.fillStyle = e.cast.color || '#ffd75e';
      ctx.fillRect(e.x - w / 2 + 1, e.y - e.r - 43, (w - 2) * clamp(k, 0, 1), 7);
      ttext(ctx, e.cast.name, e.x, e.y - e.r - 54, 13, e.cast.counterable ? '#9fe8ff' : '#ffd9a0', 'center', UI_FONT, 0.95, 'bold');
    }
  },

  updateCamera(dt) {
    const p = G.player, cam = G.cam;
    let tx = p.x - G.VW / 2, ty = p.y - G.VH / 2;
    if (G.boss && G.boss.engaged && G.boss.alive) {
      tx = lerp(tx, (p.x + G.boss.x) / 2 - G.VW / 2, 0.25);
      ty = lerp(ty, (p.y + G.boss.y) / 2 - G.VH / 2, 0.25);
    }
    cam.x = lerp(cam.x, clamp(tx, 0, MAP.w - G.VW), Math.min(1, dt * 6));
    cam.y = lerp(cam.y, clamp(ty, 0, MAP.h - G.VH), Math.min(1, dt * 6));
    cam.shake = Math.max(0, cam.shake - dt * 30);
  },

  drawMinimap(ctx) {
    const w = 168, h = 84, x = G.VW - w - 14, y = 44;
    const sx = w / MAP.w, sy = h / MAP.h;
    ctx.save();
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(8,12,24,0.82)'; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); roundRect(ctx, x, y, w, h, 8); ctx.clip();
    // đấu trường
    ctx.fillStyle = 'rgba(200,60,40,0.25)';
    ctx.beginPath(); ctx.ellipse(x + MAP.arena.x * sx, y + MAP.arena.y * sy, MAP.arena.r * sx, MAP.arena.r * sy, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,120,0.25)';
    ctx.beginPath(); ctx.ellipse(x + MAP.titanArena.x * sx, y + MAP.titanArena.y * sy, MAP.titanArena.r * sx, MAP.titanArena.r * sy, 0, 0, TAU); ctx.fill();
    // cổng
    for (const g of G.gates) {
      if (g.closed) {
        ctx.strokeStyle = '#ff8080'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + g.x * sx, y + 2); ctx.lineTo(x + g.x * sx, y + h - 2); ctx.stroke();
      }
    }
    // FATE
    if (G.fate.active) {
      const F = MAP.fateZone;
      ctx.fillStyle = `rgba(110,160,255,${0.5 + 0.4 * Math.sin(G.t * 4)})`;
      ctx.beginPath(); ctx.arc(x + F.x * sx, y + F.y * sy, 5, 0, TAU); ctx.fill();
    }
    // quái
    for (const e of G.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.fate ? '#6ea0ff' : (e.def.isBoss ? '#ff4040' : '#e07050');
      const s = e.def.isBoss ? 4 : 2;
      ctx.beginPath(); ctx.arc(x + e.x * sx, y + e.y * sy, s, 0, TAU); ctx.fill();
    }
    // người chơi
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + G.player.x * sx, y + G.player.y * sy, 3, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawEmbers(ctx) {
    ctx.save();
    ctx.translate(-G.cam.x, -G.cam.y);
    for (const e of this.embers) {
      const a = 0.25 + 0.2 * Math.sin(G.t * 2 + e.ph);
      ctx.fillStyle = `rgba(255,150,60,${a})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
};

// ----- va chạm thế giới -----
function collideWorld(o) {
  o.x = clamp(o.x, 40, MAP.w - 40);
  o.y = clamp(o.y, 40, MAP.h - 40);
  for (const ob of World.obstacles) {
    if (World.obstacles.indexOf(ob) < 0) continue;
    const d = dist(o.x, o.y, ob.x, ob.y);
    if (d < ob.r * 0.8 + o.r && d > 0.01) {
      const a = ang(ob.x, ob.y, o.x, o.y);
      const need = ob.r * 0.8 + o.r;
      o.x = ob.x + Math.cos(a) * need;
      o.y = ob.y + Math.sin(a) * need;
    }
  }
  // giới hạn trong đấu trường khi boss đang chiến đấu
  const b = G.boss;
  if (b && b.engaged && b.alive) {
    const A = b.arena || MAP.arena;
    const d = dist(o.x, o.y, A.x, A.y);
    if (d > A.r - o.r - 8) {
      const a = ang(A.x, A.y, o.x, o.y);
      o.x = A.x + Math.cos(a) * (A.r - o.r - 8);
      o.y = A.y + Math.sin(a) * (A.r - o.r - 8);
    }
  }
}
function applyGates(p) {
  for (const g of G.gates) {
    if (!g.closed) continue;
    const R = p.r + 26;
    if (g.id === 'start') {
      if (p.x > g.x - R && p.x < g.x + R) p.x = (p.x <= g.x) ? g.x - R : g.x + R;
    } else if (g.id === 'boss') { // boss gate
      // trước khi trash hết: chặn không cho đi sang phải
      const trashDone = G.kills >= TRASH_TOTAL;
      if (!trashDone) {
        if (p.x > g.x - R) p.x = g.x - R;
      } else if (G.boss && G.boss.engaged && G.boss.alive) {
        if (p.x < g.x + R) p.x = g.x + R; // khoá trong đấu trường
      }
    } else if (g.id === 'titan') {
      const titan = G.enemies.find(x => x.alive && x.def && x.def.titan);
      if (g.closed && !(titan && titan.engaged)) {
        if (p.x > g.x - R) p.x = g.x - R;
      } else if (titan && titan.engaged) {
        if (p.x < g.x + R) p.x = g.x + R; // khoá trong đấu trường Titan
      }
    }
  }
}
