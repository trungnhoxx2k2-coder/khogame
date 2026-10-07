import assert from 'node:assert/strict';
import { FINISH, SAFE, absCell, initialState, ludo, rollWith } from '../lib/games/ludo/engine';
import { HOME, RING, pieceXY } from '../lib/games/ludo/layout';
import type { GameState, MoveResult, Side } from '../lib/games/types';

const ok = (r: MoveResult): GameState => { assert.ok(r.ok, r.ok ? '' : r.error); return (r as { ok: true; state: GameState }).state; };
const withPieces = (seats: Side[], pieces: number[][], dice: number | null = null): GameState => ({ ...initialState(seats), pieces, dice });
let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log('  ✓', name); };

test('bố cục: vòng 52 ô khép kín, không trùng, đúng 4 bước chéo ở góc trong', () => {
  assert.equal(RING.length, 52);
  assert.equal(new Set(RING.map(c => c.join())).size, 52);
  let diagonals = 0;
  RING.forEach((c, i) => {
    const nx = RING[(i + 1) % 52], dx = Math.abs(c[0] - nx[0]), dy = Math.abs(c[1] - nx[1]);
    assert.ok(Math.max(dx, dy) === 1, `ô ${i} → ${(i + 1) % 52} phải liền kề`);
    if (dx === 1 && dy === 1) diagonals++;
  });
  assert.equal(diagonals, 4);
  const ring = new Set(RING.map(c => c.join()));
  for (const cells of Object.values(HOME)) { assert.equal(cells.length, 5); assert.ok(cells.every(c => !ring.has(c.join()))); }
});
test('đường đi của mỗi màu: ô cuối vòng nằm ngay cạnh đường về đích', () => {
  for (const [side, cells] of Object.entries(HOME)) {
    const last = RING[absCell(side as Side, 50)], first = cells[0];
    assert.equal(Math.abs(last[0] - first[0]) + Math.abs(last[1] - first[1]), 1, side);
  }
  assert.deepEqual(pieceXY('red', 0, 0), [RING[0][0] + 0.5, RING[0][1] + 0.5]);
});
test('phải ra 6 mới được ra khỏi chuồng; không đi được thì qua lượt', () => {
  const s = ok(rollWith(initialState(['red', 'yellow']), 5));
  assert.equal(s.currentTurn, 'yellow'); assert.equal(s.dice, null);
  const t = ok(rollWith(initialState(['red', 'yellow']), 6));
  assert.equal(t.currentTurn, 'red'); assert.deepEqual(ludo.legalMoves(t), { 0: [0], 1: [0], 2: [0], 3: [0] });
});
test('ra 6 được gieo thêm sau khi đi, ra số khác thì chuyển lượt', () => {
  let s = ok(rollWith(initialState(['red', 'yellow']), 6));
  s = ok(ludo.applyMove(s, { from: 0, to: 0 }));
  assert.equal(s.currentTurn, 'red'); assert.equal(s.dice, null); assert.equal(s.pieces?.[0][0], 0);
  s = ok(rollWith(s, 3)); s = ok(ludo.applyMove(s, { from: 0, to: 3 }));
  assert.equal(s.currentTurn, 'yellow');
});
test('đá ngựa đối phương về chuồng, nhưng không đá được ở ô an toàn', () => {
  // Đỏ ở progress 3 gieo 4 -> ô 7. Xanh dương offset 13: progress 46 -> ô 7
  let s = ok(rollWith(withPieces(['red', 'blue'], [[3, -1, -1, -1], [46, -1, -1, -1]]), 4));
  s = ok(ludo.applyMove(s, { from: 0, to: 7 }));
  assert.equal(s.pieces?.[1][0], -1); assert.equal(s.history.at(-1)?.capture, true);
  // Ô 8 là ô ngôi sao (an toàn): Xanh ở progress 47 -> ô 8
  assert.ok(SAFE.has(8));
  let t = ok(rollWith(withPieces(['red', 'blue'], [[3, -1, -1, -1], [47, -1, -1, -1]]), 5));
  t = ok(ludo.applyMove(t, { from: 0, to: 8 }));
  assert.equal(t.pieces?.[1][0], 47); assert.equal(t.history.at(-1)?.capture, false);
});
test('phải ra đúng số mới vào đích', () => {
  const s = withPieces(['red', 'yellow'], [[53, -1, -1, -1], [-1, -1, -1, -1]]);
  assert.deepEqual(ludo.legalMoves({ ...s, dice: 3 }), { 0: [FINISH] });
  assert.deepEqual(ludo.legalMoves({ ...s, dice: 4 }), {});
});
test('đưa đủ 4 ngựa về đích là thắng', () => {
  let s = ok(rollWith(withPieces(['red', 'yellow'], [[56, 56, 56, 53], [-1, -1, -1, -1]]), 3));
  s = ok(ludo.applyMove(s, { from: 3, to: 56 }));
  assert.equal(s.status, 'finished'); assert.equal(s.winner, 'red'); assert.equal(s.reason, 'all-home');
});
test('ra 6 ba lần liên tiếp thì mất lượt', () => {
  let s = withPieces(['red', 'blue'], [[10, -1, -1, -1], [-1, -1, -1, -1]]);
  s = ok(rollWith(s, 6)); s = ok(ludo.applyMove(s, { from: 0, to: 16 }));
  s = ok(rollWith(s, 6)); s = ok(ludo.applyMove(s, { from: 0, to: 22 }));
  assert.equal(s.currentTurn, 'red');
  s = ok(rollWith(s, 6));
  assert.equal(s.currentTurn, 'blue'); assert.equal(s.dice, null); assert.equal(s.sixes, 0);
});
test('server chặn: gieo hai lần, đi khi chưa gieo, nước sai', () => {
  const s = initialState(['red', 'yellow']);
  assert.ok(!ludo.applyMove(s, { from: 0, to: 0 }).ok);
  const rolled = ok(rollWith(s, 6));
  assert.ok(!ludo.applyMove(rolled, { act: 'roll', from: 0, to: 0 }).ok);
  assert.ok(!ludo.applyMove(rolled, { from: 0, to: 5 }).ok);
});
test('bỏ cuộc: ván tiếp tục, còn một người thì người đó thắng', () => {
  let s = ludo.initialState(['red', 'blue', 'yellow']);
  s = ludo.forfeit!(s, 'red', 'resign');
  assert.deepEqual(s.out, ['red']); assert.equal(s.currentTurn, 'blue'); assert.equal(s.status, 'playing');
  s = ludo.forfeit!(s, 'blue', 'disconnect');
  assert.equal(s.status, 'finished'); assert.equal(s.winner, 'yellow'); assert.equal(s.reason, 'disconnect');
  assert.deepEqual(ludo.seatsFor!(2), ['red', 'yellow']); assert.equal(ludo.seatsFor!(4).length, 4);
});
test('mô phỏng 300 ván ngẫu nhiên (2/3/4 người): ván nào cũng kết thúc, không vi phạm luật', () => {
  for (let g = 0; g < 300; g++) {
    const seats = ludo.seatsFor!(2 + (g % 3));
    let s = ludo.initialState(seats), steps = 0;
    while (s.status === 'playing') {
      assert.ok(++steps < 60000, 'ván quá dài');
      const legal = ludo.legalMoves(s), froms = Object.keys(legal);
      const r = s.dice == null ? ludo.applyMove(s, { act: 'roll', from: 0, to: 0 }) : ludo.applyMove(s, { from: Number(froms[Math.floor(Math.random() * froms.length)]), to: 0 });
      if (s.dice != null) { const f = Number(froms[Math.floor(Math.random() * froms.length)]); s = ok(ludo.applyMove(s, { from: f, to: legal[f][0] })); } else s = ok(r);
      s.pieces?.forEach(a => a.forEach(p => assert.ok(p >= -1 && p <= FINISH)));
    }
    assert.ok(s.winner && seats.includes(s.winner));
  }
});
console.log(`\n${n} nhóm test cờ cá ngựa đạt.`);
