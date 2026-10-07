// Engine cờ tướng thuần (không phụ thuộc UI/mạng). Dùng chung cho client, server và AI.
// Bàn cờ: mảng 90 ô (10 hàng x 9 cột), index = hàng*9 + cột. Hàng 0 phía Đen, hàng 9 phía Đỏ.
// Chữ HOA = Đỏ, chữ thường = Đen: K tướng, A sĩ, E tượng, H mã, R xe, C pháo, P tốt.
import type { Board, GameEngine, GameState, LegalMap, Move, MoveResult, Reason, Side } from '../types';
import { describeMove } from './pieces';
export type { Board, GameState, LegalMap, Move, MoveResult, Reason, Side };
type Piece = string;

const ORTH: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const inB = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 9;

export const sideOf = (p: Piece): Side => (p === p.toUpperCase() ? 'red' : 'black');
export const other = (s: Side): Side => (s === 'red' ? 'black' : 'red');

export function initialBoard(): Board {
  const b: Board = Array(90).fill(null);
  const back = 'RHEAKAEHR';
  for (let c = 0; c < 9; c++) { b[c] = back[c].toLowerCase(); b[81 + c] = back[c]; }
  for (const c of [1, 7]) { b[2 * 9 + c] = 'c'; b[7 * 9 + c] = 'C'; }
  for (const c of [0, 2, 4, 6, 8]) { b[3 * 9 + c] = 'p'; b[6 * 9 + c] = 'P'; }
  return b;
}

export const initialState = (): GameState => ({
  game: 'xiangqi', board: initialBoard(), currentTurn: 'red', check: false, status: 'playing', history: [],
});

/** Các ô quân tại `from` có thể đến, chưa xét việc tướng mình có bị chiếu hay không. */
export function pseudoMoves(b: Board, from: number): number[] {
  const p = b[from];
  if (!p) return [];
  const r = Math.floor(from / 9), c = from % 9, s = sideOf(p), t = p.toUpperCase();
  const out: number[] = [];
  // thêm ô đích nếu hợp lệ; trả về true khi ô trống (quân trượt được tiếp)
  const add = (rr: number, cc: number): boolean => {
    if (!inB(rr, cc)) return false;
    const q = b[rr * 9 + cc];
    if (q && sideOf(q) === s) return false;
    out.push(rr * 9 + cc);
    return !q;
  };
  const palace = (rr: number, cc: number) =>
    cc >= 3 && cc <= 5 && (s === 'red' ? rr >= 7 && rr <= 9 : rr >= 0 && rr <= 2);

  if (t === 'K') {
    for (const [d, e] of ORTH) if (palace(r + d, c + e)) add(r + d, c + e);
  } else if (t === 'A') {
    for (const [d, e] of DIAG) if (palace(r + d, c + e)) add(r + d, c + e);
  } else if (t === 'E') {
    for (const [d, e] of DIAG) {
      const rr = r + 2 * d, cc = c + 2 * e;
      // không qua sông, không bị cản mắt tượng
      if (inB(rr, cc) && (s === 'red' ? rr >= 5 : rr <= 4) && !b[(r + d) * 9 + c + e]) add(rr, cc);
    }
  } else if (t === 'H') {
    for (const [d, e] of ORTH) {
      if (!inB(r + d, c + e) || b[(r + d) * 9 + c + e]) continue; // bị cản chân mã
      for (const x of [-1, 1]) add(r + 2 * d + (e ? x : 0), c + 2 * e + (d ? x : 0));
    }
  } else if (t === 'R') {
    for (const [d, e] of ORTH) { let rr = r + d, cc = c + e; while (add(rr, cc)) { rr += d; cc += e; } }
  } else if (t === 'C') {
    for (const [d, e] of ORTH) {
      let rr = r + d, cc = c + e;
      while (inB(rr, cc) && !b[rr * 9 + cc]) { out.push(rr * 9 + cc); rr += d; cc += e; } // đi thường
      rr += d; cc += e; // bỏ qua quân làm ngòi
      while (inB(rr, cc) && !b[rr * 9 + cc]) { rr += d; cc += e; }
      const q = inB(rr, cc) ? b[rr * 9 + cc] : null;
      if (q && sideOf(q) !== s) out.push(rr * 9 + cc); // ăn quân qua đúng 1 ngòi
    }
  } else {
    add(r + (s === 'red' ? -1 : 1), c); // tốt: đi thẳng
    if (s === 'red' ? r <= 4 : r >= 5) { add(r, c - 1); add(r, c + 1); } // qua sông được đi ngang
  }
  return out;
}

/** Tướng của `s` đang bị chiếu (bị quân địch bắt hoặc hai tướng đối mặt). */
export function isInCheck(b: Board, s: Side): boolean {
  const g = b.indexOf(s === 'red' ? 'K' : 'k');
  const o = b.indexOf(s === 'red' ? 'k' : 'K');
  if (g < 0) return true;
  if (o >= 0 && g % 9 === o % 9) {
    let blocked = false;
    for (let i = Math.min(g, o) + 9; i < Math.max(g, o); i += 9) if (b[i]) blocked = true;
    if (!blocked) return true;
  }
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (p && sideOf(p) !== s && pseudoMoves(b, i).includes(g)) return true;
  }
  return false;
}

/** Mọi nước đi hợp lệ của `s`: { ôXuấtPhát: [ôĐến...] }. */
export function legalMoves(b: Board, s: Side): LegalMap {
  const res: LegalMap = {};
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (!p || sideOf(p) !== s) continue;
    const ok = pseudoMoves(b, i).filter(to => {
      const sim = [...b]; sim[to] = sim[i]; sim[i] = null;
      return !isInCheck(sim, s);
    });
    if (ok.length) res[i] = ok;
  }
  return res;
}

export function finishGame(state: GameState, winner: Side, reason: Reason): GameState {
  return { ...state, status: 'finished', winner, reason, check: reason === 'checkmate' };
}

/** Áp dụng một nước đi cho bên đang tới lượt. Kiểm tra luật đầy đủ, trả về trạng thái mới. */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (state.status !== 'playing') return { ok: false, error: 'Ván cờ đã kết thúc.' };
  const side = state.currentTurn;
  if (!legalMoves(state.board, side)[move.from]?.includes(move.to)) return { ok: false, error: 'Nước đi không hợp lệ.' };
  const board = [...state.board];
  const piece = board[move.from] as Piece;
  const captured = board[move.to];
  board[move.to] = piece; board[move.from] = null;
  const next = other(side);
  const check = isInCheck(board, next);
  const next_: GameState = {
    ...state, board, currentTurn: next, check, lastMove: move,
    history: [...state.history, { side, text: describeMove(piece, move.from, move.to, captured), capture: !!captured }],
  };
  // hết nước đi hợp lệ = thua (chiếu bí hoặc bị "hết nước")
  if (Object.keys(legalMoves(board, next)).length === 0) return { ok: true, state: finishGame(next_, side, check ? 'checkmate' : 'stalemate') };
  return { ok: true, state: next_ };
}

export const xiangqi: GameEngine = {
  id: 'xiangqi',
  sides: ['red', 'black'], minPlayers: 2, maxPlayers: 2,
  initialState,
  applyMove: (s, m) => applyMove(s, { from: m.from, to: m.to }),
  finishGame: (s, winner, reason) => (winner ? finishGame(s, winner, reason) : { ...s, status: 'finished', reason }),
  legalMoves: s => legalMoves(s.board, s.currentTurn),
  checkSquare: s => (s.check && s.status === 'playing' ? s.board.indexOf(s.currentTurn === 'red' ? 'K' : 'k') : -1),
};
