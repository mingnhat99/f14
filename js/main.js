'use strict';
// ===== Game chính: trạng thái, vòng lặp, logic duty =====
const G = {
  state: 'title', t: 0, dutyTime: 0, paused: false,
  VW: 1280, VH: 720, ctx: null, canvas: null, scale: 1, offX: 0, offY: 0,
  player: null, selJob: null, enemies: [], parts: [], texts: [], projs: [], pickups: [],
  telegraphs: [], slashes: [], rings: [], gates: [], allies: [], markers: [],
  tut: { idx: 0, count: {}, used: new Set(), skip: false, progress: 0 }, helpOpen: false,
  cam: { x: 0, y: 0, shake: 0 },
  banner: null, toasts: [], dialogue: null, dlgIdx: 0,
  fate: { active: false, cooldown: 25, got: 0, need: 5, timeLeft: 0 },
  boss: null, ifritDead: false, kills: 0, gil: 0, hintT: 0, dmgFlash: 0, flash: null,
  deathT: 0, victoryT: 0, demo: Q.get('demo') === '1', demoMove: null,
  staggerCheck: null,
  delayed: [],
};

// ----- khởi tạo -----
function init() {
  G.canvas = document.getElementById('game');
  G.ctx = G.canvas.getContext('2d');
  const toLogical = (cx, cy) => {
    const r = G.canvas.getBoundingClientRect();
    return { x: (cx - r.left - G.offXCss) / G.scaleCss, y: (cy - r.top - G.offYCss) / G.scaleCss };
  };
  Input.init(G.canvas, toLogical);
  window.addEventListener('resize', resize);
  resize();

  if (G.demo || Q.get('job')) {
    G.selJob = Q.get('job') in JOBS ? Q.get('job') : 'blm';
    if (G.demo) { startDuty(); G.state = 'duty'; }
    else { G.state = 'select'; }
  }
  requestAnimationFrame(loop);
}
function resize() {
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const iw = window.innerWidth, ih = window.innerHeight;
  // Màn nhỏ (điện thoại xoay ngang): hạ độ phân giải logic từ 1280x720 xuống 560px cao
  // → mọi thứ (chữ, nút, item, quái) phóng to ~22-35% trên màn hình thật và hết letterbox 2 bên
  G.smallUI = iw >= ih && ih <= 520;
  FS = G.smallUI ? 1.12 : 1; // chữ UI to thêm một chút cho dễ đọc
  if (G.smallUI) {
    G.VH = 560;
    G.VW = clamp(Math.round(G.VH * iw / ih), 1180, 1680);
  } else {
    G.VW = 1280; G.VH = 720;
  }
  G.canvas.width = Math.round(iw * dpr);
  G.canvas.height = Math.round(ih * dpr);
  G.canvas.style.width = iw + 'px';
  G.canvas.style.height = ih + 'px';
  G.scaleCss = Math.min(iw / G.VW, ih / G.VH);
  G.offXCss = (iw - G.VW * G.scaleCss) / 2;
  G.offYCss = (ih - G.VH * G.scaleCss) / 2;
  G.dpr = dpr;
  HUD.layout();
}

// ----- bắt đầu duty -----
function buildDuty() {
  G.enemies = []; G.parts = []; G.texts = []; G.projs = []; G.pickups = [];
  G.telegraphs = []; G.slashes = []; G.rings = []; G.markers = [];
  G.delayed = [];
  G.player = makePlayer(G.selJob);
  G.kills = 0; G.gil = 0; G.paused = false; G.helpOpen = false;
  G.banner = null; G.toasts = []; G.dmgFlash = 0; G.flash = null;
  G.deathT = 0; G.victoryT = 0; G.bossGateAnnounced = false;
  G.ifritDead = false;
  G.staggerCheck = null;
  G.tut = { idx: 0, count: {}, used: new Set(), skip: Q.get('boss') === '1' || G.demo, progress: 0 };
  makeAllies();
  G.cam.x = clamp(G.player.x - G.VW / 2, 0, MAP.w - G.VW);
  G.cam.y = clamp(G.player.y - G.VH / 2, 0, MAP.h - G.VH);
  G.fate = { active: false, cooldown: 25, got: 0, need: 5, timeLeft: 0 };
  World.build();
  for (const pk of PACKS) for (const [type, x, y] of pk.mobs) spawnEnemy(type, x, y, { pack: pk.id, tier: ITEM_TIERS[pk.id] });
  G.boss = spawnEnemy('ifrit', MAP.arena.x, MAP.arena.y - 40, { tier: ITEM_TIERS.boss });
  const titan = spawnEnemy('titan', MAP.titanArena.x, MAP.titanArena.y - 40, { tier: ITEM_TIERS.titan });
  titan.arena = MAP.titanArena;
  for (const pk of TITAN_PACKS) for (const [type, x, y] of pk.mobs) spawnEnemy(type, x, y, { pack: pk.id, tier: ITEM_TIERS[pk.id] });
  if (Q.get('titan') === '1') { // debug: vào thẳng Titan
    for (const en of G.enemies) if (!en.def.isBoss) en.alive = false;
    G.kills = TRASH_TOTAL;
    for (const g of G.gates) { g.closed = false; g.anim = 0; }
    const ifrit = G.enemies.find(en => en.def.isBoss && !en.def.titan);
    if (ifrit && ifrit.alive) killEnemy(ifrit); // chạy ifritDefeated → mở cổng titan
    G.tut.skip = true;
    G.player.x = MAP.titanGateX - 140; G.player.y = MAP.titanArena.y;
  }
  if (Q.get('boss') === '1') { // debug: mở thẳng boss
    for (const e of G.enemies) if (!e.def.isBoss) e.alive = false;
    G.kills = TRASH_TOTAL;
    for (const g of G.gates) if (g.id === 'start' || g.id === 'boss') { g.closed = false; g.anim = 0; }
    G.player.x = MAP.arena.x - 260; G.player.y = MAP.arena.y;
  }
}
function startDuty() {
  buildDuty();
  G.dutyTime = 0; G.hintT = 9;
  // barrier mở sau 1.2s
  setTimeout(() => { const g0 = G.gates.find(g => g.id === 'start'); if (g0 && g0.closed) { g0.closed = false; Snd.sfx('gate'); } }, 1200);
  G.banner = { txt: '⚜ DUTY COMMENCED ⚜', sub: 'The Bowl of Embers', t: 0, tmax: 2.6 };
  G.state = 'duty';
}
function startDialogue() {
  buildDuty(); // dựng thế giới trước để có cảnh nền sau hộp thoại
  G.dlgIdx = 0;
  G.dialogue = DIALOGUES[0];
  G.state = 'dialogue';
}
function advanceDialogue() {
  G.dlgIdx++;
  if (G.dlgIdx >= DIALOGUES.length) { G.dialogue = null; startDuty(); }
  else G.dialogue = DIALOGUES[G.dlgIdx];
}

// ----- các sự kiện lớn -----
function bossDefeated() {
  G.victoryT = 1.8;
  G.cam.shake = 22;
  Snd.sfx('bigboom');
  G.flash = { color: '#fff0d0', t: 0.5, tmax: 0.5 };
  for (let i = 0; i < 80; i++) addPart(G.boss.x + rand(-60, 60), G.boss.y + rand(-50, 30), rand(-320, 320), rand(-420, -60), choice(['#ff7a3d', '#ffd75e', '#fff', '#c9402a']), rand(3, 8), 1.4);
}
function respawnPlayer() {
  const p = G.player;
  p.alive = true;
  p.hp = p.maxhp; p.mp = p.maxmp;
  p.weaknessT = 20;
  p.buffs = []; p.cast = null; p.dash = null;
  const inArena = G.boss && G.boss.engaged && G.boss.alive;
  p.x = inArena ? MAP.arenaGateX + 90 : MAP.startX;
  p.y = inArena ? MAP.arena.y : MAP.startY;
  // đồng đội hồi sinh cùng
  for (const a of G.allies) { a.alive = true; a.hp = a.maxhp; a.x = p.x + rand(-40, 40); a.y = p.y + 42; a.deadT = 0; }
  G.markers = [];
  if (inArena && G.boss.def.titan) {
    resetTitanFight();
    p.x = MAP.titanGateX - 90; p.y = MAP.titanArena.y;
    p.weaknessT = 0; // thử lại = lượt mới hoàn toàn, không phạt weakness
    for (const a of G.allies) { a.alive = true; a.hp = a.maxhp; a.deadT = 0; a.x = p.x - 30; a.y = p.y + 36; }
    G.toasts.push({ txt: '🗿 Thử lại: Titan đã hồi phục hoàn toàn!', t: 0, tmax: 2.6, color: '#e0c9a0' });
    G.state = 'duty';
    return;
  }
  if (inArena) {
    // Ifrit về giữa, hồi 25% máu
    G.boss.hp = Math.min(G.boss.maxhp, G.boss.hp + G.boss.maxhp * 0.25);
    G.boss.x = MAP.arena.x; G.boss.y = MAP.arena.y - 40;
    G.boss.cast = null; G.boss.dash = null; G.boss.abilityCd = 2.5;
    G.telegraphs = [];
  }
  // quái thường bỏ đuổi
  for (const e of G.enemies) { if (e.alive && !e.def.isBoss) { e.aggro = false; } }
  G.state = 'duty';
}

// ----- FATE -----
function updateFate(dt) {
  const F = G.fate;
  if (!F.active) {
    F.cooldown -= dt;
    if (F.cooldown <= 0 && !(G.boss && G.boss.engaged) && G.state === 'duty') {
      F.active = true; F.got = 0; F.timeLeft = 120;
      const Z = MAP.fateZone;
      for (let i = 0; i < F.need; i++) {
        const a = i / F.need * TAU;
        spawnEnemy('coeurl', Z.x + Math.cos(a) * rand(60, 160), Z.y + Math.sin(a) * rand(40, 110), { fate: true });
      }
      G.banner = { txt: '🌀 FATE BẮT ĐẦU', sub: 'Săn Lùng Coeurl — tiêu diệt 5 con!', t: 0, tmax: 2.4 };
      Snd.sfx('confirm');
    }
  } else {
    F.timeLeft -= dt;
    const alive = G.enemies.filter(e => e.alive && e.fate).length;
    if (F.got >= F.need) {
      F.active = false; F.cooldown = 90;
      gainXp(G.player, 250);
      G.gil += 100;
      G.player.pot = Math.min(5, G.player.pot + 2);
      G.banner = { txt: '✅ FATE HOÀN THÀNH', sub: '+250 XP · +100 Gil · +2 🧪', t: 0, tmax: 2.4 };
      Snd.sfx('victory');
    } else if (F.timeLeft <= 0) {
      F.active = false; F.cooldown = 60;
      for (const e of G.enemies) if (e.fate && e.alive) { e.alive = false; }
      G.toasts.push({ txt: '🌀 FATE kết thúc (hết giờ)', t: 0, tmax: 2, color: '#8b93a8' });
    } else if (alive === 0 && F.got < F.need) {
      // đủ liệu hiếm: quái FATE bỏ đi
      F.active = false; F.cooldown = 60;
    }
  }
}

// ----- hướng dẫn người mới: kiểm tra tiến độ từng bước -----
function updateTutorial() {
  if (!G.tut || G.tut.skip) return;
  const step = TUT_STEPS[G.tut.idx];
  if (!step) return;
  let v = 0;
  switch (step.id) {
    case 'move': v = G.tut.count.move || 0; break;
    case 'target': v = G.tut.count.target || 0; break;
    case 'skill': v = Math.min(1, G.tut.used.size); break;
    case 'skills3': v = G.tut.used.size; break;
    case 'kill3': v = Math.min(3, G.kills); break;
    case 'pickup': v = G.tut.count.pickup || 0; break;
    case 'dodge': v = G.tut.count.dodge || 0; break;
    case 'potion': v = G.tut.count.potion || 0; break;
    case 'trash': v = Math.min(TRASH_TOTAL, G.kills); break;
    case 'boss': v = G.ifritDead ? 1 : 0; break;
  }
  G.tut.progress = v;
  if (v >= step.need) {
    const rw = TUT_REWARDS[step.id] || {};
    if (rw.xp) gainXp(G.player, rw.xp);
    if (rw.gil) G.gil += rw.gil;
    if (rw.pot) G.player.pot = Math.min(5, G.player.pot + rw.pot);
    G.toasts.push({ txt: `✅ Bước ${G.tut.idx + 1} hoàn thành!${rw.xp ? ` +${rw.xp} XP` : ''}`, t: 0, tmax: 2.2, color: '#7de08a' });
    Snd.sfx('confirm');
    G.tut.idx++;
    G.tut.progress = 0;
    if (G.tut.idx >= TUT_STEPS.length) {
      G.tut.skip = true;
      G.banner = { txt: '📖 HƯỚNG DẪN HOÀN TẤT', sub: 'Bạn đã sẵn sàng — Warrior of Light!', t: 0, tmax: 3 };
      Snd.sfx('levelup');
    }
  }
}

// ----- bot demo (?demo=1) -----
function demoBot() {
  const p = G.player;
  if (!p.alive) { G.demoMove = null; return; }
  G.demoMove = { x: 0, y: 0, mag: 0 };
  // né telegraph sắp nổ
  let danger = null;
  for (const tg of G.telegraphs) {
    if (tg.tmax - tg.t < 1.0 && telegraphHitTest(tg, p.x, p.y)) { danger = tg; break; }
  }
  if (danger) {
    const x = danger.follow ? danger.follow.x : danger.x, y = danger.follow ? danger.follow.y : danger.y;
    let a = ang(x, y, p.x, p.y);
    if (danger.shape === 'annulus') a += Math.PI; // ôm sát boss
    if (danger.shape === 'rect') a = danger.ang + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
    G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 1 };
    return;
  }
  // xử lý marker boss: stack → chạy đến đứng chung; spread → tản; gaze → bỏ chạy (quay mặt đi)
  for (const m of G.markers) {
    if (m.type === 'stack') {
      const t = m.followMember;
      if (t && t !== p) {
        const d = dist(p.x, p.y, t.x, t.y);
        if (d > 40) { const a = ang(p.x, p.y, t.x, t.y); G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 1 }; return; }
        return;
      }
    } else if (m.type === 'gaze') {
      const b = G.boss;
      if (b && dist(p.x, p.y, b.x, b.y) < 540) {
        const a = ang(b.x, b.y, p.x, p.y);
        G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 0.6 };
        return;
      }
    } else if (m.type === 'spread') {
      let ax = 0, ay = 0, push = 0;
      for (const o of partyMembers()) {
        if (o === p) continue;
        const d = dist(p.x, p.y, o.x, o.y);
        if (d < 170 && d > 0.01) { ax += (p.x - o.x) / d; ay += (p.y - o.y) / d; push++; }
      }
      if (push) { const n = Math.hypot(ax, ay) || 1; G.demoMove = { x: ax / n, y: ay / n, mag: 1 }; return; }
    }
  }
  const foes = G.enemies.filter(e => e.alive && !e.def.nail);
  const nails = G.enemies.filter(e => e.alive && e.def.nail);
  let tgt = nails[0] || foes.reduce((b, e) => !b || dist(p.x, p.y, e.x, e.y) < dist(p.x, p.y, b.x, b.y) ? e : b, null);
  if (!tgt) { // đi về phía đấu trường
    const a = ang(p.x, p.y, MAP.arena.x, MAP.arena.y);
    G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 1 };
    return;
  }
  p.target = tgt;
  const d = dist(p.x, p.y, tgt.x, tgt.y);
  const want = p.job.auto ? 100 : 420;
  if (d > want) {
    const a = ang(p.x, p.y, tgt.x, tgt.y);
    G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 1 };
  } else if (d < want - 120 && !p.job.auto) {
    const a = ang(tgt.x, tgt.y, p.x, p.y) + 0.6;
    G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 0.8 };
  }
  // bấm skill
  if (!p.cast && p.gcd <= 0.05) {
    for (let i = 0; i < p.skills.length; i++) {
      if (tryUseSkill(p, i)) break;
    }
  }
  if (p.hp < p.maxhp * 0.42) tryPotion(p);
  if (p.lb >= 100) tryLB(p);
}

// ----- xử lý chạm -----
function handleTap(x, y) {
  switch (G.state) {
    case 'title': G.state = 'select'; Snd.sfx('confirm'); break;
    case 'select': {
      const z = HUD.zoneAt(x, y);
      if (!z) break;
      if (z.id.startsWith('job:')) { G.selJob = z.id.slice(4); Snd.sfx('select'); }
      else if (z.id === 'confirm' && G.selJob) { Snd.sfx('confirm'); startDialogue(); }
      break;
    }
    case 'dialogue': {
      const d = G.dialogue;
      if (d && G.t * 46 < d.text.length) { /* đang chạy chữ — cho phép tap để skip nhanh */ }
      advanceDialogue(); Snd.sfx('select');
      break;
    }
    case 'duty': {
      if (G.paused) {
        const z = HUD.zoneAt(x, y);
        if (!z) break;
        if (z.id === 'resume') G.paused = false;
        else if (z.id === 'replay') startDuty();
        else if (z.id === 'mute') { Snd.muted = !Snd.muted; }
        else if (z.id === 'select') { G.state = 'select'; G.paused = false; }
        break;
      }
      // bảng trợ giúp đang mở: chỉ nhận nút đóng
      if (G.helpOpen) {
        const z = HUD.zoneAt(x, y);
        if (z && z.id === 'help-close') { G.helpOpen = false; Snd.sfx('select'); }
        break;
      }
      // nút tròn
      const b = HUD.btnAt(x, y);
      if (b) {
        if (b.id === 'pause') { G.paused = true; Snd.sfx('select'); }
        else if (b.id === 'help') { G.helpOpen = true; Snd.sfx('select'); }
        else if (b.id === 'potion') tryPotion(G.player);
        else if (b.id === 'lb') tryLB(G.player);
        else if (b.id === 'counter') tryCounter(G.player);
        else if (b.id === 'skill') tryUseSkill(G.player, b.idx);
        return;
      }
      // nút trong UI (bỏ qua hướng dẫn...)
      const uz = HUD.zoneAt(x, y);
      if (uz && uz.id === 'tut-skip') {
        G.tut.skip = true;
        G.toasts.push({ txt: 'Đã bỏ qua hướng dẫn — mở ❓ để xem lại trợ giúp', t: 0, tmax: 2.4, color: '#8b93a8' });
        Snd.sfx('select');
        break;
      }
      // chạm để chọn mục tiêu
      let best = null, bd = 46 * 46;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const d2 = dist2(x + G.cam.x, y + G.cam.y, e.x, e.y - e.r * 0.3);
        if (d2 < bd + e.r * e.r) { bd = d2; best = e; }
      }
      if (best) { G.player.target = best; if (G.tut) G.tut.count.target = 1; Snd.sfx('select'); }
      break;
    }
    case 'victory': {
      const z = HUD.zoneAt(x, y);
      if (!z) break;
      if (z.id === 'replay') startDuty();
      else if (z.id === 'select') { G.state = 'select'; }
      break;
    }
    case 'defeat': {
      const z = HUD.zoneAt(x, y);
      if (!z) break;
      if (z.id === 'respawn') respawnPlayer();
      else if (z.id === 'select') { G.state = 'select'; }
      break;
    }
  }
}

// ----- cập nhật -----
function update(dt) {
  G.t += dt;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.tmax) G.banner = null; }
  G.toasts.forEach(t => t.t += dt);
  G.toasts = G.toasts.filter(t => t.t < t.tmax);
  G.dmgFlash = Math.max(0, G.dmgFlash - dt * 2.2);
  if (G.flash) { G.flash.t -= dt; if (G.flash.t <= 0) G.flash = null; }
  G.hintT = Math.max(0, G.hintT - dt);
  for (const d of G.delayed) d.t -= dt;
  const fireNow = G.delayed.filter(d => d.t <= 0);
  G.delayed = G.delayed.filter(d => d.t > 0);
  for (const d of fireNow) d.fn();

  if (G.state === 'dialogue') return;
  if (G.state !== 'duty') { updateParts(dt); return; }
  if (G.paused) return;

  G.dutyTime += dt;
  World.update(dt);
  updateFate(dt);
  updateTutorial();
  updateAllies(dt);

  if (G.deathT > 0) {
    G.deathT -= dt;
    updateParts(dt);
    updateTelegraphs(0); // đóng băng telegraph khi chết
    if (G.deathT <= 0) G.state = 'defeat';
    return;
  }
  if (G.victoryT > 0) {
    G.victoryT -= dt;
    updateEnemies(dt); updateTelegraphs(dt); updateParts(dt);
    if (G.victoryT <= 0) { G.state = 'victory'; Snd.sfx('victory'); }
    return;
  }

  if (G.demo) demoBot();
  updatePlayer(G.player, dt);
  updateEnemies(dt);
  updateTelegraphs(dt);
  updateMarkers(dt);
  updateProjs(dt);
  updatePickups(dt);
  updateParts(dt);
  World.updateCamera(dt);

  // mở cổng boss khi quét xong trash
  if (G.kills >= TRASH_TOTAL && !G.bossGateAnnounced) {
    G.bossGateAnnounced = true;
    const g = G.gates.find(g2 => g2.id === 'boss');
    if (g && g.closed) { g.closed = false; }
    G.toasts.push({ txt: '⛓ Cổng đấu trường đã MỞ!', t: 0, tmax: 2.6, color: '#7de08a' });
    Snd.sfx('gate');
  }
}

// ----- vẽ -----
function render() {
  const ctx = G.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, G.canvas.width, G.canvas.height);
  ctx.setTransform(G.dpr * G.scaleCss, 0, 0, G.dpr * G.scaleCss, G.dpr * G.offXCss, G.dpr * G.offYCss);
  // viền letterbox
  ctx.strokeStyle = 'rgba(217,196,143,0.25)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, G.VW - 2, G.VH - 2);

  switch (G.state) {
    case 'title': HUD.drawTitle(ctx); break;
    case 'select': HUD.drawSelect(ctx); break;
    case 'dialogue': {
      renderDutyWorld(ctx);
      HUD.drawDialogue(ctx);
      break;
    }
    case 'duty': {
      renderDutyWorld(ctx);
      HUD.drawDuty(ctx);
      if (G.paused) HUD.drawPause(ctx);
      break;
    }
    case 'victory': renderDutyWorld(ctx); HUD.drawVictory(ctx); break;
    case 'defeat': renderDutyWorld(ctx); HUD.drawDefeat(ctx); break;
  }

  // flash toàn màn
  if (G.flash) {
    ctx.globalAlpha = 0.65 * (G.flash.t / G.flash.tmax);
    ctx.fillStyle = G.flash.color;
    ctx.fillRect(0, 0, G.VW, G.VH);
    ctx.globalAlpha = 1;
  }
  if (G.dmgFlash > 0) {
    ctx.globalAlpha = Math.min(0.5, G.dmgFlash * 0.5);
    const vg = ctx.createLinearGradient(0, 0, 0, G.VH);
    vg.addColorStop(0, '#c00'); vg.addColorStop(0.5, 'rgba(200,0,0,0)'); vg.addColorStop(1, '#c00');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, G.VW, G.VH);
    ctx.globalAlpha = 1;
  }
}
function renderDutyWorld(ctx) {
  const sh = G.cam.shake;
  if (sh > 0.3) {
    ctx.save();
    ctx.translate(rand(-sh, sh), rand(-sh, sh));
  }
  World.drawGround(ctx);
  World.drawGates(ctx);
  drawTelegraphs(ctx);
  World.drawEntities(ctx);
  World.drawEmbers(ctx);
  if (sh > 0.3) ctx.restore();
}

// ----- vòng lặp -----
let lastT = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
  lastT = ts;
  // xử lý input
  for (const tap of Input.taps) handleTap(tap.x, tap.y);
  Input.taps.length = 0;
  for (const act of Input.keyActions) {
    if (act === 'pause') {
      if (G.state === 'duty') { G.paused = !G.paused; Snd.sfx('select'); }
    } else if (act === 'confirm') {
      if (G.state === 'title') G.state = 'select';
      else if (G.state === 'dialogue') advanceDialogue();
      else if (G.state === 'select' && G.selJob) startDialogue();
    } else if (G.state === 'duty' && !G.paused) {
      if (act.startsWith('skill:')) tryUseSkill(G.player, +act.slice(6));
      else if (act === 'potion') tryPotion(G.player);
      else if (act === 'lb') tryLB(G.player);
      else if (act === 'counter') tryCounter(G.player);
    }
  }
  Input.keyActions.length = 0;

  try {
    update(dt);
    render();
  } catch (err) {
    console.error('[game loop]', err);
    if (!G.loopErr) {
      G.loopErr = true;
      console.error(err && err.stack || err);
    }
  }
  requestAnimationFrame(loop);
}
init();
