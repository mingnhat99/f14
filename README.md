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
| Dùng skill | 5 nút vòng cung bên phải | phím `1`–`5` |
| Chọn mục tiêu | chạm vào quái | click chuột vào quái |
| Thuốc | nút 🧪 | `Q` |
| Limit Break | nút 🌈 (khi gauge đầy) | `R` |
| Tạm dừng | nút ⏸ | `P` / `Esc` |

## Nội dung game

- **4 Job**: Paladin (Tank), White Mage (Healer), Black Mage (DPS phép), Monk (DPS cận chiến, GCD 2.1s) — mỗi job 5 skill, có combo 1-2-3, oGCD, cast time.
- **Duty Support**: 2 NPC đồng đội đi cùng — Thancred 🪓 (tank giữ aggro, có Raise khi chết) và Alisaie 🌸 (healer + nuke). Hệ thống **enmity** 3 bên: quái đánh người giữ thù hận cao nhất.
- **Duty "The Bowl of Embers"**: quét 12 quái trash (Marmot/Goblin/Imp/Bomb — Bomb biết tự nổ, Goblin ném bom AoE), cổng mở, vào đấu trường đấu trùm **Ifrit**.
- **Cơ chế Ifrit**: AoE cam đổ đầy (Eruption), vành khuyên Radiant Plume, lao Crimson Cyclone, Vulcan Burst hất tung, **Stack 💥 / Spread 🔵 / Tank Buster 🔻 / Gaze 👁️**, phase 60%/30% sinh **Infernal Nail** — không phá kịp Ifrit sẽ Enrage.
- **Chiều sâu job**: Monk có **positional** (đánh sau lưng/hông mới bonus damage), Black Mage có **Astral Fire / Umbral Ice** (xoay vòng stack lửa/băng).
- **Trang bị iLvl**: quái rớt vũ khí/giáp theo khu vực (i15→i60), tự trang bị nếu tốt hơn.
- **Hướng dẫn người mới**: 10 bước tutorial gắn nhiệm vụ (di chuyển → target → skill → né AoE →... → hạ Ifrit) có highlight nút, mũi tên chỉ đường, phần thưởng từng bước. Nút **❓** mở bảng legend giải thích mọi marker.
- **Hệ thống**: GCD có vòng quét, MP, auto-attack, XP/Level, Limit Break, potion, FATE "Săn Coeurl", minimap, chết → hồi sinh với Weakness 20s.
- Đồ họa mock toàn emoji + shape, nhìn phát biết ngay con gì.

Xem [TODO.md](TODO.md) để có danh sách cơ chế FFXIV chưa làm (Raise, LB3, duty Titan, multiplayer...).

## URL cheat (để test)

- `?job=blm` — vào thẳng màn chọn job với job đã chọn
- `?boss=1` — bỏ qua trash, mở thẳng cổng boss
- `?demo=1` — bot tự chơi (tự né AoE, tự bấm skill) — tiện quay video demo

## Cấu trúc code

```
index.html      — khung trang + xoay ngang bắt buộc
css/style.css   — fullscreen, chặn zoom/cuộn
js/util.js      — toán, vẽ chữ/emoji, hit-test
js/audio.js     — SFX tổng hợp WebAudio (không file âm thanh)
js/data.js      — SKILLS / JOBS / ETYPES / MAP / PACKS / dialogue
js/input.js     — pointer events (joystick + tap) + bàn phím
js/entities.js  — người chơi, combat, quái AI, boss script, telegraph, hiệu ứng
js/world.js     — địa hình núi lửa, chướng ngại, cổng, camera, minimap
js/hud.js       — mọi UI: title, chọn job, HUD, banner, victory/defeat
js/main.js      — state machine + vòng lặp + FATE + bot demo
```
