# Kho Game Online

Trang chủ là kho game: chọn game, rồi đấu với người (phòng + mã) hoặc đấu với máy.
Hiện có **Cờ Tướng**, **Cờ Vua** (2 người) và **Cờ Cá Ngựa** (2-4 người).
Next.js 14 + TypeScript (strict) + Tailwind (client) · Node.js + Express + Socket.IO (server).

## Chạy
```bash
npm install
npm run dev          # web http://localhost:3000, server http://localhost:4000
```
- Đấu với máy chạy hoàn toàn trên trình duyệt (AI trong Web Worker), không cần server.
- Đấu với người: tạo phòng, gửi mã 6 ký tự. Cùng WiFi vào `http://<IP máy bạn>:3000`.
- Game 2 người tự bắt đầu khi đủ người. Game 2-4 người (cá ngựa): chủ phòng bấm "Bắt đầu" khi có từ 2 người; đủ 4 người thì tự bắt đầu.
- Chạy production trong máy: `npm run build && npm start`. Deploy lên Vercel xem mục bên dưới.

## Deploy (Vercel + server riêng)
**Vercel chỉ chạy được phần web (Next.js).** Server realtime (Express + Socket.IO) cần một tiến trình chạy liên tục nên phải deploy ở nơi khác
(Render, Railway, Fly.io hoặc VPS). Nếu không, web trên Vercel sẽ không có server để kết nối và không tạo/vào phòng được.

**Bước 1. Deploy server** (ví dụ Render, đã có sẵn `render.yaml`):
1. Đẩy code lên GitHub. Render: New > Blueprint > chọn repo (hoặc New > Web Service, build `npm install`, start `npm run start:server`).
2. Đặt biến `CLIENT_ORIGIN` = địa chỉ web trên Vercel, nhiều địa chỉ ngăn cách bằng dấu phẩy, hỗ trợ `*`:
   `https://ten-ban.vercel.app,https://*.vercel.app`
3. Deploy xong có địa chỉ dạng `https://kho-game-server.onrender.com`. Mở `<địa chỉ>/health` phải thấy `{"ok":true}`.

**Bước 2. Deploy web lên Vercel:**
1. Import repo vào Vercel (Framework: Next.js, để mặc định).
2. Settings > Environment Variables: `NEXT_PUBLIC_SERVER_URL` = địa chỉ server ở bước 1 (https, không có `/` cuối).
3. **Deploy lại** sau khi đặt biến: biến `NEXT_PUBLIC_*` được nhúng lúc build, đặt xong mà không deploy lại thì web vẫn dùng giá trị cũ.

**Lưu ý:**
- Gói miễn phí của Render tự ngủ khi không có ai dùng, lần truy cập đầu mất khoảng 1 phút để thức dậy. Phòng đang chơi sẽ mất khi server khởi động lại (phòng lưu trong bộ nhớ).
- Web https thì server cũng phải https (Render, Railway, Fly.io đều cấp sẵn). Không dùng `http://` hay `localhost` cho web đã deploy.
- Chạy thử trong máy không cần cấu hình gì: `npm run dev`.

## Kiểm thử
```bash
npm run typecheck             # TypeScript strict
npm test                      # luật cờ tướng + AI
npx tsx tests/chess.test.ts   # cờ vua: perft chuẩn quốc tế, nhập thành, bắt tốt qua đường, phong cấp, hòa cờ, AI
npx tsx tests/ludo.test.ts    # cờ cá ngựa: bố cục, luật, bỏ cuộc, mô phỏng 300 ván ngẫu nhiên
npm run test:e2e              # nhiều client thật qua Socket.IO: cả 3 game
```

## Sơ đồ thư mục
```
lib/games/                    LUẬT + DỮ LIỆU của game (không phụ thuộc giao diện/mạng, dùng chung client và server)
├── types.ts                  kiểu chung và interface GameEngine  (sửa khi thêm game: GameId, Side)
├── registry.ts               đăng ký engine của từng game        (thêm 1 dòng)
├── meta.ts                   tên, biểu tượng, màu thẻ, nhãn các bên (thêm 1 mục)
├── ai.ts                     chọn AI theo game                   (thêm 1 nhánh nếu có AI)
├── worker.ts                 Web Worker chạy AI
├── xiangqi/  chess/  ludo/   mỗi game một thư mục: engine.ts (+ ai.ts, layout.ts nếu cần)
server/
├── rooms.ts                  phòng, người chơi, đồng hồ, kết nối lại (dùng chung mọi game, KHÔNG cần sửa khi thêm game)
└── index.ts                  REST + Socket.IO                    (không cần sửa)
components/
├── games/
│   ├── types.ts              BoardProps: giao diện chung của bàn cờ
│   ├── boards.ts             đăng ký bàn cờ của từng game        (thêm 1 dòng)
│   └── XiangqiBoard.tsx  ChessBoard.tsx  LudoBoard.tsx   mỗi game một component bàn cờ
├── GameView.tsx              khung ván đấu dùng chung (đồng hồ, lịch sử, đầu hàng, kết quả)
└── lobby/RoomWaiting.tsx     phòng chờ + đếm ngược
app/                          các trang (trang chủ, menu từng game, tạo phòng, vào phòng, ván đấu)
tests/                        engine.test.ts  chess.test.ts  ludo.test.ts  e2e.ts
```

## Thêm một game mới
Phòng chơi, đồng hồ, kết nối lại, chơi lại, trang chủ, menu, trang tạo phòng đều dùng chung: **không phải sửa `server/` hay `app/`**.

**Bước 1. Luật:** tạo `lib/games/<game>/engine.ts` export một `GameEngine` (xem `lib/games/types.ts`):
- `id`, `sides` (các bên, người đi trước ở đầu), `minPlayers`, `maxPlayers`
- `initialState()`: trạng thái ban đầu
- `applyMove(state, move)`: kiểm tra luật và trả `{ok:true,state}` hoặc `{ok:false,error}`. Server gọi hàm này nên không ai gian lận được
- `legalMoves(state)`: `{ từ: [đến...] }` cho bên đang tới lượt (giao diện dùng để tô gợi ý)
- `finishGame`, `checkSquare` (không dùng thì trả `-1`)
- Game nhiều người thêm: `seatsFor(n)` (chia chỗ ngồi), `forfeit(state, side, reason)` (một người bỏ cuộc mà ván tiếp tục)

**Bước 2. Đăng ký:** thêm id vào `GameId` (và màu vào `Side` nếu cần) trong `lib/games/types.ts`; thêm engine vào `lib/games/registry.ts`; thêm mục vào `lib/games/meta.ts` (`ai: false` nếu chưa có máy).

**Bước 3. Giao diện:** tạo `components/games/<Game>Board.tsx` nhận `BoardProps` rồi đăng ký ở `components/games/boards.ts`.
- Cờ bàn (chọn quân rồi chọn ô đích): vẽ bàn, gọi `onCell(i)` khi bấm ô. `GameView` lo phần chọn/gợi ý.
- Game thao tác riêng (xúc xắc, bấm quân...): tự gọi `onMove({...})`, xem `LudoBoard.tsx`.

**Bước 4 (tùy chọn). Đấu máy:** viết `lib/games/<game>/ai.ts` và thêm một nhánh trong `lib/games/ai.ts`; đặt `ai: true` trong `meta.ts`.

**Bước 5. Test:** viết `tests/<game>.test.ts`. Nên có test mô phỏng ván ngẫu nhiên để chắc ván nào cũng kết thúc.

## Luật cờ cá ngựa đang áp dụng
Phải ra 6 mới ra khỏi chuồng · đi theo chiều kim đồng hồ quanh vòng 52 ô rồi rẽ vào đường về đích · phải ra đúng số mới vào đích ·
đáp xuống ô có ngựa đối phương thì đá nó về chuồng (trừ ô xuất phát và ô ngôi sao) · ra 6 được gieo thêm, ba lần 6 liên tiếp mất lượt ·
đưa đủ 4 ngựa về đích trước thì thắng · một người bỏ cuộc thì ngựa của họ rời bàn, ván vẫn tiếp tục.
Muốn đổi luật (ví dụ ra 1 hoặc 6 mới xuất quân) chỉ cần sửa `lib/games/ludo/engine.ts`.

## Chưa có
MongoDB (phòng lưu trong bộ nhớ server), lịch sử trận đấu, ký hiệu Trung Hoa cho cờ tướng, luật chiếu dai/bắt dai, xin hòa,
đồng hồ khi đấu máy, đấu máy cho cờ cá ngựa, xoay bàn cờ cá ngựa theo màu của bạn, đăng nhập + xếp hạng, matchmaking.
