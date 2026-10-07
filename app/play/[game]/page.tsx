import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/ui';
import { GAME_META } from '@/lib/games/meta';
import { isGameId } from '@/lib/games/registry';

export default function GameMenu({ params }: { params: { game: string } }) {
  if (!isGameId(params.game)) notFound();
  const g = params.game, meta = GAME_META[g];
  const items = [
    { href: `/play/${g}/create`, title: 'Tạo phòng', desc: 'Nhận mã phòng và mời bạn vào.' },
    { href: '/join', title: 'Tham gia phòng', desc: 'Nhập mã phòng bạn bè gửi.' },
    { href: `/play/${g}/ai`, title: 'Chơi với máy', desc: 'Chọn độ khó và vào bàn cờ luôn.' },
  ];
  return (
    <Shell back={{ href: '/', label: 'Kho game' }}>
      <section className="mx-auto max-w-2xl px-5 py-14">
        <p aria-hidden className="font-han text-5xl text-gold">{meta.icon}</p>
        <h1 className="mb-6 mt-2 text-3xl font-extrabold">{meta.name}</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.filter(i => meta.ai || !i.href.endsWith('/ai')).map(i => <Link key={i.href} href={i.href} className="card transition hover:border-gold"><p className="text-xl font-bold">{i.title}</p><p className="mt-1 text-sm text-paper/70">{i.desc}</p></Link>)}
        </div>
      </section>
    </Shell>
  );
}
