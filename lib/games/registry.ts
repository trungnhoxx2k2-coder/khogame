import type { GameEngine, GameId, Side } from './types';
import { xiangqi } from './xiangqi/engine';
import { chess } from './chess/engine';
import { ludo } from './ludo/engine';

export const ENGINES: Record<GameId, GameEngine> = { xiangqi, chess, ludo };
export const isGameId = (v: unknown): v is GameId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ENGINES, v);
export const opponentOf = (e: GameEngine, s: Side): Side => (e.sides[0] === s ? e.sides[1] : e.sides[0]);
