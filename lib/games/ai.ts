import type { Difficulty, GameState, Move } from './types';
import { findBestMove } from './xiangqi/ai';
import { findChessMove } from './chess/ai';

/** AI của từng game; mỗi game tự có hàm đánh giá + tìm kiếm riêng. */
export const findMove = (s: GameState, level: Difficulty): Move | null =>
  s.game === 'ludo' ? null : s.game === 'chess' ? findChessMove(s, level) : findBestMove(s.board, s.currentTurn, level);
