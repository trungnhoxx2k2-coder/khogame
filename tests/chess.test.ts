import assert from 'node:assert/strict';
import { chess, fromFen, initialState, legalList, makeMove, stateOf, Pos } from '../lib/games/chess/engine';
import { findChessMove } from '../lib/games/chess/ai';
import type { GameState } from '../lib/games/types';

const perft = (p: Pos, d: number): number => (d === 0 ? 1 : legalList(p).reduce((n, m) => n + (d === 1 ? 1 : perft(makeMove(p, m), d - 1)), 0));
const sq = (name: string) => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const play = (s: GameState, ...moves: string[]): GameState => {
  for (const m of moves) {
    const r = chess.applyMove(s, { from: sq(m.slice(0, 2)), to: sq(m.slice(2, 4)), promo: m[4] });
    assert.ok(r.ok, `nước ${m} phải hợp lệ`); s = (r as { ok: true; state: GameState }).state;
  }
  return s;
};
let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log('  ✓', name); };

test('perft: thế khai cuộc (20 / 400 / 8902)', () => {
  const p = fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  assert.deepEqual([1, 2, 3].map(d => perft(p, d)), [20, 400, 8902]);
});
test('perft: Kiwipete (nhập thành, bắt qua đường, phong cấp) 48 / 2039 / 97862', () => {
  const p = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
  assert.deepEqual([1, 2, 3].map(d => perft(p, d)), [48, 2039, 97862]);
});
test('perft: tàn cuộc có bắt tốt qua đường, chiếu lộ (14 / 191 / 2812 / 43238)', () => {
  const p = fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -');
  assert.deepEqual([1, 2, 3, 4].map(d => perft(p, d)), [14, 191, 2812, 43238]);
});
test('perft: phong cấp và nhập thành phức tạp (6 / 264 / 9467, 44 / 1486 / 62379)', () => {
  assert.deepEqual([1, 2, 3].map(d => perft(fromFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -'), d)), [6, 264, 9467]);
  assert.deepEqual([1, 2, 3].map(d => perft(fromFen('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -'), d)), [44, 1486, 62379]);
});
test('ký hiệu SAN, nhập thành, bắt tốt qua đường', () => {
  const s = play(initialState(), 'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'e1g1', 'f6e4', 'd2d4', 'e4d6');
  assert.deepEqual(s.history.map(h => h.text).slice(0, 7), ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O']);
  const ep = play(initialState(), 'e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6');
  assert.equal(ep.history[4].text, 'exd6'); assert.equal(ep.board[sq('d5')], null, 'tốt bị bắt qua đường phải biến mất');
});
test('phong cấp thành quân được chọn (mặc định Hậu)', () => {
  const s = stateOf(fromFen('8/4P1k1/8/8/8/8/8/K7 w - -'));
  assert.equal(play(s, 'e7e8n').board[sq('e8')], 'N');
  assert.equal(play(s, 'e7e8').board[sq('e8')], 'Q');
  assert.ok(chess.isPromotion?.(s, sq('e7'), sq('e8')));
});
test('chiếu bí (mã Fool) và bí nước (hòa)', () => {
  const mate = play(initialState(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
  assert.equal(mate.status, 'finished'); assert.equal(mate.winner, 'black'); assert.equal(mate.reason, 'checkmate');
  assert.equal(mate.history[3].text, 'Qh4#');
  const stale = play(stateOf(fromFen('7k/8/6K1/8/8/8/8/5Q2 w - -')), 'f1f7');
  assert.equal(stale.status, 'finished'); assert.equal(stale.winner, undefined); assert.equal(stale.reason, 'stalemate');
});
test('hòa do lặp lại thế cờ 3 lần', () => {
  const s = play(initialState(), 'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8');
  assert.equal(s.reason, 'repetition'); assert.equal(s.winner, undefined);
});
test('không nhập thành qua ô bị chiếu / khi vua đang bị chiếu', () => {
  const thru = legalList(fromFen('4k3/8/8/8/8/5r2/8/4K2R w K -'));
  assert.ok(!thru.some(m => m.from === sq('e1') && m.to === sq('g1')), 'f1 bị xe chiếu');
  const inChk = legalList(fromFen('4k3/8/8/8/8/8/4r3/4K2R w K -'));
  assert.ok(!inChk.some(m => m.to === sq('g1')));
});
test('server từ chối nước sai lượt/sai luật', () => {
  const s = initialState();
  assert.ok(!chess.applyMove(s, { from: sq('e7'), to: sq('e5') }).ok);
  assert.ok(!chess.applyMove(s, { from: sq('e2'), to: sq('e5') }).ok);
});
test('AI cờ vua: hợp lệ ở mọi mức, trung bình/khó tìm được chiếu bí 1 nước', () => {
  for (const lv of ['easy', 'medium', 'hard'] as const) {
    const m = findChessMove(initialState(), lv);
    assert.ok(m && chess.applyMove(initialState(), m).ok, `mức ${lv}`);
  }
  const mate = stateOf(fromFen('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - -')); // Ra8#
  for (const lv of ['medium', 'hard'] as const) {
    const m = findChessMove(mate, lv), r = m && chess.applyMove(mate, m);
    assert.ok(r && r.ok && r.state.winner === 'white', `mức ${lv} phải chiếu bí`);
  }
});
console.log(`\n${n} nhóm test cờ vua đạt.`);
