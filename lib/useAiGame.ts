'use client';
import { useEffect, useState } from 'react';
import { ENGINES, opponentOf } from './games/registry';
import type { Difficulty, GameId, GameState, Move, Side } from './games/types';

/** Đấu với máy: chạy hoàn toàn trên trình duyệt, máy tính nước đi trong Web Worker. */
export function useAiGame(game: GameId, level: Difficulty) {
  const engine = ENGINES[game];
  const [you, setYou] = useState<Side>(engine.sides[0]);
  const [state, setState] = useState<GameState>(() => engine.initialState());
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== 'playing' || state.currentTurn === you) return;
    setThinking(true);
    const worker = new Worker(new URL('./games/worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<Move | null>) => {
      setThinking(false);
      if (!e.data) return setError('Máy không tìm được nước đi.');
      const move = e.data;
      setState(s => { const r = engine.applyMove(s, move); return r.ok ? r.state : s; });
    };
    worker.onerror = () => { setThinking(false); setError('Máy gặp lỗi khi tính nước đi.'); };
    worker.postMessage({ state, level });
    return () => { worker.terminate(); setThinking(false); }; // ván mới/thoát trang thì hủy tính toán
  }, [state, you, level, engine]);

  const play = (m: Move) => setState(s => {
    if (s.currentTurn !== you) return s;
    const r = engine.applyMove(s, m);
    return r.ok ? r.state : s;
  });
  const resign = () => setState(s => (s.status === 'playing' ? engine.finishGame(s, opponentOf(engine, you), 'resign') : s));
  const newGame = () => { setError(null); setYou(opponentOf(engine, you)); setState(engine.initialState()); }; // đổi bên mỗi ván
  return { state, you, thinking, error, play, resign, newGame };
}
