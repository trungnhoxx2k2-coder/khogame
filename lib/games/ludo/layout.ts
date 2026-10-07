// Bố cục bàn cờ cá ngựa trên lưới 15x15 (tọa độ cột, hàng). Dùng cho giao diện và kiểm thử.
import type { Side } from '../types';
import { absCell, FINISH } from './engine';

export type XY = [number, number];
const seg = ([x0, y0]: XY, [x1, y1]: XY): XY[] => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  return Array.from({ length: n + 1 }, (_, i) => [x0 + Math.sign(x1 - x0) * i, y0 + Math.sign(y1 - y0) * i] as XY);
};
/** Vòng 52 ô theo chiều kim đồng hồ, ô 0 là ô xuất phát của Đỏ. (Ở 4 góc trong, đường đi chéo sang ô kế tiếp.) */
export const RING: XY[] = [
  ...seg([1, 6], [5, 6]), ...seg([6, 5], [6, 0]), ...seg([7, 0], [8, 0]), ...seg([8, 1], [8, 5]),
  ...seg([9, 6], [14, 6]), ...seg([14, 7], [14, 8]), ...seg([13, 8], [9, 8]), ...seg([8, 9], [8, 14]),
  ...seg([7, 14], [6, 14]), ...seg([6, 13], [6, 9]), ...seg([5, 8], [0, 8]), ...seg([0, 7], [0, 6]),
];
export const START_CELL: Record<number, string> = { 0: 'red', 13: 'blue', 26: 'yellow', 39: 'green' };
/** Đường về đích (5 ô, progress 51..55) của từng màu. */
export const HOME: Record<string, XY[]> = {
  red: seg([1, 7], [5, 7]), blue: seg([7, 1], [7, 5]), yellow: seg([13, 7], [9, 7]), green: seg([7, 13], [7, 9]),
};
export const BASE_ORIGIN: Record<string, XY> = { red: [0, 0], blue: [9, 0], yellow: [9, 9], green: [0, 9] };
export const BASE_SLOTS: XY[] = [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]];
const FINISH_SPOT: Record<string, XY> = { red: [6.7, 7.5], blue: [7.5, 6.7], yellow: [8.3, 7.5], green: [7.5, 8.3] };
export const COLOR: Record<string, string> = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e' };
export const LIGHT: Record<string, string> = { red: '#fecaca', blue: '#bfdbfe', yellow: '#fef08a', green: '#bbf7d0' };

/** Tọa độ liên tục (đơn vị ô) để vẽ một ngựa. */
export function pieceXY(side: Side, idx: number, progress: number): XY {
  if (progress === -1) { const [bx, by] = BASE_ORIGIN[side], [sx, sy] = BASE_SLOTS[idx]; return [bx + sx, by + sy]; }
  if (progress === FINISH) return FINISH_SPOT[side];
  if (progress <= 50) { const [x, y] = RING[absCell(side, progress)]; return [x + 0.5, y + 0.5]; }
  const [x, y] = HOME[side][progress - 51];
  return [x + 0.5, y + 0.5];
}
