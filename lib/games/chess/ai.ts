// AI cờ vua: negamax + alpha-beta + quiescence (chỉ xét nước ăn quân ở lá), iterative deepening có giới hạn thời gian.
import type { Difficulty, GameState, Move } from '../types';
import { Pos, inCheck, legalList, makeMove, sideOf, toPos } from './engine';

const VAL: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const WIN = 100000;

/** Điểm theo góc nhìn bên đang tới lượt: giá trị quân + vị trí (tốt tiến lên, mã/tượng vào trung tâm). */
function evaluate(p: Pos): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const pc = p.board[i];
    if (!pc) continue;
    const t = pc.toUpperCase(), sd = sideOf(pc), r = i >> 3, c = i & 7;
    const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
    let v = VAL[t];
    if (t === 'P') v += (sd === 'white' ? 6 - r : r - 1) * 6 + (c === 3 || c === 4 ? 8 : 0);
    else if (t === 'N') v += centre * 10;
    else if (t === 'B') v += centre * 5;
    else if (t === 'K' && (r === 0 || r === 7)) v += 10; // vua ở hàng nhà
    score += sd === p.turn ? v : -v;
  }
  return score;
}

const gain = (p: Pos, m: Move) => {
  const v = p.board[m.to] ? VAL[(p.board[m.to] as string).toUpperCase()] * 10 - VAL[(p.board[m.from] as string).toUpperCase()] : 0;
  return v + (m.promo ? 800 : 0);
};
const ordered = (p: Pos, ms: Move[]) => ms.sort((a, b) => gain(p, b) - gain(p, a));

class OutOfTime extends Error {}
let nodes = 0;
let deadline = Infinity;
const tick = () => { if ((++nodes & 511) === 0 && performance.now() > deadline) throw new OutOfTime(); };

function quiesce(p: Pos, alpha: number, beta: number, depth: number): number {
  tick();
  let best = evaluate(p);
  if (best >= beta || depth === 0) return best;
  if (best > alpha) alpha = best;
  for (const m of ordered(p, legalList(p).filter(x => p.board[x.to] || x.promo))) {
    const v = -quiesce(makeMove(p, m), -beta, -alpha, depth - 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function search(p: Pos, depth: number, alpha: number, beta: number, ply: number): number {
  tick();
  const moves = legalList(p);
  if (moves.length === 0) return inCheck(p) ? -WIN + ply : 0; // bị chiếu bí hoặc hòa do hết nước
  if (p.half >= 100) return 0;
  if (depth === 0) return quiesce(p, alpha, beta, 4);
  let best = -Infinity;
  for (const m of ordered(p, moves)) {
    const v = -search(makeMove(p, m), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Dễ: nhìn 1 nước, chọn ngẫu nhiên trong top 3 (hay bỏ quân). Trung bình: sâu 3. Khó: sâu tới 5 (tối đa 3,5 giây). */
export function findChessMove(state: GameState, level: Difficulty): Move | null {
  const p = toPos(state), moves = legalList(p);
  if (moves.length === 0) return null;
  if (level === 'easy') {
    const scored = moves.map(m => ({ m, v: -evaluate(makeMove(p, m)) })).sort((a, b) => b.v - a.v);
    return pick(scored.slice(0, 3)).m;
  }
  nodes = 0;
  deadline = performance.now() + (level === 'medium' ? 2000 : 3500);
  let order = moves, best = pick(moves);
  for (let depth = 1; depth <= (level === 'medium' ? 3 : 5); depth++) {
    const scored: { m: Move; v: number }[] = [];
    try {
      for (const m of order) scored.push({ m, v: -search(makeMove(p, m), depth - 1, -Infinity, Infinity, 1) });
    } catch (e) {
      if (e instanceof OutOfTime) break; // hết giờ: giữ kết quả của vòng sâu trước
      throw e;
    }
    scored.sort((a, b) => b.v - a.v);
    best = pick(scored.filter(s => s.v === scored[0].v)).m;
    order = scored.map(s => s.m);
    if (scored[0].v >= WIN - 100) break; // đã thấy nước chiếu bí
  }
  return best;
}
