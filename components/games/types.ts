import type { GameState, LegalMap, Move, Side } from '@/lib/games/types';

/** Giao diện chung của mọi bàn cờ: thêm game mới chỉ cần viết một component nhận props này. */
export type BoardProps = {
  state: GameState; flip: boolean; selected: number | null; targets: number[]; legal: LegalMap; interactive: boolean;
  you: Side; onMove: (m: Move) => void; checkAt: number; rippleAt: number | null; rippleKey: number; onCell: (i: number) => void;
};
