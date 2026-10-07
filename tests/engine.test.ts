import assert from 'node:assert/strict';
import { Board, GameState, Side, applyMove, initialState, isInCheck, legalMoves } from '../lib/games/xiangqi/engine';
import { findBestMove } from '../lib/games/xiangqi/ai';

const at = (r: number, c: number) => r * 9 + c;
const empty = (): Board => Array(90).fill(null);
const put = (b: Board, p: string, r: number, c: number) => { b[at(r, c)] = p; return b; };
const base = () => put(put(empty(), 'K', 9, 3), 'k', 0, 5); // hai tướng không đối mặt
const st = (board: Board, turn: Side): GameState => ({ game: 'xiangqi', board, currentTurn: turn, check: false, status: 'playing', history: [] });
const movesOf = (b: Board, s: Side, r: number, c: number) => legalMoves(b, s)[at(r, c)] ?? [];
let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log('  ✓', name); };

test('thế khai cuộc: Đỏ có đúng 44 nước đi', () => {
  assert.equal(Object.values(legalMoves(initialState().board, 'red')).flat().length, 44);
});
test('mã bị cản chân', () => {
  const free = movesOf(put(base(), 'H', 9, 1), 'red', 9, 1);
  assert.ok(free.includes(at(7, 0)) && free.includes(at(7, 2)));
  const blocked = movesOf(put(put(base(), 'H', 9, 1), 'P', 8, 1), 'red', 9, 1);
  assert.ok(!blocked.includes(at(7, 0)) && !blocked.includes(at(7, 2)));
});
test('tượng bị cản mắt và không được qua sông', () => {
  const free = movesOf(put(base(), 'E', 9, 2), 'red', 9, 2);
  assert.ok(free.includes(at(7, 0)) && free.includes(at(7, 4)));
  assert.ok(!movesOf(put(put(base(), 'E', 9, 2), 'P', 8, 3), 'red', 9, 2).includes(at(7, 4)));
  const river = movesOf(put(base(), 'E', 5, 2), 'red', 5, 2);
  assert.ok(river.length === 2 && river.every(i => Math.floor(i / 9) >= 5));
});
test('pháo ăn quân phải qua đúng một ngòi', () => {
  const b = put(put(put(base(), 'C', 7, 1), 'p', 4, 1), 'h', 2, 1);
  const m = movesOf(b, 'red', 7, 1);
  assert.ok(m.includes(at(2, 1)), 'ăn qua ngòi');
  assert.ok(!m.includes(at(4, 1)), 'không ăn quân sát mặt khi chưa có ngòi');
  assert.ok(!movesOf(put(b, 'p', 3, 1), 'red', 7, 1).includes(at(2, 1)), 'hai ngòi thì không ăn được');
});
test('tốt: chưa qua sông đi thẳng, qua sông được đi ngang', () => {
  assert.deepEqual(movesOf(put(base(), 'P', 6, 0), 'red', 6, 0), [at(5, 0)]);
  assert.deepEqual(movesOf(put(base(), 'P', 4, 4), 'red', 4, 4).sort(), [at(3, 4), at(4, 3), at(4, 5)].sort());
});
test('hai tướng không được đối mặt nhau', () => {
  const b = put(put(put(empty(), 'K', 9, 4), 'k', 0, 4), 'R', 5, 4); // xe đỏ là quân cản duy nhất
  const m = movesOf(b, 'red', 5, 4);
  assert.ok(m.includes(at(4, 4)) && !m.includes(at(5, 0)));
});
test('tướng không được đi nước làm mình bị chiếu', () => {
  const b = put(put(base(), 'r', 5, 2), 'K', 9, 3); // xe đen khống chế cột 2
  assert.ok(!movesOf(b, 'red', 9, 3).includes(at(9, 2)));
});
test('chiếu bí kết thúc ván', () => {
  const b = put(put(put(put(empty(), 'k', 0, 4), 'K', 9, 3), 'R', 1, 0), 'R', 6, 8);
  const r = applyMove(st(b, 'red'), { from: at(6, 8), to: at(0, 8) });
  assert.ok(r.ok && r.state.status === 'finished' && r.state.winner === 'red' && r.state.reason === 'checkmate');
  assert.ok(r.ok && isInCheck(r.state.board, 'black'));
});
test('server từ chối nước đi sai (quân đối phương / sai luật / sai lượt)', () => {
  const s = initialState();
  assert.ok(!applyMove(s, { from: at(3, 0), to: at(4, 0) }).ok);
  assert.ok(!applyMove(s, { from: at(9, 0), to: at(5, 0) }).ok);
  assert.ok(applyMove(s, { from: at(6, 0), to: at(5, 0) }).ok);
});
test('AI: mọi mức đều đi nước hợp lệ; trung bình/khó tìm được nước chiếu bí', () => {
  const s0 = initialState();
  for (const lv of ['easy', 'medium', 'hard'] as const) {
    const m = findBestMove(s0.board, 'red', lv);
    assert.ok(m && applyMove(s0, m).ok, `mức ${lv}`);
  }
  const mate = st(put(put(put(put(empty(), 'k', 0, 4), 'K', 9, 3), 'R', 1, 0), 'R', 6, 8), 'red');
  for (const lv of ['medium', 'hard'] as const) {
    const m = findBestMove(mate.board, 'red', lv);
    const r = m && applyMove(mate, m);
    assert.ok(r && r.ok && r.state.winner === 'red', `mức ${lv} phải chiếu bí`);
  }
});
console.log(`\n${n} nhóm test đạt.`);
