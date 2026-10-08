'use strict';
// ===== HUD & các màn hình UI =====
const HUD = {
  // vị trí nút skill (toạ độ logic) — kiểu Liên Quân; layout() tính lại theo màn hình
  skillBtns: [],
  lbBtn: { x: 0, y: 0, r: 38 },
  potBtn: { x: 0, y: 0, r: 30 },
  pauseBtn: { x: 0, y: 0, r: 20 },
  helpBtn: { x: 0, y: 0, r: 20 },
  // nút UI các màn hình (đặt lại mỗi lần render để hit-test)
  zones: [],

  // Tính lại vị trí nút: neo cụm skill vào góc dưới-phải, pause/help vào góc trên-phải.
  // Máy nhỏ (điện thoại) phóng cụm nút thêm s lần cho dễ bấm; desktop giữ nguyên 1280x720.
  layout() {
    const s = G.smallUI ? 1.2 : 1;
    const T = (x, y, r) => ({ x: G.VW + (x - 1280) * s, y: G.VH + (y - 720) * s, r: r * s });
    this.skillBtns = [T(1160, 590, 52), T(1058, 650, 46), T(1058, 524, 46), T(952, 588, 44)]; // Q, E, R, F
    this.lbBtn = T(852, 548, 38);
    this.counterBtn = T(866, 460, 38);
    this.potBtn = T(1206, 452, 30);
    this.pauseBtn = { x: G.VW - 36, y: 22, r: 20 };
    this.helpBtn = { x: G.VW - 84, y: 22, r: 20 };
  },

  zone(id, x, y, w, h) { this.zones.push({ id, x, y, w, h }); return { x, y, w, h }; },
  zoneAt(px, py) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z;
    }
    return null;
  },
  btnAt(px, py) {
    const circ = (b) => dist2(px, py, b.x, b.y) <= b.r * b.r;
    if (circ(this.pauseBtn)) return { id: 'pause' };
    if (circ(this.helpBtn)) return { id: 'help' };
    if (circ(this.potBtn)) return { id: 'potion' };
    if (circ(this.lbBtn)) return { id: 'lb' };
    if (circ(this.counterBtn)) return { id: 'counter' };
    for (let i = 0; i < this.skillBtns.length; i++) if (circ(this.skillBtns[i])) return { id: 'skill', idx: i };
    return null;
  },

  panel(ctx, x, y, w, h, alpha = 0.86) {
    roundRect(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, `rgba(16,22,44,${alpha})`);
    g.addColorStop(1, `rgba(8,11,24,${alpha})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
  },
  bar(ctx, x, y, w, h, k, color, bg = 'rgba(8,12,22,0.85)') {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    if (k > 0) {
      roundRect(ctx, x + 1, y + 1, Math.max(h - 2, (w - 2) * clamp(k, 0, 1)), h - 2, (h - 2) / 2);
      ctx.fillStyle = color; ctx.fill();
    }
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.strokeStyle = 'rgba(217,196,143,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  },

  // ================= TITLE =================
  drawTitle(ctx) {
    this.zones = [];
    const cx = G.VW / 2, yr = y => G.VH * y / 720;
    // nền
    const g = ctx.createRadialGradient(cx, yr(300), 60, cx, yr(400), 800);
    g.addColorStop(0, '#1c2440'); g.addColorStop(1, '#070a14');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, G.VH);
    // tro bay
    for (let i = 0; i < 60; i++) {
      const x = (i * 197 + G.t * (14 + (i % 7) * 5)) % G.VW;
      const y = (G.VH - ((G.t * (10 + (i % 5) * 7) + i * 131) % G.VH));
      ctx.fillStyle = `rgba(255,${140 + (i % 5) * 20},60,${0.14 + 0.1 * Math.sin(G.t * 2 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, TAU); ctx.fill();
    }
    // tinh thể
    ctx.save();
    ctx.translate(cx, yr(218));
    const sc = 1 + 0.04 * Math.sin(G.t * 1.8);
    ctx.scale(sc, sc);
    const cg = ctx.createLinearGradient(0, -90, 0, 90);
    cg.addColorStop(0, '#9fd0ff'); cg.addColorStop(0.5, '#4d7dd6'); cg.addColorStop(1, '#1c2440');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(0, -95); ctx.lineTo(52, -20); ctx.lineTo(30, 88); ctx.lineTo(-30, 88); ctx.lineTo(-52, -20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d9e8ff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-52, -20); ctx.lineTo(52, -20); ctx.moveTo(0, -95); ctx.lineTo(0, 88);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // chữ
    ttext(ctx, 'FINAL FANTASY', cx, yr(356), 40, '#e8ecf5', 'center', TITLE_FONT, 1, 'bold');
    ttext(ctx, 'X I V', cx, yr(410), 52, GOLD, 'center', TITLE_FONT, 1, 'bold');
    ttext(ctx, '—  MOBILE MOCK  —', cx, yr(452), 18, '#8b93a8', 'center', TITLE_FONT);
    // chocobo chạy ngang
    const chx = ((G.t * 130) % (G.VW + 300)) - 150;
    drawEmoji(ctx, '🐔', chx, yr(560), 44);
    drawEmoji(ctx, '💨', chx - 40, yr(566), 20, 0.5);
    const a = 0.55 + 0.45 * Math.sin(G.t * 3);
    ttext(ctx, '▾ CHẠM ĐỂ BẮT ĐẦU ▾', cx, yr(632), 24, `rgba(217,196,143,${a})`, 'center', UI_FONT, 1, 'bold');
    ttext(ctx, 'Fan-made mock • không chính thức • chỉ dùng học tập', cx, yr(694), 13, 'rgba(139,147,168,0.7)');
    this.zone('title-tap', 0, 0, G.VW, G.VH);
  },

  // ================= CHỌN JOB =================
  drawSelect(ctx) {
    this.zones = [];
    const cx = G.VW / 2;
    // máy nhỏ: nén thẻ job lại (~k) cho vừa màn thấp; 5 nghề thì thu thêm cho vừa bề ngang
    const k = G.smallUI ? 0.85 : 1;
    const y0 = G.smallUI ? 118 : 132;
    const gap = 30, nJob = JOB_ORDER.length;
    const maxCw = (G.VW - 24 - (nJob - 1) * gap) / nJob;
    const cw = Math.min(Math.round(268 * k), Math.round(maxCw)), ch = Math.round(400 * k);
    const g = ctx.createLinearGradient(0, 0, 0, G.VH);
    g.addColorStop(0, '#141b36'); g.addColorStop(1, '#070a14');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, G.VH);
    ttext(ctx, '⚜ CHỌN JOB CỦA BẠN ⚜', cx, 58, 34, GOLD, 'center', TITLE_FONT, 1, 'bold');
    ttext(ctx, 'Duty: The Bowl of Embers — Ifrit', cx, 96, 17, '#8b93a8');

    const total = JOB_ORDER.length * cw + (JOB_ORDER.length - 1) * gap;
    const x0 = (G.VW - total) / 2;
    JOB_ORDER.forEach((jid, i) => {
      const j = JOBS[jid];
      const x = x0 + i * (cw + gap);
      const sel = G.selJob === jid;
      const y = y0 + (sel ? -10 : 0);
      const z = this.zone('job:' + jid, x, y, cw, ch);
      // thẻ
      roundRect(ctx, x, y, cw, ch, 16);
      const cg = ctx.createLinearGradient(x, y, x, y + ch);
      cg.addColorStop(0, sel ? 'rgba(40,52,96,0.96)' : 'rgba(18,24,46,0.92)');
      cg.addColorStop(1, 'rgba(8,11,24,0.95)');
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = sel ? GOLD : 'rgba(120,130,160,0.4)';
      ctx.lineWidth = sel ? 3.5 : 1.5; ctx.stroke();
      if (sel) {
        ctx.shadowColor = GOLD; ctx.shadowBlur = 22;
        roundRect(ctx, x, y, cw, ch, 16);
        ctx.strokeStyle = GOLD; ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // icon
      const rc = ROLE_COLORS[j.role];
      ctx.fillStyle = rc;
      ctx.beginPath(); ctx.arc(x + cw / 2, y + 78 * k, 50 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(10,14,26,0.6)'; ctx.lineWidth = 3; ctx.stroke();
      drawEmoji(ctx, j.icon, x + cw / 2, y + 78 * k, 58 * k, 1, j.id.toUpperCase());
      ttext(ctx, j.name, x + cw / 2, y + 152 * k, 27, '#e8ecf5', 'center', TITLE_FONT, 1, 'bold');
      // role chip
      const chipW = 150;
      roundRect(ctx, x + cw / 2 - chipW / 2, y + 172 * k, chipW, 24, 12);
      ctx.fillStyle = rc; ctx.fill();
      ttext(ctx, ROLE_VN[j.role], x + cw / 2, y + 184 * k, 13, '#0a0e1a', 'center', UI_FONT, 1, 'bold');
      ttext(ctx, j.vn, x + cw / 2, y + 214 * k, 15, GOLD);
      // chip hệ phái
      const hp = j.hePhai, hw = cw - 56;
      roundRect(ctx, x + cw / 2 - hw / 2, y + 230 * k, hw, 24 * k, 12 * k);
      ctx.globalAlpha = 0.16; ctx.fillStyle = hp.color; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = hp.color; ctx.lineWidth = 1.5; ctx.stroke();
      ttext(ctx, `${hp.icon} HỆ ${hp.name.toUpperCase()}`, x + cw / 2, y + 242 * k, 12, hp.color, 'center', UI_FONT, 1, 'bold');
      // mô tả (thẻ hẹp do nhiều job → chữ nhỏ hơn cho vừa)
      const dsz = cw < 245 ? 14 : 17;
      wrapText(ctx, j.desc, x + cw / 2, y + 268 * k, cw - 24, dsz + 4, '#c9d2e4', 'center', dsz);
      // stat bars
      const stats = [['HP', j.hp / 900], ['ATK', j.atk / 38], ['DEF', j.def / 15]];
      stats.forEach(([nm, kk], si) => {
        const sy = y + 316 * k + si * 26 * k;
        ttext(ctx, nm, x + 30, sy + 7, 13, '#8b93a8', 'left');
        this.bar(ctx, x + 68, sy, cw - 100, 13, kk, nm === 'HP' ? '#5dd39e' : nm === 'ATK' ? '#e08b3f' : '#7cc7ff');
      });
      // best time
      const best = localStorage.getItem('ff14mock_best_' + jid);
      if (best) ttext(ctx, `🏅 Best: ${fmtTime(+best)}`, x + cw / 2, y + ch - 14, 13, GOLD);
    });
    // nút xác nhận (neo cách thẻ 12px, desktop giữ nguyên vị trí cũ)
    const bw = 320, bx = (G.VW - bw) / 2;
    const by = G.smallUI ? y0 + ch + 12 : 568;
    const ok = G.selJob != null;
    roundRect(ctx, bx, by, bw, 58, 29);
    ctx.fillStyle = ok ? 'rgba(90,110,190,0.95)' : 'rgba(40,46,70,0.8)'; ctx.fill();
    ctx.strokeStyle = ok ? GOLD : 'rgba(120,130,160,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ttext(ctx, ok ? `⚔ XUẤT CHINH — ${JOBS[G.selJob].name}` : 'Chọn một job bên trên', cx, by + 30, 22, ok ? '#fff' : '#8b93a8', 'center', UI_FONT, 1, 'bold');
    if (ok) this.zone('confirm', bx, by, bw, 58);
    ttext(ctx, 'Điều khiển: joystick trái • nút skill phải • chạm quái để chọn mục tiêu', cx, G.smallUI ? G.VH - 14 : 668, 15, 'rgba(139,147,168,0.85)');
    if (!G.smallUI) ttext(ctx, 'Desktop: WASD di chuyển • chuột chọn mục tiêu • Q đánh thường • E/R/F kỹ năng hệ phái • Z thuốc • C counter • X Limit Break', cx, 692, 14, 'rgba(139,147,168,0.6)');
  },

  // ================= HỘP THOẠI =================
  drawDialogue(ctx) {
    const d = G.dialogue;
    if (!d) return;
    this.zones = [];
    const w = 920, h = 170, x = (G.VW - w) / 2, y = G.VH - h - 26;
    this.panel(ctx, x, y, w, h, 0.94);
    // tên
    roundRect(ctx, x + 22, y - 18, 200, 36, 18);
    ctx.fillStyle = '#1c2440'; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    drawEmoji(ctx, d.icon, x + 44, y, 24, 1, d.who);
    ttext(ctx, d.who, x + 118, y + 1, 19, GOLD, 'center', UI_FONT, 1, 'bold');
    // chữ xuất hiện dần
    const chars = Math.floor(G.t * 46);
    const shown = d.text.slice(0, chars);
    wrapText(ctx, shown, x + 36, y + 46, w - 72, 26, '#e8ecf5', 'left');
    if (chars >= d.text.length) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(G.t * 3.4));
      ttext(ctx, '▶ Tap để tiếp tục', x + w - 110, y + h - 20, 15, `rgba(217,196,143,${a})`, 'right');
    }
    this.zone('dialogue-next', 0, 0, G.VW, G.VH);
  },

  // ================= HUD TRONG DUTY =================
  drawDuty(ctx) {
    this.zones = [];
    const p = G.player;
    const cx = G.VW / 2;
    // ----- khung người chơi -----
    const fx = 16, fy = 12, fw = 316, fh = 74;
    this.panel(ctx, fx, fy, fw, fh, 0.82);
    ctx.fillStyle = ROLE_COLORS[p.job.role];
    ctx.beginPath(); ctx.arc(fx + 34, fy + 32, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
    drawEmoji(ctx, p.job.icon, fx + 34, fy + 32, 27, 1, p.job.id.toUpperCase());
    ttext(ctx, `Bạn  ·  Lv ${p.level}`, fx + 66, fy + 15, 14, '#e8ecf5', 'left', UI_FONT, 1, 'bold');
    ttext(ctx, `${p.job.hePhai.icon} ${p.job.hePhai.name}`, fx + 66 + 118, fy + 15, 13, p.job.hePhai.color, 'left');
    ttext(ctx, `i${p.gear.weaponIlvl}`, fx + fw - 10, fy + 15, 12, GOLD, 'right', UI_FONT, 1, 'bold');
    this.bar(ctx, fx + 66, fy + 25, 236, 15, p.hp / p.maxhp, '#5dd39e');
    ttext(ctx, `${Math.ceil(p.hp)} / ${p.maxhp}`, fx + 66 + 118, fy + 33, 11, '#0a0e1a', 'center', UI_FONT, 1, 'bold');
    this.bar(ctx, fx + 66, fy + 43, 236, 10, p.mp / p.maxmp, '#58a6ff');
    ttext(ctx, `${Math.floor(p.mp)} MP`, fx + 66 + 50, fy + 48, 10, '#e8ecf5', 'left');
    // LB gauge
    this.bar(ctx, fx + 66, fy + 56, 236, 9, p.lb / 100, p.lb >= 100 ? `hsl(${(G.t * 200) % 360},85%,60%)` : '#d9c48f');
    ttext(ctx, 'LB', fx + 50, fy + 61, 10, GOLD, 'right');
    // buff icons
    const buffIcons = [];
    for (const b of p.buffs) buffIcons.push({ icon: b.icon, t: b.t });
    buffIcons.forEach((b, i) => {
      const bx = fx + 66 + i * 32, by = fy + 70;
      drawEmoji(ctx, b.icon, bx, by, 18);
      ttext(ctx, b.label || (Math.ceil(b.t) + 's'), bx, by + 13, 10, '#c9d2e4');
    });
    // weakness
    if (p.weaknessT > 0) {
      drawEmoji(ctx, '💧', fx + 300, fy + 70, 16);
      ttext(ctx, 'Yếu', fx + 300, fy + 84, 10, '#7cc7ff');
    }

    // ----- khung đồng đội (Duty Support) -----
    (G.allies || []).forEach((a, i) => {
      const ax = 16, ay = 92 + i * 24, aw = 316, ah = 20;
      roundRect(ctx, ax, ay, aw, ah, 6);
      ctx.fillStyle = a.alive ? 'rgba(10,15,30,0.75)' : 'rgba(30,12,16,0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(217,196,143,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      drawEmoji(ctx, a.def.icon, ax + 14, ay + 10, 15, 1, a.def.name);
      ttext(ctx, a.def.name, ax + 28, ay + 10, 11, a.alive ? '#c9d2e4' : '#8b6b6b', 'left');
      const k = a.alive ? clamp(a.hp / a.maxhp, 0, 1) : 0;
      this.bar(ctx, ax + 108, ay + 5, aw - 120, 10, k, k > 0.4 ? '#7de08a' : '#ff6b6b');
      if (!a.alive) ttext(ctx, `💀 hồi sinh ${Math.ceil(a.deadT)}s`, ax + 108 + (aw - 120) / 2, ay + 10, 10, '#ff9c9c');
    });

    // ----- khung mục tiêu -----
    const t = (p.target && p.target.alive) ? p.target : null;
    const tfx = 348, tfy = 12, tfw = 252, tfh = 54;
    this.panel(ctx, tfx, tfy, tfw, tfh, 0.8);
    if (t) {
      ctx.fillStyle = t.def.color || '#888';
      ctx.beginPath(); ctx.arc(tfx + 26, tfy + 20, 15, 0, TAU); ctx.fill();
      drawEmoji(ctx, t.def.icon || '🔥', tfx + 26, tfy + 20, 19, 1, t.def.name);
      ttext(ctx, t.def.name, tfx + 48, tfy + 12, 13, '#ffd9a0', 'left', UI_FONT, 1, 'bold');
      ttext(ctx, `Lv ${t.def.isBoss ? '??' : Math.max(1, Math.round(t.def.xp / 12))}`, tfx + tfw - 40, tfy + 12, 11, '#8b93a8', 'right');
      this.bar(ctx, tfx + 10, tfy + 26, tfw - 20, 12, t.hp / t.maxhp, '#ff6b6b');
      ttext(ctx, `${Math.ceil(Math.max(0, t.hp))}`, tfx + tfw / 2, tfy + 32, 10, '#fff', 'center', UI_FONT, 1, 'bold');
      if (t.cast) {
        this.bar(ctx, tfx + 10, tfy + 41, tfw - 20, 9, t.cast.t / t.cast.tmax, '#ffd75e');
        ttext(ctx, t.cast.name, tfx + tfw / 2, tfy + 45, 9, '#1a1408', 'center', UI_FONT, 1, 'bold');
      }
    } else {
      ttext(ctx, 'Không có mục tiêu', tfx + tfw / 2, tfy + 28, 14, 'rgba(139,147,168,0.7)');
    }

    // ----- nhiệm vụ & FATE -----
    const obj = this.objectiveText();
    const objY = 92 + (G.allies || []).length * 24 + 8;
    this.panel(ctx, 16, objY, 300, obj.length * 18 + 16, 0.72);
    obj.forEach((line, i) => {
      ttext(ctx, line.txt, 28, objY + 14 + i * 18, 13, line.color || '#c9d2e4', 'left');
    });

    // ----- đồng hồ + gil -----
    this.panel(ctx, cx - 80, 10, 160, 30, 0.7);
    ttext(ctx, `⏱ ${fmtTime(G.dutyTime)}`, cx, 25, 15, '#c9d2e4');
    this.panel(ctx, 352, 74, 150, 26, 0.7);
    drawEmoji(ctx, '💰', 368, 87, 15);
    ttext(ctx, `${G.gil}`, 430, 87, 14, '#ffd75e', 'center', UI_FONT, 1, 'bold');

    // ----- boss bar -----
    const b = G.boss;
    if (b && b.engaged && b.alive) {
      const bbw = 560, bbx = (G.VW - bbw) / 2, bby = 58;
      ttext(ctx, b.def.title || 'IFRIT — PRIMAL CỦA LỬA', cx, bby - 6, 15, b.def.titan ? '#e0c9a0' : '#ff9c6b', 'center', TITLE_FONT, 1, 'bold');
      this.bar(ctx, bbx, bby, bbw, 20, b.hp / b.maxhp, '#c9402a');
      // vạch trắng đánh dấu NGƯỠNG ĐỔI PHASE trên thanh máu
      const gates = b.def.titan ? [0.70, 0.35] : [0.60, 0.30];
      for (const g of gates) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bbx + bbw * g, bby + 3); ctx.lineTo(bbx + bbw * g, bby + 17); ctx.stroke();
      }
      ttext(ctx, `${Math.ceil(Math.max(0, b.hp))} / ${b.maxhp}`, cx, bby + 10, 12, '#fff', 'center', UI_FONT, 1, 'bold');
      if (b.def.titan && b.engaged) { // nhãn giai đoạn hiện tại
        const ph = TITAN_PHASES[Math.min(b.phaseIdx, TITAN_PHASES.length - 1)];
        ttext(ctx, `P${b.phaseIdx + 1} · ${ph.name.replace(/^GIAI ĐOẠN \d+ — /, '')}`, bbx + 4, bby - 6, 13, b.phaseIdx === 2 ? '#ff9c6b' : '#ffe066', 'left', UI_FONT, 1, 'bold');
      }
      if (b.atkBuff > 1) ttext(ctx, `🔥 ENRAGE x${b.atkBuff.toFixed(2)}`, bbx + bbw - 4, bby - 6, 12, '#ff5b5b', 'right');
      if (b.def.titan) {
        if (G.staggerCheck && G.staggerCheck.titan === b) { // thanh stagger chỉ hiện khi CHECK đang chạy
          const sk = clamp((b.stagger || 0) / 100, 0, 1);
          this.bar(ctx, bbx, bby + 22, bbw, 10, sk, sk > 0.7 ? '#ffef9a' : '#ffe066');
          ttext(ctx, 'STAGGER', bbx + 46, bby + 27, 9, '#1a1408', 'center', UI_FONT, 1, 'bold');
        }
        if (b.cast) {
          this.bar(ctx, bbx, bby + 36, bbw, 14, b.cast.t / b.cast.tmax, b.cast.color || '#ffd75e', 'rgba(20,16,8,0.9)');
          ttext(ctx, `⚒ ${b.cast.name}${b.cast.counterable ? '  ⟵ COUNTER! (6)' : ''}`, cx, bby + 43, 11, b.cast.counterable ? '#0a4a5a' : '#1a1408', 'center', UI_FONT, 1, 'bold');
        }
      } else if (b.cast) {
        this.bar(ctx, bbx, bby + 24, bbw, 14, b.cast.t / b.cast.tmax, '#ffd75e', 'rgba(20,16,8,0.9)');
        ttext(ctx, `⚒ ${b.cast.name}`, cx, bby + 31, 11, '#1a1408', 'center', UI_FONT, 1, 'bold');
      }
    }

    // ----- overlay stagger check -----
    if (G.staggerCheck) {
      const sc = G.staggerCheck;
      const w = 460, x = (G.VW - w) / 2, y = 128;
      const k = clamp(sc.titan.stagger / 100, 0, 1);
      const pulse = 0.7 + 0.3 * Math.sin(G.t * 9);
      ctx.strokeStyle = `rgba(255,224,102,${pulse})`; ctx.lineWidth = 3;
      this.panel(ctx, x, y, w, 52, 0.9);
      ttext(ctx, '⚡ LÀM RUNG CHUYỂN TITAN!', x + w / 2, y + 14, 15, '#ffe066', 'center', UI_FONT, 1, 'bold');
      this.bar(ctx, x + 16, y + 26, w - 90, 16, k, '#ffe066');
      ttext(ctx, `${Math.ceil(sc.tmax - sc.t)}s`, x + w - 40, y + 34, 20, '#ff9c6b', 'center', UI_FONT, 1, 'bold');
    }

    // ----- prompt COUNTER khi Titan ra đòn xanh -----
    if (G.boss && G.boss.engaged && G.boss.cast && G.boss.cast.counterable && G.player.alive) {
      const c = G.boss.cast;
      const left = c.tmax - c.t;
      const near = dist(G.player.x, G.player.y, G.boss.x, G.boss.y) <= 220 + G.boss.r;
      const fast = left < 1;
      const pl = 0.6 + 0.4 * Math.sin(G.t * (fast ? 26 : 10));
      const w2 = 420, x2 = (G.VW - w2) / 2, y2 = 196;
      ctx.globalAlpha = 0.92;
      roundRect(ctx, x2, y2, w2, 54, 14);
      ctx.fillStyle = 'rgba(20,60,80,0.9)'; ctx.fill();
      ctx.strokeStyle = `rgba(110,231,255,${pl})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = 1;
      drawEmoji(ctx, '🛡️', x2 + 36, y2 + 27, 30, pl);
      ttext(ctx, near ? `BẤM [C] ĐỂ COUNTER — còn ${left.toFixed(1)}s!` : `LẠI GẦN TITAN ĐỂ COUNTER — ${left.toFixed(1)}s`, x2 + w2 / 2 + 14, y2 + 22, 17, near ? '#bff2ff' : '#ffd75e', 'center', UI_FONT, pl, 'bold');
      this.bar(ctx, x2 + 30, y2 + 38, w2 - 60, 8, left / c.tmax, left < 1 ? '#ff9c6b' : '#6ee7ff');
    }

    World.drawMinimap(ctx);

    // ----- nút pause & trợ giúp -----
    ctx.fillStyle = 'rgba(8,12,24,0.8)';
    ctx.beginPath(); ctx.arc(this.pauseBtn.x, this.pauseBtn.y, this.pauseBtn.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    ttext(ctx, '⏸', this.pauseBtn.x, this.pauseBtn.y + 1, 17, '#c9d2e4');
    ctx.fillStyle = 'rgba(8,12,24,0.8)';
    ctx.beginPath(); ctx.arc(this.helpBtn.x, this.helpBtn.y, this.helpBtn.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    ttext(ctx, '❓', this.helpBtn.x, this.helpBtn.y + 1, 13, '#c9d2e4');

    // ----- joystick -----
    if (Input.joy.on) {
      const j = Input.joy;
      ctx.strokeStyle = 'rgba(217,196,143,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(j.bx, j.by, this.joyR_vis || 66, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(217,196,143,0.18)';
      ctx.beginPath(); ctx.arc(j.bx, j.by, 66, 0, TAU); ctx.fill();
      const kx = j.bx + j.dx * j.mag * 60, ky = j.by + j.dy * j.mag * 60;
      ctx.fillStyle = 'rgba(232,236,245,0.75)';
      ctx.beginPath(); ctx.arc(kx, ky, 26, 0, TAU); ctx.fill();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
    } else if (G.hintT > 0 && p.alive) {
      const a = Math.min(1, G.hintT) * (0.35 + 0.15 * Math.sin(G.t * 3));
      ctx.strokeStyle = `rgba(217,196,143,${a * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(170, G.VH - 160, 66, 0, TAU); ctx.stroke();
      ttext(ctx, '👁 joystick di chuyển', 170, G.VH - 60, 15, `rgba(232,236,245,${a})`);
    }

    // ----- nút skill -----
    this.drawSkillButtons(ctx, p);
    // ----- gợi ý điều khiển đầu game -----
    if (G.hintT > 0) {
      const a = Math.min(1, G.hintT / 1.5);
      const lines = ['👆 Chạm vào quái để chọn mục tiêu', '🟠 Vòng cam = AOE — NÉ NGAY!', 'Nút 💧 xanh: thuốc · nút LB: chiêu cuối'];
      lines.forEach((l, i) => ttext(ctx, l, cx, 96 + i * 22, 15, `rgba(232,236,245,${a * 0.9})`));
    }

    // ----- banner lớn -----
    if (G.banner) {
      const bn = G.banner;
      const k = bn.t / bn.tmax;
      const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      const gr = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0);
      gr.addColorStop(0, 'rgba(8,11,24,0)'); gr.addColorStop(0.5, 'rgba(8,11,24,0.75)'); gr.addColorStop(1, 'rgba(8,11,24,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - 300, 210, 600, 110);
      ttext(ctx, bn.txt, cx, 250, 40, GOLD, 'center', TITLE_FONT, 1, 'bold');
      ttext(ctx, bn.sub || '', cx, 292, 17, '#c9d2e4');
      ctx.strokeStyle = `rgba(217,196,143,${a * 0.8})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 240, 224); ctx.lineTo(cx - 80, 224); ctx.moveTo(cx + 80, 224); ctx.lineTo(cx + 240, 224); ctx.stroke();
      ctx.restore();
    }
    // ----- toasts -----
    G.toasts.forEach((t2, i) => {
      const k = t2.t / t2.tmax;
      const a = k < 0.12 ? k / 0.12 : k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.globalAlpha = a;
      const w = ctx.measureText(t2.txt).width + 60;
      this.panel(ctx, cx - w / 2, 340 + i * 40, w, 32, 0.85);
      ttext(ctx, t2.txt, cx, 356 + i * 40, 15, t2.color || '#c9d2e4', 'center', UI_FONT, 1, 'bold');
      ctx.globalAlpha = 1;
    });

    // ----- thẻ hướng dẫn người mới -----
    this.drawTutorial(ctx);
    // ----- bảng trợ giúp -----
    if (G.helpOpen) this.drawHelp(ctx);

    // vignette máu thấp
    const hpk = p.hp / p.maxhp;
    if (p.alive && hpk < 0.28) {
      const a = (0.28 - hpk) / 0.28 * (0.5 + 0.3 * Math.sin(G.t * 6));
      const vg = ctx.createRadialGradient(cx, G.VH / 2, 300, cx, G.VH / 2, 760);
      vg.addColorStop(0, 'rgba(200,0,0,0)');
      vg.addColorStop(1, `rgba(200,0,0,${a * 0.8})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, G.VW, G.VH);
    }
  },

  drawSkillButtons(ctx, p) {
    // 4 nút: Q đánh thường + E/R/F kỹ năng hệ phái
    p.skills.forEach((s, i) => {
      const b = this.skillBtns[i];
      const def = s.def;
      const maxCh = def.charges || 0;
      const cdFrac = maxCh
        ? (s.charges < maxCh ? clamp(s.cd / def.cd, 0, 1) : 0)
        : (def.cd ? clamp(s.cd / def.cd, 0, 1) : 0);
      const canUse = (maxCh ? s.charges > 0 : s.cd <= 0.05) && p.mp >= def.mp && !p.cast && !p.dash;
      // đòn đánh thường sắp tới là đòn kết liễu → phát sáng báo hiệu
      const finisherNext = def.basic && p.chain && p.chain.t > 0 && p.chain.n >= (def.chainEvery || 3) - 1;
      ctx.save();
      ctx.translate(b.x, b.y);
      if (finisherNext) { ctx.shadowColor = def.color; ctx.shadowBlur = 20 + 8 * Math.sin(G.t * 7); }
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU);
      const g = ctx.createRadialGradient(0, -b.r * 0.4, 4, 0, 0, b.r);
      g.addColorStop(0, canUse ? '#2c3a66' : '#1c2238');
      g.addColorStop(1, '#0c1122');
      ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = canUse ? def.color : 'rgba(110,120,150,0.35)';
      ctx.stroke();
      drawEmoji(ctx, def.icon, 0, -2, b.r * 0.92, 1, def.name);
      // cooldown riêng
      if (cdFrac > 0) {
        cdPie(ctx, 0, 0, b.r, cdFrac);
        ttext(ctx, s.cd > 1 ? Math.ceil(s.cd) : s.cd.toFixed(1), 0, 0, 17, '#fff', 'center', UI_FONT, 1, 'bold');
      }
      // nhãn phím + giá MP
      ttext(ctx, def.key, -b.r + 13, -b.r + 13, 13, canUse ? '#ffe9a0' : 'rgba(232,236,245,0.55)', 'center', UI_FONT, 1, 'bold');
      if (def.mp > 0) ttext(ctx, `${def.mp}`, b.r - 11, b.r - 11, 10, '#7cc7ff', 'center', UI_FONT, 1, 'bold');
      // chấm nạp cho skill nhiều lần dùng (vd Tam Đoạn Lướt x3)
      if (maxCh) {
        for (let c = 0; c < maxCh; c++) {
          const px = (c - (maxCh - 1) / 2) * 15;
          ctx.beginPath(); ctx.arc(px, b.r - 5, 4.2, 0, TAU);
          ctx.fillStyle = c < s.charges ? def.color : 'rgba(110,120,150,0.4)'; ctx.fill();
          ctx.strokeStyle = 'rgba(10,14,26,0.7)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      ctx.restore();
      // nhãn tên nhỏ
      if (i === 0 && G.hintT > 0) ttext(ctx, def.name, b.x, b.y + b.r + 14, 12, `rgba(232,236,245,${Math.min(1, G.hintT)})`);
    });
    // LB
    const lb = this.lbBtn, full = p.lb >= 100;
    ctx.save();
    ctx.translate(lb.x, lb.y);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-lb.r, -lb.r, lb.r * 2, lb.r * 2, 10) : ctx.rect(-lb.r, -lb.r, lb.r * 2, lb.r * 2);
    if (full) { ctx.shadowColor = `hsl(${(G.t * 200) % 360},85%,60%)`; ctx.shadowBlur = 24; }
    const lg = ctx.createLinearGradient(-lb.r, -lb.r, lb.r, lb.r);
    lg.addColorStop(0, full ? '#ffdf80' : '#20284a');
    lg.addColorStop(1, full ? '#e07040' : '#0c1122');
    ctx.fillStyle = lg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = full ? '#fff' : 'rgba(110,120,150,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    drawEmoji(ctx, '🌈', lb.x, lb.y - 4, 34, 1, 'LB');
    ttext(ctx, `${Math.floor(p.lb)}%`, lb.x, lb.y + 22, 12, full ? '#fff' : GOLD, 'center', UI_FONT, 1, 'bold');
    // Potion
    const pb = this.potBtn;
    ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU);
    ctx.fillStyle = p.pot > 0 ? '#17301e' : '#14161f'; ctx.fill();
    ctx.strokeStyle = p.pot > 0 ? '#7de08a' : 'rgba(110,120,150,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawEmoji(ctx, '🧪', pb.x, pb.y, 26, 1, 'P');
    ttext(ctx, `x${p.pot}`, pb.x + 16, pb.y + 18, 13, '#7de08a', 'center', UI_FONT, 1, 'bold');
    // Counter (hệ thống Titan)
    const cb = this.counterBtn;
    const cReady = p.counterCd <= 0;
    ctx.save();
    ctx.translate(cb.x, cb.y);
    ctx.beginPath(); ctx.arc(0, 0, cb.r, 0, TAU);
    const cg = ctx.createRadialGradient(0, -cb.r * 0.4, 4, 0, 0, cb.r);
    cg.addColorStop(0, cReady ? '#1f4a5a' : '#1c2238'); cg.addColorStop(1, '#0c1122');
    ctx.fillStyle = cg; ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = cReady ? '#6ee7ff' : 'rgba(110,120,150,0.35)'; ctx.stroke();
    drawEmoji(ctx, '🛡️', 0, -2, cb.r * 0.85, 1, 'CTR');
    if (p.counterCd > 0) {
      cdPie(ctx, 0, 0, cb.r, p.counterCd / 12);
      ttext(ctx, p.counterCd > 1 ? Math.ceil(p.counterCd) : p.counterCd.toFixed(1), 0, 0, 17, '#fff', 'center', UI_FONT, 1, 'bold');
    }
    ctx.restore();
    ttext(ctx, 'C', cb.x - cb.r + 13, cb.y - cb.r + 13, 12, 'rgba(232,236,245,0.65)', 'center');
  },

  // ================= HƯỚNG DẪN NGƯỜI MỚI =================
  drawTutorial(ctx) {
    if (G.tut.skip || !G.tut) return;
    const step = TUT_STEPS[G.tut.idx];
    if (!step) return;
    const w = 560, x = (G.VW - w) / 2, y = G.VH - 132, h = 74;
    const pulse = 0.6 + 0.4 * Math.sin(G.t * 4);
    ctx.save();
    ctx.shadowColor = `rgba(159,208,255,${0.35 * pulse})`;
    ctx.shadowBlur = 16;
    this.panel(ctx, x, y, w, h, 0.92);
    ctx.restore();
    drawEmoji(ctx, '📖', x + 30, y + h / 2, 30);
    ttext(ctx, `HƯỚNG DẪN  ${G.tut.idx + 1}/${TUT_STEPS.length}`, x + 56, y + 18, 13, GOLD, 'left', UI_FONT, 1, 'bold');
    wrapText(ctx, step.txt, x + 56, y + 42, w - 120, 20, '#eef2fa', 'left');
    // tiến độ bước
    const prog = clamp((G.tut.progress || 0) / step.need, 0, 1);
    this.bar(ctx, x + 56, y + h - 16, w - 190, 8, prog, '#9fd0ff');
    ttext(ctx, `${Math.min(G.tut.progress || 0, step.need)}/${step.need}`, x + w - 100, y + h - 12, 11, '#9fd0ff', 'left');
    // nút bỏ qua
    this.btn(ctx, x + w - 40, y + 8, 32, 22, '✖', 'tut-skip');

    // ----- tô sáng phần tử liên quan -----
    const ring = (rx, ry, rr, color) => {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(rx, ry, rr + 6 + 3 * Math.sin(G.t * 5), 0, TAU); ctx.stroke();
      ctx.restore();
    };
    if (step.hint === 'joy') ring(170, G.VH - 160, 66, 'rgba(159,208,255,0.9)');
    else if (step.hint === 'skill0') ring(this.skillBtns[0].x, this.skillBtns[0].y, this.skillBtns[0].r, 'rgba(255,215,94,0.95)');
    else if (step.hint === 'potion') ring(this.potBtn.x, this.potBtn.y, this.potBtn.r, 'rgba(125,224,138,0.95)');

    // ----- mũi tên chỉ mục tiêu trong thế giới -----
    let target = null;
    if (step.hint === 'enemy') {
      let bd = 1e9;
      for (const e of G.enemies) { if (!e.alive) continue; const d = dist2(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; target = e; } }
    } else if (step.hint === 'pickup') target = G.pickups[0] || null;
    else if (step.hint === 'gate') target = { x: MAP.arenaGateX, y: 800 };
    else if (step.hint === 'boss') target = (G.boss && G.boss.alive) ? G.boss : { x: MAP.arena.x, y: MAP.arena.y };
    if (target && dist(p.x, p.y, target.x, target.y) > 200) {
      const sx = target.x - G.cam.x, sy = target.y - G.cam.y;
      const a = ang(p.x, p.y, target.x, target.y);
      const ax = clamp(sx, 70, G.VW - 70), ay = clamp(sy, 120, G.VH - 200);
      ctx.save();
      ctx.translate(ax, ay - 46 - 6 * Math.sin(G.t * 4));
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = `rgba(255,215,94,${pulse})`;
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(12, 10); ctx.lineTo(0, 4); ctx.lineTo(-12, 10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ttext(ctx, '↓', ax, ay - 26, 16, `rgba(255,215,94,${pulse})`, 'center', UI_FONT, pulse, 'bold');
    }
  },

  drawHelp(ctx) {
    this.zones = [];
    ctx.fillStyle = 'rgba(5,8,16,0.82)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const w = 780, h = 560, x = (G.VW - w) / 2, y = (G.VH - h) / 2;
    this.panel(ctx, x, y, w, h, 0.97);
    ttext(ctx, '❓ TRỢ GIÚP — CÁC KÝ HIỆU TRONG GAME', x + w / 2, y + 40, 24, GOLD, 'center', TITLE_FONT, 1, 'bold');
    const rows = [
      ['☯', 'Hệ phái', 'Mỗi hero 1 hệ riêng: Q đánh thường · E/R/F kỹ năng hệ phái'],
      ['🟠', 'Vòng CAM đổ đầy', 'AoE sắp nổ — CHẠY RA NGOÀI trước khi đầy'],
      ['💥', 'Marker STACK', 'Cả nhóm đứng CHUNG một chỗ để chia sát thương'],
      ['🔵', 'Marker SPREAD', 'Ngược lại: mỗi người TẢN RA một hướng'],
      ['🔻', 'Marker TANK BUSTER', 'Đòn cực nặng vào tank — người khác tránh xa'],
      ['👁️', 'GAZE (con mắt)', 'QUAY MẶT ĐI khỏi boss trước khi cast xong'],
      ['🔥', 'Infernal Nail', 'Phá hủy NGAY trước khi đồng hồ cháy hết'],
      ['🪓🌸', 'NPC đồng đội', 'Thancred giữ aggro, Alisaie hồi máu — hãy đứng gần'],
      ['🌈', 'Limit Break (phím X)', 'Đầy 100% thì bấm — chiêu cuối cực mạnh'],
      ['⚡', 'STAGGER CHECK (đầu P2)', '8s dồn damage làm đầy thanh vàng — đầy là Titan ĐỔ GỤC 5s, ăn thêm 50% damage. Damage thường ngoài check KHÔNG làm boss ngã'],
      ['🛡️', 'COUNTER (nút 🛡 / phím C)', 'Đòn cast XANH: lại gần bấm 🛡 đúng lúc để PARRY — không thì cả team ăn 80% HP'],
      ['💠', 'Heart of Stone', 'Phá trong 12s khi xuất hiện — phá xong Titan ngã 6s, fail là WIPE cả team'],
      ['🪨', 'Granite Gaol', 'Cũi đá giam 1 người — PHÁ CÙI trong 10s nếu không người đó chết'],
      ['🌋', 'Earthen Fury', '3 đợt quét sân — chỉ góc XANH an toàn, đứng sai 1 lần là wipe'],
      ['🍕', 'Vòng Xoáy Đá (P3)', 'Titan đứng giữa sân quét 3 lát xoay tròn + xạ mũi tên — chạy theo LÁT AN TOÀN, chừa 2/3 sân'],
      ['🌀', 'Seismic Dive', 'Titan CHÌM xuống rồi LAO TỚI chỗ bạn — vòng cam bám nửa cast rồi KHÓA lại: chạy ra ngay khi nó ngừng bám'],
      ['🎯', 'Granite Rush (mở màn)', 'Đầu trận Titan khóa 1 người 🔴 rồi lướt qua 3 lần — ai trên đường lướt bị hất, tránh khỏi đường'],
    ];
    rows.forEach((r, i) => {
      const ry = y + 60 + i * 26;
      drawEmoji(ctx, r[0], x + 56, ry, 20);
      ttext(ctx, r[1], x + 96, ry - 7, 14, '#ffd9a0', 'left', UI_FONT, 1, 'bold');
      ttext(ctx, r[2], x + 96, ry + 10, 12, '#c9d2e4', 'left');
    });
    ttext(ctx, 'Điều khiển: joystick trái · nút skill phải · chạm quái để target · Q/E/R/F + Z/C/X trên desktop', x + w / 2, y + h - 58, 14, '#8b93a8', 'center');
    this.btn(ctx, x + w / 2 - 90, y + h - 44, 180, 32, 'Đã hiểu ✔', 'help-close');
  },

  objectiveText() {
    const lines = [];
    if (G.kills < TRASH_TOTAL) {
      lines.push({ txt: `◆ Tiêu diệt tay sai Ifrit  (${G.kills}/${TRASH_TOTAL})`, color: '#ffd75e' });
    } else if (!(G.boss && G.boss.engaged)) {
      lines.push({ txt: '◆ Cổng đã mở — đến đấu trường!', color: '#7de08a' });
    } else if (G.ifritDead && G.boss && G.boss.alive && G.boss.def.titan) {
      lines.push({ txt: `◆ Hạ gục Titan  (${Math.ceil(Math.max(0, G.boss.hp))}/${G.boss.maxhp})`, color: '#e0c9a0' });
    } else if (G.boss.alive) {
      lines.push({ txt: `◆ Hạ gục Ifrit  (${Math.ceil(Math.max(0, G.boss.hp))}/${G.boss.maxhp})`, color: '#ff9c6b' });
    }
    if (G.fate.active) {
      lines.push({ txt: `🌀 FATE: Săn Coeurl  (${G.fate.got}/${G.fate.need})`, color: '#6ea0ff' });
    }
    return lines;
  },

  // ================= VICTORY / DEFEAT / PAUSE =================
  drawVictory(ctx) {
    this.zones = [];
    ctx.fillStyle = 'rgba(5,8,16,0.72)'; ctx.fillRect(0, 0, G.VW, G.VH);
    // pháo hoa
    if (Math.random() < 0.12) addBurst(rand(200, G.VW - 200), rand(120, 380), choice(['#ffd75e', '#7de08a', '#7cc7ff', '#ff9c6b']), 18, 240);
    drawPartsUI(ctx);
    const w = 700, h = 430, x = (G.VW - w) / 2, y = 90;
    this.panel(ctx, x, y, w, h, 0.95);
    ttext(ctx, '⚜ DUTY COMPLETE ⚜', G.VW / 2, y + 62, 42, GOLD, 'center', TITLE_FONT, 1, 'bold');
    ttext(ctx, 'Bạn đã hạ gục Titan, Primal của Đất — The Navel hoàn thành!', G.VW / 2, y + 104, 18, '#c9d2e4');
    const rows = [
      ['⏱ Thời gian', fmtTime(G.dutyTime)],
      ['💀 Quái vật đã diệt', `${G.kills + (G.fate ? G.fate.got : 0)}`],
      ['💰 Gil thu được', `${G.gil}`],
      ['⭐ Cấp độ', `Lv ${G.player.level}`],
      ['🗡️ Trang bị', `Vũ khí i${G.player.gear.weaponIlvl} · Giáp i${G.player.gear.armorIlvl}`],
      ['🏅 Kỷ lục', (() => {
        const k = 'ff14mock_best_' + G.player.jobId;
        const best = +localStorage.getItem(k);
        if (!best || G.dutyTime < best) { localStorage.setItem(k, Math.round(G.dutyTime)); return 'MỚI!'; }
        return fmtTime(best);
      })()],
    ];
    rows.forEach(([a, b2], i) => {
      const ry = y + 150 + i * 36;
      ttext(ctx, a, x + 80, ry, 17, '#8b93a8', 'left');
      ttext(ctx, b2, x + w - 80, ry, 18, '#ffd75e', 'right', UI_FONT, 1, 'bold');
    });
    drawEmoji(ctx, '🎉', G.VW / 2, y + 348, 44);
    // nút
    const bw = 250, bx = x + (w - bw * 2 - 30) / 2;
    this.btn(ctx, bx, y + h - 96, bw, 56, '🔁 Chơi lại', 'replay');
    this.btn(ctx, bx + bw + 30, y + h - 96, bw, 56, '🧭 Đổi Job', 'select');
  },
  drawDefeat(ctx) {
    this.zones = [];
    ctx.fillStyle = 'rgba(20,4,4,0.66)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const w = 560, h = 300, x = (G.VW - w) / 2, y = 180;
    this.panel(ctx, x, y, w, h, 0.95);
    drawEmoji(ctx, '💀', G.VW / 2, y + 64, 56);
    ttext(ctx, 'DUTY FAILED', G.VW / 2, y + 130, 36, '#ff6b6b', 'center', TITLE_FONT, 1, 'bold');
    ttext(ctx, G.boss && G.boss.engaged ? (G.boss.def.titan ? 'Titan vẫn đang túc trực...' : 'Ifrit vẫn đang túc trực...') : 'Eorzea cần bạn thử lại!', G.VW / 2, y + 168, 16, '#c9d2e4');
    const bw = 250, bx = x + (w - bw * 2 - 30) / 2;
    this.btn(ctx, bx, y + h - 96, bw, 56, '⚡ Hồi sinh', 'respawn');
    this.btn(ctx, bx + bw + 30, y + h - 96, bw, 56, '🧭 Đổi Job', 'select');
  },
  drawPause(ctx) {
    this.zones = [];
    ctx.fillStyle = 'rgba(5,8,16,0.7)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const w = 420, h = 330, x = (G.VW - w) / 2, y = 150;
    this.panel(ctx, x, y, w, h, 0.95);
    ttext(ctx, '⏸ TẠM DỪNG', G.VW / 2, y + 50, 30, GOLD, 'center', TITLE_FONT, 1, 'bold');
    this.btn(ctx, x + 60, y + 90, w - 120, 52, '▶ Tiếp tục', 'resume');
    this.btn(ctx, x + 60, y + 152, w - 120, 52, '🔁 Chơi lại', 'replay');
    this.btn(ctx, x + 60, y + 214, w - 120, 52, `🔊 Âm thanh: ${Snd.muted ? 'TẮT' : 'BẬT'}`, 'mute');
    this.btn(ctx, x + 60, y + 276, w - 120, 44, '🧭 Về chọn Job', 'select');
  },
  btn(ctx, x, y, w, h, label, id) {
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = 'rgba(44,58,102,0.95)'; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.8; ctx.stroke();
    ttext(ctx, label, x + w / 2, y + h / 2 + 1, 19, '#fff', 'center', UI_FONT, 1, 'bold');
    this.zone(id, x, y, w, h);
  }
};

// chữ tự xuống dòng
function wrapText(ctx, txt, cx, y, maxW, lineH, color, align = 'center', size = 17) {
  const words = txt.split(' ');
  const lines = [];
  let cur = '';
  ctx.font = `${size * FS}px ${UI_FONT}`;
  for (const w2 of words) {
    const test = cur ? cur + ' ' + w2 : w2;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w2; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => ttext(ctx, l, align === 'left' ? cx : cx, y + i * lineH, size, color, align));
}
// particles vẽ ở toạ độ UI (màn victory)
function drawPartsUI(ctx) {
  for (const p of G.parts) {
    const a = 1 - p.t / p.tmax;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
