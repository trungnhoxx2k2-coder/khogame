'use client';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, HistoryEntry, Move, Reason, Side } from '@/lib/games/types';
import { ENGINES, opponentOf } from '@/lib/games/registry';
import { GAME_META, sideInfo } from '@/lib/games/meta';
import { BOARDS } from '@/components/games/boards';
import { loadSound, setSound, sfx } from '@/lib/sound';
import { ErrorText, Modal } from '@/components/ui';

type PlayerLite = { name: string; side: Side; connected?: boolean };
type Props = {
  state: GameState; you: Side; players: PlayerLite[];
  clocks?: Record<string, number> | null; clocksAt?: number;
  thinking?: boolean; notice?: string | null; error?: string | null;
  onMove: (m: Move) => void; onResign: () => void; onLeave: () => void;
  onRematch?: () => void; rematchNote?: string; rematchDisabled?: boolean;
};
const REASON: Record<Reason, string> = {
  checkmate: 'chiếu bí', stalemate: 'hết nước đi', resign: 'đầu hàng', timeout: 'hết giờ', disconnect: 'mất kết nối',
  insufficient: 'không đủ quân để chiếu bí', 'fifty-move': 'luật 50 nước', repetition: 'lặp lại thế cờ 3 lần', 'all-home': 'đưa đủ 4 ngựa về đích',
};
const PROMO: Record<string, string> = { q: '♕', r: '♖', b: '♗', n: '♘' };

function Clock({ ms, at, running }: { ms: number | null | undefined; at: number; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  if (ms == null) return <span className="text-paper/60">∞</span>;
  const left = Math.max(0, ms - (running ? Math.max(0, now - at) : 0));
  const sec = Math.ceil(left / 1000);
  return <span className={left < 30_000 ? 'text-red-300' : ''}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</span>;
}

function PlayerBar({ p, game, active, clock }: { p: PlayerLite; game: GameState['game']; active: boolean; clock: ReactNode }) {
  const info = sideInfo(game, p.side);
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-2 ${active ? 'border-gold bg-gold/10' : 'border-gold/20 bg-navy-800/70'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-paper text-base font-black ${p.side === 'red' ? 'border-cinnabar text-cinnabar' : 'border-[#14181f] text-[#14181f]'}`}>{info.glyph}</span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="text-xs text-paper/60">{info.label}{p.connected === false && ' · mất kết nối'}</p>
        </div>
      </div>
      <div className="font-mono text-xl font-bold tabular-nums">{clock}</div>
    </div>
  );
}

function PlayerList({ players, state, you }: { players: PlayerLite[]; state: GameState; you: Side }) {
  return (
    <ul className="space-y-2">
      {players.map(pl => {
        const info = sideInfo(state.game, pl.side), out = state.out?.includes(pl.side);
        const turn = state.status === 'playing' && state.currentTurn === pl.side && !out;
        const home = state.seats && state.pieces ? state.pieces[state.seats.indexOf(pl.side)]?.filter(x => x === 56).length : undefined;
        return (
          <li key={pl.side} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${turn ? 'border-gold bg-gold/10' : 'border-white/10 bg-navy-800/70'} ${out ? 'opacity-50' : ''}`}>
            <span className="flex min-w-0 items-center gap-2"><span aria-hidden>{info.dot}</span><span className="truncate font-semibold">{pl.name}{pl.side === you ? ' (bạn)' : ''}</span></span>
            <span className="shrink-0 text-xs text-paper/70">{out ? 'đã rời' : pl.connected === false ? 'mất kết nối' : home !== undefined ? `${home}/4 về đích` : ''}{turn ? ' · đang đi' : ''}</span>
          </li>
        );
      })}
    </ul>
  );
}

function MoveHistory({ history, han, game, multi }: { history: HistoryEntry[]; han: boolean; game: GameState['game']; multi: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [history.length]);
  const cls = han ? 'font-han' : 'font-mono';
  const rows: number[] = [];
  for (let i = 0; i < history.length; i += 2) rows.push(i);
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg bg-navy-900/60 p-3 text-sm lg:max-h-72">
      {history.length === 0 && <p className="text-paper/50">Chưa có nước đi nào.</p>}
      {multi
        ? history.map((h, i) => <p key={i} className="py-0.5"><span aria-hidden>{sideInfo(game, h.side).dot}</span> {h.text}</p>)
        : rows.map(i => (
          <div key={i} className="grid grid-cols-[2rem_1fr_1fr] gap-2 py-0.5">
            <span className="text-paper/50">{i / 2 + 1}.</span>
            <span className={cls}>{history[i].text}</span>
            <span className={cls}>{history[i + 1]?.text}</span>
          </div>
        ))}
      <div ref={end} />
    </div>
  );
}

export function GameView(p: Props) {
  const { state, you } = p;
  const engine = ENGINES[state.game], Board = BOARDS[state.game];
  const [selected, setSelected] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);
  const [confirm, setConfirm] = useState<'resign' | 'leave' | null>(null);
  const [hideResult, setHideResult] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const myTurn = state.status === 'playing' && state.currentTurn === you;
  const legal = useMemo(() => (myTurn ? engine.legalMoves(state) : {}), [state, myTurn, engine]);
  const targets = selected !== null ? legal[selected] ?? [] : [];
  const oppSide = opponentOf(engine, you);
  const me = p.players.find(x => x.side === you) ?? { name: 'Bạn', side: you };
  const opp = p.players.find(x => x.side !== you) ?? { name: 'Đối thủ', side: oppSide };
  const draw = state.status === 'finished' && !state.winner;
  const won = state.winner === you;
  const multi = engine.maxPlayers > 2;
  const nameOfSide = (s: Side) => p.players.find(x => x.side === s)?.name ?? sideInfo(state.game, s).label;

  useEffect(() => { setSoundOn(loadSound()); }, []);
  const len = state.history.length, prevLen = useRef(len);
  useEffect(() => {
    setSelected(null);
    if (state.status === 'playing') setHideResult(false);
    const over = state.status === 'finished';
    if (len > prevLen.current) {
      if (over) (state.winner === you ? sfx.win : sfx.lose)();
      else if (state.check) sfx.check();
      else if (state.history[len - 1].capture) sfx.capture();
      else sfx.move();
    } else if (len === prevLen.current && over) (state.winner === you ? sfx.win : sfx.lose)(); // đầu hàng, hết giờ
    prevLen.current = len;
  }, [len, state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCell = (i: number) => {
    if (!myTurn) return;
    if (selected !== null && targets.includes(i)) {
      if (engine.isPromotion?.(state, selected, i)) setPromo({ from: selected, to: i });
      else p.onMove({ from: selected, to: i });
      setSelected(null);
    } else setSelected(legal[i] ? i : null);
  };

  const lastCapture = len > 0 && state.history[len - 1].capture ? state.lastMove?.to ?? null : null;
  const running = state.status === 'playing' && !!p.clocks;
  const clock = (s: Side) => <Clock ms={p.clocks?.[s]} at={p.clocksAt ?? 0} running={running && state.currentTurn === s} />;
  const reasonText = state.reason ? REASON[state.reason] : '';

  let status: string;
  if (state.status === 'finished') status = draw ? '🤝 Ván cờ hòa' : won ? '🎉 Bạn đã thắng' : multi && state.winner ? `😢 ${nameOfSide(state.winner)} đã thắng` : '😢 Bạn đã thua';
  else if (myTurn) status = `${sideInfo(state.game, you).dot} Lượt của bạn`;
  else if (multi) status = `${sideInfo(state.game, state.currentTurn).dot} Đang chờ ${nameOfSide(state.currentTurn)}...`;
  else status = p.thinking ? '🤖 Máy đang suy nghĩ...' : `${sideInfo(state.game, oppSide).dot} Đối thủ đang suy nghĩ...`;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 p-3 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-start lg:p-6">
      <div className="space-y-2">
        {!multi && <PlayerBar p={opp} game={state.game} active={state.status === 'playing' && state.currentTurn === opp.side} clock={clock(opp.side)} />}
        <Board state={state} flip={!multi && you === engine.sides[1]} selected={selected} targets={targets} legal={legal} interactive={myTurn}
          checkAt={engine.checkSquare(state)} rippleAt={lastCapture} rippleKey={len} onCell={onCell} you={you} onMove={p.onMove} />
        {!multi && <PlayerBar p={me} game={state.game} active={myTurn} clock={clock(you)} />}
      </div>

      <aside className="card space-y-4">
        <div>
          <p className="text-sm font-semibold text-gold">{GAME_META[state.game].name}</p>
          <p className="text-xl font-bold">{status}</p>
          {state.check && state.status === 'playing' && <p className="mt-1 animate-pulse font-bold text-red-300">⚠️ CHIẾU TƯỚNG!</p>}
          {state.status === 'finished' && reasonText && <p className="text-sm text-paper/70">Kết thúc do {reasonText}.</p>}
        </div>
        {p.notice && <p className="rounded-lg bg-gold/15 px-3 py-2 text-sm text-gold">{p.notice}</p>}
        {p.error && <ErrorText>{p.error}</ErrorText>}
        {multi && <PlayerList players={p.players} state={state} you={you} />}
        <MoveHistory history={state.history} han={state.game === 'xiangqi'} game={state.game} multi={multi} />
        <div className="flex flex-wrap gap-2">
          {state.status === 'playing' && <button className="btn-ghost" onClick={() => setConfirm('resign')}>🏳️ Đầu hàng</button>}
          {state.status === 'finished' && p.onRematch && <button className="btn-gold" disabled={p.rematchDisabled} onClick={p.onRematch}>Chơi lại</button>}
          <button className="btn-ghost" onClick={() => (state.status === 'playing' ? setConfirm('leave') : p.onLeave())}>Rời phòng</button>
          <button className="btn-ghost" aria-label="Bật/tắt âm thanh" onClick={() => { setSound(!soundOn); setSoundOn(!soundOn); }}>{soundOn ? '🔊' : '🔇'}</button>
        </div>
        {p.rematchNote && <p className="text-sm text-paper/70">{p.rematchNote}</p>}
      </aside>

      {promo && (
        <Modal title="Phong cấp thành quân nào?">
          <div className="flex justify-center gap-3">
            {Object.entries(PROMO).map(([k, g]) => (
              <button key={k} className="btn-ghost h-16 w-16 text-4xl" aria-label={`Phong ${k}`} onClick={() => { p.onMove({ ...promo, promo: k }); setPromo(null); }}>{g}</button>
            ))}
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm === 'resign' ? 'Bạn có chắc chắn muốn đầu hàng?' : 'Bạn có chắc chắn muốn rời phòng?'}>
          {confirm === 'leave' && <p className="mb-3 text-sm text-paper/70">Rời phòng khi đang chơi sẽ bị xử thua.</p>}
          <div className="flex justify-center gap-3">
            <button className="btn-ghost" onClick={() => setConfirm(null)}>Hủy</button>
            <button className="btn-red" onClick={() => { const c = confirm; setConfirm(null); if (c === 'resign') p.onResign(); else p.onLeave(); }}>{confirm === 'resign' ? 'Đầu hàng' : 'Rời phòng'}</button>
          </div>
        </Modal>
      )}
      {state.status === 'finished' && !hideResult && !confirm && (
        <Modal title={draw ? '🤝 HÒA CỜ!' : won ? '🎉 BẠN ĐÃ THẮNG!' : multi && state.winner ? `😢 ${nameOfSide(state.winner).toUpperCase()} THẮNG!` : '😢 BẠN ĐÃ THUA!'}>
          <p className="mb-4 text-paper/70">Kết thúc do {reasonText}.</p>
          {p.rematchNote && <p className="mb-3 text-sm text-gold">{p.rematchNote}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {p.onRematch && <button className="btn-gold" disabled={p.rematchDisabled} onClick={p.onRematch}>Chơi lại</button>}
            <button className="btn-ghost" onClick={() => setHideResult(true)}>Xem bàn cờ</button>
            <button className="btn-ghost" onClick={p.onLeave}>Rời phòng</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
