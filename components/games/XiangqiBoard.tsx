'use client';
import { CSSProperties, memo } from 'react';
import { sideOf } from '@/lib/games/xiangqi/engine';
import { GLYPH } from '@/lib/games/xiangqi/pieces';
import type { BoardProps } from './types';

const S = 56, M = 36, W = 8 * S + 2 * M, H = 9 * S + 2 * M;

// đường kẻ bàn cờ + cung tướng, vẽ bằng một path duy nhất
const GRID = (() => {
  let d = '';
  for (let r = 0; r < 10; r++) d += `M${M} ${M + r * S}H${M + 8 * S}`;
  for (let c = 0; c < 9; c++) {
    const x = M + c * S;
    d += c === 0 || c === 8 ? `M${x} ${M}V${M + 9 * S}` : `M${x} ${M}V${M + 4 * S}M${x} ${M + 5 * S}V${M + 9 * S}`; // sông ở giữa
  }
  for (const r0 of [0, 7]) d += `M${M + 3 * S} ${M + r0 * S}L${M + 5 * S} ${M + (r0 + 2) * S}M${M + 5 * S} ${M + r0 * S}L${M + 3 * S} ${M + (r0 + 2) * S}`;
  return d;
})();

function XiangqiBoardBase({ state, flip, selected, targets, legal, interactive, checkAt, rippleAt, rippleKey, onCell }: BoardProps) {
  const { board, lastMove } = state;
  // quân của mình luôn ở phía dưới: xoay bàn 180° khi cầm quân Đen
  const xy = (i: number): [number, number] => [M + (flip ? 8 - (i % 9) : i % 9) * S, M + (flip ? 9 - Math.floor(i / 9) : Math.floor(i / 9)) * S];
  const [fx, fy] = lastMove ? xy(lastMove.from) : [0, 0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-manipulation select-none rounded-xl shadow-2xl" role="img" aria-label="Bàn cờ tướng">
      <rect width={W} height={H} rx="12" fill="#d9a95f" />
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="8" fill="none" stroke="#7a5320" strokeWidth="2" />
      <path d={GRID} stroke="#5a3a1a" strokeWidth="2" fill="none" />
      <text x={M + 1.5 * S} y={M + 4.5 * S} className="piece" fill="#5a3a1a" opacity=".55" style={{ fontSize: 28, letterSpacing: 8 }}>楚河</text>
      <text x={M + 6.5 * S} y={M + 4.5 * S} className="piece" fill="#5a3a1a" opacity=".55" style={{ fontSize: 28, letterSpacing: 8 }}>漢界</text>

      {lastMove && [lastMove.from, lastMove.to].map(i => (
        <rect key={i} x={xy(i)[0] - 27} y={xy(i)[1] - 27} width="54" height="54" rx="8" fill="none" stroke="#2f6f8f" strokeWidth="3" />
      ))}

      {board.map((p, i) => {
        if (!p) return null;
        const [x, y] = xy(i), red = sideOf(p) === 'red', moved = lastMove?.to === i;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <g className={moved ? 'slide' : selected === i ? 'lift' : undefined}
              style={moved ? ({ '--dx': `${fx - x}px`, '--dy': `${fy - y}px` } as CSSProperties) : undefined}>
              <circle r="25" fill="#f6ecd2" stroke={red ? '#b3261e' : '#14181f'} strokeWidth="3" />
              <circle r="20" fill="none" stroke={red ? '#b3261e' : '#14181f'} strokeWidth="1" opacity=".6" />
              <text className="piece" fill={red ? '#b3261e' : '#14181f'}>{GLYPH[p]}</text>
            </g>
          </g>
        );
      })}

      {checkAt >= 0 && <circle className="check-ring" cx={xy(checkAt)[0]} cy={xy(checkAt)[1]} r="30" fill="none" stroke="#ff3b2e" strokeWidth="4" />}
      {rippleAt !== null && <circle key={rippleKey} className="ripple" cx={xy(rippleAt)[0]} cy={xy(rippleAt)[1]} r="24" fill="none" stroke="#d4a64a" strokeWidth="4" />}
      {targets.map(i => (
        <circle key={i} cx={xy(i)[0]} cy={xy(i)[1]} r={board[i] ? 30 : 9} fill={board[i] ? 'none' : '#2f6f8f'} stroke="#2f6f8f" strokeWidth="4" opacity=".85" pointerEvents="none" />
      ))}
      {Array.from({ length: 90 }, (_, i) => (
        <circle key={i} cx={xy(i)[0]} cy={xy(i)[1]} r="27" className={`hit ${interactive && (legal[i] || targets.includes(i)) ? 'can' : ''}`} onClick={() => onCell(i)} />
      ))}
    </svg>
  );
}
export const XiangqiBoard = memo(XiangqiBoardBase);
