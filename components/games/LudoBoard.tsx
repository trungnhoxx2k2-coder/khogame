'use client';
import { memo } from 'react';
import { sideInfo } from '@/lib/games/meta';
import { BASE_ORIGIN, BASE_SLOTS, COLOR, HOME, LIGHT, RING, START_CELL, pieceXY } from '@/lib/games/ludo/layout';
import type { BoardProps } from './types';

const U = 36, W = 15 * U, C = 7.5 * U;
const STARS = [8, 21, 34, 47];
const STACK: [number, number][] = [[0, 0], [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2], [0, 0.3]];
const DICE = '⚀⚁⚂⚃⚄⚅';
const CENTER: [string, string][] = [
  ['red', `${6 * U},${6 * U} ${6 * U},${9 * U} ${C},${C}`], ['blue', `${6 * U},${6 * U} ${9 * U},${6 * U} ${C},${C}`],
  ['yellow', `${9 * U},${6 * U} ${9 * U},${9 * U} ${C},${C}`], ['green', `${6 * U},${9 * U} ${9 * U},${9 * U} ${C},${C}`],
];

function LudoBoardBase({ state, interactive, legal, you, onMove }: BoardProps) {
  const seats = state.seats ?? [], pieces = state.pieces ?? [], out = state.out ?? [];
  const seen = new Map<string, number>();
  const items = seats.flatMap((side, si) => (out.includes(side) ? [] : pieces[si].map((p, i) => {
    const [x, y] = pieceXY(side, i, p), key = `${x},${y}`, k = seen.get(key) ?? 0;
    seen.set(key, k + 1);
    const [dx, dy] = STACK[k % STACK.length];
    return { side, i, x: x + dx, y: y + dy, can: interactive && side === you && !!legal[i] };
  }))).sort((a, b) => Number(a.can) - Number(b.can)); // ngựa đi được vẽ sau cùng để bấm được

  const hint = state.status === 'finished' ? 'Ván cờ đã kết thúc.'
    : interactive ? (state.dice == null ? 'Đến lượt bạn: hãy gieo xúc xắc.' : 'Chọn một ngựa đang nhấp nháy để đi.')
      : `Đang chờ ${sideInfo('ludo', state.currentTurn).label} đi...`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${W}`} className="block h-auto w-full touch-manipulation select-none rounded-xl shadow-2xl" role="img" aria-label="Bàn cờ cá ngựa">
        <rect width={W} height={W} rx="14" fill="#f5f3ff" />
        {Object.entries(BASE_ORIGIN).map(([side, [bx, by]]) => (
          <g key={side}>
            <rect x={bx * U} y={by * U} width={6 * U} height={6 * U} fill={COLOR[side]} />
            <rect x={(bx + 0.8) * U} y={(by + 0.8) * U} width={4.4 * U} height={4.4 * U} rx="14" fill="#fff" />
            {BASE_SLOTS.map(([sx, sy], i) => <circle key={i} cx={(bx + sx) * U} cy={(by + sy) * U} r={U * 0.42} fill={LIGHT[side]} />)}
          </g>
        ))}
        {RING.map(([x, y], i) => (
          <g key={i}>
            <rect x={x * U} y={y * U} width={U} height={U} fill={START_CELL[i] ? COLOR[START_CELL[i]] : '#fff'} stroke="#c4b5fd" strokeWidth="1" />
            {STARS.includes(i) && <text x={(x + 0.5) * U} y={(y + 0.5) * U} textAnchor="middle" dominantBaseline="central" fontSize="20" fill="#a78bfa">★</text>}
          </g>
        ))}
        {Object.entries(HOME).map(([side, cells]) => cells.map(([x, y], i) => (
          <rect key={`${side}${i}`} x={x * U} y={y * U} width={U} height={U} fill={COLOR[side]} fillOpacity="0.6" stroke="#c4b5fd" strokeWidth="1" />
        )))}
        {CENTER.map(([side, pts]) => <polygon key={side} points={pts} fill={COLOR[side]} />)}
        {items.map(it => (
          <g key={`${it.side}${it.i}`} transform={`translate(${it.x * U},${it.y * U})`}>
            <circle r={U * 0.33} fill={COLOR[it.side]} stroke="#fff" strokeWidth="2.5" />
            <text textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="800" fill={it.side === 'yellow' ? '#3b2f00' : '#fff'} pointerEvents="none">{it.i + 1}</text>
            {it.can && (
              <>
                <circle className="check-ring" r={U * 0.45} fill="none" stroke="#111827" strokeWidth="3" strokeDasharray="4 3" pointerEvents="none" />
                <circle r={U * 0.5} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onMove({ from: it.i, to: legal[it.i][0] })} />
              </>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-800/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span key={state.dice ?? 'none'} className="pop w-12 text-center text-5xl leading-none" aria-label={state.dice ? `Xúc xắc ${state.dice}` : 'Chưa gieo'}>{state.dice ? `${DICE[state.dice - 1]}\uFE0E` : '🎲'}</span>
          <p className="text-sm text-paper/80">{hint}</p>
        </div>
        <button className="btn-gold shrink-0" disabled={!(interactive && state.dice == null)} onClick={() => onMove({ act: 'roll', from: 0, to: 0 })}>Gieo xúc xắc</button>
      </div>
    </div>
  );
}
export const LudoBoard = memo(LudoBoardBase);
