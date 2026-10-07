import type { ComponentType } from 'react';
import type { GameId } from '@/lib/games/types';
import { ChessBoard } from './ChessBoard';
import { LudoBoard } from './LudoBoard';
import { XiangqiBoard } from './XiangqiBoard';
import type { BoardProps } from './types';

export const BOARDS: Record<GameId, ComponentType<BoardProps>> = { xiangqi: XiangqiBoard, chess: ChessBoard, ludo: LudoBoard };
