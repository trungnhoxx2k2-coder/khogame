'use client';
import { CSSProperties, memo } from 'react';
import { sideOf } from '@/lib/games/chess/engine';
import type { BoardProps } from './types';

const S = 56, M = 28, W = 8 * S + 2 * M;
const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

function ChessBoardBase({ state, flip, selected, targets, legal, interactive, checkAt, rippleAt, rippleKey, onCell }: BoardProps) {
  const { board, lastMove } = state;
  // quân của mình luôn ở phía dưới: xoay bàn khi cầm quân Đen
  const xy = (i: number): [number, number] => [M + (flip ? 7 - (i & 7) : i & 7) * S, M + (flip ? 7 - (i >> 3) : i >> 3) * S];
  const ctr = (i: number): [number, number] => { const [x, y] = xy(i); return [x + S / 2, y + S / 2]; };
  const [fx, fy] = lastMove ? ctr(lastMove.from) : [0, 0];
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="block h-auto w-full touch-manipulation select-none rounded-xl shadow-2xl" role="img" aria-label="Bàn cờ vua">
      <rect width={W} height={W} rx="12" fill="#4a3320" />
      {Array.from({ length: 64 }, (_, i) => {
        const [x, y] = xy(i);
        return <rect key={i} x={x} y={y} width={S} height={S} fill={((i >> 3) + (i & 7)) % 2 ? '#b58863' : '#f0d9b5'} />;
      })}
      {Array.from({ length: 8 }, (_, k) => (
        <g key={k} fill="#e8d5b0" fontSize="12" textAnchor="middle" dominantBaseline="central">
          <text x={M + k * S + S / 2} y={W - 12}>{'abcdefgh'[flip ? 7 - k : k]}</text>
          <text x={13} y={M + k * S + S / 2}>{flip ? k + 1 : 8 - k}</text>
        </g>
      ))}
      {lastMove && [lastMove.from, lastMove.to].map(i => <rect key={i} x={xy(i)[0]} y={xy(i)[1]} width={S} height={S} fill="rgba(255,213,79,.45)" />)}
      {selected !== null && <rect x={xy(selected)[0]} y={xy(selected)[1]} width={S} height={S} fill="rgba(80,160,220,.5)" />}
      {checkAt >= 0 && <circle className="check-ring" cx={ctr(checkAt)[0]} cy={ctr(checkAt)[1]} r="27" fill="rgba(255,59,46,.55)" />}
      {board.map((p, i) => {
        if (!p) return null;
        const [x, y] = ctr(i), moved = lastMove?.to === i;
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <g className={moved ? 'slide' : selected === i ? 'lift' : undefined}
              style={moved ? ({ '--dx': `${fx - x}px`, '--dy': `${fy - y}px` } as CSSProperties) : undefined}>
              <text className={`cpiece ${sideOf(p) === 'white' ? 'w' : 'b'}`}>{GLYPH[p.toUpperCase()]}{'\uFE0E'}</text>
            </g>
          </g>
        );
      })}
      {rippleAt !== null && <circle key={rippleKey} className="ripple" cx={ctr(rippleAt)[0]} cy={ctr(rippleAt)[1]} r="24" fill="none" stroke="#d4a64a" strokeWidth="4" />}
      {targets.map(i => (board[i]
        ? <circle key={i} cx={ctr(i)[0]} cy={ctr(i)[1]} r="27" fill="none" stroke="#2f6f8f" strokeWidth="5" opacity=".85" pointerEvents="none" />
        : <circle key={i} cx={ctr(i)[0]} cy={ctr(i)[1]} r="9" fill="#2f6f8f" opacity=".8" pointerEvents="none" />))}
      {Array.from({ length: 64 }, (_, i) => (
        <rect key={i} x={xy(i)[0]} y={xy(i)[1]} width={S} height={S} className={`hit ${interactive && (legal[i] || targets.includes(i)) ? 'can' : ''}`} onClick={() => onCell(i)} />
      ))}
    </svg>
  );
}
export const ChessBoard = memo(ChessBoardBase);
