import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import type { Move } from '../lib/games/types';
import { isGameId } from '../lib/games/registry';
import { Room, RoomError, RoomService } from './rooms';

// CLIENT_ORIGIN: các địa chỉ web được phép gọi server, ngăn cách bằng dấu phẩy, hỗ trợ ký tự *
// ví dụ: https://kho-game.vercel.app,https://*.vercel.app   (bỏ trống = cho phép mọi nơi, chỉ nên dùng khi chạy thử)
const ORIGINS = (process.env.CLIENT_ORIGIN ?? '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const patterns = ORIGINS.map(o => new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')}$`));
const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
  cb(null, !origin || patterns.length === 0 || patterns.some(p => p.test(origin)));

const app = express();
app.use(cors({ origin: corsOrigin }));
app.get('/health', (_req, res) => res.json({ ok: true })); // cho nền tảng hosting kiểm tra server còn sống
app.use(express.json({ limit: '10kb' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin } });

// Mỗi lần phòng thay đổi: gửi snapshot riêng cho từng người chơi (+ sự kiện đặt tên theo spec)
const rooms = new RoomService((room, event) => {
  if (event) io.to(room.code).emit(event, { lastMove: room.state.lastMove });
  for (const p of room.players) for (const sid of p.sockets) io.to(sid).emit('room-state', rooms.snapshot(room, p.id));
});

// ---------- validate đầu vào ----------
const CODE_RE = /^[A-Z0-9]{6}$/;
const cleanName = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 20) : '') || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
const cleanId = (v: unknown) => {
  if (typeof v !== 'string' || !/^[\w-]{8,64}$/.test(v)) throw new RoomError(400, 'Định danh người chơi không hợp lệ.');
  return v;
};
const cleanCode = (v: unknown) => {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!CODE_RE.test(c)) throw new RoomError(400, 'Mã phòng gồm 6 ký tự.');
  return c;
};
const isMove = (m: unknown): m is Move => {
  const x = m as Partial<Move> | null;
  return !!x && Number.isInteger(x.from) && Number.isInteger(x.to) && x.from! >= 0 && x.from! < 90 && x.to! >= 0 && x.to! < 90 && (x.promo === undefined || (typeof x.promo === 'string' && /^[qrbnQRBN]$/.test(x.promo))) && (x.act === undefined || x.act === 'roll');
};

// ---------- rate limit đơn giản ----------
const hits = new Map<string, number[]>();
setInterval(() => hits.clear(), 300_000);
function limit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown', now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 60_000);
  if (recent.length >= 30) return res.status(429).json({ error: 'Bạn thao tác quá nhanh, hãy thử lại sau ít phút.' });
  recent.push(now); hits.set(ip, recent);
  next();
}
function fail(res: Response, e: unknown) {
  if (e instanceof RoomError) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Lỗi máy chủ.' });
}
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

// ---------- REST API ----------
app.post('/api/rooms', limit, (req, res) => {
  try {
    const b = body(req);
    const minutes = [0, 5, 10].includes(Number(b.minutes)) ? Number(b.minutes) : 10;
    const game = isGameId(b.game) ? b.game : 'xiangqi';
    res.status(201).json({ code: rooms.create(cleanName(b.name), cleanId(b.playerId), minutes, game).code });
  } catch (e) { fail(res, e); }
});
app.post('/api/rooms/join', limit, (req, res) => {
  try {
    const b = body(req);
    res.json({ code: rooms.join(cleanCode(b.code), cleanName(b.name), cleanId(b.playerId)).code });
  } catch (e) { fail(res, e); }
});
app.get('/api/rooms/:code', (req, res) => {
  try {
    const room = rooms.get(cleanCode(req.params.code));
    if (!room) throw new RoomError(404, 'Không tìm thấy phòng.');
    res.json({ code: room.code, status: room.status, players: room.players.length });
  } catch (e) { fail(res, e); }
});
app.delete('/api/rooms/:code', (req, res) => {
  try {
    rooms.cancel(cleanCode(req.params.code), cleanId(req.query.playerId));
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

// ---------- Socket.IO ----------
io.on('connection', socket => {
  let room: Room | null = null;
  let playerId = '';
  const act = (fn: (r: Room, pid: string) => string | null | void) => {
    if (!room) return socket.emit('error-message', 'Bạn chưa vào phòng.');
    const err = fn(room, playerId);
    if (err) socket.emit('error-message', err);
  };

  socket.on('join-room', (p: { code?: unknown; playerId?: unknown }) => {
    const code = typeof p?.code === 'string' ? p.code.toUpperCase() : '';
    const pid = typeof p?.playerId === 'string' ? p.playerId : '';
    const r = rooms.attach(code, pid, socket.id);
    if (!r) return socket.emit('room-missing', 'Không tìm thấy phòng, hoặc bạn chưa tham gia phòng này.');
    room = r; playerId = pid;
    socket.join(r.code);
  });
  socket.on('make-move', (m: unknown) => act((r, pid) => (isMove(m) ? rooms.move(r, pid, { from: m.from, to: m.to, promo: m.promo, act: m.act }) : 'Nước đi không hợp lệ.')));
  socket.on('resign', () => act((r, pid) => rooms.resign(r, pid)));
  socket.on('start-game', () => act((r, pid) => rooms.startNow(r, pid)));
  socket.on('rematch', () => act((r, pid) => rooms.rematch(r, pid)));
  socket.on('leave-room', () => act((r, pid) => { rooms.leave(r, pid); socket.leave(r.code); room = null; }));
  socket.on('disconnect', () => { if (room) rooms.detach(room, playerId, socket.id); });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => console.log(`Server cờ tướng chạy tại http://localhost:${PORT}`));
