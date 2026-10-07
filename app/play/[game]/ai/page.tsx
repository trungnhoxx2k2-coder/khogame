import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/ui';
import { GAME_META } from '@/lib/games/meta';
import { isGameId } from '@/lib/games/registry';

const LEVELS = [
  { id: 'easy', icon: '🟢', name: 'DỄ', desc: 'Ưu tiên ăn quân, hầu như không nhìn trước. Hợp để làm quen.' },
  { id: 'medium', icon: '🟡', name: 'TRUNG BÌNH', desc: 'Tính trước 3 nước, biết phòng thủ và tìm nước chiếu.' },
  { id: 'hard', icon: '🔴', name: 'KHÓ', desc: 'Minimax + alpha-beta, tính sâu tới 5 nước.' },
];

export default function ChooseDifficulty({ params }: { params: { game: string } }) {
  if (!isGameId(params.game) || !GAME_META[params.game].ai) notFound();
  return (
    <Shell back={{ href: `/play/${params.game}`, label: GAME_META[params.game].name }}>
      <section className="mx-auto max-w-2xl px-5 py-14">
        <h1 className="mb-6 text-3xl font-extrabold">Chọn độ khó</h1>
        <div className="grid gap-4">
          {LEVELS.map(l => (
            <Link key={l.id} href={`/game/ai/${params.game}/${l.id}`} className="card flex items-center gap-4 transition hover:border-gold">
              <span className="text-3xl" aria-hidden>{l.icon}</span>
              <div><p className="text-xl font-bold">{l.name}</p><p className="text-paper/70">{l.desc}</p></div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
