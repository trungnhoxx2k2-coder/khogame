// Multiplayer: quản lý phòng, người chơi, đồng hồ, kết nối lại. Luật cờ nằm hết ở lib/chess/engine.
import type { GameId, GameState, Move, Side } from '../lib/games/types';
import { ENGINES, opponentOf } from '../lib/games/registry';
import type { RoomSnapshot, RoomStatus } from '../lib/protocol';

const clocksFor = (g: GameId, ms: number): Record<string, number> => ({ [ENGINES[g].sides[0]]: ms, [ENGINES[g].sides[1]]: ms });
const opp = (room: Room, s: Side) => opponentOf(ENGINES[room.game], s);

export class RoomError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface RoomPlayer { id: string; name: string; side: Side; sockets: Set<string>; dropped: boolean; grace?: NodeJS.Timeout }
export interface Room {
  code: string; game: GameId; status: RoomStatus; players: RoomPlayer[]; state: GameState;
  timeMs: number; clocks: Record<string, number>; turnStartedAt: number; startsAt: number | null;
  rematch: Set<string>; createdAt: number; updatedAt: number; startTimer?: NodeJS.Timeout;
}
export type Notify = (room: Room, event?: string) => void;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GRACE_MS = 60_000;     // thời gian chờ kết nối lại
const COUNTDOWN_MS = 3_000;  // 3-2-1 trước khi vào trận

export class RoomService {
  private rooms = new Map<string, Room>();
  constructor(private notify: Notify) {
    setInterval(() => this.tick(), 500);
    setInterval(() => this.sweep(), 60_000);
  }

  get(code: string) { return this.rooms.get(code); }

  create(name: string, playerId: string, minutes: number, game: GameId): Room {
    let code = '';
    do code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    while (this.rooms.has(code));
    const now = Date.now(), timeMs = (ENGINES[game].maxPlayers > 2 ? 0 : minutes) * 60_000; // game nhiều người không dùng đồng hồ
    const room: Room = {
      code, game, status: 'WAITING', players: [{ id: playerId, name, side: ENGINES[game].sides[0], sockets: new Set(), dropped: false }],
      state: ENGINES[game].initialState(), timeMs, clocks: clocksFor(game, timeMs), turnStartedAt: now, startsAt: null,
      rematch: new Set(), createdAt: now, updatedAt: now,
    };
    this.rooms.set(code, room);
    return room;
  }

  join(code: string, name: string, playerId: string): Room {
    const room = this.rooms.get(code);
    if (!room || room.status === 'CANCELLED') throw new RoomError(404, 'Không tìm thấy phòng.');
    if (room.players.some(p => p.id === playerId)) return room; // vào lại phòng của chính mình
    const e = ENGINES[room.game];
    if (room.status !== 'WAITING' || room.players.length >= e.maxPlayers) throw new RoomError(409, 'Phòng đã đầy.');
    room.players.push({ id: playerId, name, side: e.sides[room.players.length], sockets: new Set(), dropped: false });
    if (room.players.length === e.maxPlayers) this.beginCountdown(room); // đủ người thì tự đếm ngược
    this.touch(room);
    this.notify(room, 'player-joined');
    return room;
  }

  cancel(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError(404, 'Không tìm thấy phòng.');
    if (room.players[0]?.id !== playerId || room.status !== 'WAITING') throw new RoomError(403, 'Bạn không thể hủy phòng này.');
    this.doCancel(room);
  }

  /** Gắn socket vào người chơi (cũng dùng khi kết nối lại). */
  attach(code: string, playerId: string, socketId: string): Room | null {
    const room = this.rooms.get(code);
    const player = room?.players.find(p => p.id === playerId);
    if (!room || !player) return null;
    if (player.grace) { clearTimeout(player.grace); player.grace = undefined; }
    player.sockets.add(socketId);
    if (player.dropped) { player.dropped = false; this.notify(room, 'player-reconnected'); } else this.notify(room);
    return room;
  }

  detach(room: Room, playerId: string, socketId: string) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    player.sockets.delete(socketId);
    if (player.sockets.size > 0) return; // vẫn còn tab khác
    player.dropped = true;
    this.notify(room, 'player-disconnected');
    player.grace = setTimeout(() => this.abandon(room, player), GRACE_MS);
  }

  move(room: Room, playerId: string, move: Move): string | null {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return 'Bạn không ở trong phòng này.';
    if (room.status !== 'PLAYING') return 'Ván cờ chưa bắt đầu hoặc đã kết thúc.';
    if (player.side !== room.state.currentTurn) return 'Chưa tới lượt bạn.';
    const now = Date.now();
    if (room.timeMs > 0) {
      room.clocks[player.side] -= now - room.turnStartedAt;
      if (room.clocks[player.side] <= 0) { room.clocks[player.side] = 0; this.finish(room, opp(room, player.side), 'timeout'); return null; }
    }
    const res = ENGINES[room.game].applyMove(room.state, move);
    if (!res.ok) return res.error;
    room.state = res.state;
    room.turnStartedAt = now;
    this.touch(room);
    if (res.state.status === 'finished') { room.status = 'FINISHED'; this.notify(room, 'game-over'); }
    else this.notify(room, 'move-made');
    return null;
  }

  resign(room: Room, playerId: string): string | null {
    const player = room.players.find(p => p.id === playerId);
    if (!player || room.status !== 'PLAYING') return 'Không thể đầu hàng lúc này.';
    this.drop(room, player, 'resign');
    return null;
  }

  leave(room: Room, playerId: string) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    if (room.status === 'WAITING') this.removeWaiting(room, player);
    else if (room.status === 'PLAYING') this.drop(room, player, 'resign');
  }

  rematch(room: Room, playerId: string): string | null {
    if (room.status !== 'FINISHED') return 'Ván cờ chưa kết thúc.';
    room.rematch.add(playerId);
    if (room.players.length >= 2 && room.players.every(p => room.rematch.has(p.id))) {
      if (ENGINES[room.game].sides.length === 2) room.players.forEach(p => { p.side = opp(room, p.side); }); // game 2 người: đổi bên
      room.rematch.clear();
      this.start(room);
    } else this.notify(room);
    return null;
  }

  snapshot(room: Room, playerId: string): RoomSnapshot {
    const me = room.players.find(p => p.id === playerId);
    const now = Date.now();
    let clocks: Record<string, number> | null = null;
    if (room.timeMs > 0) {
      clocks = { ...room.clocks };
      if (room.status === 'PLAYING') clocks[room.state.currentTurn] = Math.max(0, clocks[room.state.currentTurn] - (now - room.turnStartedAt));
    }
    return {
      code: room.code, game: room.game, status: room.status,
      players: room.players.map(p => ({ name: p.name, side: p.side, connected: !p.dropped })),
      you: me?.side ?? ENGINES[room.game].sides[0], state: room.state, timeMinutes: room.timeMs / 60_000, clocks,
      startsIn: room.startsAt ? Math.max(0, room.startsAt - now) : null,
      rematch: { you: !!me && room.rematch.has(me.id), opponent: room.players.some(p => p.id !== playerId && room.rematch.has(p.id)) },
      host: room.players[0]?.id === playerId, minPlayers: ENGINES[room.game].minPlayers, maxPlayers: ENGINES[room.game].maxPlayers,
    };
  }

  /** Chủ phòng bắt đầu khi đã đủ số người tối thiểu (game 2-4 người). */
  startNow(room: Room, playerId: string): string | null {
    if (room.players[0]?.id !== playerId) return 'Chỉ chủ phòng mới được bắt đầu.';
    if (room.status !== 'WAITING' || room.startsAt) return 'Không thể bắt đầu lúc này.';
    if (room.players.length < ENGINES[room.game].minPlayers) return `Cần ít nhất ${ENGINES[room.game].minPlayers} người chơi.`;
    this.beginCountdown(room);
    this.touch(room);
    this.notify(room);
    return null;
  }

  private beginCountdown(room: Room) {
    const e = ENGINES[room.game];
    if (e.seatsFor) { const seats = e.seatsFor(room.players.length); room.players.forEach((p, i) => { p.side = seats[i]; }); } // chia chỗ ngồi
    room.startsAt = Date.now() + COUNTDOWN_MS;
    room.startTimer = setTimeout(() => this.start(room), COUNTDOWN_MS);
  }

  // người chơi (không phải chủ phòng) rời khi đang chờ: phòng vẫn mở; chủ phòng rời thì hủy phòng
  private removeWaiting(room: Room, player: RoomPlayer) {
    if (room.players[0] === player) return this.doCancel(room);
    room.players = room.players.filter(p => p !== player);
    if (room.startTimer) { clearTimeout(room.startTimer); room.startTimer = undefined; }
    room.startsAt = null;
    this.touch(room);
    this.notify(room, 'player-left');
  }

  // một người bỏ cuộc (đầu hàng / rời / mất kết nối quá lâu): game nhiều người tiếp tục, game 2 người thì đối thủ thắng
  private drop(room: Room, player: RoomPlayer, reason: 'resign' | 'disconnect') {
    const e = ENGINES[room.game];
    if (!e.forfeit) return this.finish(room, opp(room, player.side), reason);
    room.state = e.forfeit(room.state, player.side, reason);
    this.touch(room);
    if (room.state.status === 'finished') { room.status = 'FINISHED'; room.rematch.clear(); this.notify(room, 'game-over'); }
    else this.notify(room, 'player-left');
  }

  private start(room: Room) {
    if (room.status === 'CANCELLED') return;
    if (room.players.length < ENGINES[room.game].minPlayers) { room.startsAt = null; return; }
    room.status = 'PLAYING'; room.startsAt = null;
    room.state = ENGINES[room.game].initialState(room.players.map(p => p.side));
    room.clocks = clocksFor(room.game, room.timeMs);
    room.turnStartedAt = Date.now();
    this.touch(room);
    this.notify(room, 'game-start');
  }

  private finish(room: Room, winner: Side, reason: 'resign' | 'timeout' | 'disconnect') {
    room.state = ENGINES[room.game].finishGame(room.state, winner, reason);
    room.status = 'FINISHED'; room.rematch.clear();
    this.touch(room);
    this.notify(room, 'game-over');
  }

  private doCancel(room: Room) {
    room.status = 'CANCELLED';
    if (room.startTimer) clearTimeout(room.startTimer);
    this.notify(room, 'room-cancelled');
    this.rooms.delete(room.code);
  }

  private abandon(room: Room, player: RoomPlayer) {
    if (player.sockets.size > 0) return;
    if (room.status === 'PLAYING') this.drop(room, player, 'disconnect');
    else if (room.status === 'WAITING') this.removeWaiting(room, player);
  }

  private touch(room: Room) { room.updatedAt = Date.now(); }

  private tick() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.status !== 'PLAYING' || room.timeMs <= 0) continue;
      const turn = room.state.currentTurn;
      if (room.clocks[turn] - (now - room.turnStartedAt) <= 0) { room.clocks[turn] = 0; this.finish(room, opp(room, turn), 'timeout'); }
    }
  }

  // dọn phòng bỏ hoang để không rò bộ nhớ
  private sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const idle = now - room.updatedAt;
      const offline = room.players.every(p => p.sockets.size === 0);
      if ((room.status === 'FINISHED' && idle > 600_000) || (room.status === 'WAITING' && idle > 1_800_000) || (offline && idle > 300_000)) {
        room.players.forEach(p => p.grace && clearTimeout(p.grace));
        this.rooms.delete(code);
      }
    }
  }
}
