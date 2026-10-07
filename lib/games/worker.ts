// Web Worker: máy tính nước đi ở luồng riêng để không làm đứng giao diện.
import { findMove } from './ai';
import type { Difficulty, GameState } from './types';

self.onmessage = (e: MessageEvent<{ state: GameState; level: Difficulty }>) => {
  self.postMessage(findMove(e.data.state, e.data.level));
};
