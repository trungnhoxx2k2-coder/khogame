import type { GameId, GameState, Side } from './games/types';

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';

/** Ảnh chụp phòng gửi cho từng người chơi (server là nguồn dữ liệu duy nhất). */
export type RoomSnapshot = {
  code: string;
  game: GameId;
  status: RoomStatus;
  players: { name: string; side: Side; connected: boolean }[];
  you: Side;
  host: boolean;                          // bạn là chủ phòng
  minPlayers: number;
  maxPlayers: number;
  state: GameState;
  timeMinutes: number;                    // 0 = không giới hạn
  clocks: Record<string, number> | null;  // ms còn lại tại thời điểm gửi, khóa là tên bên
  startsIn: number | null;                // ms còn lại của đếm ngược 3-2-1
  rematch: { you: boolean; opponent: boolean };
};
