// Kiểm thử đa người chơi thật: khởi động server, 2 client Socket.IO chơi qua REST + WebSocket.
import assert from 'node:assert/strict';
import { io, Socket } from 'socket.io-client';
import type { RoomSnapshot } from '../lib/protocol';

process.env.PORT = '4100';
const URL = 'http://localhost:4100';
const at = (r: number, c: number) => r * 9 + c;
const post = async (path: string, body: unknown) => { const r = await fetch(URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: (await r.json()) as { code?: string; error?: string } }; };

function client(code: string, playerId: string) {
  const s: Socket = io(URL);
  const c = { s, snap: null as RoomSnapshot | null, errors: [] as string[] };
  s.on('connect', () => s.emit('join-room', { code, playerId }));
  s.on('room-state', (r: RoomSnapshot) => { c.snap = r; });
  s.on('error-message', (m: string) => c.errors.push(m));
  return c;
}
const until = async (fn: () => boolean, ms = 6000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('timeout chờ điều kiện'); await new Promise(r => setTimeout(r, 50)); } };

async function main() {
  await import('../server/index');
  await new Promise(r => setTimeout(r, 500));
  const A = 'player-aaaaaaaa', B = 'player-bbbbbbbb', C = 'player-cccccccc';

  assert.equal((await post('/api/rooms/join', { code: 'ZZZZZZ', name: 'x', playerId: B })).status, 404);
  const created = await post('/api/rooms', { name: 'An', playerId: A, minutes: 5 });
  const code = created.data.code as string;
  assert.match(code, /^[A-Z0-9]{6}$/);
  const a = client(code, A);
  await until(() => a.snap?.status === 'WAITING');
  assert.equal((await post('/api/rooms/join', { code, name: 'Bình', playerId: B })).status, 200);
  assert.equal((await post('/api/rooms/join', { code, name: 'Chi', playerId: C })).status, 409, 'phòng đầy');
  const b = client(code, B);
  await until(() => a.snap?.status === 'PLAYING' && b.snap?.status === 'PLAYING'); // sau đếm ngược 3 giây
  assert.equal(a.snap?.you, 'red'); assert.equal(b.snap?.you, 'black');
  console.log('  ✓ tạo phòng / vào phòng / phòng đầy / đếm ngược / bắt đầu');

  b.s.emit('make-move', { from: at(3, 0), to: at(4, 0) });                 // Đen đi khi chưa tới lượt
  await until(() => b.errors.length > 0);
  a.s.emit('make-move', { from: at(9, 0), to: at(5, 0) });                 // nước đi sai luật
  await until(() => a.errors.length > 0);
  a.s.emit('make-move', { from: at(6, 0), to: at(5, 0) });
  await until(() => b.snap?.state.history.length === 1);
  assert.equal(b.snap?.state.currentTurn, 'black');
  console.log('  ✓ server từ chối sai lượt / sai luật, đồng bộ nước đi realtime');

  b.s.disconnect();                                                          // đối thủ rớt mạng
  await until(() => a.snap?.players.find(p => p.side === 'black')?.connected === false);
  const b2 = client(code, B);                                                // kết nối lại cùng danh tính
  await until(() => b2.snap?.state.history.length === 1 && a.snap?.players.every(p => p.connected) === true);
  console.log('  ✓ mất kết nối và kết nối lại, khôi phục ván đấu');

  b2.s.emit('resign');
  await until(() => a.snap?.status === 'FINISHED');
  assert.equal(a.snap?.state.winner, 'red'); assert.equal(a.snap?.state.reason, 'resign');
  a.s.emit('rematch'); b2.s.emit('rematch');
  await until(() => a.snap?.status === 'PLAYING' && a.snap.you === 'black'); // chơi lại, đổi bên
  console.log('  ✓ đầu hàng, thông báo thắng/thua, chơi lại đổi bên');
  // ---- cờ vua: tạo phòng game=chess, đi e2e4 / e7e5, kiểm tra ký hiệu SAN ----
  const D = 'player-dddddddd', E = 'player-eeeeeeee';
  const cc = (await post('/api/rooms', { name: 'Trắng', playerId: D, minutes: 0, game: 'chess' })).data.code as string;
  await post('/api/rooms/join', { code: cc, name: 'Đen', playerId: E });
  const d = client(cc, D), e = client(cc, E);
  await until(() => d.snap?.status === 'PLAYING' && e.snap?.status === 'PLAYING');
  assert.equal(d.snap?.game, 'chess'); assert.equal(d.snap?.you, 'white'); assert.equal(e.snap?.you, 'black'); assert.equal(d.snap?.clocks, null);
  d.s.emit('make-move', { from: 52, to: 36 });
  await until(() => e.snap?.state.history.length === 1);
  e.s.emit('make-move', { from: 12, to: 28 });
  await until(() => d.snap?.state.history.length === 2);
  assert.deepEqual(d.snap?.state.history.map(h => h.text), ['e4', 'e5']);
  d.s.emit('make-move', { from: 60, to: 4 });                               // vua nhảy xa: phải bị từ chối
  await until(() => d.errors.length > 0);
  console.log('  ✓ cờ vua online: tạo phòng theo game, đồng bộ nước đi, ký hiệu SAN, chặn nước sai');
  // ---- cờ cá ngựa: 3 người, chủ phòng bắt đầu thủ công ----
  const L1 = 'player-lllllll1', L2 = 'player-lllllll2', L3 = 'player-lllllll3';
  const lc = (await post('/api/rooms', { name: 'Chủ', playerId: L1, game: 'ludo' })).data.code as string;
  await post('/api/rooms/join', { code: lc, name: 'B', playerId: L2 });
  await post('/api/rooms/join', { code: lc, name: 'C', playerId: L3 });
  const l1 = client(lc, L1), l2 = client(lc, L2), l3 = client(lc, L3), all = [l1, l2, l3];
  await until(() => all.every(c => c.snap?.players.length === 3));
  assert.equal(l1.snap?.status, 'WAITING', 'chưa đủ 4 người thì chưa tự bắt đầu');
  assert.ok(l1.snap?.host && !l2.snap?.host); assert.equal(l1.snap?.maxPlayers, 4);
  l2.s.emit('start-game'); await until(() => l2.errors.length > 0);     // không phải chủ phòng
  l1.s.emit('start-game');
  await until(() => all.every(c => c.snap?.status === 'PLAYING'));
  assert.deepEqual(l1.snap?.state.seats, ['red', 'blue', 'yellow']);
  const cur = all.find(c => c.snap?.you === c.snap?.state.currentTurn) as (typeof all)[number];
  const wrong = all.find(c => c !== cur) as (typeof all)[number];
  wrong.s.emit('make-move', { act: 'roll', from: 0, to: 0 }); await until(() => wrong.errors.length > 0);
  cur.s.emit('make-move', { act: 'roll', from: 0, to: 0 });
  await until(() => cur.snap?.state.history.some(h => h.text.startsWith('🎲')) === true);
  l3.s.emit('resign');                                                   // một người bỏ cuộc, ván vẫn tiếp tục
  await until(() => l1.snap?.state.out?.includes('yellow') === true);
  assert.equal(l1.snap?.status, 'PLAYING');
  console.log('  ✓ cờ cá ngựa 3 người: chủ phòng bắt đầu, chia chỗ ngồi, gieo xúc xắc đúng lượt, một người bỏ cuộc vẫn chơi tiếp');
  console.log('\nE2E đạt.');
  process.exit(0);
}
main().catch(e => { console.error('E2E LỖI:', e); process.exit(1); });
