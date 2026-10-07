// Kiểu dùng chung cho MỌI game trong kho. Thêm game mới = viết một GameEngine rồi đăng ký ở registry.ts.
export type GameId = 'xiangqi' | 'chess' | 'ludo';
export type Side = 'red' | 'black' | 'white' | 'blue' | 'yellow' | 'green';
export type Reason = 'checkmate' | 'stalemate' | 'resign' | 'timeout' | 'disconnect' | 'insufficient' | 'fifty-move' | 'repetition' | 'all-home';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Board = (string | null)[];
// Cờ bàn: from/to là ô. Cờ cá ngựa: from = số thứ tự quân (0-3), to = vị trí mới; act:'roll' = gieo xúc xắc.
export type Move = { from: number; to: number; promo?: string; act?: 'roll' };
export type HistoryEntry = { side: Side; text: string; capture: boolean };
export type LegalMap = Record<number, number[]>;
export type MoveResult = { ok: true; state: GameState } | { ok: false; error: string };

export type GameState = {
  game: GameId;
  board: Board;                 // game không dùng ô lưới (cá ngựa) để mảng rỗng
  currentTurn: Side;
  check: boolean;
  status: 'playing' | 'finished';
  winner?: Side;                // không có winner + finished = hòa
  reason?: Reason;
  lastMove?: Move;
  history: HistoryEntry[];
  out?: Side[];                 // game nhiều người: các bên đã rời ván
  castle?: string; ep?: number; half?: number; seen?: Record<string, number>;   // riêng cờ vua
  seats?: Side[]; pieces?: number[][]; dice?: number | null; sixes?: number;    // riêng cờ cá ngựa
};

export interface GameEngine {
  id: GameId;
  sides: Side[];                             // sides[0] đi trước; với game 2 người đúng 2 phần tử
  minPlayers: number;
  maxPlayers: number;
  initialState(seats?: Side[]): GameState;   // seats: các bên thực sự có người chơi (game nhiều người)
  applyMove(s: GameState, m: Move): MoveResult;  // kiểm tra luật đầy đủ, server dùng hàm này
  finishGame(s: GameState, winner: Side | undefined, reason: Reason): GameState;
  legalMoves(s: GameState): LegalMap;        // nước đi hợp lệ của bên đang tới lượt
  checkSquare(s: GameState): number;         // ô tướng/vua đang bị chiếu, -1 nếu không
  isPromotion?(s: GameState, from: number, to: number): boolean;
  seatsFor?(n: number): Side[];              // game nhiều người: chia chỗ ngồi theo số người (vd 2 người ngồi đối diện)
  forfeit?(s: GameState, side: Side, reason: Reason): GameState; // một người bỏ cuộc mà ván vẫn tiếp tục
}
