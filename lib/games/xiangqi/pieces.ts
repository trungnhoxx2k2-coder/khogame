export const GLYPH: Record<string, string> = {
  K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵',
  k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒',
};
const FILES = 'abcdefghi';
const square = (i: number) => `${FILES[i % 9]}${10 - Math.floor(i / 9)}`;
/** Ký hiệu đơn giản: quân + ô đi – ô đến (× nếu ăn quân). */
export const describeMove = (piece: string, from: number, to: number, captured: string | null) =>
  `${GLYPH[piece]} ${square(from)}${captured ? '×' : '–'}${square(to)}`;
