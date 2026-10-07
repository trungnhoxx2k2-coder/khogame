// Engine cờ vua đầy đủ luật quốc tế. Bàn cờ 64 ô, index = hàng*8 + cột, hàng 0 là hạng 8 (phía Đen).
// Chữ HOA = Trắng, chữ thường = Đen: K vua, Q hậu, R xe, B tượng, N mã, P tốt.
import type { Board, GameEngine, GameState, LegalMap, Move, MoveResult, Reason, Side } from '../types';

export type Pos = { board: Board; turn: Side; castle: string; ep: number; half: number };
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const OR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const sideOf = (p: string): Side => (p === p.toUpperCase() ? 'white' : 'black');
export const other = (s: Side): Side => (s === 'white' ? 'black' : 'white');
const kingOf = (s: Side) => (s === 'white' ? 'K' : 'k');

/** Ô `sq` có đang bị bên `by` tấn công không (dò từ ô ra ngoài, nhanh hơn sinh hết nước đi địch). */
export function attacked(b: Board, sq: number, by: Side): boolean {
  const r = sq >> 3, c = sq & 7;
  const has = (rr: number, cc: number, pcs: string) => {
    if (!inB(rr, cc)) return false;
    const p = b[rr * 8 + cc];
    return !!p && sideOf(p) === by && pcs.includes(p.toUpperCase());
  };
  const pr = by === 'white' ? r + 1 : r - 1;
  if (has(pr, c - 1, 'P') || has(pr, c + 1, 'P')) return true;
  for (const [d, e] of KN) if (has(r + d, c + e, 'N')) return true;
  for (const [d, e] of KG) if (has(r + d, c + e, 'K')) return true;
  for (const [dirs, pcs] of [[DG, 'BQ'], [OR, 'RQ']] as [number[][], string][]) {
    for (const [d, e] of dirs) {
      let rr = r + d, cc = c + e;
      while (inB(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) { if (sideOf(p) === by && pcs.includes(p.toUpperCase())) return true; break; }
        rr += d; cc += e;
      }
    }
  }
  return false;
}

/** Nước đi "thô": chưa loại các nước làm vua mình bị chiếu. */
export function genPseudo(p: Pos): Move[] {
  const { board: b, turn: s } = p, out: Move[] = [];
  for (let from = 0; from < 64; from++) {
    const pc = b[from];
    if (!pc || sideOf(pc) !== s) continue;
    const t = pc.toUpperCase(), r = from >> 3, c = from & 7;
    const hit = (rr: number, cc: number) => { const q = b[rr * 8 + cc]; return !q || sideOf(q) !== s; };
    if (t === 'P') {
      const dr = s === 'white' ? -1 : 1, start = s === 'white' ? 6 : 1, last = s === 'white' ? 0 : 7;
      const add = (to: number) => {
        if (to >> 3 === last) for (const promo of 'qrbn') out.push({ from, to, promo });
        else out.push({ from, to });
      };
      if (!b[from + dr * 8]) {
        add(from + dr * 8);
        if (r === start && !b[from + 2 * dr * 8]) out.push({ from, to: from + 2 * dr * 8 });
      }
      for (const e of [-1, 1]) {
        if (c + e < 0 || c + e > 7) continue;
        const to = from + dr * 8 + e, q = b[to];
        if ((q && sideOf(q) !== s) || to === p.ep) add(to); // ăn thường hoặc bắt tốt qua đường
      }
    } else if (t === 'N' || t === 'K') {
      for (const [d, e] of t === 'N' ? KN : KG) if (inB(r + d, c + e) && hit(r + d, c + e)) out.push({ from, to: (r + d) * 8 + c + e });
      if (t === 'K') {
        const home = s === 'white' ? 60 : 4, rights = s === 'white' ? 'KQ' : 'kq', rook = s === 'white' ? 'R' : 'r', foe = other(s);
        if (from === home && !attacked(b, home, foe)) {
          if (p.castle.includes(rights[0]) && !b[home + 1] && !b[home + 2] && b[home + 3] === rook && !attacked(b, home + 1, foe) && !attacked(b, home + 2, foe)) out.push({ from, to: home + 2 });
          if (p.castle.includes(rights[1]) && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === rook && !attacked(b, home - 1, foe) && !attacked(b, home - 2, foe)) out.push({ from, to: home - 2 });
        }
      }
    } else {
      for (const [d, e] of t === 'B' ? DG : t === 'R' ? OR : [...DG, ...OR]) {
        let rr = r + d, cc = c + e;
        while (inB(rr, cc)) {
          const q = b[rr * 8 + cc];
          if (!q) out.push({ from, to: rr * 8 + cc });
          else { if (sideOf(q) !== s) out.push({ from, to: rr * 8 + cc }); break; }
          rr += d; cc += e;
        }
      }
    }
  }
  return out;
}

export function makeMove(p: Pos, m: Move): Pos {
  const b = [...p.board], pc = b[m.from] as string, t = pc.toUpperCase(), s = p.turn, cap = b[m.to];
  let ep = -1, castle = p.castle;
  b[m.from] = null; b[m.to] = pc;
  if (t === 'P') {
    if (!cap && (m.from & 7) !== (m.to & 7)) b[s === 'white' ? m.to + 8 : m.to - 8] = null; // bắt tốt qua đường
    if (Math.abs(m.to - m.from) === 16) ep = (m.from + m.to) / 2;
    if (m.promo) b[m.to] = s === 'white' ? m.promo.toUpperCase() : m.promo.toLowerCase();
  }
  if (t === 'K' && Math.abs(m.to - m.from) === 2) { // nhập thành: dời xe
    const rf = m.to > m.from ? m.from + 3 : m.from - 4;
    b[(m.from + m.to) / 2] = b[rf]; b[rf] = null;
  }
  if (t === 'K') castle = castle.replace(s === 'white' ? /[KQ]/g : /[kq]/g, '');
  for (const sq of [m.from, m.to]) { // xe di chuyển hoặc bị ăn thì mất quyền nhập thành tương ứng
    if (sq === 63) castle = castle.replace('K', ''); else if (sq === 56) castle = castle.replace('Q', '');
    else if (sq === 7) castle = castle.replace('k', ''); else if (sq === 0) castle = castle.replace('q', '');
  }
  return { board: b, turn: other(s), castle, ep, half: t === 'P' || cap ? 0 : p.half + 1 };
}

export const inCheck = (p: Pos) => attacked(p.board, p.board.indexOf(kingOf(p.turn)), other(p.turn));
export function legalList(p: Pos): Move[] {
  return genPseudo(p).filter(m => { const n = makeMove(p, m); return !attacked(n.board, n.board.indexOf(kingOf(p.turn)), n.turn); });
}

export function fromFen(fen: string): Pos {
  const [rows, turn, castle, ep] = fen.split(' ');
  const board: Board = [];
  for (const row of rows.split('/')) for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push(null); else board.push(ch); }
  return { board, turn: turn === 'w' ? 'white' : 'black', castle: !castle || castle === '-' ? '' : castle, ep: ep && ep !== '-' ? (8 - Number(ep[1])) * 8 + 'abcdefgh'.indexOf(ep[0]) : -1, half: 0 };
}
export const toPos = (s: GameState): Pos => ({ board: s.board, turn: s.currentTurn, castle: s.castle ?? '', ep: s.ep ?? -1, half: s.half ?? 0 });
const keyOf = (p: Pos) => `${p.board.map(x => x ?? '.').join('')}${p.turn[0]}${p.castle}${p.ep}`;
export function stateOf(p: Pos): GameState {
  return { game: 'chess', board: p.board, currentTurn: p.turn, check: inCheck(p), status: 'playing', history: [], castle: p.castle, ep: p.ep, half: p.half, seen: { [keyOf(p)]: 1 } };
}
export const initialState = (): GameState => {
  const board: Board = Array(64).fill(null);
  [...'rnbqkbnr'].forEach((ch, c) => { board[c] = ch; board[56 + c] = ch.toUpperCase(); board[8 + c] = 'p'; board[48 + c] = 'P'; });
  return stateOf({ board, turn: 'white', castle: 'KQkq', ep: -1, half: 0 });
};

function insufficient(b: Board): boolean {
  const rest = b.map((p, i) => ({ p: p as string, i })).filter(x => x.p && x.p.toUpperCase() !== 'K');
  if (rest.length === 0) return true;
  if (rest.length === 1) return 'BN'.includes(rest[0].p.toUpperCase());
  return rest.every(x => x.p.toUpperCase() === 'B') && new Set(rest.map(x => ((x.i >> 3) + (x.i & 7)) % 2)).size === 1; // các tượng cùng màu ô
}

/** Ký hiệu đại số chuẩn (SAN): e4, Nbd2, exd5, O-O, e8=Q. */
function san(p: Pos, m: Move, legal: Move[]): string {
  const pc = p.board[m.from] as string, t = pc.toUpperCase(), F = 'abcdefgh';
  const sq = (i: number) => F[i & 7] + (8 - (i >> 3));
  if (t === 'K' && Math.abs(m.to - m.from) === 2) return m.to > m.from ? 'O-O' : 'O-O-O';
  const cap = !!p.board[m.to] || (t === 'P' && (m.from & 7) !== (m.to & 7));
  if (t === 'P') return (cap ? F[m.from & 7] + 'x' : '') + sq(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
  const rivals = legal.filter(x => x.to === m.to && x.from !== m.from && p.board[x.from] === pc);
  let dis = '';
  if (rivals.length) {
    dis = !rivals.some(x => (x.from & 7) === (m.from & 7)) ? F[m.from & 7] : !rivals.some(x => x.from >> 3 === m.from >> 3) ? String(8 - (m.from >> 3)) : sq(m.from);
  }
  return t + dis + (cap ? 'x' : '') + sq(m.to);
}

const finishGame = (s: GameState, winner: Side | undefined, reason: Reason): GameState => ({ ...s, status: 'finished', winner, reason, check: reason === 'checkmate' });

function applyMove(s: GameState, m: Move): MoveResult {
  if (s.status !== 'playing') return { ok: false, error: 'Ván cờ đã kết thúc.' };
  const p = toPos(s), legal = legalList(p), promo = (m.promo ?? 'q').toLowerCase();
  const mv = legal.find(x => x.from === m.from && x.to === m.to && (!x.promo || x.promo === promo));
  if (!mv) return { ok: false, error: 'Nước đi không hợp lệ.' };
  const n = makeMove(p, mv), check = inCheck(n), hasMoves = legalList(n).length > 0;
  const capture = n.board.filter(Boolean).length < p.board.filter(Boolean).length;
  const key = keyOf(n), seen = { ...(s.seen ?? {}), [key]: (s.seen?.[key] ?? 0) + 1 };
  const state: GameState = {
    ...s, board: n.board, currentTurn: n.turn, check, lastMove: { from: mv.from, to: mv.to }, castle: n.castle, ep: n.ep, half: n.half, seen,
    history: [...s.history, { side: p.turn, text: san(p, mv, legal) + (check ? (hasMoves ? '+' : '#') : ''), capture }],
  };
  if (!hasMoves) return { ok: true, state: check ? finishGame(state, p.turn, 'checkmate') : finishGame(state, undefined, 'stalemate') };
  if (insufficient(n.board)) return { ok: true, state: finishGame(state, undefined, 'insufficient') };
  if (n.half >= 100) return { ok: true, state: finishGame(state, undefined, 'fifty-move') };
  if (seen[key] >= 3) return { ok: true, state: finishGame(state, undefined, 'repetition') };
  return { ok: true, state };
}

export const chess: GameEngine = {
  id: 'chess',
  sides: ['white', 'black'], minPlayers: 2, maxPlayers: 2,
  initialState,
  applyMove,
  finishGame,
  legalMoves: s => {
    const map: LegalMap = {};
    for (const m of legalList(toPos(s))) { const a = (map[m.from] ??= []); if (!a.includes(m.to)) a.push(m.to); }
    return map;
  },
  checkSquare: s => (s.check && s.status === 'playing' ? s.board.indexOf(kingOf(s.currentTurn)) : -1),
  isPromotion: (s, from, to) => s.board[from]?.toUpperCase() === 'P' && (to >> 3 === 0 || to >> 3 === 7),
};
