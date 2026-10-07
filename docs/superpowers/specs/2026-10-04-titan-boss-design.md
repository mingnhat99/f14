# Design — Duty 2: The Navel (Titan) — Boss phase-mechanic thông minh kiểu Lost Ark / Blade & Soul

Ngày: 2026-10-04
Trạng thái: Đã duyệt qua brainstorming (3 phần thiết kế đều được phê duyệt)

## Mục tiêu

Tạo boss thứ hai **Titan** vận hành theo phase-mechanic script ngặt và có lớp AI thích ứng, lấy cảm hứng từ raid boss Lost Ark / Blade & Soul / Aion 2. Titan là duty mới (Duty 2: The Navel) nằm ở vùng mới mở sau khi hạ Ifrit.

## Nguyên tắc thiết kế

- **Hybrid brain**: lõi là phase script deterministic (học được, fail = wipe công bằng) + lớp thích ứng (targeting động, phản ứng theo hành vi player). Đây là cách Lost Ark vận hành thực tế.
- **Wipe thật**: fail mechanic lớn = chết cả team, retry từ cửa arena (không quét trash lại).
- Không refactor Ifrit — `updateTitan()` song song với `updateIfrit()`.
- Tái dùng hệ có sẵn: telegraph, marker, enmity, cast bar, banner, gate, party NPC (Thancred/Alisaie).

## 1. Đường tới boss & cấu trúc phase

### Đường tới boss
1. Hạ Ifrit → cổng đá mở bên phải Ifrit arena.
2. Đường hầm núi ngắn → 2 pack trash nhẹ: golem 🗿 (cận chiến, chậm, đánh nặng) + sprite 🌱 (tầm xa, ném đá). Tổng 4-6 quái.
3. Đấu trường Titan tròn (r ≈ 420), viền đá. Cổng 'titan' đóng khi engage.

### Phases (gate theo %HP)

| Phase | HP | Tempo cast | Nội dung chính |
|---|---|---|---|
| **P1 — Đất rung** | 100→70% | ×1.0 | Landslide (line nhắm người đứng xa nhất), Geocrush (AoE tròn quanh boss + knockback), Tumult (raidwave nhẹ), đòn counterable đầu tiên (Bury) |
| **P1.5 — Trái tim đá** | tại 70% | — | Titan bất tử + gầm, sinh **Heart of Stone** ♥ (thực thể riêng, HP ≈ 1400, 12s để phá). Phá kịp → Titan choáng 6s, nhận +50% dmg (cửa sổ DPS lớn). **Fail = WIPE** |
| **P2 — Cũi đá** | 70→35% | ×0.9 | Thêm **Gaol** (giam 1 thành viên 10s, không phá = chết), Stagger Check đầu phase, Bom nhắm 2 người đứng gần nhau (ép spread), Landslide thành 2 đường chéo |
| **P3 — Cơn thịnh nộ** | 35→0% | ×0.75 | **Earthen Fury**: 3 đợt AoE quét toàn arena, mỗi đợt chỉ 1 góc an toàn (telegraph chỉ góc an toàn bằng viền xanh); miss 1 đợt = WIPE. Upheaval (knockback từ tâm, va viền arena = damage nặng + stun 1s), Mountain Buster (tankbuster, marker 🔻 tái dùng), soft enrage sau 3 phút: atkBuff +5% mỗi 10s |

### Luật phạt (đã duyệt "wipe thật")
- Fail **Heart** (không phá trong 12s) → **WIPE**
- Fail **Gaol** (10s không phá) → thành viên bị giam chết. Nếu đó là player → DUTY FAILED. Nếu NPC chết → fight tiếp tục nhưng gánh nặng tăng (healer chết = nguy hiểm sống còn).
- Fail **Earthen Fury** (đứng sai góc an toàn bất kỳ đợt nào) → **WIPE**
- Fail **Counter** (đòn xanh resolve mà không bị parry) → raidwave ≈ 80% max HP mỗi thành viên (sống sót được, healer phải cứu)
- Fail **Stagger Check** (8s không đầy gauge) → Titan hồi 4% HP + raidwave + atkBuff tạm +20% (20s)
- Wipe → màn DUTY FAILED (tái dùng) → nút "Thử lại" hồi sinh cả party ở cửa arena Titan, Titan reset full HP + phase, trash KHÔNG respawn.

## 2. Bốn hệ cơ chế

### 2.1 Stagger Gauge
- Thanh vàng mỏng nằm dưới HP bar Titan, 0–100, có chữ "STAGGER".
- Mọi đòn của player làm đầy: điểm stagger ∝ potency (≈ 40% damage gây ra); skill tank nhân ×1.5.
- **Decay 6/s** khi không bị đánh — ép duy trì DPS liên tục, không tích lũy thụ động.
- Đầy → Titan **CHOÁNG 5s**: +50% damage nhận vào, cast đang thi triển bị ngắt mọi state (kể cả giữa dash), gauge reset 0. NPC đồng đội cũng góp stagger điểm (≈ 25% hiệu quả player).
- **Stagger Check** (khi vào P2): overlay gauge lớn giữa màn + đếm ngược 8s, fill từ 0→100. Thành công → bỏ qua Gaol đầu tiên. Fail → xem Luật phạt.

### 2.2 Counter
- Nút skill thứ 6 **🛡** cho MỌI job (không sửa 4 job hiện có), desktop phím `6`, CD 12s.
- Điều kiện hiệu lực: đang đứng trong tầm 220 của Titan + Titan đang cast đòn counterable.
- Đòn counterable (Bury ở P1/P2, Upheaval đòn xanh ở P3): **cast bar xanh + viền trắng sáng quanh boss**, 1 giây cuối nhấp nháy dồn dập (chuẩn Lost Ark).
- **Thành công** → PARRY: SFX "keng", Titan giật lùi 1.5s, đòn bị hủy hoàn toàn, stagger +30.
- **Bấm ngoài tầm / không có đòn xanh** → nút nhấp đỏ "Xa quá!" / "Không có gì để chặn!", KHÔNG tốn CD.
- **Không counter** khi đòn resolve → raidwave ≈ 80% HP.
- NPC không bao giờ counter — đây là kỹ năng cá nhân của player.

### 2.3 AI thích ứng (lớp phủ trên script)
- **Landslide** nhắm thành viên **đứng xa boss nhất** (không random) → dạy spread bằng chính hành vi.
- **Phạt greed lưng**: thành viên nào đứng phía sau Titan quá 4s (cộng dồn, có icon mắt nhỏ phía sau boss) → Titan **ngắt queue hiện tại, chèn ngay** quét hình quạt sau lưng "Seismic Slap" (damage nặng + knockback), sau đó tiếp script tại chỗ đã dừng.
- **Bom P2** nhắm **2 thành viên đứng gần nhau nhất** → ép tách cặp.
- **Tức giận**: nếu player không dính bất kỳ telegraph nào trong 3 đòn liên tiếp → toast "🗿 Titan nổi giận!" → đòn kế tiếp cast nhanh hơn 20%. Reset bộ đếm khi player dính 1 đòn.
- **Gaol targeting**: 60% giam player, 40% giam NPC gây damage thấp nhất gần nhất (thường Alisaie) — player luôn phải phá cũi.
- Các rule này KHÔNG đổi thứ tự script, chỉ đổi *mục tiêu / tempo* — pattern vẫn học được.

### 2.4 Phase script engine (data-driven)
- `TITAN_PHASES` = mảng phase object: `{ name, banner, hpGate, tempo, actions[], events[] }` với action = `{ id, cast, counterable?, telegraph..., onResolve }`.
- Engine mini: duyệt action theo index trong phase; gate %HP chuyển phase (ngắt cast, gầm, banner, clear telegraph nhỏ lẻ).
- Tempo: nhân thời gian cast P1 ×1.0 / P2 ×0.9 / P3 ×0.75.
- Chỉ Titan dùng engine này (Ifrit giữ nguyên cơ chế cũ).

## 3. Kỹ năng Titan theo phase

| Kỹ năng | Phase | Mô tả |
|---|---|---|
| Landslide | P1 | Rect line dài nhắm người xa nhất |
| Cross Slide | P2+ | 2 rect chéo nhau (90°) cùng lúc |
| Geocrush | P1+ | Vòng tròn lớn quanh boss + knockback ra ngoài |
| Tumult | P1 | Raidwave nhẹ 2 nhịp (whm heal through) |
| Bury 🛡 | P1+ | Đòn counterable — see 2.2 |
| Seismic Slap | reactive | Quạt sau lưng khi bị greed lưng 4s |
| Granite Gaol | P2 | Giam 1 thành viên trong cũi đá (HP cũi ≈ 600), đếm ngược 10s hiển thị trên cũi |
| Bom Spread | P2 | 2 vòng cam trên 2 người đứng gần nhau, nổ sau 2.5s |
| Upheaval 🛡 | P3 | Counterable knockback từ tâm — va viền arena = damage nặng + stun |
| Earthen Fury | P3 | 3 đợt quét arena, mỗi đợt 1 góc an toàn (viền xanh), cách nhau 2s |
| Mountain Buster | P3 | Tankbuster marker 🔻 (tái dùng hệ marker) |

Heart of Stone là entity riêng (kiểu nail của Ifrit): HP ~1400, thời gian 12s.

## 4. UI/HUD

- Thanh stagger dưới HP bar boss (chỉ khi Titan active), nhấp nháy >70.
- Nút 🛡 thứ 6 trong cung skill mobile + phím 6, vòng CD như skill hiện có.
- Cast bar xanh + viền trắng quanh boss cho đòn counterable, nhấp nháy 1s cuối.
- Banner chuyển phase: "🗿 GIAI ĐOẠN 2 — CỖI ĐÁ"…
- Overlay Stagger Check: gauge lớn giữa màn + đếm ngược 8s.
- Cũi Gaol: HP bar nhỏ + số đếm ngược trên đầu cũi.
- Earthen Fury: góc an toàn được chỉ bằng viền xanh phát sáng (logic ngược telegraph thường — vùng KHÔNG đỏ).
- Bảng legend ❓ thêm 5 dòng: stagger, counter, gaol, heart, fury.
- Victory screen Titan: rớt iLvl 90, XP lớn.

## 5. Zone & data

- Map mở rộng theo trục X (bên phải Ifrit arena): cổng đá `titanGate` (mở khi Ifrit chết) → hầm → arena `titanArena` (tâm + r đăng ký vào MAP như arena cũ).
- ETYPE mới: `titan` (isBoss, hp ≈ 9000, dmg ≈ 34), `golem`, `sprite`, `gaol` (minion-type như nail), `heart` (minion-type).
- URL cheat `?titan=1`: mở cổng titan + dịch player tới cửa arena Titan (bỏ Ifrit + trash).
- `?demo=1`: bot tự counter khi thấy cast xanh (đợi ~0.5s), ưu tiên đánh Heart/Gaol khi xuất hiện, đứng góc an toàn Earthen Fury.

## 6. Cấu trúc code & phạm vi file

```
js/data.js      — ETYPE mới, MAP mở rộng, dialogue Minfilia ngắn
js/entities.js  — TITAN_PHASES config + updateTitan() + stagger tích lũy trong dealToEnemy + counter input handling + Gaol/Heart logic
js/world.js     — vẽ hầm + arena Titan + cổng titanGate + minimap mở rộng
js/hud.js       — stagger bar, nút 🛡, cast bar xanh, banner phase, overlay stagger-check, legend, victory Titan
js/main.js      — retry flow sau wipe, URL cheat ?titan=1, bot demo counter, bossDefeated Titan
```

Không đổi: Ifrit logic, 4 job hiện có (nút counter là hệ thống chung), input scheme.

## 7. Edge cases

- Wipe giữa Heart/Gaol/Fury: dọn toàn bộ telegraph/marker/gaol/heart, reset stagger gauge + phase state.
- Player chết đang ở trong cũi: cũi vỡ ngay, vào defeat flow thường.
- Staggered trúng lúc Titan đang dash/sequence: force-clear mọi state đang chạy (không kẹt animation).
- Counter bấm đúng frame cast resolve: window hiệu lực tính theo thời điểm resolve (resolve trước parry → tính là fail — simple & công bằng, parry phải bấm trước khi bar hết).
- Gaol giam NPC khi NPC đang cast: hủy cast NPC, đứng trong cũi không hành động.
- Enrage timer chỉ chạy ở P3, tạm dừng khi Titan staggered.

## 8. Testing (thủ công — game canvas không có test framework)

Checklist chi tiết nằm trong implementation plan, bao gồm: từng phase đạt gate đúng script; 4 wipe-case (heart/gaol-player/fury/counter-heavy); counter in/out range không tốn CD; stagger decay & full-stagger ngắt cast; greed-back punish; bot demo chạy hết fight không chết oan; 2 URL cheat; mobile touch nút 🛡.

## Phạm vi KHÔNG làm (YAGNI)

- Không làm hard mode Titan, duty Garuda, multiplayer.
- Không refactor Ifrit sang engine mới.
- Không thêm job/máy móc mới ngoài nút counter.
- Không có cú nhảy/nhảy né (game không có jump).
