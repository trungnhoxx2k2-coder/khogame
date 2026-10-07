// Cờ Cá Ngựa (Ludo) 2-4 người. Luật áp dụng:
//  - Mỗi người có 4 ngựa trong chuồng. Gieo xúc xắc, ra 6 mới được đưa ngựa ra ô xuất phát.
//  - Đi theo chiều kim đồng hồ quanh vòng 52 ô, rồi rẽ vào đường về đích riêng. Phải ra đúng số mới vào đích.
//  - Đáp xuống ô có ngựa đối phương thì đá nó về chuồng, trừ ô an toàn (ô xuất phát và ô ngôi sao).
//  - Ra 6 được gieo thêm; ra 6 ba lần liên tiếp thì mất lượt. Ai đưa đủ 4 ngựa về đích trước thắng.
// "progress" của một ngựa: -1 = trong chuồng, 0..50 = trên vòng (0 là ô xuất phát), 51..55 = đường về đích, 56 = đã về đích.
import type { GameEngine, GameState, LegalMap, Move, MoveResult, Reason, Side } from '../types';

export const SEATS: Side[] = ['red', 'blue', 'yellow', 'green']; // theo chiều kim đồng hồ
const OFFSET: Record<string, number> = { red: 0, blue: 13, yellow: 26, green: 39 };
export const TRACK = 52, LAST_RING = 50, FINISH = 56;
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
/** Ô tuyệt đối (0..51) trên vòng của một ngựa, -1 nếu ở chuồng hoặc đã vào đường về đích. */
export const absCell = (side: Side, progress: number) => (progress >= 0 && progress <= LAST_RING ? (OFFSET[side] + progress) % TRACK : -1);
const seatIdx = (s: GameState, side: Side) => (s.seats ?? []).indexOf(side);

export const initialState = (seats: Side[] = ['red', 'yellow']): GameState => ({
  game: 'ludo', board: [], currentTurn: seats[0], check: false, status: 'playing', history: [],
  seats, pieces: seats.map(() => [-1, -1, -1, -1]), dice: null, sixes: 0, out: [],
});

function legalMoves(s: GameState): LegalMap {
  const map: LegalMap = {};
  const si = seatIdx(s, s.currentTurn), d = s.dice;
  if (s.status !== 'playing' || d == null || si < 0 || !s.pieces) return map;
  s.pieces[si].forEach((p, i) => {
    if (p === -1) { if (d === 6) map[i] = [0]; }
    else if (p + d <= FINISH) map[i] = [p + d];
  });
  return map;
}

/** Chuyển lượt (bỏ qua người đã rời). again = vẫn người đó gieo tiếp. */
function advance(s: GameState, again: boolean): GameState {
  if (again) return { ...s, dice: null };
  const seats = s.seats ?? [], out = s.out ?? [];
  let i = seats.indexOf(s.currentTurn);
  do i = (i + 1) % seats.length; while (out.includes(seats[i]));
  return { ...s, dice: null, sixes: 0, currentTurn: seats[i] };
}

const finishGame = (s: GameState, winner: Side | undefined, reason: Reason): GameState => ({ ...s, status: 'finished', winner, reason, check: false });

/** Gieo xúc xắc với giá trị cho trước (server gọi với số ngẫu nhiên, test gọi với số cố định). */
export function rollWith(s: GameState, d: number): MoveResult {
  const sixes = d === 6 ? (s.sixes ?? 0) + 1 : 0, triple = sixes >= 3;
  const entry = { side: s.currentTurn, text: `🎲 ${d}${triple ? ' (ba lần 6, mất lượt)' : ''}`, capture: false };
  const rolled: GameState = { ...s, dice: d, sixes, history: [...s.history, entry] };
  if (triple) return { ok: true, state: advance(rolled, false) };
  if (Object.keys(legalMoves(rolled)).length === 0) return { ok: true, state: advance(rolled, d === 6) }; // không đi được: qua lượt (6 thì gieo lại)
  return { ok: true, state: rolled };
}

function applyMove(s: GameState, m: Move): MoveResult {
  if (s.status !== 'playing') return { ok: false, error: 'Ván cờ đã kết thúc.' };
  if (m.act === 'roll') {
    if (s.dice != null) return { ok: false, error: 'Bạn đã gieo rồi, hãy chọn một ngựa để đi.' };
    return rollWith(s, 1 + Math.floor(Math.random() * 6));
  }
  if (s.dice == null) return { ok: false, error: 'Hãy gieo xúc xắc trước.' };
  if (!legalMoves(s)[m.from]?.includes(m.to)) return { ok: false, error: 'Nước đi không hợp lệ.' };
  const side = s.currentTurn, si = seatIdx(s, side), d = s.dice;
  const pieces = (s.pieces as number[][]).map(a => [...a]);
  const from = pieces[si][m.from];
  pieces[si][m.from] = m.to;
  const cell = absCell(side, m.to);
  let capture = false;
  if (cell >= 0 && !SAFE.has(cell)) {
    (s.seats as Side[]).forEach((o, oi) => {
      if (oi !== si) pieces[oi].forEach((p, k) => { if (absCell(o, p) === cell) { pieces[oi][k] = -1; capture = true; } });
    });
  }
  const text = `Ngựa ${m.from + 1}: ${from === -1 ? 'ra khỏi chuồng' : `ô ${from} → ${m.to}`}${capture ? ' (đá ngựa đối phương)' : ''}${m.to === FINISH ? ' (về đích)' : ''}`;
  const moved: GameState = { ...s, pieces, history: [...s.history, { side, text, capture }] };
  if (pieces[si].every(p => p === FINISH)) return { ok: true, state: finishGame({ ...moved, dice: null }, side, 'all-home') };
  return { ok: true, state: advance(moved, d === 6) };
}

/** Một người bỏ cuộc: ngựa của họ rời bàn, ván tiếp tục; còn một người thì người đó thắng. */
function forfeit(s: GameState, side: Side, reason: Reason): GameState {
  if (s.status !== 'playing' || !(s.seats ?? []).includes(side) || (s.out ?? []).includes(side)) return s;
  const out = [...(s.out ?? []), side], left = (s.seats as Side[]).filter(x => !out.includes(x));
  const next: GameState = { ...s, out, pieces: (s.pieces as number[][]).map((a, i) => (out.includes((s.seats as Side[])[i]) ? [-1, -1, -1, -1] : a)) };
  if (left.length === 1) return finishGame(next, left[0], reason);
  return s.currentTurn === side ? advance(next, false) : next;
}

export const ludo: GameEngine = {
  id: 'ludo', sides: SEATS, minPlayers: 2, maxPlayers: 4,
  seatsFor: n => (n <= 2 ? ['red', 'yellow'] : n === 3 ? ['red', 'blue', 'yellow'] : [...SEATS]),
  initialState, applyMove, finishGame, legalMoves, checkSquare: () => -1, forfeit,
};
