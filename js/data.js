'use strict';
// ===== Dữ liệu game: Job, Skill, Quái, Map, Đối thoại =====
const ROLE_COLORS = { TANK: '#4d7dd6', HEALER: '#4fc978', MELEE: '#e0565f', CASTER: '#e08b3f' };
const ROLE_VN = { TANK: 'TANK', HEALER: 'HEALER', MELEE: 'DPS CẬN CHIẾN', CASTER: 'DPS PHÉP' };
const GOLD = '#d9c48f';

// pot = potency (sức mạnh), dmg = pot * atk / 60
// Bộ kỹ năng: mỗi hero 1 chiêu ĐÁNH THƯỜNG (Q) + 3 KỸ NĂNG HỆ PHÁI (E / R / F)
const SKILLS = {
  // ===== PALADIN — HỆ THÁNH QUANG =====
  tramKiem: {
    id: 'tramKiem', name: 'Trảm Kiếm', icon: '⚔️', key: 'Q', basic: true,
    pot: 130, range: 135, mp: 0, cd: 0.9, chainEvery: 3, chainBonus: 0.8,
    color: '#ffe9a0',
    desc: 'Đánh thường — đòn thứ 3 cộng hưởng thánh quang, +80% sát thương',
  },
  nemKhien: {
    id: 'nemKhien', name: 'Ném Khiên', icon: '🛡️', key: 'E',
    pot: 190, range: 450, mp: 10, cd: 6, proj: true, taunt: true,
    color: '#ffd76a',
    desc: 'Ném khiên bay ra trúng địch rồi QUAY VỀ tay — kéo THÙ HẬN rất lớn',
  },
  thanhChanh: {
    id: 'thanhChanh', name: 'Thánh Chánh Trảm', icon: '💫', key: 'R',
    pot: 260, range: 170, mp: 20, cd: 12, leap: true, aoeSelf: 120, stun: 1,
    color: '#fff3c4',
    desc: 'Nhảy lao tới địch, đáp xuống nổ AoE thánh quang 120px + choáng 1s (trừ boss)',
  },
  thanhKhien: {
    id: 'thanhKhien', name: 'Thánh Khiên Bất Diệt', icon: '✨', key: 'F',
    pot: 0, range: 0, mp: 0, cd: 45, invuln: 5, tauntAoE: 300,
    color: '#ffe9a0',
    desc: 'CHIÊU CUỐI — bất tử 5s trong vòm thánh quang + khiêu chiến mọi địch gần',
  },

  // ===== WHITE MAGE — HỆ THIÊN NHIÊN =====
  phiThach: {
    id: 'phiThach', name: 'Phi Thạch', icon: '🪨', key: 'Q', basic: true,
    pot: 150, range: 500, mp: 0, cd: 1.1, proj: true,
    color: '#c9b8a0',
    desc: 'Đánh thường — phóng phi thạch về phía mục tiêu',
  },
  cuongPhong: {
    id: 'cuongPhong', name: 'Cuồng Phong', icon: '🌪️', key: 'E',
    pot: 90, range: 450, mp: 15, cd: 7, dot: { dur: 8, total: 120, color: '#a8e8b0' },
    color: '#a8e8b0',
    desc: 'Vòng xoáy gió cuộn quanh địch — sát thương ngay + DoT gió 8s',
  },
  thanhQuang: {
    id: 'thanhQuang', name: 'Thánh Quang', icon: '🌟', key: 'R',
    pot: 240, range: 0, mp: 40, cd: 13, cast: 1.6, aoeSelf: 180, stun: 1.2,
    color: '#fff3c4',
    desc: 'Đọc thần chú — cột sáng khổng lồ quét AoE 180px quanh bản thân + choáng (trừ boss)',
  },
  menhThien: {
    id: 'menhThien', name: 'Mệnh Thiên Hội Phục', icon: '💚', key: 'F',
    pot: 0, range: 0, mp: 60, cd: 60, cast: 1.4, heal: 0.45, shield: 0.2, revive: 0.4,
    color: '#b8f0c0',
    desc: 'CHIÊU CUỐI — hồi 45% HP cả đội, khiên 20% bản thân, HỒI SINH đồng đội gục',
  },

  // ===== BLACK MAGE — HỆ NGUYÊN TỐ =====
  hoaTien: {
    id: 'hoaTien', name: 'Hỏa Tiễn', icon: '🔥', key: 'Q', basic: true,
    pot: 140, range: 520, mp: 0, cd: 1.1, proj: true,
    color: '#ff9c2b',
    desc: 'Đánh thường — cầu lửa nhỏ miễn phí',
  },
  bangThuat: {
    id: 'bangThuat', name: 'Băng Thuật', icon: '❄️', key: 'E',
    pot: 190, range: 500, mp: 0, cd: 8, cast: 1.2, mana: 0.25, slow: { dur: 4, pct: 0.2 },
    color: '#9fdcff',
    desc: 'Mưa mũi băng giáng xuống — sát thương + làm chậm 20%/4s, hồi 25% MP',
  },
  loiPhat: {
    id: 'loiPhat', name: 'Lôi Phạt', icon: '⚡', key: 'R',
    pot: 210, range: 520, mp: 35, cd: 12, cast: 1.5, dot: { dur: 10, total: 160, color: '#ffe066' },
    color: '#ffe066',
    desc: 'Đọc thần chú — tia sét GIÁNG TỪ TRỜI vào địch + DoT sét 10s',
  },
  dietTinh: {
    id: 'dietTinh', name: 'Diệt Tinh Hỏa Ngục', icon: '☄️', key: 'F',
    pot: 380, range: 500, mp: 80, cd: 40, cast: 2.2, aoeTarget: 170,
    color: '#ff6b3b',
    desc: 'CHIÊU CUỐI — mưa thiên thạch thiêu rụi vùng 170px quanh mục tiêu',
  },

  // ===== MONK — HỆ CHÂN KHÍ =====
  lienHoan: {
    id: 'lienHoan', name: 'Liên Hoàn Cước', icon: '👊', key: 'Q', basic: true,
    pot: 110, range: 135, mp: 0, cd: 0.75, chainEvery: 3, chainBonus: 0.6,
    color: '#ffd9a0',
    desc: 'Đánh thường NHANH NHẤT — đòn thứ 3 là cú đá kết liễu +60%',
  },
  cuongQuyen: {
    id: 'cuongQuyen', name: 'Cương Quyền', icon: '🥊', key: 'E',
    pot: 240, range: 145, mp: 10, cd: 7, stun: 1,
    color: '#ffb27a',
    desc: 'Giật tay đấm một cú cháy nổ — sát thương lớn + choáng 1s (trừ boss)',
  },
  hoaHau: {
    id: 'hoaHau', name: 'Hỏa Hầu Quyền', icon: '🔥', key: 'R',
    pot: 0, range: 0, mp: 20, cd: 14, buff: { dur: 10, dmg: 0.25, spd: 0.15 },
    color: '#ff7a3d',
    desc: 'Đốt chân khí 10s: +25% sát thương, +15% tốc đánh, aura lửa quanh người',
  },
  phongThan: {
    id: 'phongThan', name: 'Phong Thần Cước', icon: '💨', key: 'F',
    pot: 320, range: 500, mp: 0, cd: 30, dashThrough: true, stun: 1.5,
    color: '#ffd75e',
    desc: 'CHIÊU CUỐI — bay khoé xuyên qua địch, AoE dọc đường lối + choáng 1.5s (trừ boss)',
  },

  // ===== SWORDMASTER (KIẾM SƯ) — HỆ KIẾM VŨ =====
  tocTram: {
    id: 'tocTram', name: 'Tốc Trảm', icon: '⚔️', key: 'Q', basic: true,
    pot: 120, range: 135, mp: 0, cd: 0.8, chainEvery: 3, chainBonus: 0.7,
    color: '#cfe8ff',
    desc: 'Đánh thường — chuỗi 3 nhát chém kiếm, đòn 3 là KIẾM KHÍ +70% sát thương',
  },
  xungKiem: {
    id: 'xungKiem', name: 'Xung Kiếm', icon: '🗡️', key: 'E',
    pot: 220, range: 460, mp: 10, cd: 9, thrust: true,
    color: '#9fe8ff',
    desc: 'Hạ thấp người CHỌC KIẾM về phía trước một đoạn xa — lao xuyên, xuyên phá mọi địch trên đường đâm',
  },
  tamDoan: {
    id: 'tamDoan', name: 'Tam Đoạn Lướt', icon: '🌀', key: 'R',
    pot: 150, range: 400, mp: 0, cd: 9, charges: 3, slide: true,
    color: '#dff2ff',
    desc: 'Lướt kiếm XUYÊN QUA mục tiêu gây sát thương — tích tối đa 3 lần lướt, mỗi lần hồi riêng 9s',
  },
  thienKiem: {
    id: 'thienKiem', name: 'Thiên Kiếm Giáng', icon: '☄️', key: 'F',
    pot: 420, range: 500, mp: 70, cd: 45, cast: 1.8, aoeTarget: 120, giantsword: true,
    color: '#ffd9a0',
    desc: 'CHIÊU CUỐI — TRIỆU HỒI thanh kiếm khổng lồ từ trên trời ĐÁM XUỐNG mục tiêu, nổ AoE 120px',
  },
};

const JOBS = {
  pld: {
    id: 'pld', name: 'Paladin', vn: 'Kiếm Sĩ Holy', role: 'TANK', icon: '🛡️',
    hp: 900, mp: 300, atk: 27, def: 15, gHp: 82, gMp: 6, gAtk: 3.2, gDef: 1.7,
    hePhai: { name: 'Thánh Quang', icon: '☀️', color: '#ffd76a' },
    skills: ['tramKiem', 'nemKhien', 'thanhChanh', 'thanhKhien'],
    desc: 'Hệ Thánh Quang — tank trâu bò, kéo thù hận, khiên bất tử gánh cả đội',
  },
  whm: {
    id: 'whm', name: 'White Mage', vn: 'Pháp Sĩ Trắng', role: 'HEALER', icon: '🌿',
    hp: 560, mp: 460, atk: 33, def: 8, gHp: 48, gMp: 10, gAtk: 3.6, gDef: 0.9,
    hePhai: { name: 'Thiên Nhiên', icon: '🍃', color: '#7de08a' },
    skills: ['phiThach', 'cuongPhong', 'thanhQuang', 'menhThien'],
    desc: 'Hệ Thiên Nhiên — gió đá nghệ công, cột sáng AoE, chiêu cuối hồi sinh cả đội',
  },
  blm: {
    id: 'blm', name: 'Black Mage', icon: '🔮', vn: 'Pháp Sĩ Đen', role: 'CASTER',
    hp: 520, mp: 520, atk: 38, def: 7, gHp: 44, gMp: 11, gAtk: 4.1, gDef: 0.8,
    hePhai: { name: 'Nguyên Tố', icon: '🌀', color: '#ff9c2b' },
    skills: ['hoaTien', 'bangThuat', 'loiPhat', 'dietTinh'],
    desc: 'Hệ Nguyên Tố — lửa băng sét 3 nguyên tố, thiên thạch hủy diệt diện rộng',
  },
  mnk: {
    id: 'mnk', name: 'Monk', vn: 'Võ Sĩ', role: 'MELEE', icon: '👊',
    hp: 640, mp: 260, atk: 34, def: 10, gHp: 55, gMp: 5, gAtk: 3.8, gDef: 1.1,
    hePhai: { name: 'Chân Khí', icon: '✊', color: '#ff8b5c' },
    skills: ['lienHoan', 'cuongQuyen', 'hoaHau', 'phongThan'],
    desc: 'Hệ Chân Khí — đánh liên hoàn cực nhanh, đốt chân khí bùng nổ, bay khoé xuyên trận',
  },
  sam: {
    id: 'sam', name: 'Swordmaster', vn: 'Kiếm Sư', role: 'MELEE', icon: '⚔️',
    hp: 620, mp: 280, atk: 36, def: 9, gHp: 53, gMp: 6, gAtk: 4.0, gDef: 1.0,
    hePhai: { name: 'Kiếm Vũ', icon: '🗡️', color: '#9fe8ff' },
    skills: ['tocTram', 'xungKiem', 'tamDoan', 'thienKiem'],
    desc: 'Hệ Kiếm Vũ — chém nhanh lấp lánh, xung kiếm xuyên phá, lướt 3 đoạn liên hoàn, thiên kiếm giáng thế',
  },
};
const JOB_ORDER = ['pld', 'whm', 'blm', 'mnk', 'sam'];

const ETYPES = {
  marmot: { name: 'Marmot', icon: '🐁', hp: 75, dmg: 11, xp: 25, spd: 120, aggro: 260, r: 16, atkRange: 70, atkCd: 2.0, color: '#a9815c' },
  goblin: { name: 'Goblin', icon: '👺', hp: 140, dmg: 15, xp: 40, spd: 145, aggro: 290, r: 19, atkRange: 72, atkCd: 1.9, color: '#6faf5c' },
  imp:    { name: 'Imp', icon: '👹', hp: 115, dmg: 15, xp: 45, spd: 120, aggro: 330, r: 17, ranged: true, castRange: 340, keepDist: 250, atkCd: 3.4, color: '#a05cc8' },
  bomb:   { name: 'Bomb', icon: '🎃', hp: 160, dmg: 12, xp: 55, spd: 135, aggro: 280, r: 19, atkRange: 70, atkCd: 2.2, selfDestruct: true, color: '#e08b3f' },
  coeurl: { name: 'Coeurl', icon: '🐆', hp: 170, dmg: 17, xp: 50, spd: 200, aggro: 300, r: 20, atkRange: 74, atkCd: 1.7, color: '#c8b45c' },
  nail:   { name: 'Infernal Nail', icon: '', hp: 430, dmg: 0, xp: 90, spd: 0, aggro: 0, r: 16, stationary: true, nail: true, color: '#ff7a3d' },
  heart:  { name: 'Heart of Stone', icon: '💠', hp: 1400, dmg: 0, xp: 200, spd: 0, aggro: 0, r: 22, stationary: true, heart: true, noCount: true, color: '#b8a8d8' },
  gaol:   { name: 'Granite Gaol', icon: '🪨', hp: 600, dmg: 0, xp: 100, spd: 0, aggro: 0, r: 26, stationary: true, gaol: true, noCount: true, color: '#9a8d78' },
  ifrit:  { name: 'Ifrit', icon: '', hp: 5200, dmg: 26, xp: 800, spd: 165, aggro: 2000, r: 58, isBoss: true, atkRange: 165, atkCd: 2.6, color: '#c9402a' },
  golem:  { name: 'Stone Golem', icon: '🪨', hp: 320, dmg: 24, xp: 90, spd: 105, aggro: 280, r: 24, atkRange: 78, atkCd: 2.4, color: '#8a7f70' },
  sprite: { name: 'Land Sprite', icon: '🌱', hp: 130, dmg: 16, xp: 70, spd: 150, aggro: 320, r: 16, ranged: true, castRange: 360, keepDist: 260, atkCd: 3.2, color: '#7fae6b' },
  titan:  { name: 'Titan', icon: '🗿', hp: 32000, dmg: 34, xp: 1600, spd: 150, aggro: 2200, r: 64, isBoss: true, titan: true, dropTier: 90, title: 'TITAN — PRIMAL CỦA ĐẤT', atkRange: 175, atkCd: 2.4, color: '#a08a6a' },
};

// Map 4700x1600 — trái (start) → giữa (Ifrit) → phải (Titan)
const MAP = {
  w: 4700, h: 1600, startX: 260, startY: 800,
  barrierX: 560, arenaGateX: 2050,
  arena: { x: 2650, y: 800, r: 470 },
  titanGateX: 3260,
  titanArena: { x: 4050, y: 800, r: 420 },
  fateZone: { x: 1600, y: 1150, r: 220 },
};

const PACKS = [
  { id: 'a1', mobs: [['marmot', 800, 560], ['marmot', 885, 645], ['marmot', 790, 705]] },
  { id: 'a2', mobs: [['goblin', 1040, 940], ['goblin', 1125, 1015], ['marmot', 975, 1035]] },
  { id: 'b1', mobs: [['imp', 1420, 610], ['imp', 1505, 695], ['bomb', 1360, 730]] },
  { id: 'b2', mobs: [['bomb', 1745, 930], ['bomb', 1825, 1005], ['imp', 1680, 1025]] },
];
const TRASH_TOTAL = PACKS.reduce((s, p) => s + p.mobs.length, 0);

// Trash vùng Titan (không tính TRASH_TOTAL — cổng titan mở khi Ifrit chết)
const TITAN_PACKS = [
  { id: 'c1', mobs: [['golem', 3400, 620], ['golem', 3480, 980]] },
  { id: 'c2', mobs: [['sprite', 3620, 700], ['sprite', 3620, 900], ['golem', 3700, 800]] },
];

const DIALOGUES = [
  { who: 'Minfilia', icon: '👩', text: 'Chiến binh của Eorzea! Primal của lửa — IFITR — đã thức tỉnh tại Bowl of Embers.' },
  { who: 'Minfilia', icon: '👩', text: 'Hãy quét sạch bọn tay sai trên đường đi. Khi cổng mở, tiến vào đấu trường và hạ gục Ifrit.' },
  { who: 'Minfilia', icon: '👩', text: 'Nhớ kỹ: vòng AOE MÀU CAM là điểm rơi của chiêu thức — di chuyển ra NGAY trước khi nó đầy! Vì Eorzea! ⚔️' },
];

const xpNext = l => Math.round(55 * Math.pow(l, 1.35));

// ===== Duty Support: NPC đồng đội =====
const ALLY_DEFS = {
  tank:   { id: 'tank', name: 'Thancred', vn: 'Warrior', icon: '🪓', hp: 1450, atk: 30, r: 20, spd: 195, pot: 210, atkCd: 2.2, color: '#4d7dd6' },
  healer: { id: 'healer', name: 'Alisaie', vn: 'Red Mage', icon: '🌸', hp: 750, atk: 26, r: 18, spd: 180, pot: 150, atkCd: 2.8, color: '#4fc978' },
};

// ===== Trang bị rớt theo khu vực =====
const ITEM_TIERS = { a1: 15, a2: 25, b1: 35, b2: 45, boss: 60, c1: 70, c2: 70, titan: 90 };

// ===== Hướng dẫn người mới (kết hợp nhiệm vụ) =====
const TUT_STEPS = [
  { id: 'move',    txt: 'Di chuyển: giữ ngón tay ở NỬA TRÁI màn hình (hoặc phím WASD)', need: 220, hint: 'joy' },
  { id: 'target',  txt: 'Chạm vào một con quái để CHỌN MỤC TIÊU', need: 1, hint: 'enemy' },
  { id: 'skill',   txt: 'Dùng chiêu đánh thường: nút Q (nút TO NHẤT bên phải)', need: 1, hint: 'skill0' },
  { id: 'skills3', txt: 'Dùng 3 kỹ năng HỆ PHÁI theo thứ tự: E → R → F', need: 3, hint: 'skill0' },
  { id: 'kill3',   txt: 'Tiêu diệt 3 quái — Thancred 🪓 và Alisaie 🌸 sẽ hỗ trợ bạn', need: 3, hint: 'enemy' },
  { id: 'pickup',  txt: 'Nhặt vật phẩm rơi (💰 gil / 🧪 thuốc tự hút về)', need: 1, hint: 'pickup' },
  { id: 'dodge',   txt: 'NÉ vòng AoE CAM: chạy RA NGOÀI trước khi nó đổ đầy!', need: 1, hint: null },
  { id: 'potion',  txt: 'Dùng thuốc 🧪 (nút nhỏ / phím Z) khi máu xuống thấp', need: 1, hint: 'potion' },
  { id: 'trash',   txt: 'Quét sạch tay sai Ifrit để mở cổng đấu trường', need: TRASH_TOTAL, hint: 'gate' },
  { id: 'boss',    txt: 'Bước vào đấu trường và HẠ GỤC IFRIT. Vì Eorzea! ⚔️', need: 1, hint: 'boss' },
];
const TUT_REWARDS = {
  move: { xp: 20 }, target: { xp: 15 }, skill: { xp: 15 }, skills3: { xp: 25, pot: 1 },
  kill3: { xp: 60 }, pickup: { gil: 20 }, dodge: { xp: 20 }, potion: { gil: 15 },
  trash: { gil: 100, pot: 1 }, boss: {},
};

const LB_NAME = { TANK: 'Shield Wall', HEALER: 'Pulse of Life', MELEE: 'Final Heaven', CASTER: 'Meteor' };
