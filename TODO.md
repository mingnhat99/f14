# 📋 TODO — Các cơ chế FFXIV chưa làm

Đã xong ✅ / Chưa làm ⬜. Ưu tiên sắp xếp theo giá trị gameplay.

## ✅ Đã hoàn thành
- [x] 4 Job (PLD/WHM/BLM/MNK), GCD 2.5s, combo 1-2-3, oGCD, cast time
- [x] AoE telegraph cam đổ đầy, cast bar boss, knockback, DoT, auto-attack
- [x] Trùm Ifrit: Eruption / Radiant Plume / Crimson Cyclone / Vulcan Burst / Infernal Nail + Enrage
- [x] XP/Level, MP, Limit Break, potion, FATE Coeurl, minimap, chết → Weakness
- [x] **Duty Support**: NPC Thancred 🪓 (tank giữ aggro) + Alisaie 🌸 (healer + Raise) — hệ thống enmity 3 bên
- [x] **Marker boss**: Stack 💥 / Spread 🔵 / Tank Buster 🔻 / Gaze 👁️ (đã vào rotation Ifrit)
- [x] **Positional MNK**: đánh sau lưng (crit/+25%) / hông (+30%), quái có chỉ hướng nhìn
- [x] **Astral Fire / Umbral Ice BLM**: cộng dồn stack, đổi damage/MP cost, hồi MP nhanh dưới UI
- [x] **Rớt đồ iLvl** theo khu vực (15→60), tự trang bị, badge iLvl, hiển thị ở màn Victory
- [x] **Tutorial 10 bước** gắn nhiệm vụ: card hướng dẫn, highlight nút, mũi tên chỉ mục tiêu, phần thưởng từng bước
- [x] Nút Trợ giúp ❓ + bảng legend giải thích toàn bộ marker

## ⬜ Combat & Job
- [ ] **Esuna** — cleanses debuff (cần thêm loại debuff có thể cleanse, ví dụ Burn từ Ifrit)
- [ ] **Raise người chơi** — NPC healer hồi sinh player thay vì màn DUTY FAILED (kèm Brink of Death)
- [ ] **LB 3 cấp** — LB1 đơn mục tiêu / LB2 AoE / LB3 hiệu ứng đặc biệt theo vai trò
- [ ] **Cửa sổ buff raid** — buff.damage-window 15s, burst theo nhịp, DPS-check bằng timer
- [ ] **Interrupt/Silence** — một số cast của quái có thể ngắt (Thêm hành động + hiển thị.cast có thể ngắt)
- [ ] **Mitigation chủ động cho player-tank** — Rampart/Sentinel bấm trước tank buster
- [ ] **Weaving oGCD hợp lệ** — phạt dùng 2 oGCD trong 1 GCD (clip)

## ⬜ Boss & Duty
- [ ] **Duty 2: The Navel (Titan)** — knockback positioning, Phase gauge, Gaol giam người chơi
- [ ] **Duty 3: Garuda** — gió đẩy, add phase xử lý theo thứ tự
- [ ] **Mechanic nâng cao**: soak tower, gaze chain (nhìn theo thứ tự), orb nhặt theo màu, uptime checks
- [ ] **Hard mode** cho duty cũ (thêm mechanic, tăng tốc độ)
- [ ] **Duty Roulette** — random duty cũ có thưởng

## ⬜ Hệ thống
- [ ] **Trang bị đầy đủ** — nhiều slot (đầu/thân/tay/chân), set bonus, transmog
- [ ] **Materia meld** — gem cắm đồ
- [ ] **Job khác**: Dragoon (jump), Bard (đạn bay + bài hát), Scholar (pet), Summoner (egi)
- [ ] **Job stone / class nâng cấp** ở level nhất định
- [ ] **Level sync** khi vào duty
- [ ] **Chocobo mount** + chạy nhanh giữa vùng
- [ ] **Sprint** trong duty (nút chạy nhanh, hồi bằng cách đứng yên)
- [ ] **Aetheryte** — điểm di chuyển nhanh trên map lớn
- [ ] **Market Board / shop NPC** — tiêu gil mua đồ
- [ ] **Hệ thống quest dài hạn** — MSQ nhiều chương, side quest, dialogue choices

## ⬜ MMO-feel (cần netcode hoặc giả lập)
- [ ] **Multiplayer thật** — WebSocket party 4 người (hiện Duty Support là NPC offline)
- [ ] **Emote / chat nhanh** — bubble chào, well done
- [ ] **FATE đa dạng** — boss FATE, escort NPC, gather item
- [ ] **Leaderboard** — thời gian clear duty theo job
