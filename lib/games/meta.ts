import type { GameId, Side } from './types';

export type SideInfo = { label: string; glyph: string; dot: string };
type Meta = { name: string; icon: string; tagline: string; gradient: string; ai: boolean; tags: string[]; sides: Record<string, SideInfo> };

// Thông tin hiển thị của từng game (tên, biểu tượng, màu thẻ, nhãn các bên). Game mới: thêm một mục ở đây.
export const GAME_META: Record<GameId, Meta> = {
  xiangqi: {
    name: 'Cờ Tướng', icon: '象棋', tagline: 'Chiến thuật kinh điển với sông, cung và pháo. Đấu trí từng nước đi.', gradient: 'from-coral to-amber',
    ai: true, tags: ['Đấu với người', 'Đấu với máy'],
    sides: { red: { label: 'Đỏ', glyph: '帥', dot: '🔴' }, black: { label: 'Đen', glyph: '將', dot: '⚫' } },
  },
  chess: {
    name: 'Cờ Vua', icon: '♞', tagline: 'Đủ luật quốc tế: nhập thành, bắt tốt qua đường, phong cấp.', gradient: 'from-violet to-sky',
    ai: true, tags: ['Đấu với người', 'Đấu với máy'],
    sides: { white: { label: 'Trắng', glyph: '♔', dot: '⚪' }, black: { label: 'Đen', glyph: '♚', dot: '⚫' } },
  },
  ludo: {
    name: 'Cờ Cá Ngựa', icon: '🎲', tagline: 'Gieo xúc xắc, đá ngựa bạn bè và đua về đích. Vui nhất khi chơi đông.', gradient: 'from-mint to-amber',
    ai: false, tags: ['2-4 người', 'Gieo xúc xắc'],
    sides: {
      red: { label: 'Đỏ', glyph: '🐴', dot: '🔴' }, blue: { label: 'Xanh dương', glyph: '🐴', dot: '🔵' },
      yellow: { label: 'Vàng', glyph: '🐴', dot: '🟡' }, green: { label: 'Xanh lá', glyph: '🐴', dot: '🟢' },
    },
  },
};
export const sideInfo = (g: GameId, s: Side): SideInfo => GAME_META[g].sides[s];
