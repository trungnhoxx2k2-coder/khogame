// AI tách riêng khỏi engine: Minimax + Alpha-Beta + hàm đánh giá, có giới hạn thời gian.
import { legalMoves, other, pseudoMoves, sideOf } from './engine';
import type { Board, Difficulty, Move, Side } from '../types';

const VAL: Record<string, number> = { K: 10000, R: 900, C: 450, H: 400, E: 200, A: 200, P: 100 };
const WIN = 100000;

/** Điểm theo góc nhìn của `side` (dương = đang hơn): giá trị quân + vị trí. */
function evaluate(b: Board, side: Side): number {
  let score = 0;
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (!p) continue;
    const t = p.toUpperCase(), sd = sideOf(p), r = Math.floor(i / 9), c = i % 9;
    let v = VAL[t];
    if (t === 'P' && (sd === 'red' ? r <= 4 : r >= 5)) v += 100;              // tốt qua sông
    if (t === 'R' || t === 'C' || t === 'H') v += (4 - Math.abs(c - 4)) * 4;  // quân mạnh ưu tiên trung tâm
    score += sd === side ? v : -v;
  }
  return score;
}

// Nước đi thô (không xét chiếu), ăn quân giá trị cao xếp trước để cắt tỉa tốt hơn
function genMoves(b: Board, side: Side): Move[] {
  const out: Move[] = [];
  for (let from = 0; from < 90; from++) {
    const p = b[from];
    if (!p || sideOf(p) !== side) continue;
    for (const to of pseudoMoves(b, from)) out.push({ from, to });
  }
  const gain = (m: Move) => { const q = b[m.to]; return q ? VAL[q.toUpperCase()] : 0; };
  return out.sort((x, y) => gain(y) - gain(x));
}

class OutOfTime extends Error {}
let nodes = 0;
let deadline = Infinity;

function search(b: Board, side: Side, depth: number, alpha: number, beta: number): number {
  if ((++nodes & 1023) === 0 && performance.now() > deadline) throw new OutOfTime();
  if (depth === 0) return evaluate(b, side);
  let best = -Infinity;
  for (const m of genMoves(b, side)) {
    const cap = b[m.to];
    if (cap && cap.toUpperCase() === 'K') return WIN + depth; // ăn được tướng = thắng
    b[m.to] = b[m.from]; b[m.from] = null;
    const v = -search(b, other(side), depth - 1, -beta, -alpha);
    b[m.from] = b[m.to]; b[m.to] = cap;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? -WIN : best;
}

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/**
 * Dễ: ăn quân khi có cơ hội, không nhìn trước (chọn ngẫu nhiên trong top 3 nước).
 * Trung bình: tìm kiếm sâu 3 nước.  Khó: tìm kiếm sâu tới 5 nước (iterative deepening, tối đa 3 giây).
 */
export function findBestMove(board: Board, side: Side, level: Difficulty): Move | null {
  const moves: Move[] = Object.entries(legalMoves(board, side)).flatMap(([f, ts]) => ts.map(to => ({ from: Number(f), to })));
  if (moves.length === 0) return null;

  if (level === 'easy') {
    const scored = moves.map(m => {
      const b = [...board]; b[m.to] = b[m.from]; b[m.from] = null;
      return { m, v: evaluate(b, side) };
    }).sort((x, y) => y.v - x.v);
    return pick(scored.slice(0, 3)).m;
  }

  const maxDepth = level === 'medium' ? 3 : 5;
  nodes = 0;
  deadline = performance.now() + (level === 'medium' ? 2000 : 3000);
  let ordered = moves;
  let best = pick(moves);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const b = [...board]; // bản sao mới mỗi vòng, nếu hết giờ thì bỏ vòng dở dang
    const scored: { m: Move; v: number }[] = [];
    try {
      for (const m of ordered) {
        const cap = b[m.to];
        b[m.to] = b[m.from]; b[m.from] = null;
        const v = -search(b, other(side), depth - 1, -Infinity, Infinity);
        b[m.from] = b[m.to]; b[m.to] = cap;
        scored.push({ m, v });
      }
    } catch (e) {
      if (e instanceof OutOfTime) break;
      throw e;
    }
    scored.sort((x, y) => y.v - x.v);
    best = pick(scored.filter(s => s.v === scored[0].v)).m;
    ordered = scored.map(s => s.m);
    if (scored[0].v >= WIN) break; // đã thấy nước chiếu bí
  }
  return best;
}
