'use strict';
// ===== Thực thể & chiến đấu =====

// ---------- NGƯỜI CHƠI ----------
function makePlayer(jobId) {
  const job = JOBS[jobId];
  const p = {
    jobId, job, x: MAP.startX, y: MAP.startY, r: 20, face: 0,
    level: 1, xp: 0, alive: true, respawnT: 0, weaknessT: 0,
    hp: 0, maxhp: 0, mp: 0, maxmp: 0, atk: 0, def: 0,
    gcd: 0, cast: null, combo: null, autoT: 0, spdBuffT: 0,
    buffs: [], skills: job.skills.map(id => ({ def: SKILLS[id], cd: 0 })),
    target: null, lb: 0, pot: 3, kb: { x: 0, y: 0, t: 0 }, dash: null,
    flashT: 0, hitFxT: 0, castFxT: 0, counterCd: 0,
    gear: { weaponIlvl: 5, weaponAtk: 2, armorIlvl: 5, armorHp: 20, armorDef: 1 }, stance: null,
  };
  recalcStats(p, true);
  return p;
}
function recalcStats(p, full) {
  const j = p.job, l = p.level, ratio = full ? 1 : p.hp / p.maxhp;
  const oldMax = p.maxhp;
  p.maxhp = Math.round(j.hp + j.gHp * (l - 1)) + p.gear.armorHp;
  p.maxmp = Math.round(j.mp + j.gMp * (l - 1));
  p.atk = j.atk + j.gAtk * (l - 1) + p.gear.weaponAtk;
  p.def = j.def + j.gDef * (l - 1) + p.gear.armorDef;
  if (full) { p.hp = p.maxhp; p.mp = p.maxmp; }
  else { p.hp = clamp(p.hp + (p.maxhp - oldMax), 1, p.maxhp); if (ratio) p.hp = Math.max(p.hp, p.maxhp * Math.min(ratio, 1)); }
}
function gainXp(p, n) {
  if (!n) return;
  p.xp += n;
  addText(`+${n} XP`, p.x, p.y - 46, '#9fd0ff', 15);
  while (p.xp >= xpNext(p.level) && p.level < 10) {
    p.xp -= xpNext(p.level);
    p.level++;
    recalcStats(p);
    p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.35);
    Snd.sfx('levelup');
    addText('LEVEL UP!', p.x, p.y - 70, '#ffd75e', 24, true);
    for (let i = 0; i < 26; i++) addPart(p.x + rand(-22, 22), p.y + rand(-10, 30), rand(-40, 40), rand(-160, -60), '#ffd75e', rand(3, 6), 0.9);
    G.rings.push({ x: p.x, y: p.y, r0: 10, r1: 120, t: 0, tmax: 0.6, color: '#ffd75e', w: 4 });
  }
}

function playerPotency(p, pot, opts = {}) {
  let critChance = 0.12 + (opts.critBonus || 0);
  const crit = Math.random() < critChance;
  let d = pot * p.atk / 60 * rand(0.92, 1.08) * (crit ? 1.5 : 1);
  if (p.weaknessT > 0) d *= 0.8;
  return { dmg: d, crit };
}
function dealToEnemy(e, amount, opts = {}) {
  if (!e.alive) return 0;
  if (e.shielded) { addText('KHÔNG THẤM', e.x, e.y - e.r - 12, '#8b93a8', 14); return 0; }
  const mult = 200 / (200 + (e.defMul || 0));
  const d = Math.max(1, amount * mult * (opts.crit ? 1 : 1));
  const dmgFinal = (e.vulnT || 0) > 0 ? d * 1.5 : d;
  e.hp -= dmgFinal;
  if (e.def.titan && !e.shielded && (e.staggeredT || 0) <= 0) {
    const rate = { player: 0.30, tank: 0.35, healer: 0.08 }[opts.from || 'player'] || 0.30;
    e.stagger = Math.min(100, (e.stagger || 0) + dmgFinal * rate);
    if (e.stagger >= 100) titanStaggered(e, 5);
  }
  e.flashT = 0.12;
  // ghi nhận thù hận (enmity): tank nhân hệ số, healer vừa đánh vừa hồi
  if (!e.enmity) e.enmity = { player: 0, tank: 0, healer: 0 };
  const from = opts.from || 'player';
  e.enmity[from] += d * (from === 'tank' ? 5 : from === 'healer' ? 1.5 : 1);
  addText(Math.round(dmgFinal), e.x + rand(-14, 14), e.y - e.r - 12,
    opts.crit ? '#ff9c2b' : (opts.auto ? '#f2f2f2' : '#ffd75e'), opts.crit ? 23 : 17, opts.crit);
  if (!G.player.target || G.player.target.dead || !G.player.target.alive) { G.player.target = e; G.tut && (G.tut.count.target = 1); }
  e.aggro = true;
  if (e.packId) aggroPack(e.packId);
  if (e.hp <= 0) killEnemy(e);
  return d;
}
function damagePlayer(amount, label) {
  const p = G.player;
  if (!p.alive) return;
  if (getBuff(p, 'invuln')) {
    addText('BẤT TỬ', p.x, p.y - 50, '#ffe9a0', 18, true);
    return;
  }
  let d = amount * rand(0.94, 1.06) * (100 / (100 + p.def * 3));
  const mw = getBuff(p, 'manaward');
  if (mw) {
    const absorbed = Math.min(mw.val, d);
    mw.val -= absorbed; d -= absorbed;
    addText(`🔷 -${Math.round(absorbed)}`, p.x, p.y - 60, '#7cc7ff', 15);
    if (mw.val <= 0) p.buffs = p.buffs.filter(b => b !== mw);
    if (d <= 0.5) return;
  }
  d = Math.round(d);
  p.hp -= d;
  p.hitFxT = 0.25;
  G.dmgFlash = Math.min(1, G.dmgFlash + 0.45);
  addText(`-${d}`, p.x + rand(-10, 10), p.y - 52, '#ff5b5b', 19);
  if (label) G.toasts.push({ txt: `⚠ ${label}!`, t: 0, tmax: 1.6, color: '#ff9c6b' });
  Snd.sfx('hit');
  if (p.hp <= 0) { p.hp = 0; playerDie(); }
}
function getBuff(p, id) { return p.buffs.find(b => b.id === id); }
function addBuff(p, id, icon, dur, val) {
  const ex = getBuff(p, id);
  if (ex) { ex.t = Math.max(ex.t, dur); ex.val = val; return; }
  p.buffs.push({ id, icon, t: dur, val });
}
function playerDie() {
  const p = G.player;
  p.alive = false; p.cast = null; p.dash = null;
  Snd.sfx('death');
  for (let i = 0; i < 30; i++) addPart(p.x, p.y, rand(-140, 140), rand(-180, 20), choice(['#ff5b5b', '#d9c48f', '#8b93a8']), rand(3, 6), 1.1);
  addText('💀 BẠN ĐÃ BỊ HẠ', p.x, p.y - 60, '#ff5b5b', 24, true);
  Input.joy.on = false;
  G.deathT = 1.4; // delay trước khi hiện màn hình thất bại
}

function tryUseSkill(p, idx) {
  if (!p || !p.alive || G.state !== 'duty' || G.paused) return false;
  if (p.gaoled && p.target !== p.gaoled) {
    G.toasts.push({ txt: '🪨 Bạn đang bị giam — phá cũi để thoát!', t: 0, tmax: 1.2, color: '#e0c9a0' });
    return false;
  }
  const s = p.skills[idx];
  if (!s) return false;
  const def = s.def;
  if (def.gcd && p.gcd > 0.05) return false;
  if (s.cd > 0) return false;
  // Astral Fire làm Fire tốn MP nhiều hơn
  const mpCost = def.mp * (def.st === 'AF' && p.stance && p.stance.name === 'AF' ? 1 + 0.45 * (p.stance.stacks - 1) : 1);
  if (p.mp < mpCost) { G.toasts.push({ txt: '❄ Không đủ MP — dùng Blizzard/mana!', t: 0, tmax: 1.1, color: '#7cc7ff' }); return false; }
  if (p.cast) return false;

  // mục tiêu
  let t = p.target && p.target.alive ? p.target : null;
  if (def.range > 0) {
    if (!t || dist(p.x, p.y, t.x, t.y) > def.range + t.r) {
      // thử tìm mục tiêu gần nhất trong tầm
      let best = null, bd = 1e9;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < def.range + e.r && d < bd) { bd = d; best = e; }
      }
      if (best) t = best;
      else { G.toasts.push({ txt: `Ngoài tầm — ${def.name}`, t: 0, tmax: 0.9, color: '#ff9c6b' }); return false; }
    }
  }
  if (t) p.face = ang(p.x, p.y, t.x, t.y);
  p.mp -= mpCost;
  if (G.tut && !G.tut.skip) { G.tut.used.add(def.id); }
  if (def.gcd) p.gcd = p.job.gcd;
  if (def.cd) s.cd = def.cd;
  if (def.cast) {
    p.cast = { def, target: t, t: 0, tmax: def.cast };
    p.castFxT = 0.1;
    Snd.sfx('cast');
  } else {
    applySkill(p, def, t);
  }
  return true;
}
function finishCast(p) {
  const c = p.cast; p.cast = null;
  applySkill(p, c.def, (c.target && c.target.alive) ? c.target : null, c.tx, c.ty);
}
function applySkill(p, def, t, tx, ty) {
  const comboOk = def.combo && p.combo && p.combo.id === def.combo && p.combo.t > 0;
  let pot = def.pot * (comboOk ? 1.5 : 1);
  if (t) { tx = t.x; ty = t.y; p.face = ang(p.x, p.y, tx, ty); }

  // ===== Astral Fire / Umbral Ice (BLM) =====
  if (p.jobId === 'blm' && def.st) {
    if (def.st === 'AF') {
      const prev = p.stance && p.stance.name === 'AF' ? p.stance.stacks : 0;
      p.stance = { name: 'AF', stacks: Math.min(3, prev + 1), t: 18 };
      if (p.stance.stacks !== prev) addText(`Astral Fire ${p.stance.stacks}!`, p.x, p.y - 66, '#ff9c2b', 15, true);
    } else {
      p.stance = { name: 'UI', stacks: 1, t: 18 };
      addText('Umbral Ice!', p.x, p.y - 66, '#7cc7ff', 15, true);
    }
  }
  if (p.stance) {
    if (p.stance.name === 'AF' && def.st === 'AF') pot *= 1 + 0.13 * p.stance.stacks;
    if (p.stance.name === 'UI' && def.id === 'blizzard') pot *= 1.2;
  }

  // ===== Positional (MNK): đánh sau lưng / hông quái =====
  if (t && def.pos && !def.proj) {
    const toMe = ang(t.x, t.y, p.x, p.y);          // hướng từ quái → người chơi
    const face = t.face || 0;
    const front = Math.abs(((toMe - face + Math.PI * 3) % TAU) - Math.PI); // 0 = đối diện mặt quái
    const rear = Math.PI - front;                   // 0 = ngay sau lưng
    if (def.pos === 'rear' && rear < 1.15) {
      if (def.id === 'bootshine') { pot *= 1.5; addText('SAU LƯNG — CRIT!', p.x, p.y - 58, '#ffd75e', 14, true); }
      else { pot *= 1.25; addText('SAU LƯNG +25%', p.x, p.y - 58, '#ffd75e', 13); }
    } else if (def.pos === 'flank' && rear >= 1.35 && rear < 2.25) {
      pot *= 1.3; addText('HÔNG +30%!', p.x, p.y - 58, '#ffd75e', 14, true);
    }
  }
  const hitOne = (e, pot2, opts) => {
    const { dmg, crit } = playerPotency(p, pot2, { critBonus: def.critBonus || (comboOk ? 0.2 : 0), ...opts });
    dealToEnemy(e, dmg, { crit });
    p.lb = Math.min(100, p.lb + 2.4);
    if (def.stun) e.stunT = Math.max(e.stunT || 0, def.stun);
  };

  switch (def.id) {
    case 'cure': {
      const h = Math.round(p.maxhp * def.heal);
      p.hp = Math.min(p.maxhp, p.hp + h);
      addText(`+${h}`, p.x, p.y - 54, '#7de08a', 21, true);
      for (let i = 0; i < 12; i++) addPart(p.x + rand(-18, 18), p.y + rand(0, 20), rand(-20, 20), rand(-90, -40), '#7de08a', rand(2, 4), 0.8);
      Snd.sfx('heal'); break;
    }
    case 'hallowedGround':
      addBuff(p, 'invuln', '✨', 6, 1);
      addText('HALLOWED GROUND!', p.x, p.y - 60, '#ffe9a0', 20, true);
      G.rings.push({ x: p.x, y: p.y, r0: 20, r1: 130, t: 0, tmax: 0.5, color: '#ffe9a0', w: 5 });
      Snd.sfx('confirm'); break;
    case 'lucidDreaming': {
      const m = Math.round(p.maxmp * def.mana);
      p.mp = Math.min(p.maxmp, p.mp + m);
      addText(`+${m} MP`, p.x, p.y - 54, '#7cc7ff', 18);
      Snd.sfx('heal'); break;
    }
    case 'manaward':
      addBuff(p, 'manaward', '🔷', 15, Math.round(p.maxhp * def.shield));
      addText('MANAWARD', p.x, p.y - 54, '#7cc7ff', 17, true);
      Snd.sfx('confirm'); break;
    case 'blizzard': if (t) hitOne(t, pot), p.mp = Math.min(p.maxmp, p.mp + p.maxmp * def.mana); break;
    case 'aero': case 'thunder': {
      if (!t) break;
      hitOne(t, pot);
      const dot = t.dots.find(d => d.name === def.name);
      if (dot) { dot.t = def.dot.dur; dot.total = def.dot.total; }
      else t.dots.push({ name: def.name, icon: def.icon, t: def.dot.dur, total: def.dot.total, color: def.dot.color, tick: 0 });
      break;
    }
    case 'holy': {
      Snd.sfx('bigboom');
      G.flash = { color: '#fffbe8', t: 0.28, tmax: 0.28 };
      G.cam.shake = Math.max(G.cam.shake, 7);
      G.rings.push({ x: p.x, y: p.y, r0: 30, r1: def.aoeSelf + 30, t: 0, tmax: 0.45, color: '#fff3c4', w: 6 });
      for (const e of G.enemies) if (e.alive && dist(p.x, p.y, e.x, e.y) < def.aoeSelf + e.r) hitOne(e, pot);
      for (let i = 0; i < 24; i++) addPart(p.x, p.y, rand(-260, 260), rand(-260, 260), '#fff3c4', rand(2, 5), 0.6);
      break;
    }
    case 'flare': {
      if (!t) break;
      Snd.sfx('bigboom');
      G.cam.shake = Math.max(G.cam.shake, 10);
      const r = def.aoeTarget;
      G.rings.push({ x: tx, y: ty, r0: 20, r1: r + 40, t: 0, tmax: 0.5, color: '#ff9c2b', w: 7 });
      for (const e of G.enemies) if (e.alive && dist(tx, ty, e.x, e.y) < r + e.r) hitOne(e, pot);
      for (let i = 0; i < 34; i++) addPart(tx + rand(-30, 30), ty + rand(-30, 30), rand(-300, 300), rand(-320, 160), choice(['#ff9c2b', '#ffd75e', '#ff5b3b']), rand(3, 7), 0.8);
      break;
    }
    case 'shoulderTackle': {
      if (!t) break;
      p.dash = { t: 0, dur: 0.18, x0: p.x, y0: p.y, x1: tx - Math.cos(p.face) * (t.r + 12), y1: ty - Math.sin(p.face) * (t.r + 12), target: t, pot };
      Snd.sfx('swing'); break;
    }
    default: {
      // đòn cận chiến / projectile
      if (def.proj) {
        addProj({ x: p.x, y: p.y - 6, target: t, tx, ty, spd: 640, icon: def.icon, size: 26, pot, critBonus: def.critBonus || (comboOk ? 0.2 : 0), color: def.id === 'fire' ? '#ff9c2b' : def.id === 'stone' ? '#c9b8a0' : '#9fd0ff' });
        Snd.sfx(def.id === 'fire' ? 'fire' : 'cast');
      } else if (t) {
        hitOne(t, pot);
        addSlash(t.x, t.y, p.face, comboOk ? '#ffd75e' : '#ffffff');
        Snd.sfx('hit');
      }
      // hiệu ứng combo
      if (def.id === 'riotBlade' && comboOk) { p.mp = Math.min(p.maxmp, p.mp + p.maxmp * 0.12); addText('+MP', p.x, p.y - 44, '#7cc7ff', 14); }
      if (def.id === 'rageOfHalone' && t && comboOk) { t.atkDebuffT = 10; addText('ATK ↓', t.x, t.y - t.r - 26, '#c8a0ff', 14); }
      if (def.id === 'snapPunch' && comboOk) p.spdBuffT = 8;
      break;
    }
  }
  // combo chain
  if (def.combo) p.combo = { id: def.id, t: 6 };
  else if (def.gcd && def.range > 0) p.combo = null;
}
function tryPotion(p) {
  if (!p.alive || p.pot <= 0 || G.state !== 'duty' || G.paused) return false;
  if (p.hp >= p.maxhp && p.mp >= p.maxmp) return false;
  p.pot--;
  if (G.tut) G.tut.count.potion = (G.tut.count.potion || 0) + 1;
  const h = Math.round(p.maxhp * 0.45);
  p.hp = Math.min(p.maxhp, p.hp + h);
  p.mp = Math.min(p.maxmp, p.mp + p.maxmp * 0.3);
  addText(`+${h}`, p.x, p.y - 54, '#7de08a', 21, true);
  for (let i = 0; i < 10; i++) addPart(p.x + rand(-14, 14), p.y, rand(-15, 15), rand(-80, -40), '#7de08a', rand(2, 4), 0.7);
  Snd.sfx('heal');
  return true;
}
function tryLB(p) {
  if (!p.alive || p.lb < 100 || G.state !== 'duty' || G.paused) return false;
  p.lb = 0;
  Snd.sfx('lb');
  G.flash = { color: '#ffffff', t: 0.4, tmax: 0.4 };
  G.cam.shake = 14;
  const name = LB_NAME[p.job.role];
  addText(`⚡ ${name}!`, p.x, p.y - 74, '#ffe9a0', 26, true);
  if (p.job.role === 'TANK' || p.job.role === 'HEALER') {
    p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.6);
    addBuff(p, 'manaward', '🔷', 12, p.maxhp * 0.35);
    G.rings.push({ x: p.x, y: p.y, r0: 20, r1: 260, t: 0, tmax: 0.7, color: '#9fd0ff', w: 8 });
  } else {
    G.rings.push({ x: p.x, y: p.y, r0: 30, r1: 300, t: 0, tmax: 0.7, color: '#ffd75e', w: 9 });
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (dist(p.x, p.y, e.x, e.y) < 230 + e.r) {
        const { dmg, crit } = playerPotency(p, 900);
        dealToEnemy(e, dmg, { crit: true });
      }
    }
  }
  for (let i = 0; i < 40; i++) addPart(p.x + rand(-30, 30), p.y + rand(-20, 20), rand(-380, 380), rand(-380, 200), choice(['#ffe9a0', '#ffd75e', '#fff']), rand(3, 6), 0.9);
  return true;
}

function tryCounter(p) {
  if (!p || !p.alive || G.state !== 'duty' || G.paused) return false;
  const b = G.boss;
  if (!(b && b.alive && b.engaged && b.def.titan)) { G.toasts.push({ txt: 'Không có gì để chặn!', t: 0, tmax: 1, color: '#8b93a8' }); return false; }
  if (p.counterCd > 0) return false;
  if (!(b.cast && b.cast.counterable)) { G.toasts.push({ txt: 'Chưa có đòn nào để chặn!', t: 0, tmax: 1, color: '#8b93a8' }); return false; }
  if (dist(p.x, p.y, b.x, b.y) > 220 + b.r) { G.toasts.push({ txt: 'Xa quá — lại gần Titan!', t: 0, tmax: 1, color: '#ff9c6b' }); return false; }
  // PARRY!
  p.counterCd = 12;
  b.cast = null;
  cancelOwnerTelegraphs(b);
  b.stunT = 1.5;
  b.stagger = Math.min(100, (b.stagger || 0) + 30);
  if (b.stagger >= 100) titanStaggered(b, 5);
  addText('PARRY!', p.x, p.y - 60, '#9fe8ff', 24, true);
  G.rings.push({ x: b.x, y: b.y, r0: 30, r1: 160, t: 0, tmax: 0.4, color: '#9fe8ff', w: 6 });
  G.cam.shake = 6;
  Snd.sfx('parry');
  return true;
}

function updatePlayer(p, dt) {
  if (!p.alive) return;
  p.gcd = Math.max(0, p.gcd - dt);
  p.autoT -= dt; p.weaknessT = Math.max(0, p.weaknessT - dt);
  p.spdBuffT = Math.max(0, p.spdBuffT - dt);
  p.stunT = Math.max(0, (p.stunT || 0) - dt);
  p.flashT = Math.max(0, p.flashT - dt); p.hitFxT = Math.max(0, p.hitFxT - dt); p.castFxT = Math.max(0, p.castFxT - dt);
  p.counterCd = Math.max(0, p.counterCd - dt);
  p.mp = Math.min(p.maxmp, p.mp + (p.stance && p.stance.name === 'UI' ? 16 : 7) * dt);
  if (p.stance) { p.stance.t -= dt; if (p.stance.t <= 0) p.stance = null; }
  for (const s of p.skills) s.cd = Math.max(0, s.cd - dt);
  for (const b of p.buffs) b.t -= dt;
  p.buffs = p.buffs.filter(b => b.t > 0);
  if (p.combo) { p.combo.t -= dt; if (p.combo.t <= 0) p.combo = null; }
  if (p.target && !p.target.alive) retarget(p);

  // cast
  if (p.cast) {
    p.cast.t += dt;
    if (p.cast.t >= p.cast.tmax) finishCast(p);
  }
  // dash (Shoulder Tackle)
  if (p.dash) {
    p.dash.t += dt;
    const k = clamp(p.dash.t / p.dash.dur, 0, 1);
    p.x = lerp(p.dash.x0, p.dash.x1, easeOut(k));
    p.y = lerp(p.dash.y0, p.dash.y1, easeOut(k));
    addPart(p.x, p.y, rand(-20, 20), rand(-20, 20), '#cfe8ff', 3, 0.3);
    if (k >= 1) {
      const t = p.dash.target;
      if (t && t.alive) {
        const { dmg, crit } = playerPotency(p, p.dash.pot);
        dealToEnemy(t, dmg, { crit });
        t.stunT = Math.max(t.stunT || 0, 1.5);
        addSlash(t.x, t.y, p.face, '#cfe8ff');
        p.lb = Math.min(100, p.lb + 3);
        Snd.sfx('hit');
      }
      p.dash = null;
    }
  } else {
    // di chuyển
    const mv = (p.gaoled || (p.stunT || 0) > 0) ? { x: 0, y: 0, mag: 0 } : ((G.demo && G.demoMove) ? G.demoMove : Input.moveVec());
    const spd = 175 * (p.spdBuffT > 0 ? 1.14 : 1);
    if (mv.mag > 0.02) {
      p.x += mv.x * spd * dt;
      p.y += mv.y * spd * dt;
      p.face = Math.atan2(mv.y, mv.x);
      if (G.tut && mv.mag > 0.15) G.tut.count.move = (G.tut.count.move || 0) + spd * mv.mag * dt;
    }
  }
  // knockback
  if (p.kb.t > 0) {
    p.kb.t -= dt;
    p.x += p.kb.x * dt; p.y += p.kb.y * dt;
  }
  collideWorld(p);
  applyGates(p);

  // auto attack
  if (p.job.auto && p.target && p.target.alive && !p.cast) {
    const t = p.target;
    if (dist(p.x, p.y, t.x, t.y) < p.job.autoRange + t.r && p.autoT <= 0) {
      p.autoT = 2.8;
      p.face = ang(p.x, p.y, t.x, t.y);
      const { dmg, crit } = playerPotency(p, 90);
      dealToEnemy(t, dmg, { auto: true, crit });
      addSlash(t.x, t.y, p.face, '#e8e8e8');
      p.lb = Math.min(100, p.lb + 1.2);
      Snd.sfx('swing');
    }
  }
}
function retarget(p) {
  let best = null, bd = 520 * 520;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d2 = dist2(p.x, p.y, e.x, e.y);
    if (d2 < bd) { bd = d2; best = e; }
  }
  p.target = best;
}

// ---------- QUÁI ----------
function spawnEnemy(typeId, x, y, opts = {}) {
  const d = ETYPES[typeId];
  const e = {
    type: typeId, def: d, x, y, home: { x, y },
    hp: d.hp, maxhp: d.hp, r: d.r, alive: true, aggro: false,
    atkT: rand(0.4, 1.2), cast: null, stunT: 0, dots: [], flashT: 0,
    dir: rand(TAU), face: rand(TAU), wanderT: rand(1, 3), lungeT: 0, atkDebuffT: 0,
    packId: opts.pack || null, fate: opts.fate || false, defMul: 0, tier: opts.tier || 0,
    // boss
    engaged: false, abilityCd: 2.5, rotIdx: 0, atkBuff: 1,
    phase60: false, phase30: false, dash: null, clawCd: 1.5,
    phaseIdx: 0, vulnT: 0, stagger: 0, staggeredT: 0, shielded: false, rageNext: false, atkBuffT: 0,
    sd: false, fuse: opts.fuse || 0,
  };
  G.enemies.push(e);
  return e;
}
function aggroPack(packId) {
  for (const e of G.enemies) if (e.packId === packId && e.alive) e.aggro = true;
}
function killEnemy(e) {
  if (!e.alive) return;
  e.alive = false; e.cast = null;
  const p = G.player;
  gainXp(p, e.def.xp);
  p.lb = Math.min(100, p.lb + (e.def.isBoss ? 0 : 6));
  for (let i = 0; i < (e.def.isBoss ? 60 : 14); i++)
    addPart(e.x + rand(-e.r, e.r), e.y + rand(-e.r / 2, e.r / 2), rand(-120, 120), rand(-180, -30),
      choice(['#d9c48f', '#8b93a8', e.def.color]), rand(2, 5), 0.8);
  if (!e.def.isBoss) {
    if (Math.random() < 0.75) addPickup('gil', e.x + rand(-20, 20), e.y + rand(-14, 14), randi(4, 14));
    if (Math.random() < 0.2) addPickup('potion', e.x + rand(-20, 20), e.y + rand(-14, 14), 0);
  }
  // rớt trang bị theo iLvl khu vực
  if (e.tier && Math.random() < (e.def.nail ? 0 : 0.15)) dropGear(Math.random() < 0.5 ? 'weapon' : 'armor', e.tier);
  if (e.def.isBoss) { dropGear('weapon', e.def.dropTier || 60); dropGear('armor', e.def.dropTier || 60); }
  Snd.sfx('death');
  if (G.player.target === e) retarget(G.player);
  if (e.fate) G.fate.got++;
  if (!e.fate && !e.def.isBoss && !e.def.nail && !e.def.noCount) G.kills++;
  if (e.def.isBoss) { if (e.def.titan) bossDefeated(); else ifritDefeated(); }
  if (e.def.heart && G.boss && G.boss.alive && G.boss.def.titan) {
    G.boss.shielded = false;
    titanStaggered(G.boss, 6);
    G.toasts.push({ txt: '💫 Trái tim vỡ — Titan choáng 6s, DỒN DAMAGE!', t: 0, tmax: 2.4, color: '#ffe066' });
  }
  if (e.def.gaol && e.member) {
    e.member.gaoled = null;
    addText('TỰ DO!', e.x, e.y - 40, '#7de08a', 18, true);
  }
}

function updateEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    e.flashT = Math.max(0, e.flashT - dt);
    e.lungeT = Math.max(0, e.lungeT - dt);
    e.atkDebuffT = Math.max(0, e.atkDebuffT - dt);
    if (e.stunT > 0) { e.stunT -= dt; continue; }
    // DoT
    for (const d of e.dots) {
      d.t -= dt; d.tick -= dt;
      if (d.tick <= 0) {
        d.tick = 1;
        const { dmg } = playerPotency(p, d.total / (e.def.isBoss ? 2 : 1) / (d.total > 150 ? 8 : 6));
        dealToEnemy(e, dmg, { auto: true });
        addPart(e.x + rand(-8, 8), e.y - 10, 0, -40, d.color, 3, 0.5);
      }
    }
    e.dots = e.dots.filter(d => d.t > 0);

    if (e.def.gaol) { updateGaol(e, dt); continue; }
    if (e.def.heart) { updateHeart(e, dt); continue; }
    if (e.def.nail) { updateNail(e, dt); continue; }
    if (e.def.titan) { updateTitan(e, dt); continue; }
    if (e.def.isBoss) { updateIfrit(e, dt); continue; }

    // ---- quái thường ----
    if (e.cast) { // đang thi triển
      e.cast.t += dt;
      if (e.cast.t >= e.cast.tmax) {
        const done = e.cast;
        e.cast = null;
        if (done.onDone) done.onDone(e);
      }
      continue; // đứng yên khi cast
    }
    if (!e.aggro) {
      // aggro nếu MỘT THÀNH VIÊN BẤT KỲ trong party tới gần
      let near = false;
      for (const m of partyMembers()) {
        if (dist(e.x, e.y, m.x, m.y) < e.def.aggro) { near = true; break; }
      }
      if (near) {
        e.aggro = true;
        if (e.packId) aggroPack(e.packId);
        addText('!', e.x, e.y - e.r - 16, '#ff5b5b', 18, true);
      }
      // đi dạo
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = rand(1.5, 3.5); e.dir = rand(TAU); }
      e.x += Math.cos(e.dir) * 26 * dt; e.y += Math.sin(e.dir) * 26 * dt;
      e.face = e.dir;
      if (dist(e.x, e.y, e.home.x, e.home.y) > 90) e.dir = ang(e.x, e.y, e.home.x, e.home.y);
    } else {
      const tgt = enmityTarget(e);
      if (dist(e.x, e.y, e.home.x, e.home.y) > 950) {
        e.aggro = false; e.hp = e.maxhp; e.enmity = null;
        e.x = lerp(e.x, e.home.x, dt * 2); e.y = lerp(e.y, e.home.y, dt * 2);
        continue;
      }
      const d = dist(e.x, e.y, tgt.x, tgt.y);
      // Bomb: tự nổ khi sắp chết
      if (e.def.selfDestruct && !e.sd && e.hp < e.maxhp * 0.32) {
        e.sd = true;
        e.cast = { name: 'Self-Destruct', t: 0, tmax: 2.4, color: '#ff7a3d' };
        addTelegraph({ shape: 'circle', follow: e, r: 155, tmax: 2.4, dmg: 150, label: 'Self-Destruct' });
        G.toasts.push({ txt: '🎃 Bomb sắp tự nổ — chạy RA XA!', t: 0, tmax: 2, color: '#ff9c6b' });
        Snd.sfx('warn');
        continue;
      }
      if (e.def.ranged) {
        // Imp: giữ khoảng cách + ném cầu lửa
        if (d < e.def.keepDist - 40) { moveEnemy(e, ang(tgt.x, tgt.y, e.x, e.y), e.def.spd, dt); }
        else if (d > e.def.castRange - 30) { moveEnemy(e, ang(e.x, e.y, tgt.x, tgt.y), e.def.spd, dt); }
        e.atkT -= dt;
        if (e.atkT <= 0 && d < e.def.castRange) {
          e.atkT = e.def.atkCd;
          const aim = tgt;
          e.cast = {
            name: 'Fireball', t: 0, tmax: 1.1, color: '#c86af0',
            onDone: (self) => {
              addProj({ x: self.x, y: self.y - 8, target: aim, tx: aim.x, ty: aim.y, spd: 300, icon: '🟣', size: 22, flatDmg: self.def.dmg * 1.8, color: '#c86af0', enemyProj: true });
              Snd.sfx('fire');
            }
          };
        }
      } else {
        const anT = ang(e.x, e.y, tgt.x, tgt.y);
        if (d > e.def.atkRange) moveEnemy(e, anT, e.def.spd, dt);
        else e.face = anT;
        e.atkT -= dt;
        if (e.atkT <= 0 && d < e.def.atkRange + 14) {
          e.atkT = e.def.atkCd;
          e.lungeT = 0.22;
          e.face = anT;
          const dmg = e.def.dmg * (e.atkDebuffT > 0 ? 0.75 : 1);
          // Goblin ném bom có AoE cam (dạy né sớm), còn lại chém trực tiếp
          if (e.type === 'goblin' && Math.random() < 0.55) {
            addTelegraph({ shape: 'circle', x: tgt.x, y: tgt.y, r: 78, tmax: 1.6, dmg: dmg * 2.4, label: 'Bomb Toss' });
            Snd.sfx('cast');
          } else {
            hitMember(tgt, dmg);
            addSlash(tgt.x, tgt.y, anT, '#ffb0a0');
          }
        }
      }
    }
    collideWorld(e);
  }
  G.enemies = G.enemies.filter(e => e.alive || e.fadeT === undefined ? true : false);
}
function moveEnemy(e, a, spd, dt) {
  e.x += Math.cos(a) * spd * dt;
  e.y += Math.sin(a) * spd * dt;
  e.face = a;
}

// ---------- INFERAL NAIL ----------
function updateNail(e, dt) {
  e.fuse -= dt;
  if (e.fuse <= 0) {
    const ifrit = G.boss;
    e.alive = false;
    addText('💥 Searing Wind!', e.x, e.y - 30, '#ff7a3d', 18, true);
    for (let i = 0; i < 16; i++) addPart(e.x, e.y, rand(-160, 160), rand(-200, -40), '#ff7a3d', rand(3, 6), 0.7);
    if (ifrit && ifrit.alive) {
      ifrit.atkBuff += 0.35;
      G.toasts.push({ txt: '⚠ Ifrit mạnh lên (Nail chưa phá)!', t: 0, tmax: 2.2, color: '#ff7a3d' });
    }
  }
}

// ---------- IFRIT (BOSS) ----------
const IFITR_ROTATION = ['eruption', 'stack', 'plume', 'gaze', 'cyclone', 'spread', 'eruption', 'burst', 'tb', 'plume', 'stack', 'cyclone', 'gaze', 'eruption', 'spread', 'burst'];
const IFITR_ABIL = {
  eruption: { name: 'Eruption', cast: 3.0 },
  plume: { name: 'Radiant Plume', cast: 2.8 },
  cyclone: { name: 'Crimson Cyclone', cast: 3.2 },
  burst: { name: 'Vulcan Burst', cast: 2.3 },
  stack: { name: 'Searing Collapse', cast: 3.2 },
  spread: { name: 'Crimson Scatter', cast: 3.0 },
  tb: { name: 'Infernal Edge', cast: 2.6 },
  gaze: { name: 'Vulcan Gaze', cast: 3.0 },
};
function updateIfrit(e, dt) {
  const p = G.player;
  if (!e.engaged) {
    if (p.alive && p.x > MAP.arenaGateX + 90 && dist(p.x, p.y, MAP.arena.x, MAP.arena.y) < MAP.arena.r) engageBoss(e);
    return;
  }
  e.flashT = Math.max(0, e.flashT - dt);
  // dash Crimson Cyclone
  if (e.dash) {
    const step = 760 * dt;
    e.x += Math.cos(e.dash.a) * step;
    e.y += Math.sin(e.dash.a) * step;
    for (let i = 0; i < 3; i++) addPart(e.x + rand(-30, 30), e.y + rand(-30, 10), rand(-40, 40), rand(-140, -40), choice(['#ff7a3d', '#ffd75e']), rand(4, 8), 0.6);
    if (!e.dash.hit && dist(e.x, e.y, p.x, p.y) < e.r + 26) {
      e.dash.hit = true;
      damagePlayer(300 * e.atkBuff, 'Crimson Cyclone');
      const a = ang(e.dash.x0, e.dash.y0, e.x, e.y);
      p.kb = { x: Math.cos(a + Math.PI / 2) * (Math.random() < 0.5 ? 420 : -420), y: Math.sin(a + Math.PI / 2) * (Math.random() < 0.5 ? 420 : -420), t: 0.3 };
      G.cam.shake = 12;
    }
    e.dash.left -= step;
    const dc = dist(e.x, e.y, MAP.arena.x, MAP.arena.y);
    if (e.dash.left <= 0 || dc > MAP.arena.r - e.r - 20) {
      e.dash = null;
      e.x = clamp(e.x, MAP.arena.x - MAP.arena.r + e.r + 20, MAP.arena.x + MAP.arena.r - e.r - 20);
      e.y = clamp(e.y, MAP.arena.y - MAP.arena.r + e.r + 20, MAP.arena.y + MAP.arena.r - e.r - 20);
    }
    return;
  }
  // đang thi triển
  if (e.cast) {
    e.cast.t += dt;
    if (e.cast.t >= e.cast.tmax) e.cast = null; // telegraph tự resolve theo đúng thời điểm
    return;
  }
  // vuốt móng (đòn thường) — đánh vào người giữ enmity cao nhất (thường là tank)
  e.clawCd -= dt;
  const clawTgt = enmityTarget(e);
  if (e.clawCd <= 0 && clawTgt.alive && dist(e.x, e.y, clawTgt.x, clawTgt.y) < e.def.atkRange) {
    e.clawCd = e.def.atkCd;
    e.lungeT = 0.22;
    hitMember(clawTgt, e.def.dmg * 1.15 * e.atkBuff);
    addSlash(clawTgt.x, clawTgt.y, ang(e.x, e.y, clawTgt.x, clawTgt.y), '#ff7a3d');
  }
  // phase nail
  if (!e.phase60 && e.hp < e.maxhp * 0.6) { e.phase60 = true; spawnNails(e); }
  if (!e.phase30 && e.hp < e.maxhp * 0.3) { e.phase30 = true; spawnNails(e); }
  // rotation kỹ năng
  e.abilityCd -= dt;
  if (e.abilityCd <= 0 && p.alive) {
    const ab = IFITR_ROTATION[e.rotIdx % IFITR_ROTATION.length];
    e.rotIdx++;
    e.abilityCd = 4.6;
    castIfritAbility(e, ab);
  } else {
    // đuổi theo người giữ enmity
    const t2 = enmityTarget(e);
    const d = dist(e.x, e.y, t2.x, t2.y);
    if (d > 150) {
      const a = ang(e.x, e.y, t2.x, t2.y);
      e.x += Math.cos(a) * e.def.spd * dt;
      e.y += Math.sin(a) * e.def.spd * dt;
      e.face = a;
    }
  }
}
function engageBoss(e) {
  e.engaged = true;
  const gate = G.gates.find(g => g.id === (e.def.titan ? 'titan' : 'boss'));
  if (gate) { gate.closed = true; gate.anim = 0; }
  G.banner = { txt: '⚔ ENGAGE! ⚔', sub: `${e.def.name} — ${e.def.titan ? 'Primal của Đất' : 'Primal của Lửa'}`, t: 0, tmax: 2.4 };
  G.toasts.push(e.def.titan
    ? { txt: 'Đòn có viền XANH → bấm 🛡 COUNTER (phím 6) để chặn!', t: 0, tmax: 3, color: '#9fe8ff' }
    : { txt: 'Nếu Infernal Nail xuất hiện → PHÁ HỦY NGAY!', t: 0, tmax: 3, color: '#ff9c6b' });
  Snd.sfx('warn');
}
function ifritDefeated() {
  G.ifritDead = true;
  const gt = G.gates.find(g => g.id === 'titan');
  if (gt) gt.closed = false;
  G.boss = G.enemies.find(x => x.alive && x.def.titan) || G.boss;
  G.banner = { txt: '🔥 IFRIT GỤC NGÃ!', sub: 'Cổng đá phía đông đã mở — THE NAVEL chờ phía trước', t: 0, tmax: 3 };
  G.toasts.push({ txt: '🗿 Qua đường hầm phía phải: duty mới THE NAVEL — Titan!', t: 0, tmax: 3.4, color: '#e0c9a0' });
  Snd.sfx('gate');
}
function spawnNails(e) {
  for (let i = 0; i < 2; i++) {
    const a = rand(TAU);
    const nx = MAP.arena.x + Math.cos(a) * rand(180, 320);
    const ny = MAP.arena.y + Math.sin(a) * rand(180, 320);
    spawnEnemy('nail', nx, ny, { fuse: 13 });
  }
  G.banner = { txt: '🔥 INFERNAL NAIL 🔥', sub: 'Phá hủy Nail trước khi chúng phát nổ!', t: 0, tmax: 2.2 };
  Snd.sfx('warn');
}
function castIfritAbility(e, ab) {
  const p = G.player;
  const info = IFITR_ABIL[ab];
  e.cast = { name: info.name, t: 0, tmax: info.cast, color: '#ff7a3d' };
  Snd.sfx('cast');
  if (ab === 'stack') {
    // chọn ngẫu nhiên 1 thành viên — cả party phải đứng chồng vào người đó
    const members = partyMembers().filter(m => m.alive);
    const target = Math.random() < 0.55 ? p : choice(members);
    G.markers.push({ type: 'stack', followMember: target, t: 0, tmax: info.cast });
    G.toasts.push({ txt: '💥 STACK: chạy đến đứng CHUNG với người có marker!', t: 0, tmax: 2.2, color: '#ffd9a0' });
  } else if (ab === 'spread') {
    G.markers.push({ type: 'spread', t: 0, tmax: info.cast });
    G.toasts.push({ txt: '🔵 SPREAD: tản ra, ai nấy một chỗ!', t: 0, tmax: 2.2, color: '#9fd0ff' });
  } else if (ab === 'tb') {
    G.markers.push({ type: 'tb', followMember: enmityTarget(e), t: 0, tmax: info.cast });
    G.toasts.push({ txt: '🔻 TANK BUSTER: đòn nặng vào tank — mọi người tránh xa!', t: 0, tmax: 2.2, color: '#e0b0ff' });
  } else if (ab === 'gaze') {
    G.markers.push({ type: 'gaze', t: 0, tmax: info.cast });
    G.toasts.push({ txt: '👁️ GAZE: QUAY MẮT ĐI khỏi Ifrit trước khi hết cast!', t: 0, tmax: 2.2, color: '#ffd75e' });
  } else if (ab === 'eruption') {
    // 3 vòng cam: 1 cái đúng vị trí một thành viên (snapshot) + 2 cái ngẫu nhiên gần đó
    const members = partyMembers().filter(m => m.alive);
    const aim = Math.random() < 0.6 ? p : choice(members);
    const spots = [{ x: aim.x, y: aim.y }];
    for (let i = 0; i < 2; i++) spots.push({ x: aim.x + rand(-200, 200), y: aim.y + rand(-170, 170) });
    for (const s of spots) {
      const sx = clamp(s.x, MAP.arena.x - MAP.arena.r + 100, MAP.arena.x + MAP.arena.r - 100);
      const sy = clamp(s.y, MAP.arena.y - MAP.arena.r + 100, MAP.arena.y + MAP.arena.r - 100);
      addTelegraph({ shape: 'circle', x: sx, y: sy, r: 95, tmax: info.cast, dmg: 230 * e.atkBuff, label: info.name });
    }
  } else if (ab === 'plume') {
    // vành khuyên quanh Ifrit — AN TOÀN khi ôm sát boss hoặc đứng xa
    addTelegraph({ shape: 'annulus', follow: e, r1: 115, r2: 225, tmax: info.cast, dmg: 260 * e.atkBuff, label: info.name });
  } else if (ab === 'cyclone') {
    const a = ang(e.x, e.y, p.x, p.y);
    const len = 1150;
    const cx = e.x + Math.cos(a) * len / 2, cy = e.y + Math.sin(a) * len / 2;
    addTelegraph({ shape: 'rect', x: cx, y: cy, w: len, h: 150, ang: a, tmax: info.cast, dmg: 0, label: info.name,
      onResolve: () => {
        e.dash = { a, left: len - 120, x0: e.x, y0: e.y, hit: false };
        Snd.sfx('fire');
      } });
  } else if (ab === 'burst') {
    addTelegraph({ shape: 'circle', follow: e, r: 175, tmax: info.cast, dmg: 150 * e.atkBuff, label: info.name,
      knockback: 460 });
  }
}

// ---------- DUTY SUPPORT: NPC ĐỒNG ĐỘI + ENMITY ----------
function makeAllies() {
  G.allies = [];
  const spots = [['tank', -66, 52], ['healer', -70, -58]];
  for (const [id, ox, oy] of spots) {
    const d = ALLY_DEFS[id];
    G.allies.push({
      def: d, x: MAP.startX + ox, y: MAP.startY + oy, r: d.r,
      hp: d.hp, maxhp: d.hp, alive: true, deadT: 0, atkT: rand(0.5, 1.5), raiseT: 0,
      face: 0, lungeT: 0, flashT: 0, hitFxT: 0, stunT: 0, danger: null,
    });
  }
}
function partyMembers() {
  return [G.player, ...G.allies.filter(a => a.alive)];
}
function enmityTarget(e) {
  if (!e.enmity) e.enmity = { player: 0, tank: 0, healer: 0 };
  let best = G.player, bv = -1;
  for (const k of ['player', 'tank', 'healer']) {
    let m = null, alive = false;
    if (k === 'player') m = G.player;
    else m = G.allies.find(a => a.def.id === k);
    alive = m && m.alive;
    if (alive && e.enmity[k] > bv) { bv = e.enmity[k]; best = m; }
  }
  return best;
}
function hitMember(m, dmg, label) {
  if (m === G.player) damagePlayer(dmg, label);
  else damageAlly(m, dmg, label);
}
function after(sec, fn) { G.delayed.push({ t: sec, fn }); }
function wipeParty(label) {
  for (const m of partyMembers()) if (m.alive) hitMember(m, 99999, label);
  G.cam.shake = 20; Snd.sfx('fail');
}
function damageAlly(a, amount, label) {
  if (!a.alive) return;
  a.hp -= amount;
  a.hitFxT = 0.25; a.flashT = 0.12;
  addText(`-${Math.round(amount)}`, a.x + rand(-8, 8), a.y - 44, '#ff8b8b', 15);
  if (a.hp <= 0) {
    a.hp = 0; a.alive = false; a.deadT = 22;
    addText(`💀 ${a.def.name} gục ngã!`, a.x, a.y - 56, '#ff5b5b', 16, true);
    Snd.sfx('death');
    // chuyển thù hận sang người còn sống
    for (const e of G.enemies) if (e.alive && e.enmity) e.enmity[a.def.id] = 0;
  }
}
function allyAttack(a, e) {
  const dmg = a.def.pot * a.def.atk / 60 * rand(0.92, 1.08);
  a.lungeT = 0.2;
  a.face = ang(a.x, a.y, e.x, e.y);
  dealToEnemy(e, dmg, { from: a.def.id });
  addSlash(e.x, e.y, a.face, a.def.id === 'tank' ? '#ffd9a0' : '#ffb0e0');
  Snd.sfx('hit2');
}
function healMember(a, m) {
  const h = Math.round(m.maxhp * 0.3);
  m.hp = Math.min(m.maxhp, m.hp + h);
  const isPlayer = m === G.player;
  addText(`+${h}`, m.x, m.y - 54, '#7de08a', isPlayer ? 20 : 15, isPlayer);
  // tia hồi máu
  for (let i = 0; i < 8; i++) {
    const k = i / 8;
    addPart(lerp(a.x, m.x, k) + rand(-6, 6), lerp(a.y, m.y, k) + rand(-6, 6), rand(-10, 10), rand(-50, -20), '#7de08a', 3, 0.5);
  }
  for (let i = 0; i < 6; i++) addPart(m.x + rand(-14, 14), m.y + rand(-4, 16), 0, rand(-60, -30), '#7de08a', 3, 0.6);
  // heal tạo enmity lên healer với quái đang đánh nhau
  for (const e of G.enemies) if (e.alive && e.aggro) { if (!e.enmity) e.enmity = { player: 0, tank: 0, healer: 0 }; e.enmity.healer += h * 0.4; }
  Snd.sfx('heal');
}
function allyMarkerMove(a) {
  for (const m of G.markers) {
    if (m.type === 'stack') {
      const t = m.followMember;
      if (t && t !== a) {
        const d = dist(a.x, a.y, t.x, t.y);
        if (d > 42) return { x: (t.x - a.x) / d, y: (t.y - a.y) / d };
        return { x: 0, y: 0 };
      }
    } else if (m.type === 'spread') {
      let ax = 0, ay = 0, push = 0;
      for (const other of partyMembers()) {
        if (other === a) continue;
        const d = dist(a.x, a.y, other.x, other.y);
        if (d < 160 && d > 0.01) { ax += (a.x - other.x) / d; ay += (a.y - other.y) / d; push++; }
      }
      if (push) { const n = Math.hypot(ax, ay) || 1; return { x: ax / n, y: ay / n }; }
      return { x: 0, y: 0 };
    }
  }
  return null;
}
function updateAllies(dt) {
  const p = G.player;
  for (const a of G.allies) {
    a.flashT = Math.max(0, a.flashT - dt);
    a.hitFxT = Math.max(0, a.hitFxT - dt);
    a.lungeT = Math.max(0, a.lungeT - dt);
    a.raiseT = Math.max(0, a.raiseT - dt);
    if (!a.alive) {
      a.deadT -= dt;
      if (a.deadT <= 0) {
        a.alive = true; a.hp = a.maxhp * 0.6;
        a.x = p.x - 40 + rand(-20, 20); a.y = p.y + 40;
        addText(`${a.def.icon} ${a.def.name} đã trở lại!`, a.x, a.y - 40, '#7de08a', 15, true);
      }
      continue;
    }
    if (a.gaoled) continue;
    if (a.stunT > 0) { a.stunT -= dt; continue; }

    // chọn mục tiêu: quái đang chiến đấu gần nhất
    let tgt = null, bd = 1e9;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const engaged = e.aggro || (e.def.isBoss && e.engaged);
      if (!engaged) continue;
      const d2 = dist2(a.x, a.y, e.x, e.y);
      if (d2 < bd) { bd = d2; tgt = e; }
    }

    // ưu tiên 1: theo marker (stack/spread)
    const mv = allyMarkerMove(a);
    // ưu tiên 2: né telegraph sắp nổ
    a.danger = null;
    for (const tg of G.telegraphs) {
      if (tg.tmax - tg.t < 1.0 && telegraphHitTest(tg, a.x, a.y)) {
        const x = tg.follow ? tg.follow.x : tg.x, y = tg.follow ? tg.follow.y : tg.y;
        let an = ang(x, y, a.x, a.y);
        if (tg.shape === 'annulus') an += Math.PI;
        a.danger = { x: Math.cos(an), y: Math.sin(an) };
        break;
      }
    }
    if (mv) { a.x += mv.x * a.def.spd * dt; a.y += mv.y * a.def.spd * dt; }
    else if (a.danger) { a.x += a.danger.x * a.def.spd * dt; a.y += a.danger.y * a.def.spd * dt; }
    else if (tgt) {
      const d = dist(a.x, a.y, tgt.x, tgt.y);
      if (a.def.id === 'tank') {
        if (d > tgt.r + 34) moveAlly(a, ang(a.x, a.y, tgt.x, tgt.y), a.def.spd, dt);
        a.atkT -= dt;
        if (a.atkT <= 0 && d < tgt.r + 70) { a.atkT = a.def.atkCd; allyAttack(a, tgt); }
      } else {
        // healer giữ khoảng cách, ưu tiên hồi máu
        if (d < 200) moveAlly(a, ang(tgt.x, tgt.y, a.x, a.y), a.def.spd * 0.7, dt);
        a.atkT -= dt;
        if (a.atkT <= 0) {
          const wounded = partyMembers().filter(m => m.hp < m.maxhp * 0.8)
            .sort((x, y) => x.hp / x.maxhp - y.hp / y.maxhp)[0];
          if (wounded) { a.atkT = a.def.atkCd; healMember(a, wounded); }
          else if (d < 430) { a.atkT = a.def.atkCd; allyAttack(a, tgt); }
        }
        // Raise đồng đội chết
        const dead = G.allies.find(x => !x.alive);
        if (dead && dead.deadT > 12 && a.raiseT <= 0) {
          a.raiseT = 10; dead.deadT = 2.2;
          addText(`🌸 Raise ${dead.def.name}...`, a.x, a.y - 36, '#c8a0ff', 14);
        }
      }
    } else {
      // yên bình: đi theo người chơi
      const tx = p.x - 64, ty = p.y + (a.def.id === 'tank' ? 52 : -56);
      const d = dist(a.x, a.y, tx, ty);
      if (d > 26) moveAlly(a, ang(a.x, a.y, tx, ty), a.def.spd, dt);
    }
    collideWorld(a);
    if (a.face === undefined) a.face = 0;
  }
}
function moveAlly(a, an, spd, dt) {
  a.x += Math.cos(an) * spd * dt;
  a.y += Math.sin(an) * spd * dt;
  a.face = an;
}

// ---------- MARKER BOSS (Stack / Spread / Tank Buster / Gaze) ----------
function updateMarkers(dt) {
  for (const m of G.markers) {
    m.t += dt;
    if (m.t < m.tmax) continue;
    m.done = true;
    if (m.type === 'stack') {
      const c = m.followMember;
      const soakers = partyMembers().filter(mm => mm.alive && dist(mm.x, mm.y, c.x, c.y) < 95);
      const each = Math.round(700 / Math.max(1, soakers.length));
      G.rings.push({ x: c.x, y: c.y, r0: 40, r1: 120, t: 0, tmax: 0.35, color: '#ff9c2b', w: 6 });
      for (const s of soakers) hitMember(s, each, 'Stack');
      if (soakers.length <= 1 && G.player.alive)
        G.toasts.push({ txt: '💥 STACK: cần đứng CHUNG với đồng đội để chia damage!', t: 0, tmax: 2.4, color: '#ff9c6b' });
      Snd.sfx('boom');
    } else if (m.type === 'spread') {
      for (const mem of partyMembers()) {
        if (!mem.alive) continue;
        G.rings.push({ x: mem.x, y: mem.y, r0: 20, r1: 110, t: 0, tmax: 0.3, color: '#7cc7ff', w: 5 });
        for (const other of partyMembers()) {
          if (!other.alive) continue;
          if (dist(mem.x, mem.y, other.x, other.y) < 118) {
            const dmg = 210 + (other !== mem ? 140 : 0);
            hitMember(other, dmg, 'Spread');
          }
        }
      }
      Snd.sfx('boom');
    } else if (m.type === 'tb') {
      const t = m.followMember;
      G.rings.push({ x: t.x, y: t.y, r0: 30, r1: 130, t: 0, tmax: 0.35, color: '#c86af0', w: 7 });
      if (t.alive) hitMember(t, m.dmg || 620, m.label || 'Infernal Edge (Tank Buster)');
      G.cam.shake = Math.max(G.cam.shake, 8);
      Snd.sfx('bigboom');
    } else if (m.type === 'gaze') {
      const b = G.boss;
      if (!b || !b.alive) continue;
      for (const mem of partyMembers()) {
        if (!mem.alive) continue;
        if (mem !== G.player) continue; // NPC tự quay mặt đi
        const d = dist(mem.x, mem.y, b.x, b.y);
        const toB = ang(mem.x, mem.y, b.x, b.y);
        const diff = Math.abs(((mem.face - toB + Math.PI * 3) % TAU) - Math.PI);
        if (d < 540 && diff < 1.25) {
          damagePlayer(280, 'Vulcan Gaze — QUAY MẶT ĐI!');
        }
      }
      G.rings.push({ x: b.x, y: b.y, r0: b.r, r1: 540, t: 0, tmax: 0.4, color: '#ffd75e', w: 4 });
      Snd.sfx('warn');
    }
  }
  G.markers = G.markers.filter(m => !m.done);
}
function drawMarkers(ctx) {
  for (const m of G.markers) {
    const frac = clamp(m.t / m.tmax, 0, 1);
    const pulse = 0.7 + 0.3 * Math.sin(G.t * 9);
    ctx.save();
    if (m.type === 'stack') {
      const c = m.followMember;
      ctx.strokeStyle = `rgba(255,140,40,${pulse})`;
      ctx.fillStyle = 'rgba(255,120,20,0.18)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, 92, 62, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      drawEmoji(ctx, '💥', c.x, c.y - 58 - 6 * Math.sin(G.t * 5), 34);
      ttext(ctx, 'STACK — ĐỨNG CHUNG', c.x, c.y - 96, 13, '#ffd9a0', 'center', UI_FONT, pulse, 'bold');
    } else if (m.type === 'spread') {
      for (const mem of partyMembers()) {
        if (!mem.alive) continue;
        ctx.strokeStyle = `rgba(110,170,255,${pulse})`;
        ctx.fillStyle = 'rgba(80,140,255,0.16)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.ellipse(mem.x, mem.y, 62, 42, 0, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        drawEmoji(ctx, '🔵', mem.x, mem.y - 44, 20);
      }
      ttext(ctx, 'SPREAD — TẢN RA!', G.player.x, G.player.y - 100, 14, '#9fd0ff', 'center', UI_FONT, pulse, 'bold');
    } else if (m.type === 'tb') {
      const t = m.followMember;
      ctx.strokeStyle = `rgba(200,106,240,${pulse})`;
      ctx.fillStyle = 'rgba(180,80,240,0.18)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(t.x, t.y, 78, 52, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      drawEmoji(ctx, '🔻', t.x, t.y - 52, 28);
      ttext(ctx, 'TANK BUSTER', t.x, t.y - 84, 13, '#e0b0ff', 'center', UI_FONT, pulse, 'bold');
    } else if (m.type === 'gaze') {
      const b = G.boss;
      if (!b) continue;
      drawEmoji(ctx, '👁️', b.x, b.y - b.r - 46 + 4 * Math.sin(G.t * 4), 40);
      ttext(ctx, 'QUAY MẶT ĐI!', b.x, b.y - b.r - 86, 16, '#ffd75e', 'center', UI_FONT, pulse, 'bold');
      // cảnh báo nếu người chơi đang nhìn boss
      const p = G.player;
      const toB = ang(p.x, p.y, b.x, b.y);
      const diff = Math.abs(((p.face - toB + Math.PI * 3) % TAU) - Math.PI);
      if (diff < 1.25 && dist(p.x, p.y, b.x, b.y) < 540) {
        drawEmoji(ctx, '❗', p.x, p.y - 64, 22, pulse);
      }
    }
    ctx.restore();
  }
}

// ---------- RỚT ĐỒ iLvl ----------
function dropGear(kind, ilvl) {
  const p = G.player, g = p.gear;
  const cur = kind === 'weapon' ? g.weaponIlvl : g.armorIlvl;
  if (ilvl <= cur) { G.gil += 10; return; }
  if (kind === 'weapon') { g.weaponIlvl = ilvl; g.weaponAtk = Math.round(ilvl * 0.35); }
  else { g.armorIlvl = ilvl; g.armorHp = Math.round(ilvl * 4); g.armorDef = +(ilvl * 0.12).toFixed(1); }
  recalcStats(p);
  G.toasts.push({
    txt: `${kind === 'weapon' ? '🗡️ Vũ khí' : '🛡️ Giáp'} iLvl ${ilvl} — tự trang bị!`,
    t: 0, tmax: 2.6, color: '#7de08a'
  });
  Snd.sfx('confirm');
  for (let i = 0; i < 14; i++) addPart(p.x + rand(-16, 16), p.y, rand(-60, 60), rand(-170, -50), '#7de08a', rand(2, 5), 0.8);
}

// ---------- TELEGRAPH (AoE cam) ----------
function addTelegraph(tg) { tg.t = 0; G.telegraphs.push(tg); }
function telegraphHitTest(tg, px, py) {
  const x = tg.follow ? tg.follow.x : tg.x, y = tg.follow ? tg.follow.y : tg.y;
  if (tg.shape === 'circle') return pointInCircle(px, py, x, y, tg.r);
  if (tg.shape === 'annulus') return pointInAnnulus(px, py, x, y, tg.r1, tg.r2);
  if (tg.shape === 'rect') return pointInRotRect(px, py, x, y, tg.w, tg.h, tg.ang);
  if (tg.shape === 'sector') return pointInSector(px, py, x, y, tg.r, tg.ang, tg.spread);
  return false;
}
function updateTelegraphs(dt) {
  const p = G.player;
  for (const tg of G.telegraphs) {
    tg.t += dt;
    if (tg.t >= tg.tmax) {
      tg.done = true;
      const x = tg.follow ? tg.follow.x : tg.x, y = tg.follow ? tg.follow.y : tg.y;
      // hiệu ứng nổ
      if (tg.shape === 'circle') {
        G.rings.push({ x, y, r0: tg.r * 0.4, r1: tg.r + 26, t: 0, tmax: 0.32, color: '#ff9c2b', w: 6 });
        for (let i = 0; i < 16; i++) addPart(x + rand(-tg.r / 2, tg.r / 2), y + rand(-tg.r / 3, tg.r / 3), rand(-120, 120), rand(-220, -60), choice(['#ff7a3d', '#ffd75e']), rand(3, 6), 0.6);
        Snd.sfx('boom'); G.cam.shake = Math.max(G.cam.shake, 5);
      } else if (tg.shape === 'annulus') {
        for (let i = 0; i < 22; i++) {
          const a = rand(TAU), rr = rand(tg.r1, tg.r2);
          addPart(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rand(-60, 60), rand(-200, -80), choice(['#ff7a3d', '#ffd75e']), rand(3, 6), 0.6);
        }
        Snd.sfx('boom'); G.cam.shake = Math.max(G.cam.shake, 6);
      } else if (tg.shape === 'rect') {
        for (let i = 0; i < 18; i++) {
          const lx = rand(-tg.w / 2, tg.w / 2), ly = rand(-tg.h / 2, tg.h / 2);
          addPart(x + Math.cos(tg.ang) * lx - Math.sin(tg.ang) * ly, y + Math.sin(tg.ang) * lx + Math.cos(tg.ang) * ly, rand(-60, 60), rand(-180, -60), '#ff7a3d', rand(3, 7), 0.6);
        }
      }
      if (tg.dmg > 0 && p.alive && telegraphHitTest(tg, p.x, p.y)) {
        if (tg.owner && tg.owner.def && tg.owner.def.titan) tg.owner.dodgeStreak = 0;
        damagePlayer(tg.dmg, tg.label);
        if (tg.knockback) {
          const a = ang(x, y, p.x, p.y);
          p.kb = { x: Math.cos(a) * tg.knockback, y: Math.sin(a) * tg.knockback, t: 0.32 };
          G.cam.shake = 10;
        }
      } else if (tg.dmg > 0 && p.alive) {
        // né thành công — đếm cho hướng dẫn
        if (tg.owner && tg.owner.def && tg.owner.def.titan) tg.owner.dodgeStreak = (tg.owner.dodgeStreak || 0) + 1;
        if (G.tut) G.tut.count.dodge = (G.tut.count.dodge || 0) + 1;
      }
      // telegraph cũng làm đồng đội bị thương nếu không né kịp
      if (tg.dmg > 0) {
        for (const a of G.allies || []) {
          if (a.alive && telegraphHitTest(tg, a.x, a.y)) damageAlly(a, tg.dmg * 0.7, tg.label);
        }
      }
      // Bomb tự nổ — vẫn tính là kill (XP/gil/kills++) như dí nổ bằng damage
      if (tg.follow && tg.follow.def && tg.follow.def.selfDestruct && tg.follow.alive) {
        tg.follow.hp = 0;
        addText('💥 BOOM!', tg.follow.x, tg.follow.y - 30, '#ff7a3d', 18, true);
        killEnemy(tg.follow);
      }
      if (tg.onResolve) tg.onResolve();
    }
  }
  G.telegraphs = G.telegraphs.filter(t => !t.done);
}
function drawTelegraphs(ctx) {
  for (const tg of G.telegraphs) {
    const x = tg.follow ? tg.follow.x : tg.x, y = tg.follow ? tg.follow.y : tg.y;
    const frac = clamp(tg.t / tg.tmax, 0, 1);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,150,40,0.95)';
    ctx.fillStyle = 'rgba(255,120,20,0.22)';
    const pulse = 0.75 + 0.25 * Math.sin(G.t * 10);
    if (tg.shape === 'circle') {
      ctx.beginPath(); ctx.ellipse(x, y, tg.r, tg.r * 0.62, 0, 0, TAU);
      ctx.fillStyle = 'rgba(255,120,20,0.16)'; ctx.fill(); ctx.stroke();
      // đĩa đổ đầy theo thời gian
      ctx.beginPath(); ctx.ellipse(x, y, tg.r * frac, tg.r * 0.62 * frac, 0, 0, TAU);
      ctx.fillStyle = `rgba(255,130,30,${0.34 * pulse})`; ctx.fill();
    } else if (tg.shape === 'annulus') {
      ctx.beginPath(); ctx.ellipse(x, y, tg.r2, tg.r2 * 0.62, 0, 0, TAU);
      ctx.fillStyle = 'rgba(255,120,20,0.16)'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, tg.r1, tg.r1 * 0.62, 0, 0, TAU); ctx.clip();
      ctx.clearRect(x - tg.r2, y - tg.r2, tg.r2 * 2, tg.r2 * 2);
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(x, y, tg.r2, tg.r2 * 0.62, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y, tg.r1, tg.r1 * 0.62, 0, 0, TAU); ctx.stroke();
      // fill theo góc quét
      ctx.beginPath();
      ctx.ellipse(x, y, tg.r2, tg.r2 * 0.62, 0, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.ellipse(x, y, tg.r1, tg.r1 * 0.62, 0, -Math.PI / 2 + TAU * frac, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,130,30,${0.34 * pulse})`; ctx.fill();
    } else if (tg.shape === 'rect') {
      ctx.translate(x, y); ctx.rotate(tg.ang);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-tg.w / 2, -tg.h / 2, tg.w, tg.h, 18) : ctx.rect(-tg.w / 2, -tg.h / 2, tg.w, tg.h);
      ctx.fillStyle = 'rgba(255,120,20,0.16)'; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.rect(-tg.w / 2, -tg.h / 2, tg.w * frac, tg.h);
      ctx.fillStyle = `rgba(255,130,30,${0.34 * pulse})`; ctx.fill();
    } else if (tg.shape === 'sector') {
      ctx.translate(x, y);
      const a0 = tg.ang - tg.spread / 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.ellipse(0, 0, tg.r, tg.r * 0.62, 0, a0, a0 + tg.spread * frac); ctx.closePath();
      ctx.fillStyle = `rgba(255,130,30,${0.34 * pulse})`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.ellipse(0, 0, tg.r, tg.r * 0.62, 0, a0, a0 + tg.spread); ctx.closePath();
      ctx.fillStyle = 'rgba(255,120,20,0.14)'; ctx.fill(); ctx.stroke();
      if (tg.safeAng !== undefined) {
        ctx.strokeStyle = `rgba(110,255,170,${0.7 + 0.3 * Math.sin(G.t * 10)})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(0, 0, tg.r * 0.9, tg.r * 0.9 * 0.62, 0, tg.safeAng - Math.PI / 4, tg.safeAng + Math.PI / 4); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------- ĐẠN / HIỆU ỨNG ----------
function addProj(pr) {
  pr.t = 0;
  G.projs.push(pr);
}
function updateProjs(dt) {
  for (const pr of G.projs) {
    pr.t += dt;
    const homing = pr.enemyProj ? ((pr.target && pr.target.alive) ? pr.target : null) : (pr.target && pr.target.alive ? pr.target : null);
    if (homing) { pr.tx = homing.x; pr.ty = homing.y; }
    const d = dist(pr.x, pr.y, pr.tx, pr.ty);
    if (d < 24) {
      pr.done = true;
      if (pr.enemyProj) {
        const t = (pr.target && pr.target.alive) ? pr.target : null;
        if (t && dist(pr.x, pr.y, t.x, t.y) < t.r + 26) hitMember(t, pr.flatDmg, 'Fireball');
        for (let i = 0; i < 8; i++) addPart(pr.x, pr.y, rand(-90, 90), rand(-90, 90), '#c86af0', 3, 0.4);
      } else {
        const t = (pr.target && pr.target.alive) ? pr.target : null;
        if (t && dist(pr.x, pr.y, t.x, t.y) < t.r + 30) {
          const p = G.player;
          const { dmg, crit } = playerPotency(p, pr.pot, { critBonus: pr.critBonus });
          dealToEnemy(t, dmg, { crit });
          p.lb = Math.min(100, p.lb + 2.4);
          addSlash(t.x, t.y, ang(pr.x, pr.y, t.x, t.y), pr.color);
        }
        for (let i = 0; i < 8; i++) addPart(pr.x, pr.y, rand(-100, 100), rand(-100, 100), pr.color, 3, 0.4);
        Snd.sfx(pr.icon === '🔥' ? 'fire' : 'hit');
      }
      continue;
    }
    const a = ang(pr.x, pr.y, pr.tx, pr.ty);
    pr.x += Math.cos(a) * pr.spd * dt;
    pr.y += Math.sin(a) * pr.spd * dt;
    pr.ang = a;
    if (pr.t > 4) pr.done = true;
  }
  G.projs = G.projs.filter(p => !p.done);
}
function drawProjs(ctx) {
  for (const pr of G.projs) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    if (pr.ang !== undefined) ctx.rotate(pr.ang);
    // đuôi lửa
    ctx.globalAlpha = 0.5;
    drawEmoji(ctx, '▪', -18, 0, 14);
    ctx.globalAlpha = 1;
    drawEmoji(ctx, pr.icon, 0, 0, pr.size);
    ctx.restore();
  }
}

function addPart(x, y, vx, vy, color, size, tmax) {
  if (G.parts.length > 420) return;
  G.parts.push({ x, y, vx, vy, color, size, t: 0, tmax });
}
function addBurst(x, y, color, n = 12, spd = 160) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(spd * 0.3, spd);
    addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 60, color, rand(2, 5), rand(0.4, 0.8));
  }
}
function addSlash(x, y, a, color) {
  G.slashes.push({ x, y, a, t: 0, tmax: 0.18, color });
}
function addText(txt, x, y, color, size, big = false) {
  if (G.texts.length > 60) G.texts.shift();
  G.texts.push({ txt, x, y, color, size, t: 0, tmax: big ? 1.3 : 1, vy: big ? -46 : -34 });
}
function updateParts(dt) {
  for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; }
  G.parts = G.parts.filter(p => p.t < p.tmax);
  for (const s of G.slashes) s.t += dt;
  G.slashes = G.slashes.filter(s => s.t < s.tmax);
  for (const t of G.texts) { t.t += dt; t.y += t.vy * dt; t.vy *= 0.94; }
  G.texts = G.texts.filter(t => t.t < t.tmax);
  for (const r of G.rings) r.t += dt;
  G.rings = G.rings.filter(r => r.t < r.tmax);
}
function drawParts(ctx) {
  for (const p of G.parts) {
    const a = 1 - p.t / p.tmax;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of G.slashes) {
    const k = s.t / s.tmax;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.strokeStyle = s.color; ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(0, 0, 20 + 26 * k, -0.7, 0.7); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const r of G.rings) {
    const k = r.t / r.tmax;
    ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - k * 0.6);
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, lerp(r.r0, r.r1, easeOut(k)), lerp(r.r0, r.r1, easeOut(k)) * 0.62, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawTexts(ctx) {
  for (const t of G.texts) {
    const k = t.t / t.tmax;
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
    ctx.font = `bold ${t.size}px ${UI_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(10,10,20,0.85)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- VẬT PHẨM RƠI ----------
function addPickup(type, x, y, val) { G.pickups.push({ type, x, y, val, t: 0 }); }
function updatePickups(dt) {
  const p = G.player;
  for (const it of G.pickups) {
    it.t += dt;
    if (!p.alive) continue;
    const d = dist(it.x, it.y, p.x, p.y);
    if (d < 100) {
      const a = ang(it.x, it.y, p.x, p.y);
      it.x += Math.cos(a) * 320 * dt; it.y += Math.sin(a) * 320 * dt;
    }
    if (d < 30) {
      it.done = true; Snd.sfx('pickup');
      if (G.tut) G.tut.count.pickup = (G.tut.count.pickup || 0) + 1;
      if (it.type === 'gil') { G.gil += it.val; addText(`+${it.val} gil`, p.x, p.y - 40, '#ffd75e', 14); }
      else { p.pot = Math.min(5, p.pot + 1); addText('+1 🧪', p.x, p.y - 40, '#7de08a', 14); }
    }
  }
  G.pickups = G.pickups.filter(i => !i.done && i.t < 40);
}
function drawPickups(ctx) {
  for (const it of G.pickups) {
    const bob = Math.sin(it.t * 4) * 4;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(it.x, it.y + 10, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    drawEmoji(ctx, it.type === 'gil' ? '💰' : '🧪', it.x, it.y - 6 + bob, 24, 1, it.type === 'gil' ? 'G' : 'P');
  }
}

// ---------- TITAN (BOSS 2) ----------
const TITAN_PHASES = [
  {
    id: 'p1', name: 'GIAI ĐOẠN 1 — ĐẤT RUNG', gate: 0.70, tempo: 1.0,
    actions: ['landslide', 'geocrush', 'bury', 'tumult', 'landslide', 'geocrush', 'bury'],
  },
  {
    id: 'p2', name: 'GIAI ĐOẠN 2 — CỖI ĐÁ', gate: 0.35, tempo: 0.9,
    actions: ['crossslide', 'bomb', 'gaol', 'geocrush', 'bury', 'gaol', 'bomb', 'crossslide'],
  },
  {
    id: 'p3', name: 'GIAI ĐOẠN 3 — CƠN THỊNH NỘ', gate: 0, tempo: 0.75,
    actions: ['fury', 'upheaval', 'mountainbuster', 'bury', 'fury', 'crossslide'],
  },
];

function castTitanAbility(e, id) {
  const tempo = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)].tempo;
  const base = { landslide: 2.6, geocrush: 2.8, tumult: 2.2, bury: 2.6, crossslide: 2.4, bomb: 2.5, gaol: 2.6, fury: 7.0, upheaval: 2.4, mountainbuster: 2.6 }[id] || 2.6;
  const tmax = base * tempo * (e.rageNext ? 0.8 : 1);
  if (e.rageNext) {
    G.toasts.push({ txt: '🗿 Titan NỔI GIẬN — ra đòn nhanh hơn!', t: 0, tmax: 1.6, color: '#ff9c6b' });
    e.rageNext = false;
  }
  e.cast = { id, name: { landslide: 'Landslide', geocrush: 'Geocrush', tumult: 'Tumult', bury: 'Bury', crossslide: 'Cross Slide', bomb: 'Bombardment', gaol: 'Granite Gaol', fury: 'Earthen Fury', upheaval: 'Upheaval', mountainbuster: 'Mountain Buster' }[id] || id, t: 0, tmax, color: '#e0c9a0' };
  Snd.sfx('cast');
  if (id === 'landslide') {
    // AI thích ứng: nhắm người ĐỨNG XA boss nhất
    let far = null, fd = -1;
    for (const m of partyMembers()) { if (!m.alive) continue; const d = dist(e.x, e.y, m.x, m.y); if (d > fd) { fd = d; far = m; } }
    const a = far ? ang(e.x, e.y, far.x, far.y) : rand(TAU);
    const len = 900, cx = e.x + Math.cos(a) * len / 2, cy = e.y + Math.sin(a) * len / 2;
    addTelegraph({ owner: e, shape: 'rect', x: cx, y: cy, w: len, h: 130, ang: a, tmax, dmg: 300 * e.atkBuff, label: 'Landslide' });
  } else if (id === 'geocrush') {
    addTelegraph({ owner: e, shape: 'circle', follow: e, r: 230, tmax, dmg: 260 * e.atkBuff, knockback: 520, label: 'Geocrush' });
  } else if (id === 'tumult') {
    e.cast.onDone = (self) => {
      for (const m of partyMembers()) if (m.alive) hitMember(m, 160 * self.atkBuff, 'Tumult');
      G.cam.shake = 8; Snd.sfx('boom');
    };
  } else if (id === 'bury') {
    e.cast.counterable = true;
    e.cast.color = '#6ee7ff';
    e.cast.onDone = (self) => {
      for (const m of partyMembers()) if (m.alive) hitMember(m, m.maxhp * 0.8, 'Bury — không COUNTER!');
      G.cam.shake = 16; Snd.sfx('bigboom');
    };
  } else if (id === 'crossslide') {
    let far = null, fd = -1;
    for (const m of partyMembers()) { if (!m.alive) continue; const d = dist(e.x, e.y, m.x, m.y); if (d > fd) { fd = d; far = m; } }
    const base = far ? ang(e.x, e.y, far.x, far.y) : rand(TAU);
    for (const off of [Math.PI / 4, -Math.PI / 4]) {
      const a = base + off, len = 850;
      const cx = e.x + Math.cos(a) * len / 2, cy = e.y + Math.sin(a) * len / 2;
      addTelegraph({ owner: e, shape: 'rect', x: cx, y: cy, w: len, h: 120, ang: a, tmax, dmg: 300 * e.atkBuff, label: 'Cross Slide' });
    }
  } else if (id === 'bomb') {
    // AI thích ứng: nhắm CẶP đứng GẦN NHAU nhất — ép tản ra
    const alive = partyMembers().filter(m => m.alive);
    let pair = [alive[0], alive[1]] || [G.player, G.player];
    let bd = Infinity;
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const d = dist(alive[i].x, alive[i].y, alive[j].x, alive[j].y);
      if (d < bd) { bd = d; pair = [alive[i], alive[j]]; }
    }
    for (const m of pair) if (m) addTelegraph({ owner: e, shape: 'circle', x: m.x, y: m.y, r: 85, tmax, dmg: 320 * e.atkBuff, label: 'Bomb' });
    G.toasts.push({ txt: '💣 SPREAD: 2 người đứng gần nhau bị ngắm — TẢN RA!', t: 0, tmax: 2, color: '#9fd0ff' });
  } else if (id === 'gaol') {
    if (e.skipFirstGaol) { e.skipFirstGaol = false; e.cast = null; return; }
    // AI thích ứng: 60% giam player, 40% giam NPC gây damage thấp nhất (thường healer)
    const allies = G.allies.filter(a => a.alive);
    let tgt = G.player;
    if (Math.random() < 0.4 && allies.length) {
      tgt = allies.reduce((b, a) => a.hp < b.hp ? a : b, allies[0]);
    }
    e.cast.onDone = (self) => { if (tgt.alive && !tgt.gaoled) spawnGaol(tgt); };
  } else if (id === 'mountainbuster') {
    e.cast.onDone = (self) => {
      G.markers.push({ type: 'tb', followMember: enmityTarget(self), t: 0, tmax: 1.2, dmg: 700 * self.atkBuff, label: 'Mountain Buster' });
      G.toasts.push({ txt: '🔻 MOUNTAIN BUSTER — tank ăn đòn nặng, người khác tránh xa!', t: 0, tmax: 2, color: '#e0b0ff' });
    };
  } else if (id === 'upheaval') {
    e.cast.counterable = true;
    e.cast.color = '#6ee7ff';
    e.cast.onDone = (self) => {
      const A = MAP.titanArena;
      for (const m of partyMembers()) {
        if (!m.alive) continue;
        const a = ang(A.x, A.y, m.x, m.y);
        if (m === G.player) {
          m.kb = { x: Math.cos(a) * 780, y: Math.sin(a) * 780, t: 0.34 };
          after(0.4, () => {
            if (!m.alive) return;
            if (dist(m.x, m.y, A.x, A.y) > A.r - 120) {
              damagePlayer(260 * self.atkBuff, 'Va viền đá — Upheaval');
              m.stunT = 1; // updatePlayer xử lý stun
            }
          });
        } else {
          m.x = A.x + Math.cos(a) * (A.r - 60);
          m.y = A.y + Math.sin(a) * (A.r - 60);
          if (Math.random() < 0.5) damageAlly(m, 200 * self.atkBuff, 'Upheaval');
        }
      }
      G.cam.shake = 14; Snd.sfx('rumble');
    };
  } else if (id === 'fury') {
    // 3 đợt quét arena — mỗi đợt 1 góc an toàn, trúng 1 đợt = wipe
    G.toasts.push({ txt: '🌋 EARTHEN FURY — chạy vào GÓC XANH an toàn!', t: 0, tmax: 2.4, color: '#7dffb0' });
    Snd.sfx('rumble');
    let safe = rand(TAU);
    const wave = (n) => {
      if (n > 3) return;
      safe = safe + rand(-Math.PI / 4, Math.PI / 4);
      const dangerAng = safe + Math.PI;
      addTelegraph({
        owner: e, shape: 'sector', x: MAP.titanArena.x, y: MAP.titanArena.y,
        r: MAP.titanArena.r + 60, ang: dangerAng, spread: 1.5 * Math.PI, safeAng: safe,
        tmax: 2.2, dmg: 4000, label: 'Earthen Fury',
        onResolve: () => { wave(n + 1); },
      });
    };
    wave(1);
  }
}

function titanStaggered(e, dur) {
  if (G.staggerCheck && G.staggerCheck.titan === e) G.staggerCheck.ok = true;
  e.stagger = 0;
  e.staggeredT = dur;
  e.vulnT = dur;
  e.cast = null;
  cancelOwnerTelegraphs(e);
  G.banner = { txt: '💫 TITAN CHOÁNG!', sub: 'Dồn damage — nhận thêm 50% sát thương!', t: 0, tmax: 1.8 };
  addText('STAGGER!', e.x, e.y - e.r - 30, '#ffe066', 22, true);
  Snd.sfx('confirm'); G.cam.shake = 10;
  for (let i = 0; i < 20; i++) addPart(e.x + rand(-e.r, e.r), e.y + rand(-40, 20), rand(-120, 120), rand(-240, -60), '#ffe066', rand(3, 6), 0.8);
}

function updateTitan(e, dt) {
  const p = G.player;
  if (!e.engaged) {
    const A = MAP.titanArena;
    if (p.alive && G.ifritDead && p.x > MAP.titanGateX + 40 && dist(p.x, p.y, A.x, A.y) < A.r) engageBoss(e);
    return;
  }
  e.flashT = Math.max(0, e.flashT - dt);
  e.vulnT = Math.max(0, e.vulnT - dt);
  e.atkBuffT = Math.max(0, e.atkBuffT - dt);
  if (e.atkBuffT <= 0 && !e.enraged && e.atkBuff > 1) e.atkBuff = Math.max(1, e.atkBuff - dt * 0.25);
  if ((e.staggeredT || 0) <= 0) e.stagger = Math.max(0, (e.stagger || 0) - 5 * dt); // decay
  if (e.stunT > 0) return; // flinch — updateEnemies đã trừ stunT
  if ((e.staggeredT || 0) > 0) { e.staggeredT -= dt; return; }
  if (e.shielded) { // trái tim đá (task 6): đứng im giữa sân
    if (Math.random() < 0.3) addPart(e.x + rand(-e.r, e.r), e.y + rand(-e.r / 2, 0), 0, rand(-80, -30), '#c9b896', rand(3, 6), 0.8);
    return;
  }
  if (e.cast) {
    e.cast.t += dt;
    if (e.cast.t >= e.cast.tmax) { const c = e.cast; e.cast = null; if (c.onDone) c.onDone(e); }
    return;
  }
  // vuốt tay (đòn thường)
  e.clawCd -= dt;
  const clawTgt = enmityTarget(e);
  if (e.clawCd <= 0 && clawTgt.alive && dist(e.x, e.y, clawTgt.x, clawTgt.y) < e.def.atkRange) {
    e.clawCd = e.def.atkCd;
    e.lungeT = 0.22;
    hitMember(clawTgt, e.def.dmg * 1.15 * e.atkBuff);
    addSlash(clawTgt.x, clawTgt.y, ang(e.x, e.y, clawTgt.x, clawTgt.y), '#e0c9a0');
  }
  // phase trái tim đá tại 70%
  if (!e.heartDone && e.hp < e.maxhp * 0.7) {
    e.heartDone = true;
    e.cast = null;
    cancelOwnerTelegraphs(e);
    spawnHeart(e);
    G.cam.shake = 12; Snd.sfx('rumble');
    return;
  }
  // gate phase theo %HP
  const ph = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)];
  if (e.phaseIdx < TITAN_PHASES.length - 1 && e.hp < e.maxhp * ph.gate && e.heartDone && !G.enemies.some(x => x.alive && x.def.heart)) {
    e.phaseIdx++;
    e.rotIdx = 0;
    e.cast = null;
    cancelOwnerTelegraphs(e);
    const np = TITAN_PHASES[e.phaseIdx];
    G.banner = { txt: `🗿 ${np.name}`, sub: 'Titan đổi chiến thuật!', t: 0, tmax: 2.4 };
    Snd.sfx('rumble'); G.cam.shake = 14;
  }
  const phNow = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)];
  // Stagger Check đầu P2: 8s làm đầy gauge từ 0
  if (e.checkDone !== true && e.phaseIdx === 1 && !G.enemies.some(x => x.alive && (x.def.heart || x.def.gaol))) {
    if (G.staggerCheck === null || G.staggerCheck === undefined) {
      e.checkDone = false;
    }
    if (e.checkDone === false) {
      e.stagger = 0;
      G.staggerCheck = { t: 0, tmax: 8, titan: e };
      e.checkDone = 'running';
      G.banner = { txt: '⚡ STAGGER CHECK!', sub: 'LÀM RUNG CHUYỂN Titan trong 8 giây!', t: 0, tmax: 2 };
      Snd.sfx('warn');
    }
  }
  if (G.staggerCheck && G.staggerCheck.titan === e) {
    G.staggerCheck.t += dt;
    if (e.stagger >= 100 || G.staggerCheck.ok) {
      e.skipFirstGaol = true;
      G.staggerCheck = null;
      e.checkDone = true;
      G.toasts.push({ txt: '✅ STAGGER CHECK THÀNH CÔNG — bỏ qua Gaol đầu tiên!', t: 0, tmax: 2.4, color: '#7de08a' });
    } else if (G.staggerCheck.t >= G.staggerCheck.tmax) {
      G.staggerCheck = null;
      e.checkDone = true;
      e.hp = Math.min(e.maxhp, e.hp + e.maxhp * 0.04);
      for (const m of partyMembers()) if (m.alive) hitMember(m, 220, 'Stagger Check thất bại');
      e.atkBuff = Math.max(e.atkBuff, 1.2); e.atkBuffT = 20;
      G.toasts.push({ txt: '❌ Stagger Check thất bại — Titan hồi máu + mạnh lên!', t: 0, tmax: 2.4, color: '#ff5b5b' });
    }
  }
  // Phạt greed lưng: đứng sau Titan >4s → Seismic Slap
  if (!e.greed) e.greed = {};
  const rearBase = (e.face || 0) + Math.PI;
  for (const m of partyMembers()) {
    if (!m.alive || m.gaoled) continue;
    const key = m === G.player ? 'player' : m.def.id;
    const d = dist(e.x, e.y, m.x, m.y);
    const inRear = d < 380 && d > e.r && angDiff(ang(e.x, e.y, m.x, m.y), rearBase) < 0.9;
    e.greed[key] = inRear ? (e.greed[key] || 0) + dt : 0;
    if (e.greed[key] > 4 && !e.cast) {
      e.greed[key] = 0;
      addTelegraph({ owner: e, shape: 'sector', x: e.x, y: e.y, r: 340, ang: rearBase, spread: 1.9, tmax: 1.6, dmg: 340 * e.atkBuff, label: 'Seismic Slap' });
      G.toasts.push({ txt: '🗿 Phạt đứng sau lưng — SEISMIC SLAP!', t: 0, tmax: 1.6, color: '#ff9c6b' });
      Snd.sfx('rumble');
    }
  }
  // Tức giận: player né sạch 3 telegraph liên tiếp → đòn kế nhanh hơn 20%
  if ((e.dodgeStreak || 0) >= 3) { e.dodgeStreak = 0; e.rageNext = true; }
  // soft enrage P3: sau 3 phút, mỗi 10s mạnh thêm 5%
  if (e.phaseIdx === 2) {
    e.p3T = (e.p3T || 0) + dt;
    if (e.p3T > 180) {
      e.enraged = true;
      e.enrageAcc = (e.enrageAcc || 0) + dt;
      if (e.enrageAcc >= 10) { e.enrageAcc -= 10; e.atkBuff += 0.05; }
    }
  }
  // rotation kỹ năng
  e.abilityCd -= dt;
  if (e.abilityCd <= 0 && p.alive) {
    const list = phNow.actions;
    castTitanAbility(e, list[e.rotIdx % list.length]);
    e.rotIdx++;
    e.abilityCd = 4.2 * phNow.tempo;
  } else if (clawTgt.alive) {
    const d = dist(e.x, e.y, clawTgt.x, clawTgt.y);
    if (d > 170) {
      const a = ang(e.x, e.y, clawTgt.x, clawTgt.y);
      e.x += Math.cos(a) * e.def.spd * dt;
      e.y += Math.sin(a) * e.def.spd * dt;
      e.face = a;
    }
  }
}
function cancelOwnerTelegraphs(owner) {
  G.telegraphs = G.telegraphs.filter(t => t.owner !== owner);
}

// ---------- HEART OF STONE (P1.5) ----------
function spawnHeart(titan) {
  const A = MAP.titanArena;
  const h = spawnEnemy('heart', A.x, A.y - 120, { fuse: 12 });
  h.aggro = true;
  titan.shielded = true;
  G.banner = { txt: '💠 TRÁI TIM ĐÁ 💠', sub: 'PHÁ HỦY trong 12 giây — nếu không TOÀN BỘ GỤC NGÃ!', t: 0, tmax: 2.6 };
  G.toasts.push({ txt: '💠 Tập trung DPS vào Trái Tim ĐÁ — 12s!', t: 0, tmax: 2.6, color: '#c8b8ff' });
  Snd.sfx('rumble');
}
function updateHeart(e, dt) {
  e.fuse -= dt;
  if (e.fuse <= 0 && e.alive) {
    e.alive = false;
    wipeParty('Heart of Stone — không phá kịp!');
  }
}

// ---------- GRANITE GAOL (P2) ----------
function spawnGaol(member) {
  const g = spawnEnemy('gaol', member.x, member.y, { fuse: 10 });
  g.aggro = true;
  g.member = member;
  member.gaoled = g;
  if (member === G.player) G.player.target = g;
  G.banner = { txt: '🪨 GRANITE GAOL 🪨', sub: member === G.player ? 'Đồng đội PHÁ CÙI giải cứu bạn — 10s!' : `${member.def.name} bị giam — PHÁ CÙI NGAY (10s)!`, t: 0, tmax: 2.2 };
  Snd.sfx('rumble');
}
function updateGaol(e, dt) {
  e.fuse -= dt;
  if (e.member) { e.member.x = e.x; e.member.y = e.y; }
  if (e.fuse <= 0 && e.alive) {
    e.alive = false;
    const m = e.member;
    if (m) { m.gaoled = null; if (m.alive) m === G.player ? playerDie() : damageAlly(m, 99999, 'Granite Gaol'); }
    G.toasts.push({ txt: '🪨 Gaol không phá kịp — THÀNH VIÊN GỤC NGÃ!', t: 0, tmax: 2.4, color: '#ff5b5b' });
  }
}
