# Duty 2: The Navel (Titan) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boss Titan thứ hai vận hành theo phase-mechanic script ngặt + lớp AI thích ứng (stagger gauge, counter, targeting động) kiểu Lost Ark / Blade & Soul, ở vùng map mới sau Ifrit.

**Architecture:** Map mở rộng theo trục X (3200→4700) với cổng + arena Titan mới. `updateTitan()` chạy song song `updateIfrit()` (không refactor Ifrit), điều khiển bởi config data-driven `TITAN_PHASES` + lớp thích ứng (targeting theo vị trí, tempo rage). Stagger/counter là hệ thống chung gắn vào `dealToEnemy`/player. Wipe = retry từ cửa arena, Titan reset full.

**Tech Stack:** HTML5 Canvas thuần, JS không module không build. Âm thanh WebAudio tổng hợp (`Snd`). Không có test framework — kiểm thử thủ công qua URL cheat + console (spec mục 8).

## Global Constraints (từ spec)

- KHÔNG refactor logic Ifrit — chỉ thêm điểm rẽ nhánh (`killEnemy`, `engageBoss` parameterize).
- Không thêm job mới, không sửa 4 job hiện có — counter là nút hệ thống riêng.
- Mọi copy UI bằng tiếng Việt, phong cách hiện có (emoji + toast).
- Số liệu chuẩn: Titan hp 9000, dmg 34, r 64; stagger decay 5/s, rate player 0.30 / tank 0.35 / healer 0.08; counter CD 12s, tầm 220 từ mép boss (dist < 220 + b.r); Heart HP 1400 / fuse 12s; Gaol HP 600 / fuse 10s; tempo P1 ×1.0 / P2 ×0.9 / P3 ×0.75; counter-fail = 0.8×maxhp mỗi người; Earthen Fury 3 đợt, góc an toàn π/2, dmg 4000; wipe cases: Heart-fail / Gaol-fail / Fury-fail.
- Chạy server test: `python3 -m http.server 8765` từ repo, mở `http://localhost:8765/?titan=1&job=pld`.
- Sau mỗi task: kiểm thử thủ công theo bước Verify rồi commit. Không push trừ khi được yêu cầu.
- Spec đầy đủ: `docs/superpowers/specs/2026-10-04-titan-boss-design.md`.

## File Structure

```
js/data.js      — MAP mở rộng, ETYPES mới (golem/sprite/titan/gaol/heart), ITEM_TIERS, TITAN_PACKS
js/entities.js  — updateTitan + TITAN_PHASES + stagger + counter + gaol/heart + adaptive AI + after()/wipeParty()
js/world.js     — vẽ zone mới, drawTitan/drawGaol/drawHeart, gate/collide tổng quát, minimap, telegraph sector
js/hud.js       — stagger bar, nút counter, cast bar xanh, overlay stagger-check, legend, victory/defeat/objective
js/main.js      — buildDuty spawn Titan + trash, ?titan=1, key 6, retry flow, demoBot
js/input.js     — Digit6 → 'counter'
js/audio.js     — sfx 'parry', 'rumble'
js/util.js      — pointInSector, angDiff
README.md, TODO.md — cập nhật (task cuối)
```

## Interfaces (dùng chung giữa các task — KHÔNG đổi tên)

```js
// data.js
MAP.titanGateX = 3260;
MAP.titanArena = { x: 4050, y: 800, r: 420 };
ETYPES.titan  = { ..., isBoss: true, titan: true, dropTier: 90, title: 'TITAN — PRIMAL CỦA ĐẤT' }
ETYPES.gaol   = { ..., gaol: true,  noCount: true, stationary: true }
ETYPES.heart  = { ..., heart: true, noCount: true, stationary: true }
ITEM_TIERS = { ..., c1: 70, c2: 70, titan: 90 }
TITAN_PACKS = [{ id: 'c1', ... }, { id: 'c2', ... }]

// entities.js
updateTitan(e, dt)         castTitanAbility(e, id)      titanStaggered(e, dur)
tryCounter(p)              spawnGaol(member)            spawnHeart(titan)
updateGaol(e, dt)          updateHeart(e, dt)           wipeParty(label)
after(sec, fn)             cancelOwnerTelegraphs(owner)  resetTitanFight()
TITAN_PHASES               // mảng phase { id, name, gate, tempo, actions[] }
// field titan e: arena, stagger, staggeredT, vulnT, shielded, heartDone, checkDone,
//   skipFirstGaol, phaseIdx, rotIdx, greed{}, dodgeStreak, rageNext, p3T, enraged, atkBuffT
// field player p: counterCd, gaoled
// G mới: staggerCheck, ifritDead, delayed
// telegraph mở rộng: { owner, shape: 'sector', ang, spread, safeAng? }
```

---

### Task 1: Mở rộng map + cổng Titan + khóa vùng

**Files:**
- Modify: `js/data.js:74-104` (MAP, TITAN_PACKS, ITEM_TIERS)
- Modify: `js/world.js:7-66` (build: đá + decor + gate), `js/world.js:76-92` (drawGround), `js/world.js:437-472` (minimap), `js/world.js:486-528` (collideWorld + applyGates)

**Interfaces:**
- Produces: `MAP.titanGateX`, `MAP.titanArena`, gate `{ id: 'titan' }` trong `G.gates`, `applyGates` chặn cổng titan, `collideWorld` dùng `b.arena || MAP.arena`, `TITAN_PACKS`, `ITEM_TIERS.c1/c2/titan`.

- [ ] **Step 1: Sửa MAP + thêm TITAN_PACKS + ITEM_TIERS trong data.js**

Thay block `const MAP = { ... }` (dòng 74-79) bằng:

```js
// Map 4700x1600 — trái (start) → giữa (Ifrit) → phải (Titan)
const MAP = {
  w: 4700, h: 1600, startX: 260, startY: 800,
  barrierX: 560, arenaGateX: 2050,
  arena: { x: 2650, y: 800, r: 470 },
  titanGateX: 3260,
  titanArena: { x: 4050, y: 800, r: 420 },
  fateZone: { x: 1600, y: 1150, r: 220 },
};
```

Thêm sau `const TRASH_TOTAL = ...` (dòng 87):

```js
// Trash vùng Titan (không tính TRASH_TOTAL — cổng titan mở khi Ifrit chết)
const TITAN_PACKS = [
  { id: 'c1', mobs: [['golem', 3400, 620], ['golem', 3480, 980]] },
  { id: 'c2', mobs: [['sprite', 3620, 700], ['sprite', 3620, 900], ['golem', 3700, 800]] },
];
```

Sửa `ITEM_TIERS` (dòng 104) thành:
`const ITEM_TIERS = { a1: 15, a2: 25, b1: 35, b2: 45, boss: 60, c1: 70, c2: 70, titan: 90 };`

- [ ] **Step 2: world.js — đá quanh arena Titan + decor + gate 'titan'**

Trong `build()`, sau vòng `for (let i = 0; i < 16; i++)` quanh `MAP.arena` (dòng 18-21), thêm:

```js
    // vòng đá quanh đấu trường Titan + hầm dẫn vào
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + 0.3;
      O.push([MAP.titanArena.x + Math.cos(a) * (MAP.titanArena.r + 40), MAP.titanArena.y + Math.sin(a) * (MAP.titanArena.r + 40), randi(34, 52)]);
    }
    O.push([3260, 380, 42], [3260, 1220, 42], [3420, 300, 36], [3420, 1300, 36],
           [3560, 380, 38], [3560, 1220, 38], [3820, 240, 34], [3820, 1360, 34]);
```

Thêm vào `this.decor` (dòng 32-37) 2 phần tử: `{ icon: '⛰️', x: 3350, y: 800, s: 40 }, { icon: '⛰️', x: 4560, y: 1450, s: 44 },`

Sửa mảng `G.gates` (dòng 62-65) thành:

```js
    G.gates = [
      { id: 'start', x: MAP.barrierX, closed: true, anim: 1 },
      { id: 'boss', x: MAP.arenaGateX, closed: true, anim: 1 },
      { id: 'titan', x: MAP.titanGateX, closed: true, anim: 1 },
    ];
```

- [ ] **Step 3: world.js — vẽ nền arena Titan + minimap**

Trong `drawGround`, sau khối vẽ Ifrit arena (dòng 82-92), thêm:

```js
    // đấu trường Titan
    const TA = MAP.titanArena;
    const gt = ctx.createRadialGradient(TA.x, TA.y, TA.r * 0.2, TA.x, TA.y, TA.r);
    gt.addColorStop(0, 'rgba(72,64,52,0.75)');
    gt.addColorStop(1, 'rgba(30,26,20,0.4)');
    ctx.fillStyle = gt;
    ctx.beginPath(); ctx.ellipse(TA.x, TA.y, TA.r, TA.r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(217,196,143,0.3)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(TA.x, TA.y, TA.r - 22, (TA.r - 22) * 0.9, 0, 0, TAU); ctx.stroke();
```

Trong `drawMinimap`, sau khối vẽ arena Ifrit (dòng 446-448), thêm:

```js
    ctx.fillStyle = 'rgba(200,180,120,0.25)';
    ctx.beginPath(); ctx.ellipse(x + MAP.titanArena.x * sx, y + MAP.titanArena.y * sy, MAP.titanArena.r * sx, MAP.titanArena.r * sy, 0, 0, TAU); ctx.fill();
```

- [ ] **Step 4: world.js — applyGates cổng titan + collideWorld theo arena boss**

Trong `applyGates` (dòng 512-528): nhánh hiện tại là `if (g.id === 'start') {...} else {...boss...}`. Đổi `else {` thành `else if (g.id === 'boss') {` và thêm nhánh mới sau nó (trước `}` đóng vòng `for`):

```js
    } else if (g.id === 'titan') {
      const titan = G.enemies.find(x => x.alive && x.def && x.def.titan);
      if (g.closed && !(titan && titan.engaged)) {
        if (p.x > g.x - R) p.x = g.x - R;
      } else if (titan && titan.engaged) {
        if (p.x < g.x + R) p.x = g.x + R; // khoá trong đấu trường Titan
      }
    }
```

Trong `collideWorld` dòng 503: `const A = MAP.arena;` đổi thành `const A = b.arena || MAP.arena;`

- [ ] **Step 5: Verify tay + commit**

Run: `python3 -m http.server 8765` → mở `http://localhost:8765/?boss=1&job=pld`.
Expected: game chạy bình thường (Ifrit không đổi); chạy sang phải qua arena Ifrit thấy cổng năng lượng đỏ mới tại x≈3260 chặn lại; minimap rộng hơn có arena thứ hai màu vàng nhạt; console không lỗi. Console: `G.gates.find(g=>g.id==='titan').closed=false` → đi qua hầm tới arena đá mới (trống, chưa có boss).
Commit: `git add -A && git commit -m "Mở rộng map: hầm + đấu trường Titan + cổng titan (chặn khi Ifrit còn sống)"`

---

### Task 2: Thực thể Titan + golem/sprite + vẽ boss + luồng sau khi Ifrit chết

**Files:**
- Modify: `js/data.js:63-71` (ETYPES), `js/entities.js:396-411` (spawnEnemy defaults), `js/entities.js:415-436` (killEnemy), `js/entities.js:438-459` (routing), `js/entities.js:645-652` (engageBoss)
- Modify: `js/world.js:171-203` (drawEntities + drawTitan), `js/main.js:3-14` (G), `js/main.js:60-81` (buildDuty), `js/main.js:171-204` (tutorial)

**Interfaces:**
- Consumes: `MAP.titanArena`, `MAP.titanGateX`, gate 'titan' (Task 1).
- Produces: `ETYPES.titan/golem/sprite` (golem/sprite chạy AI generic sẵn), `G.ifritDead`, `ifritDefeated()`, stub `updateTitan` (engage + chase + claw), field `e.arena`, routing `e.def.titan`.

- [ ] **Step 1: Thêm ETYPES mới trong data.js**

Thêm vào `ETYPES` (sau dòng `ifrit`):

```js
  golem:  { name: 'Stone Golem', icon: '🪨', hp: 320, dmg: 24, xp: 90, spd: 105, aggro: 280, r: 24, atkRange: 78, atkCd: 2.4, color: '#8a7f70' },
  sprite: { name: 'Land Sprite', icon: '🌱', hp: 130, dmg: 16, xp: 70, spd: 150, aggro: 320, r: 16, ranged: true, castRange: 360, keepDist: 260, atkCd: 3.2, color: '#7fae6b' },
  titan:  { name: 'Titan', icon: '🗿', hp: 9000, dmg: 34, xp: 1600, spd: 150, aggro: 2200, r: 64, isBoss: true, titan: true, dropTier: 90, title: 'TITAN — PRIMAL CỦA ĐẤT', atkRange: 175, atkCd: 2.4, color: '#a08a6a' },
```

- [ ] **Step 2: entities.js — routing + ifritDefeated + engageBoss parameterize + killEnemy branch**

Trong `updateEnemies`, TRƯỚC dòng `if (e.def.isBoss) { updateIfrit(e, dt); continue; }` (dòng 459) thêm:

```js
    if (e.def.titan) { updateTitan(e, dt); continue; }
```

Thay toàn bộ `engageBoss` (dòng 645-652):

```js
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
```

Trong `killEnemy` dòng 435: `if (e.def.isBoss) bossDefeated();` đổi thành:

```js
  if (e.def.isBoss) { if (e.def.titan) bossDefeated(); else ifritDefeated(); }
```

Dòng 430 đổi thành: `if (e.def.isBoss) { dropGear('weapon', e.def.dropTier || 60); dropGear('armor', e.def.dropTier || 60); }`

Thêm cuối entities.js stub (Task 3 thay nội dung):

```js
// ---------- TITAN (BOSS 2) ----------
function updateTitan(e, dt) {
  const p = G.player;
  if (!e.engaged) {
    const A = MAP.titanArena;
    if (p.alive && G.ifritDead && p.x > MAP.titanGateX + 40 && dist(p.x, p.y, A.x, A.y) < A.r) engageBoss(e);
    return;
  }
  e.flashT = Math.max(0, e.flashT - dt);
  e.clawCd -= dt;
  const clawTgt = enmityTarget(e);
  if (e.clawCd <= 0 && clawTgt.alive && dist(e.x, e.y, clawTgt.x, clawTgt.y) < e.def.atkRange) {
    e.clawCd = e.def.atkCd;
    e.lungeT = 0.22;
    hitMember(clawTgt, e.def.dmg * 1.15 * e.atkBuff);
    addSlash(clawTgt.x, clawTgt.y, ang(e.x, e.y, clawTgt.x, clawTgt.y), '#e0c9a0');
  }
  const d = dist(e.x, e.y, clawTgt.x, clawTgt.y);
  if (d > 170) {
    const a = ang(e.x, e.y, clawTgt.x, clawTgt.y);
    e.x += Math.cos(a) * e.def.spd * dt;
    e.y += Math.sin(a) * e.def.spd * dt;
    e.face = a;
  }
}
```

- [ ] **Step 3: world.js — drawTitan + routing drawEntities**

`drawEntities` dòng 180 đổi thành:

```js
      drawables.push({ y: e.y, kind: e.def.titan ? 'titan' : e.def.isBoss ? 'boss' : e.def.nail ? 'nail' : 'enemy', o: e });
```

Dòng 190 thêm trước nhánh boss: `if (d.kind === 'titan') this.drawTitan(ctx, d.o);`

Thêm method vào World (sau `drawIfrit`):

```js
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
    if (e.flashT > 0) {
      ctx.globalAlpha = e.flashT * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.95, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
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
```

- [ ] **Step 4: main.js — G.ifritDead + buildDuty spawn Titan/trash + ?titan=1 + tutorial fix**

Trong object `G` (dòng 12): sau `boss: null,` thêm `ifritDead: false,`

Trong `buildDuty` (dòng 60-81): thêm `G.ifritDead = false;` vào khối reset (sau dòng 66). Sau dòng spawn ifrit (74) thêm:

```js
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
```

Trong `updateTutorial`, case `'boss'` (dòng 186) đổi thành: `case 'boss': v = G.ifritDead ? 1 : 0; break;`

- [ ] **Step 5: Verify tay + commit**

Run: `http://localhost:8765/?titan=1&job=pld`
Expected: đứng trước cổng titan đã mở, boss đá to ngủ "ZZZ..." giữa arena; đi vào arena → banner ENGAGE Titan + toast counter; Titan đuổi theo + vuốt vào người giữ aggro (tank). Console: `G.boss.def.name` → `"Titan"`. Boss bar HUD vẫn ghi "IFRIT..." (hardcode — Task 4 sửa, chấp nhận tạm).
Run: `?boss=1&job=pld` → console `G.boss.hp=1` rồi đánh Ifrit 1 đòn → banner "IFRIT GỤC NGÃ", cổng titan mở, tutorial xong bước 10, qua hầm golem 🪨/sprite 🌱 đánh bình thường.
Commit: `git add -A && git commit -m "Thêm boss Titan + golem/sprite + luồng mở cổng sau khi hạ Ifrit"`

---

### Task 3: Phase engine + bộ kỹ năng P1 + tempo

**Files:**
- Modify: `js/entities.js` — thay stub `updateTitan`, thêm `TITAN_PHASES` + `castTitanAbility` + `cancelOwnerTelegraphs`; `js/entities.js:396-411` (spawnEnemy defaults); `js/audio.js` (sfx rumble)

**Interfaces:**
- Consumes: `engageBoss`, `enmityTarget`, `addTelegraph`, `hitMember` (có sẵn).
- Produces: `TITAN_PHASES` (mảng phase — task 7/8 thêm p2/p3), `castTitanAbility(e, id)`, `cancelOwnerTelegraphs(owner)`, fields `e.phaseIdx`, `e.rotIdx`, `e.rageNext`.

- [ ] **Step 1: spawnEnemy defaults + sfx rumble**

Trong `spawnEnemy` (dòng 405-406), thêm vào object: `phaseIdx: 0, vulnT: 0, stagger: 0, staggeredT: 0, shielded: false, rageNext: false, atkBuffT: 0,` (Ifrit có field thừa nhưng không dùng — vô hại).

`audio.js` thêm trước `case 'gate'`: `case 'rumble': this.tone(55, 0.8, 'sawtooth', 0.16, -15); this.tone(38, 0.9, 'sine', 0.2, -8); break;`

- [ ] **Step 2: TITAN_PHASES + castTitanAbility (P1)**

Đặt phía trên `updateTitan` (thay stub):

```js
const TITAN_PHASES = [
  {
    id: 'p1', name: 'GIAI ĐOẠN 1 — ĐẤT RUNG', gate: 0.70, tempo: 1.0,
    actions: ['landslide', 'geocrush', 'tumult', 'landslide', 'geocrush', 'tumult'],
  },
];

function castTitanAbility(e, id) {
  const tempo = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)].tempo;
  const base = { landslide: 2.6, geocrush: 2.8, tumult: 2.2 }[id] || 2.6;
  const tmax = base * tempo * (e.rageNext ? 0.8 : 1);
  if (e.rageNext) {
    G.toasts.push({ txt: '🗿 Titan NỔI GIẬN — ra đòn nhanh hơn!', t: 0, tmax: 1.6, color: '#ff9c6b' });
    e.rageNext = false;
  }
  e.cast = { id, name: { landslide: 'Landslide', geocrush: 'Geocrush', tumult: 'Tumult' }[id] || id, t: 0, tmax, color: '#e0c9a0' };
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
  }
}
```

- [ ] **Step 3: updateTitan engine đầy đủ**

```js
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
  // gate phase theo %HP
  const ph = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)];
  if (e.phaseIdx < TITAN_PHASES.length - 1 && e.hp < e.maxhp * ph.gate && e.heartDone) {
    e.phaseIdx++;
    e.rotIdx = 0;
    e.cast = null;
    cancelOwnerTelegraphs(e);
    const np = TITAN_PHASES[e.phaseIdx];
    G.banner = { txt: `🗿 ${np.name}`, sub: 'Titan đổi chiến thuật!', t: 0, tmax: 2.4 };
    Snd.sfx('rumble'); G.cam.shake = 14;
  }
  // rotation kỹ năng
  e.abilityCd -= dt;
  if (e.abilityCd <= 0 && p.alive) {
    const list = TITAN_PHASES[Math.min(e.phaseIdx, TITAN_PHASES.length - 1)].actions;
    castTitanAbility(e, list[e.rotIdx % list.length]);
    e.rotIdx++;
    e.abilityCd = 4.2 * ph.tempo;
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
```

- [ ] **Step 4: Verify tay + commit**

Run: `?titan=1&job=pld`, engage. Console: `G.boss.abilityCd = 0.1` nhiều lần để ép rotation.
Expected: lần lượt "Landslide" (rect dài nhắm người đứng xa nhất), "Geocrush" (vòng tròn quanh boss + knockback khi nổ), "Tumult" (cả party mất máu khi cast xong, không vòng cam). Console: `G.boss.hp = G.boss.maxhp*0.69` → không đổi phase (điều kiện `e.heartDone` chưa có — task 6 bật; engine clamp 1 phase) — đúng theo thiết kế trung gian.
Commit: `git add -A && git commit -m "Phase engine Titan + bộ kỹ năng P1 (Landslide/Geocrush/Tumult)"`

---

### Task 4: Stagger gauge + thanh HUD + trạng thái choáng

**Files:**
- Modify: `js/entities.js:53-70` (dealToEnemy), `js/entities.js` (titanStaggered + decay), `js/hud.js:291-303` (boss bar), `js/world.js` (drawTitan icon choáng)

**Interfaces:**
- Consumes: fields Task 3.
- Produces: `e.stagger` (0-100) tích lũy trong `dealToEnemy` theo `opts.from` (rate: player 0.30 / tank 0.35 / healer 0.08), decay 5/s, `titanStaggered(e, dur)` (staggeredT = vulnT = dur, gauge reset, ngắt cast + telegraph), damage ×1.5 khi `e.vulnT > 0`.

- [ ] **Step 1: dealToEnemy — vuln ×1.5 + stagger gain**

Trong `dealToEnemy`: sau dòng `const d = Math.max(1, ...)` (dòng 56) thêm `const dmgFinal = (e.vulnT || 0) > 0 ? d * 1.5 : d;`. Đổi `e.hp -= d;` thành `e.hp -= dmgFinal;`, đổi tham số `addText(Math.round(d), ...)` thành `addText(Math.round(dmgFinal), ...)`. Thêm ngay sau `e.hp -= dmgFinal;`:

```js
  if (e.def.titan && !e.shielded && (e.staggeredT || 0) <= 0) {
    const rate = { player: 0.30, tank: 0.35, healer: 0.08 }[opts.from || 'player'] || 0.30;
    e.stagger = Math.min(100, (e.stagger || 0) + dmgFinal * rate);
    if (e.stagger >= 100) titanStaggered(e, 5);
  }
```

- [ ] **Step 2: titanStaggered + hiển thị choáng**

Thêm hàm (gần updateTitan):

```js
function titanStaggered(e, dur) {
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
```

Trong `drawTitan`, bên trong ctx.save/translate (sau khối mắt vàng) thêm: `if ((e.staggeredT || 0) > 0) drawEmoji(ctx, '💫', 0, -e.r - 34, 30);`

- [ ] **Step 3: HUD — stagger bar + tiêu đề boss động + cast bar theo màu**

Trong `drawDuty` boss bar (dòng 291-303): dòng tiêu đề đổi thành:

```js
      ttext(ctx, b.def.title || 'IFRIT — PRIMAL CỦA LỬA', cx, bby - 6, 15, b.def.titan ? '#e0c9a0' : '#ff9c6b', 'center', TITLE_FONT, 1, 'bold');
```

XÓA block `if (b.cast) {...}` cũ (dòng 299-302), thay bằng:

```js
      if (b.def.titan) {
        const sk = clamp((b.stagger || 0) / 100, 0, 1);
        this.bar(ctx, bbx, bby + 22, bbw, 10, sk, sk > 0.7 ? '#ffef9a' : '#ffe066');
        ttext(ctx, 'STAGGER', bbx + 46, bby + 27, 9, '#1a1408', 'center', UI_FONT, 1, 'bold');
        if (b.cast) {
          this.bar(ctx, bbx, bby + 36, bbw, 14, b.cast.t / b.cast.tmax, b.cast.color || '#ffd75e', 'rgba(20,16,8,0.9)');
          ttext(ctx, `⚒ ${b.cast.name}${b.cast.counterable ? '  ⟵ COUNTER! (6)' : ''}`, cx, bby + 43, 11, b.cast.counterable ? '#0a4a5a' : '#1a1408', 'center', UI_FONT, 1, 'bold');
        }
      } else if (b.cast) {
        this.bar(ctx, bbx, bby + 24, bbw, 14, b.cast.t / b.cast.tmax, '#ffd75e', 'rgba(20,16,8,0.9)');
        ttext(ctx, `⚒ ${b.cast.name}`, cx, bby + 31, 11, '#1a1408', 'center', UI_FONT, 1, 'bold');
      }
```

- [ ] **Step 4: Verify tay + commit**

Run: `?titan=1&job=blm`. Đánh Titan liên tục.
Expected: boss bar "TITAN — PRIMAL CỦA ĐẤT" + thanh vàng STAGGER tụt khi ngừng đánh; console `G.boss.stagger = 99` + 1 đòn → banner "TITAN CHOÁNG", boss đứng im 5s có 💫, số damage lớn hơn rõ rệt (×1.5). Gauge về 0 sau stagger.
Commit: `git add -A && git commit -m "Stagger gauge Titan: tích lũy theo damage, decay 5/s, choáng 5s +50% dmg, thanh HUD"`

---

### Task 5: Counter — nút 🛡, phím 6, PARRY, đòn Bury xanh

**Files:**
- Modify: `js/input.js:64`, `js/main.js` (tap + keyAction), `js/hud.js` (layout/btnAt/drawSkillButtons), `js/entities.js` (tryCounter + Bury), `js/audio.js` (parry), `js/world.js` (viền counterable)

**Interfaces:**
- Consumes: stagger (Task 4), `cancelOwnerTelegraphs`.
- Produces: `tryCounter(p)` → bool; `p.counterCd` (max 12); `HUD.counterBtn` + id `'counter'`; action key `'counter'`; `e.cast.counterable` + `e.cast.color = '#6ee7ff'`; đòn `bury` trong rotation.

- [ ] **Step 1: input + main**

`input.js` dòng 64: thêm `Digit6: 'counter'` vào map (sau Digit5).
`main.js` handleTap: sau `else if (b.id === 'lb')` thêm `else if (b.id === 'counter') tryCounter(G.player);`
`main.js` loop keyActions: sau `else if (act === 'lb')` thêm `else if (act === 'counter') tryCounter(G.player);`

- [ ] **Step 2: HUD nút counter**

`hud.js` `layout()`: sau dòng `this.lbBtn = ...` thêm `this.counterBtn = T(866, 460, 38);`
`btnAt`: trước vòng skillBtns thêm `if (circ(this.counterBtn)) return { id: 'counter' };`

Cuối `drawSkillButtons` (sau khối Potion) thêm:

```js
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
    ttext(ctx, '6', cb.x - cb.r + 13, cb.y - cb.r + 13, 12, 'rgba(232,236,245,0.65)', 'center');
```

- [ ] **Step 3: tryCounter + player field + sfx parry**

`entities.js` `makePlayer`: thêm `counterCd: 0,` vào object p. `updatePlayer`: thêm `p.counterCd = Math.max(0, p.counterCd - dt);`
`audio.js` thêm: `case 'parry': this.tone(1400, 0.1, 'square', 0.12, -500); this.tone(880, 0.2, 'sine', 0.1, -220, 0.02); break;`

Thêm hàm:

```js
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
```

- [ ] **Step 4: Đòn Bury counterable + viền xanh quanh boss**

`castTitanAbility`: thêm `bury: 2.6` vào map base, `'Bury'` vào map name, và nhánh (chạy sau khi `e.cast` đã gán):

```js
  } else if (id === 'bury') {
    e.cast.counterable = true;
    e.cast.color = '#6ee7ff';
    e.cast.onDone = (self) => {
      for (const m of partyMembers()) if (m.alive) hitMember(m, m.maxhp * 0.8, 'Bury — không COUNTER!');
      G.cam.shake = 16; Snd.sfx('bigboom');
    };
  }
```

Sửa `TITAN_PHASES[0].actions` thành: `['landslide', 'geocrush', 'bury', 'tumult', 'landslide', 'geocrush', 'bury']`

`drawTitan`, bên trong ctx.save/translate (sau flashT block) thêm:

```js
    if (e.cast && e.cast.counterable) {
      const pl = 0.6 + 0.4 * Math.sin(G.t * 12);
      ctx.strokeStyle = `rgba(180,240,255,${pl})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0, 0, e.r + 16, (e.r + 16) * 0.95, 0, 0, TAU); ctx.stroke();
    }
```

- [ ] **Step 5: Verify tay + commit**

Run: `?titan=1&job=pld`.
Expected: rotation có "Bury" — cast bar XANH + viền trắng nhấp nháy quanh Titan + "⟵ COUNTER! (6)" trên boss bar. Phím `6` khi gần + đang cast xanh → "PARRY!", Titan giật lùi 1.5s, stagger +30. Đứng xa bấm → toast "Xa quá!", không tốn CD. Không counter → cast xong cả party mất ~80% HP. Nút 🛡 có vòng CD 12s.
Commit: `git add -A && git commit -m "Hệ thống Counter: nút 6 + PARRY + đòn Bury counterable (cast xanh viền trắng)"`

---

### Task 6: Heart of Stone (P1.5) + wipeParty + helper after()

**Files:**
- Modify: `js/data.js` (ETYPES heart), `js/entities.js` (spawnHeart/updateHeart/after/wipeParty/killEnemy/dealToEnemy/updateTitan gate), `js/world.js` (drawHeart + routing), `js/main.js` (G.delayed)

**Interfaces:**
- Consumes: `titanStaggered`, `cancelOwnerTelegraphs`.
- Produces: `ETYPES.heart` (hp 1400, fuse 12), `spawnHeart(titan)`, `updateHeart(e, dt)`, `wipeParty(label)`, `after(sec, fn)` + `G.delayed`, fields `e.shielded`, `e.heartDone`, guard "KHÔNG THẤM" trong `dealToEnemy`.

- [ ] **Step 1: ETYPES heart + G.delayed + after/wipeParty**

`data.js` ETYPES thêm:
`heart: { name: 'Heart of Stone', icon: '💠', hp: 1400, dmg: 0, xp: 200, spd: 0, aggro: 0, r: 22, stationary: true, heart: true, noCount: true, color: '#b8a8d8' },`

`main.js`: thêm `delayed: [],` vào G; trong `buildDuty` khối reset thêm `G.delayed = [];`. Trong `update(dt)` sau dòng `G.hintT = ...` (dòng 364) thêm:

```js
  for (const d of G.delayed) d.t -= dt;
  const fireNow = G.delayed.filter(d => d.t <= 0);
  G.delayed = G.delayed.filter(d => d.t > 0);
  for (const d of fireNow) d.fn();
```

`entities.js` thêm:

```js
function after(sec, fn) { G.delayed.push({ t: sec, fn }); }
function wipeParty(label) {
  for (const m of partyMembers()) if (m.alive) hitMember(m, 99999, label);
  G.cam.shake = 20; Snd.sfx('fail');
}
```

- [ ] **Step 2: spawnHeart + updateHeart + routing + killEnemy + dealToEnemy guard**

```js
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
```

`updateEnemies`: trước `if (e.def.nail)` (dòng 458) thêm `if (e.def.heart) { updateHeart(e, dt); continue; }`
`killEnemy` dòng 434: điều kiện thêm `&& !e.def.noCount`. Thêm sau nhánh isBoss:

```js
  if (e.def.heart && G.boss && G.boss.alive && G.boss.def.titan) {
    G.boss.shielded = false;
    titanStaggered(G.boss, 6);
    G.toasts.push({ txt: '💫 Trái tim vỡ — Titan choáng 6s, DỒN DAMAGE!', t: 0, tmax: 2.4, color: '#ffe066' });
  }
```

`dealToEnemy` đầu hàm (sau `if (!e.alive) return 0;`) thêm:
`if (e.shielded) { addText('KHÔNG THẤM', e.x, e.y - e.r - 12, '#8b93a8', 14); return 0; }`

- [ ] **Step 3: Gate 70% trong updateTitan**

TRƯỚC khối "gate phase theo %HP" thêm:

```js
  // phase trái tim đá tại 70%
  if (!e.heartDone && e.hp < e.maxhp * 0.7) {
    e.heartDone = true;
    e.cast = null;
    cancelOwnerTelegraphs(e);
    spawnHeart(e);
    G.cam.shake = 12; Snd.sfx('rumble');
    return;
  }
```

(Khối gate phase đã có điều kiện `e.heartDone` từ Task 3 — giờ hoạt động: heart xử lý xong mới sang P2.)

- [ ] **Step 4: world.js — drawHeart + routing**

`drawEntities` dòng 180: thêm `e.def.heart ? 'heart' :` trước `e.def.nail ? 'nail' :`. Dòng 191 thêm nhánh: `else if (d.kind === 'heart') this.drawHeart(ctx, d.o);`

```js
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
```

- [ ] **Step 5: Verify tay + commit**

Run: `?titan=1&job=blm`. Console: `G.boss.hp = G.boss.maxhp * 0.71` rồi đánh 1 đòn.
Expected: banner "TRÁI TIM ĐÁ", boss đứng im bốc khói đá, đánh boss ra "KHÔNG THẤM"; tim 💠 có 2 thanh (HP tím + fuse vàng đếm ngược). Phá tim (console `G.enemies.find(e=>e.def.heart).hp=1` + 1 đòn) → Titan choáng 6s ×1.5 damage. Để fuse hết → cả party chết → DUTY FAILED.
Commit: `git add -A && git commit -m "Phase Trái Tim Đá: phá trong 12s hoặc wipe + helper after()/wipeParty()"`

---

### Task 7: P2 — Gaol + Bombs + Cross Slide + Stagger Check + AI thích ứng + telegraph sector

**Files:**
- Modify: `js/data.js` (ETYPES gaol), `js/util.js` (angDiff/pointInSector), `js/entities.js` (p2 actions, spawnGaol/updateGaol, stagger check, greed, telegraphHitTest, updatePlayer/tryUseSkill/updateAllies gaoled, killEnemy gaol), `js/world.js` (drawGaol, sector draw, routing), `js/hud.js` (overlay stagger-check)

**Interfaces:**
- Consumes: heart gate (Task 6), stagger (4), counter (5), `G.staggerCheck`.
- Produces: `ETYPES.gaol` (hp 600, fuse 10), `spawnGaol(member)`, `updateGaol(e, dt)`, telegraph `shape:'sector'` (`{ r, ang, spread, safeAng? }`), `pointInSector(px,py,x,y,r,ang,spread)`, `G.staggerCheck = { t, tmax, titan }`, p2 trong `TITAN_PHASES`, greed slap, closest-pair bombs, `e.dodgeStreak`, `e.skipFirstGaol`, `p.gaoled`.

- [ ] **Step 1: Telegraph sector — util + hitTest + draw**

`util.js` thêm sau `pointInAnnulus` (dòng 16):

```js
function angDiff(a, b) { return Math.abs(((a - b + Math.PI * 3) % TAU) - Math.PI); }
function pointInSector(px, py, x, y, r, ang, spread) {
  if (dist2(px, py, x, y) > r * r) return false;
  return angDiff(Math.atan2(py - y, px - x), ang) <= spread / 2;
}
```

`entities.js` `telegraphHitTest` thêm trước `return false`: `if (tg.shape === 'sector') return pointInSector(px, py, x, y, tg.r, tg.ang, tg.spread);`

`world.js`? Không — `drawTelegraphs` nằm ở `entities.js:1069-1108`. Thêm nhánh trước `ctx.restore()` cuối:

```js
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
```

- [ ] **Step 2: Gaol — ETYPES + spawn/update + player/NPC gaoled + drawGaol**

`data.js` ETYPES thêm:
`gaol: { name: 'Granite Gaol', icon: '🪨', hp: 600, dmg: 0, xp: 100, spd: 0, aggro: 0, r: 26, stationary: true, gaol: true, noCount: true, color: '#9a8d78' },`

`entities.js` thêm:

```js
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
```

`updateEnemies` routing: thêm `if (e.def.gaol) { updateGaol(e, dt); continue; }` TRƯỚC nhánh heart.
`killEnemy` thêm sau nhánh heart: `if (e.def.gaol && e.member) { e.member.gaoled = null; addText('TỰ DO!', e.x, e.y - 40, '#7de08a', 18, true); }`
`updatePlayer`: khối di chuyển — đổi `const mv = (G.demo && G.demoMove) ? G.demoMove : Input.moveVec();` thành `const mv = p.gaoled ? { x: 0, y: 0, mag: 0 } : ((G.demo && G.demoMove) ? G.demoMove : Input.moveVec());`
`tryUseSkill`: sau check `G.paused` (dòng 113) thêm:

```js
  if (p.gaoled && p.target !== p.gaoled) {
    G.toasts.push({ txt: '🪨 Bạn đang bị giam — phá cũi để thoát!', t: 0, tmax: 1.2, color: '#e0c9a0' });
    return false;
  }
```

`updateAllies`: sau `if (!a.alive) {...continue;}` thêm `if (a.gaoled) continue;`

`world.js` `drawEntities` dòng 180 thêm `e.def.gaol ? 'gaol' :` trước heart; nhánh `else if (d.kind === 'gaol') this.drawGaol(ctx, d.o);`. Thêm method:

```js
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
```

- [ ] **Step 3: P2 actions (crossslide/bomb/gaol) + closest pair + vào TITAN_PHASES**

`castTitanAbility`: thêm vào map base: `crossslide: 2.4, bomb: 2.5, gaol: 2.6,`; vào map name: `crossslide: 'Cross Slide', bomb: 'Bombardment', gaol: 'Granite Gaol',`. Thêm nhánh:

```js
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
    for (const m of pair) addTelegraph({ owner: e, shape: 'circle', x: m.x, y: m.y, r: 85, tmax, dmg: 320 * e.atkBuff, label: 'Bomb' });
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
  }
```

Thêm phase p2 vào `TITAN_PHASES` (sau p1):

```js
  {
    id: 'p2', name: 'GIAI ĐOẠN 2 — CỖI ĐÁ', gate: 0.35, tempo: 0.9,
    actions: ['crossslide', 'bomb', 'gaol', 'geocrush', 'bury', 'gaol', 'bomb', 'crossslide'],
  },
```

- [ ] **Step 4: Stagger Check đầu P2 + greed slap + rage**

Trong `updateTitan`, sau khối gate phase thêm:

```js
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
    if (e.stagger >= 100) {
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
```

Hook đếm né/trúng: trong `updateTelegraphs`, nhánh player bị dính (dòng 1041-1047, trong `if (tg.dmg > 0 && p.alive && telegraphHitTest...)`) thêm đầu nhánh: `if (tg.owner && tg.owner.def && tg.owner.def.titan) tg.owner.dodgeStreak = 0;`
Nhánh né thành công (dòng 1048-1051, else `G.tut.count.dodge++`) thêm: `if (tg.owner && tg.owner.def && tg.owner.def.titan) tg.owner.dodgeStreak = (tg.owner.dodgeStreak || 0) + 1;`

- [ ] **Step 5: HUD overlay stagger-check**

Trong `drawDuty`, sau khối boss bar thêm:

```js
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
```

- [ ] **Step 6: Verify tay + commit**

Run: `?titan=1&job=pld`. Console: `G.boss.hp = G.boss.maxhp * 0.71` → phá heart → vào P2.
Expected: banner GIAI ĐOẠN 2 + overlay STAGGER CHECK 8s giữa màn; thành công → toast skip Gaol đầu. Rotation P2: Cross Slide (2 rect chéo), Bombardment (2 vòng cam lên cặp đứng gần — toast SPREAD), Granite Gaol (cũi đá nhốt người, đếm ngược 10s trên đầu cũi, phá cũi ra "TỰ DO!", không phá → người đó chết). Đứng sau lưng boss 4s → Seismic Slap quạt sau lưng. Né sạch 3 telegraph → toast "Titan NỔI GIẬN" + đòn kế cast nhanh. Bury vẫn counter được.
Commit: `git add -A && git commit -m "P2 Titan: Gaol/Bomb/Cross Slide + Stagger Check + AI thích ứng (greed slap, closest-pair, rage)"`

---

### Task 8: P3 — Earthen Fury + Upheaval + Mountain Buster + soft enrage

**Files:**
- Modify: `js/entities.js` (p3 actions + enrage trong updateTitan, marker tb parameterize)

**Interfaces:**
- Consumes: sector telegraph (Task 7), `after()`, marker 'tb'.
- Produces: p3 trong `TITAN_PHASES`; `fury` (3 wave liên hoàn, wipe nếu trúng), `upheaval` (counterable knockback + phạt va viền), `mountainbuster` (marker tb dmg 700); soft enrage: sau 180s trong P3, `e.atkBuff += 0.05` mỗi 10s (field `e.p3T`, `e.enraged`); marker tb nhận `m.dmg`, `m.label` tùy chọn.

- [ ] **Step 1: Marker tb parameterize**

`updateMarkers` nhánh `tb` (dòng 912-917): đổi `hitMember(t, 620, 'Infernal Edge (Tank Buster)');` thành `hitMember(t, m.dmg || 620, m.label || 'Infernal Edge (Tank Buster)');`

- [ ] **Step 2: P3 actions + phase config**

`castTitanAbility`: thêm base `fury: 7.0, upheaval: 2.4, mountainbuster: 2.6`; name `fury: 'Earthen Fury', upheaval: 'Upheaval', mountainbuster: 'Mountain Buster',`. Thêm nhánh:

```js
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
              m.stunT = 1; // updatePlayer xử lý stun (bước này thêm lưới an toàn)
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
```

Thêm phase p3 vào `TITAN_PHASES`:

```js
  {
    id: 'p3', name: 'GIAI ĐOẠN 3 — CƠN THỊNH NỘ', gate: 0, tempo: 0.75,
    actions: ['fury', 'upheaval', 'mountainbuster', 'bury', 'fury', 'crossslide'],
  },
```

- [ ] **Step 3: Player stun 1s khi va viền + soft enrage trong updateTitan**

`updatePlayer`: trong khối timers (sau `p.spdBuffT = ...` dòng 318) thêm `p.stunT = Math.max(0, (p.stunT || 0) - dt);`. Khối di chuyển: gộp điều kiện stun với gaoled — đổi dòng `const mv = p.gaoled ? { x: 0, y: 0, mag: 0 } : ...` (đã thêm ở Task 7) thành:

```js
    const mv = (p.gaoled || (p.stunT || 0) > 0) ? { x: 0, y: 0, mag: 0 } : ((G.demo && G.demoMove) ? G.demoMove : Input.moveVec());
```

Trong `updateTitan`, sau khối stagger check / greed (không chạy khi staggeredT — đoạn này nằm sau `if ((e.staggeredT || 0) > 0) return;`):

```js
  // soft enrage P3: sau 3 phút, mỗi 10s mạnh thêm 5%
  if (e.phaseIdx === 2) {
    e.p3T = (e.p3T || 0) + dt;
    if (e.p3T > 180) {
      e.enraged = true;
      e.enrageAcc = (e.enrageAcc || 0) + dt;
      if (e.enrageAcc >= 10) { e.enrageAcc -= 10; e.atkBuff += 0.05; }
    }
  }
```

- [ ] **Step 4: Verify tay + commit**

Run: `?titan=1&job=pld`. Console: `G.boss.hp = G.boss.maxhp*0.7` → phá heart → `G.boss.hp = G.boss.maxhp*0.36` → vào P3.
Expected: banner GIAI ĐOẠN 3, cast nhanh hơn rõ rệt. "Earthen Fury": 3 đợt liên tiếp — mỗi đợt cả arena đỏ trừ 1 quạt XANH phát sáng; đứng góc xanh 3 lần liên tiếp = sống; dính 1 đợt = chết cả team (dmg 4000). "Upheaval" (xanh, counter được): không counter → bị hất từ tâm ra ngoài, va gần viền mất máu + đứng im 1s; counter → không sao. "Mountain Buster": marker 🔻 trên tank, đòn 700. Console: `G.boss.p3T = 179` → chờ → `G.boss.atkBuff` tăng dần từng 10s (console check).
Commit: `git add -A && git commit -m "P3 Titan: Earthen Fury (sector safe-quadrant wipe), Upheaval counterable, Mountain Buster, soft enrage"`

---

### Task 9: Wipe/retry + HUD polish + victory/defeat/objective/legend

**Files:**
- Modify: `js/entities.js` (resetTitanFight), `js/main.js:110-132` (respawnPlayer branch), `js/hud.js` (objectiveText, drawVictory, drawDefeat, drawHelp legend), `js/main.js:103-109` (bossDefeated flash màu)

**Interfaces:**
- Consumes: mọi task trước.
- Produces: `resetTitanFight()` (reset full Titan + party ở cửa arena, mở lại cổng titan), respawnPlayer phân nhánh theo boss active.

- [ ] **Step 1: resetTitanFight + respawn branch**

`entities.js` thêm:

```js
function resetTitanFight() {
  const e = G.boss;
  if (!e || !e.def.titan) return;
  e.hp = e.maxhp;
  e.engaged = false;
  e.cast = null; e.stunT = 0;
  e.stagger = 0; e.staggeredT = 0; e.vulnT = 0; e.shielded = false;
  e.phaseIdx = 0; e.rotIdx = 0; e.abilityCd = 2.5; e.clawCd = 1.5;
  e.heartDone = false; e.checkDone = false; e.skipFirstGaol = false;
  e.greed = {}; e.dodgeStreak = 0; e.rageNext = false; e.p3T = 0; e.enrageAcc = 0;
  e.enraged = false; e.atkBuff = 1; e.atkBuffT = 0;
  e.x = MAP.titanArena.x; e.y = MAP.titanArena.y - 40;
  for (const en of G.enemies) if (en.alive && (en.def.gaol || en.def.heart)) en.alive = false;
  for (const en of G.enemies) if (en.member) en.member.gaoled = null;
  cancelOwnerTelegraphs(e);
  G.markers = [];
  G.staggerCheck = null;
  G.delayed = [];
  const gt = G.gates.find(g => g.id === 'titan');
  if (gt) gt.closed = false;
}
```

`main.js` `respawnPlayer`: sau `G.markers = [];` (dòng 121), thêm branch Titan TRƯỚC khối `if (inArena)` Ifrit — đổi vị trí hồi sinh:

```js
  if (inArena && G.boss.def.titan) {
    resetTitanFight();
    p.x = MAP.titanGateX - 90; p.y = MAP.titanArena.y;
    p.weaknessT = 0; // thử lại = lượt mới hoàn toàn, không phạt weakness
    for (const a of G.allies) { a.alive = true; a.hp = a.maxhp; a.deadT = 0; a.x = p.x - 30; a.y = p.y + 36; }
    G.toasts.push({ txt: '🗿 Thử lại: Titan đã hồi phục hoàn toàn!', t: 0, tmax: 2.6, color: '#e0c9a0' });
    G.state = 'duty';
    return;
  }
```

(Giữ nguyên flow Ifrit cũ cho boss Ifrit: heal 25% + giữa arena.)

- [ ] **Step 2: HUD — objective + defeat/victory text + legend**

`hud.js` `objectiveText`: thay khối `else if (G.boss.alive) { ... }` (dòng 541-543) bằng:

```js
    } else if (G.ifritDead && G.boss && G.boss.alive && G.boss.def.titan) {
      lines.push({ txt: `◆ Hạ gục Titan  (${Math.ceil(Math.max(0, G.boss.hp))}/${G.boss.maxhp})`, color: '#e0c9a0' });
    } else if (G.boss.alive) {
      lines.push({ txt: `◆ Hạ gục Ifrit  (${Math.ceil(Math.max(0, G.boss.hp))}/${G.boss.maxhp})`, color: '#ff9c6b' });
    }
```

`drawDefeat` dòng 592: `ttext(ctx, G.boss && G.boss.engaged ? 'Ifrit vẫn đang túc trực...' : ...)` đổi thành:

```js
    ttext(ctx, G.boss && G.boss.engaged ? (G.boss.def.titan ? 'Titan vẫn đang túc trực...' : 'Ifrit vẫn đang túc trực...') : 'Eorzea cần bạn thử lại!', G.VW / 2, y + 168, 16, '#c9d2e4');
```

`drawVictory` dòng 560: đổi 'Bạn đã hạ gục Ifrit, Primal của Lửa!' thành `'Bạn đã hạ gục Titan, Primal của Đất — The Navel hoàn thành!'`

`drawHelp` rows (dòng 515-524) thêm 5 dòng:

```js
      ['⚡', 'STAGGER (thanh vàng)', 'Đánh liên tục để làm đầy — đầy 100 Titan CHOÁNG, nhận thêm damage'],
      ['🛡️', 'COUNTER (nút 6)', 'Đòn cast XANH: lại gần bấm 🛡 đúng lúc để PARRY — không thì cả team ăn 80% HP'],
      ['💠', 'Heart of Stone', 'Phá trong 12s khi xuất hiện — fail là WIPE cả team'],
      ['🪨', 'Granite Gaol', 'Cũi đá giam 1 người — PHÁ CÙI trong 10s nếu không người đó chết'],
      ['🌋', 'Earthen Fury', '3 đợt quét sân — chỉ góc XANH an toàn, đứng sai 1 lần là wipe'],
```

Và dòng hướng dẫn cuối bảng (dòng 531) đổi thành: `'Điều khiển: joystick trái · nút skill phải · chạm quái để target · 1-6/Q/R trên desktop'`

- [ ] **Step 3: Verify tay + commit**

Run: `?titan=1&job=pld` → engage → để chết (console: `G.player.hp=1; damagePlayer(50,'test')` → hoặc đứng trong Landslide).
Expected: DUTY FAILED với text "Titan vẫn đang túc trực..." → bấm "Hồi sinh" → đứng ở CỬA arena titan, party full HP, Titan giữa sân ngủ full HP (console: `G.boss.hp === G.boss.maxhp`, `G.boss.engaged === false`), cổng mở lại, đi vào re-engage từ đầu P1. Objective panel ghi "Hạ gục Titan (9000/9000)". Legend ❓ có 5 dòng mới.
Commit: `git add -A && git commit -m "Retry sau wipe Titan (reset full ở cửa arena) + HUD objective/defeat/victory/legend"`

---

### Task 10: Bot demo + docs + checklist chạy thử toàn bộ

**Files:**
- Modify: `js/main.js:206-276` (demoBot), `README.md`, `TODO.md`

**Interfaces:**
- Consumes: mọi hệ thống.
- Produces: bot demo biết counter/đánh heart+gaol/né sector; docs cập nhật.

- [ ] **Step 1: demoBot — counter + ưu tiên heart/gaol + né sector**

Trong `demoBot`, khối `if (danger) { ... }` (né telegraph): sau dòng `if (danger.shape === 'rect') a = ...` và TRƯỚC dòng `G.demoMove = { x: Math.cos(a), ...` thêm:

```js
    if (danger.shape === 'sector' && danger.safeAng !== undefined) {
      const A = MAP.titanArena;
      a = ang(p.x, p.y, A.x + Math.cos(danger.safeAng) * 200, A.y + Math.sin(danger.safeAng) * 200);
    }
```

(Nhờ vậy hướng né mặc định được đè thành "chạy về góc xanh an toàn" khi danger là sector fury.)

Đổi dòng `const foes = G.enemies.filter(e => e.alive && !e.def.nail);` + dòng `const nails = ...` + dòng `let tgt = nails[0] || ...` thành (bot phá cả cũi của CHÍNH MÌNH):

```js
  const mech = G.enemies.filter(e => e.alive && (e.def.nail || e.def.heart || e.def.gaol));
  const foes = G.enemies.filter(e => e.alive && !e.def.nail && !e.def.heart && !e.def.gaol);
  let tgt = mech[0] || foes.reduce((b, e) => !b || dist(p.x, p.y, e.x, e.y) < dist(p.x, p.y, b.x, b.y) ? e : b, null);
```

Sau khối bấm skill (trước `if (p.hp < ...)`) thêm counter bot:

```js
  // counter khi Titan cast đòn xanh (đợi nửa cast cho tự nhiên)
  const tb = G.boss;
  if (tb && tb.def.titan && tb.engaged && tb.cast && tb.cast.counterable && tb.cast.t > tb.cast.tmax * 0.45) {
    const d = dist(p.x, p.y, tb.x, tb.y);
    if (d > 220 + tb.r) {
      const a = ang(p.x, p.y, tb.x, tb.y);
      G.demoMove = { x: Math.cos(a), y: Math.sin(a), mag: 1 };
    } else tryCounter(p);
  }
```

- [ ] **Step 2: README + TODO**

README: bảng Điều khiển thêm dòng `| Counter | nút 🛡 (cung phải) | phím \`6\` |`; mục "Nội dung game" thêm bullet: `- **Duty 2 "The Navel"**: sau khi hạ Ifrit, cổng đá mở → golem/sprite → boss **Titan** với **Stagger gauge** (làm đầy → choáng), **Counter** 🛡 đòn cast xanh (Lost Ark-style), **Heart of Stone** (12s phá hoặc wipe), **Granite Gaol** giam người, **Earthen Fury** 3 góc an toàn, AI thích ứng (phạt đứng sau lưng, nhắm người xa nhất, nổi giận khi bị né sạch). Fail mechanic lớn = WIPE, thử lại từ cửa arena.`; URL cheat thêm `- \`?titan=1\` — bỏ qua Ifrit + trash, vào thẳng Titan`.
TODO.md: mục ✅ thêm `- [x] **Duty 2: The Navel (Titan)** — stagger gauge, counter, heart phase, gaol, earthen fury, AI thích ứng`; mục ⬜ Boss & Duty XÓA dòng "Duty 2: The Navel (Titan)".

- [ ] **Step 3: Checklist chạy thử toàn bộ (không commit riêng — là bước xác nhận)**

Serve + chạy lần lượt, mỗi mục PASS mới sang kế:
1. `?boss=1&job=pld`: Ifrit fight nguyên vẹn như cũ; hạ Ifrit → cổng titan mở, không vào victory.
2. Quét 2 pack golem/sprite, rớt đồ i70.
3. `?titan=1&job=pld`: P1 đầy đủ (Landslide/Geocrush/Bury/Tumult), counter parry + fail case, stagger đầy → choáng.
4. 70%: heart → phá (stagger 6s) và fail (wipe → retry reset full).
5. P2: stagger check (thành công/bại), gaol giam player + giam NPC, bomb cặp gần, greed slap, rage tempo.
6. 35%: P3 fury 3 wave sống sót + wipe case, upheaval counter + va viền, mountain buster, enrage console check `G.boss.atkBuff`.
7. Hạ Titan → VICTORY "The Navel hoàn thành", rớt i90, best-time lưu localStorage.
8. `?demo=1` (để chạy ~3-5 phút): bot tự chơi qua Ifrit + Titan không chết oan (được phép fail cơ bản nhưng phải tự retry/hồi).
9. Mobile (DevTools touch hoặc điện thoại thật): nút 🛡 bấm được, overlay stagger-check không che nút skill.
10. Console sạch lỗi (`[game loop]` không xuất hiện).

- [ ] **Step 4: Commit cuối**

```bash
git add -A && git commit -m "Bot demo biết counter + phá heart/gaol/né fury + cập nhật README/TODO"
```

---

## Self-Review đã kiểm

- **Spec coverage:** 4 hệ cơ chế (§2.1 T4, §2.2 T5, §2.3 T3+T7, §2.4 T3+T7/T8), phases (§1: T3/T6/T7/T8), luật wipe (§1: T6/T7/T8), zone (§5: T1/T2), UI (§4: T4/T5/T7/T9), retry (§1: T9), bot + URL cheat (§5: T2/T10), docs (T10). Đủ.
- **Type consistency:** tên hàm/field khớp xuyên suốt (`titanStaggered`, `cancelOwnerTelegraphs`, `e.stagger/staggeredT/vulnT/shielded/heartDone/checkDone/skipFirstGaol/greed/dodgeStreak/rageNext/p3T/enraged/atkBuffT`, `p.counterCd/gaoled`, `G.staggerCheck/ifritDead/delayed`).
- **Lưu ý triển khai:** `updateTelegraphs` nằm ở entities.js (không phải world.js); heart/gaol phải được `aggro: true` khi spawn để NPC tham chiến; `?titan=1` đặt `G.tut.skip = true` để khỏi vướng tutorial.


