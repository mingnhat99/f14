# FFXIV Mobile Mock — The Bowl of Embers

🎮 **Chơi ngay tại: https://mingnhat99.github.io/f14/** (tự động deploy qua GitHub Actions mỗi khi push)

Bản mock mini lấy cảm hứng từ **Final Fantasy XIV**, chạy thẳng trên trình duyệt điện thoại (HTML5 Canvas, không cần cài gì). Góc nhìn top-down màn hình **ngang**, điều khiển kiểu MOBA (Liên Quân Mobile): joystick ảo bên trái, nút skill vòng cung bên phải.

> ⚠️ Fan-made mock phi thương mại, chỉ dùng cho mục đích học tập / demo. Không liên quan đến Square Enix.

## Chạy game

Cách 1 — mở thẳng: double-click `index.html`.

Cách 2 — qua server nhỏ (khuyên dùng khi chơi trên điện thoại):

```bash
cd final-14
python3 -m http.server 8765
```

- Trên máy: mở http://localhost:8765
- Trên điện thoại (cùng WiFi): mở `http://<IP-của-Mac>:8765` (xem IP bằng `ipconfig getifaddr en0`)
- Mẹo iOS: Share → Add to Home Screen để chơi fullscreen không có thanh địa chỉ.

## Điều khiển

| Hành động | Điện thoại | Desktop |
|---|---|---|
| Di chuyển | joystick ảo (chạm nửa trái màn hình) | WASD / phím mũi tên |
| Đánh thường | nút **Q** (to nhất, cung phải) | phím `Q` |
| Kỹ năng hệ phái | 3 nút **E / R / F** | phím `E` `R` `F` |
| Counter | nút 🛡 (cung phải) | phím `C` |
| Chọn mục tiêu | chạm vào quái | click chuột vào quái |
| Thuốc | nút 🧪 | `Z` |
| Limit Break | nút 🌈 (khi gauge đầy) | `X` |
| Tạm dừng | nút ⏸ | `P` / `Esc` |

> Desktop còn hỗ trợ phím số cũ `1`–`4` (tương đương Q/E/R/F), `5` = thuốc, `6` = counter.

## Nội dung game

- **4 Hero — mỗi hero 1 HỆ PHÁI riêng**, bộ kỹ năng gồm 1 đánh thường (Q) + 3 kỹ năng hệ phái (E/R/F), tất cả đều có animation riêng:
  - **Paladin — Hệ Thánh Quang ☀️**: Trảm Kiếm (đòn 3 cộng hưởng thánh quang), Ném Khiên (bay đi quay về, kéo thù hận), Thánh Chánh Trảm (nhảy lao AoE + choáng), Thánh Khiên Bất Diệt (ult bất tử 5s trong vòm sáng + khiêu chiến).
  - **White Mage — Hệ Thiên Nhiên 🍃**: Phi Thạch, Cuồng Phong (vòng xoáy gió + DoT), Thánh Quang (cột sáng AoE + choáng), Mệnh Thiên Hội Phục (ult hồi 45% HP cả đội + hồi sinh đồng đội gục).
  - **Black Mage — Hệ Nguyên Tố 🌀**: Hỏa Tiễn, Băng Thuật (mưa băng + làm chậm + hồi MP), Lôi Phạt (tia sét giáng từ trời + DoT), Diệt Tinh Hỏa Ngục (ult mưa thiên thạch AoE).
  - **Monk — Hệ Chân Khí ✊**: Liên Hoàn Cước (đấm-đấm-đá nhanh nhất game), Cương Quyền (đấm shockwave + choáng), Hỏa Hầu Quyền (buff +25% dmg + aura lửa), Phong Thần Cước (ult bay khoé xuyên trận).
- **Animation skill**: mỗi chiêu có animation tung chiêu trên nhân vật (lao/nhún/nhảy/đọc thần chú với pháp trận + hạt mana hội tụ), đạn bay có vệt hạt nguyên tố, sét giáng từ trời, cột sáng, sóng xung kích, aura/vòm bám theo người.
- **Duty Support**: 2 NPC đồng đội đi cùng — Thancred 🪓 (tank giữ aggro, có Raise khi chết) và Alisaie 🌸 (healer + nuke). Hệ thống **enmity** 3 bên: quái đánh người giữ thù hận cao nhất.
- **Duty "The Bowl of Embers"**: quét 12 quái trash (Marmot/Goblin/Imp/Bomb — Bomb biết tự nổ, Goblin ném bom AoE), cổng mở, vào đấu trường đấu trùm **Ifrit**.
- **Cơ chế Ifrit**: AoE cam đổ đầy (Eruption), vành khuyên Radiant Plume, lao Crimson Cyclone, Vulcan Burst hất tung, **Stack 💥 / Spread 🔵 / Tank Buster 🔻 / Gaze 👁️**, phase 60%/30% sinh **Infernal Nail** — không phá kịp Ifrit sẽ Enrage.
- **Duty 2 "The Navel"**: sau khi hạ Ifrit, cổng đá mở → golem/sprite → boss **Titan (27k HP — trâu để luyện mech)** mở màn bằng **Granite Rush** 🎯 (khóa 1 mục tiêu rồi lướt qua 3 lần — ai trên đường lướt bị hất), nhịp ra đòn dồn 2.7s, **Landslide/Cross Slide là đòn lướt thật** (Titan lao theo đường đá, Cross Slide 2 đường lệch pha), **Rock Slide** lướt 2 lần giữa trận, **Tectonic Stomp** AoE cận thân, có **Stagger gauge** (làm đầy → choáng), **Counter** 🛡 đòn cast xanh (Lost Ark-style), **Heart of Stone** (12s phá hoặc wipe), **Granite Gaol** giam người, **Earthen Fury** 3 góc an toàn, **Seismic Dive** 🌀 (Titan chìm xuống rồi bất ngờ lao tới chỗ bạn — vòng cam bám nửa cast rồi KHÓA vị trí), AI thích ứng (phạt đứng sau lưng, nhắm người xa nhất, nổi giận khi bị né sạch). Fail mechanic lớn = WIPE, thử lại từ cửa arena.
- **Chiều sâu hero**: Monk đánh thường nhanh nhất (0.75s), Paladin/Monk có chuỗi 3 hit lên đòn kết liễu, Black Mage xoay vòng MP (Băng hồi MP để phóng chiêu lớn), mọi sát thương được buff bởi Hỏa Hầu Quyền.
- **Trang bị iLvl**: quái rớt vũ khí/giáp theo khu vực (i15→i60), tự trang bị nếu tốt hơn.
- **Hướng dẫn người mới**: 10 bước tutorial gắn nhiệm vụ (di chuyển → target → skill → né AoE →... → hạ Ifrit) có highlight nút, mũi tên chỉ đường, phần thưởng từng bước. Nút **❓** mở bảng legend giải thích mọi marker.
- **Hệ thống**: cooldown từng skill có vòng quét, MP, XP/Level, Limit Break, potion, FATE "Săn Coeurl", minimap, chết → hồi sinh với Weakness 20s.
- Đồ họa mock toàn emoji + shape, nhìn phát biết ngay con gì.

Xem [TODO.md](TODO.md) để có danh sách cơ chế FFXIV chưa làm (Raise, LB3, duty Titan, multiplayer...).

## URL cheat (để test)

- `?job=blm` — vào thẳng màn chọn job với job đã chọn
- `?boss=1` — bỏ qua trash, mở thẳng cổng boss
- `?demo=1` — bot tự chơi (tự né AoE, tự bấm skill) — tiện quay video demo
- `?titan=1` — bỏ qua Ifrit + trash, vào thẳng Titan

## Cấu trúc code

```
index.html      — khung trang + xoay ngang bắt buộc
css/style.css   — fullscreen, chặn zoom/cuộn
js/util.js      — toán, vẽ chữ/emoji, hit-test
js/audio.js     — SFX tổng hợp WebAudio (không file âm thanh)
js/data.js      — SKILLS / JOBS (hệ phái) / ETYPES / MAP / PACKS / dialogue
js/input.js     — pointer events (joystick + tap) + bàn phím
js/entities.js  — người chơi, combat, quái AI, boss script, telegraph, hiệu ứng
js/fx.js        — hệ VFX kỹ năng: pháp trận, cột sáng, sét, xoáy gió, aura, vòm, vệt lao
js/world.js     — địa hình núi lửa, chướng ngại, cổng, camera, minimap
js/hud.js       — mọi UI: title, chọn job, HUD, banner, victory/defeat
js/main.js      — state machine + vòng lặp + FATE + bot demo
```
