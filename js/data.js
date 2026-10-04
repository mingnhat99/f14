'use strict';
// ===== Dữ liệu game: Job, Skill, Quái, Map, Đối thoại =====
const ROLE_COLORS = { TANK: '#4d7dd6', HEALER: '#4fc978', MELEE: '#e0565f', CASTER: '#e08b3f' };
const ROLE_VN = { TANK: 'TANK', HEALER: 'HEALER', MELEE: 'DPS CẬN CHIẾN', CASTER: 'DPS PHÉP' };
const GOLD = '#d9c48f';

// pot = potency (sức mạnh), dmg = pot * atk / 60
const SKILLS = {
  // --- Paladin ---
  fastBlade:      { id: 'fastBlade', name: 'Fast Blade', icon: '⚔️', pot: 200, range: 135, mp: 0, gcd: true, desc: 'Mở đầu combo trăm' },
  riotBlade:      { id: 'riotBlade', name: 'Riot Blade', icon: '🗡️', pot: 260, range: 135, mp: 0, gcd: true, combo: 'fastBlade', desc: 'Combo 2 — hồi MP' },
  rageOfHalone:   { id: 'rageOfHalone', name: 'Rage of Halone', icon: '💥', pot: 340, range: 135, mp: 0, gcd: true, combo: 'riotBlade', desc: 'Combo 3 — giảm ATK địch' },
  shieldLob:      { id: 'shieldLob', name: 'Shield Lob', icon: '🛡️', pot: 190, range: 450, mp: 0, gcd: true, proj: true, desc: 'Ném khiên — kéo aggro' },
  hallowedGround: { id: 'hallowedGround', name: 'Hallowed Ground', icon: '✨', pot: 0, range: 0, mp: 0, gcd: false, cd: 110, desc: 'BẤT TỬ 6 giây' },
  // --- White Mage ---
  stone:          { id: 'stone', name: 'Stone', icon: '🪨', pot: 240, range: 510, mp: 0, gcd: true, cast: 1.5, proj: true, desc: 'Đá phép — mục tiêu đơn' },
  aero:           { id: 'aero', name: 'Aero', icon: '🌪️', pot: 70, range: 510, mp: 12, gcd: true, dot: { dur: 9, total: 140, color: '#7de08a' }, desc: 'Gió + sát thương kéo dài 9s' },
  cure:           { id: 'cure', name: 'Cure', icon: '💚', pot: 0, range: 0, mp: 30, gcd: true, cast: 1.2, heal: 0.35, desc: 'Hồi 35% HP bản thân' },
  holy:           { id: 'holy', name: 'Holy', icon: '⭐', pot: 260, range: 0, mp: 50, gcd: true, cast: 1.7, aoeSelf: 180, stun: 1.2, desc: 'AoE sáng + choáng kẻ địch' },
  lucidDreaming:  { id: 'lucidDreaming', name: 'Lucid Dreaming', icon: '💧', pot: 0, range: 0, mp: 0, gcd: false, cd: 60, mana: 0.55, desc: 'Hồi 55% MP' },
  // --- Black Mage ---
  fire:           { id: 'fire', name: 'Fire', icon: '🔥', pot: 300, range: 550, mp: 45, gcd: true, cast: 1.7, proj: true, st: 'AF', desc: 'Cầu lửa — cộng dồn Astral Fire (+dame, +tốn MP)' },
  blizzard:       { id: 'blizzard', name: 'Blizzard', icon: '❄️', pot: 190, range: 550, mp: 0, gcd: true, cast: 1.4, proj: true, mana: 0.35, st: 'UI', desc: 'Băng + hồi MP — chuyển Umbral Ice' },
  thunder:        { id: 'thunder', name: 'Thunder', icon: '⚡', pot: 70, range: 530, mp: 20, gcd: true, dot: { dur: 12, total: 200, color: '#ffe066' }, desc: 'Sét + sát thương kéo dài 12s' },
  flare:          { id: 'flare', name: 'Flare', icon: '☄️', pot: 380, range: 550, mp: 90, gcd: true, cast: 2.4, aoeTarget: 170, st: 'AF', desc: 'AoE lửa KHỦNG quanh mục tiêu' },
  manaward:       { id: 'manaward', name: 'Manaward', icon: '🔷', pot: 0, range: 0, mp: 0, gcd: false, cd: 90, shield: 0.45, desc: 'Khiên phép = 45% HP' },
  // --- Monk ---
  bootshine:      { id: 'bootshine', name: 'Boot Shine', icon: '👊', pot: 220, range: 135, mp: 0, gcd: true, critBonus: 0.45, pos: 'rear', desc: 'Combo 1 — đánh SAU LƯNG chắc chắn crit' },
  trueStrike:     { id: 'trueStrike', name: 'True Strike', icon: '🥊', pot: 280, range: 135, mp: 0, gcd: true, combo: 'bootshine', pos: 'rear', desc: 'Combo 2 — sau lưng +25%' },
  snapPunch:      { id: 'snapPunch', name: 'Snap Punch', icon: '💫', pot: 330, range: 135, mp: 0, gcd: true, combo: 'trueStrike', haste: 8, pos: 'flank', desc: 'Combo 3 — vào HÔNG +30%' },
  steelPeak:      { id: 'steelPeak', name: 'Steel Peak', icon: '🌟', pot: 260, range: 145, mp: 0, gcd: false, cd: 40, stun: 1, desc: 'Đấm choáng (oGCD)' },
  shoulderTackle: { id: 'shoulderTackle', name: 'Shoulder Tackle', icon: '💨', pot: 200, range: 570, mp: 0, gcd: false, cd: 30, dash: true, stun: 1.5, desc: 'Lao tới mục tiêu' },
};

const JOBS = {
  pld: {
    id: 'pld', name: 'Paladin', vn: 'Kiếm Sĩ Holy', role: 'TANK', icon: '🛡️', gcd: 2.5, auto: true, autoRange: 135,
    hp: 900, mp: 300, atk: 27, def: 15, gHp: 82, gMp: 6, gAtk: 3.2, gDef: 1.7,
    skills: ['fastBlade', 'riotBlade', 'rageOfHalone', 'shieldLob', 'hallowedGround'],
    desc: 'Trâu bò bậc nhất, combo 1-2-3, chiêu bất tử'
  },
  whm: {
    id: 'whm', name: 'White Mage', vn: 'Pháp Sĩ Trắng', role: 'HEALER', icon: '🌿', gcd: 2.5, auto: false, autoRange: 0,
    hp: 560, mp: 460, atk: 33, def: 8, gHp: 48, gMp: 10, gAtk: 3.6, gDef: 0.9,
    skills: ['stone', 'aero', 'cure', 'holy', 'lucidDreaming'],
    desc: 'Đá phép + tự hồi máu, sống khỏe lâu dài'
  },
  blm: {
    id: 'blm', name: 'Black Mage', icon: '🔮', vn: 'Pháp Sĩ Đen', role: 'CASTER', gcd: 2.5, auto: false, autoRange: 0,
    hp: 520, mp: 520, atk: 38, def: 7, gHp: 44, gMp: 11, gAtk: 4.1, gDef: 0.8,
    skills: ['fire', 'blizzard', 'thunder', 'flare', 'manaward'],
    desc: 'Sát thương phép mạnh nhất, yếu máu'
  },
  mnk: {
    id: 'mnk', name: 'Monk', vn: 'Võ Sĩ', role: 'MELEE', icon: '👊', gcd: 2.1, auto: true, autoRange: 135,
    hp: 640, mp: 260, atk: 34, def: 10, gHp: 55, gMp: 5, gAtk: 3.8, gDef: 1.1,
    skills: ['bootshine', 'trueStrike', 'snapPunch', 'steelPeak', 'shoulderTackle'],
    desc: 'GCD 2.1s đánh liên hoàn, cơ động'
  },
};
const JOB_ORDER = ['pld', 'whm', 'blm', 'mnk'];

const ETYPES = {
  marmot: { name: 'Marmot', icon: '🐁', hp: 75, dmg: 11, xp: 25, spd: 120, aggro: 260, r: 16, atkRange: 70, atkCd: 2.0, color: '#a9815c' },
  goblin: { name: 'Goblin', icon: '👺', hp: 140, dmg: 15, xp: 40, spd: 145, aggro: 290, r: 19, atkRange: 72, atkCd: 1.9, color: '#6faf5c' },
  imp:    { name: 'Imp', icon: '👹', hp: 115, dmg: 15, xp: 45, spd: 120, aggro: 330, r: 17, ranged: true, castRange: 340, keepDist: 250, atkCd: 3.4, color: '#a05cc8' },
  bomb:   { name: 'Bomb', icon: '🎃', hp: 160, dmg: 12, xp: 55, spd: 135, aggro: 280, r: 19, atkRange: 70, atkCd: 2.2, selfDestruct: true, color: '#e08b3f' },
  coeurl: { name: 'Coeurl', icon: '🐆', hp: 170, dmg: 17, xp: 50, spd: 200, aggro: 300, r: 20, atkRange: 74, atkCd: 1.7, color: '#c8b45c' },
  nail:   { name: 'Infernal Nail', icon: '', hp: 430, dmg: 0, xp: 90, spd: 0, aggro: 0, r: 16, stationary: true, nail: true, color: '#ff7a3d' },
  heart:  { name: 'Heart of Stone', icon: '💠', hp: 1400, dmg: 0, xp: 200, spd: 0, aggro: 0, r: 22, stationary: true, heart: true, noCount: true, color: '#b8a8d8' },
  gaol:   { name: 'Granite Gaol', icon: '🪨', hp: 600, dmg: 0, xp: 100, spd: 0, aggro: 0, r: 26, stationary: true, gaol: true, noCount: true, color: '#9a8d78' },
  ifrit:  { name: 'Ifrit', icon: '', hp: 4300, dmg: 26, xp: 800, spd: 165, aggro: 2000, r: 58, isBoss: true, atkRange: 165, atkCd: 2.6, color: '#c9402a' },
  golem:  { name: 'Stone Golem', icon: '🪨', hp: 320, dmg: 24, xp: 90, spd: 105, aggro: 280, r: 24, atkRange: 78, atkCd: 2.4, color: '#8a7f70' },
  sprite: { name: 'Land Sprite', icon: '🌱', hp: 130, dmg: 16, xp: 70, spd: 150, aggro: 320, r: 16, ranged: true, castRange: 360, keepDist: 260, atkCd: 3.2, color: '#7fae6b' },
  titan:  { name: 'Titan', icon: '🗿', hp: 9000, dmg: 34, xp: 1600, spd: 150, aggro: 2200, r: 64, isBoss: true, titan: true, dropTier: 90, title: 'TITAN — PRIMAL CỦA ĐẤT', atkRange: 175, atkCd: 2.4, color: '#a08a6a' },
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
  { id: 'skill',   txt: 'Dùng kỹ năng: chạm nút LỚN NHẤT bên phải (phím 1)', need: 1, hint: 'skill0' },
  { id: 'skills3', txt: 'Dùng 3 kỹ năng khác nhau (nút 1 → 2 → 3, làm combo)', need: 3, hint: 'skill0' },
  { id: 'kill3',   txt: 'Tiêu diệt 3 quái — Thancred 🪓 và Alisaie 🌸 sẽ hỗ trợ bạn', need: 3, hint: 'enemy' },
  { id: 'pickup',  txt: 'Nhặt vật phẩm rơi (💰 gil / 🧪 thuốc tự hút về)', need: 1, hint: 'pickup' },
  { id: 'dodge',   txt: 'NÉ vòng AoE CAM: chạy RA NGOÀI trước khi nó đổ đầy!', need: 1, hint: null },
  { id: 'potion',  txt: 'Dùng thuốc 🧪 (nút nhỏ trên skill) khi máu xuống thấp', need: 1, hint: 'potion' },
  { id: 'trash',   txt: 'Quét sạch tay sai Ifrit để mở cổng đấu trường', need: TRASH_TOTAL, hint: 'gate' },
  { id: 'boss',    txt: 'Bước vào đấu trường và HẠ GỤC IFRIT. Vì Eorzea! ⚔️', need: 1, hint: 'boss' },
];
const TUT_REWARDS = {
  move: { xp: 20 }, target: { xp: 15 }, skill: { xp: 15 }, skills3: { xp: 25, pot: 1 },
  kill3: { xp: 60 }, pickup: { gil: 20 }, dodge: { xp: 20 }, potion: { gil: 15 },
  trash: { gil: 100, pot: 1 }, boss: {},
};

const LB_NAME = { TANK: 'Shield Wall', HEALER: 'Pulse of Life', MELEE: 'Final Heaven', CASTER: 'Meteor' };
