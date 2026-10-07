'use client';
import { notFound, useRouter } from 'next/navigation';
import { GameView } from '@/components/GameView';
import { Shell } from '@/components/ui';
import { GAME_META } from '@/lib/games/meta';
import { ENGINES, isGameId, opponentOf } from '@/lib/games/registry';
import type { Difficulty } from '@/lib/games/types';
import { usePlayer } from '@/lib/player';
import { useAiGame } from '@/lib/useAiGame';

const LABEL: Record<Difficulty, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };

export default function AiGame({ params }: { params: { game: string; difficulty: string } }) {
  if (!isGameId(params.game) || !GAME_META[params.game].ai || !(params.difficulty in LABEL)) notFound();
  const game = params.game, level = params.difficulty as Difficulty;
  const router = useRouter();
  const player = usePlayer();
  const g = useAiGame(game, level);
  return (
    <Shell back={{ href: `/play/${game}/ai`, label: 'Chọn độ khó' }}>
      <GameView state={g.state} you={g.you} thinking={g.thinking} error={g.error}
        players={[{ name: player.name || 'Bạn', side: g.you }, { name: `Máy (${LABEL[level]})`, side: opponentOf(ENGINES[game], g.you) }]}
        onMove={g.play} onResign={g.resign} onLeave={() => router.push(`/play/${game}/ai`)} onRematch={g.newGame} />
    </Shell>
  );
}
