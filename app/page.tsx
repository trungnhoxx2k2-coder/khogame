import Link from 'next/link';
import { Shell } from '@/components/ui';
import { GAME_META } from '@/lib/games/meta';
import type { GameId } from '@/lib/games/types';

const STEPS = [
  { n: 1, color: 'bg-coral', title: 'Chọn game & tạo phòng', desc: 'Chọn game bạn thích, đặt tên và tạo phòng chỉ trong vài giây.' },
  { n: 2, color: 'bg-amber', title: 'Gửi mã cho bạn bè', desc: 'Mỗi phòng có một mã 6 ký tự. Bạn bè nhập mã là vào được ngay.' },
  { n: 3, color: 'bg-mint', title: 'Vào trận!', desc: 'Đếm ngược 3-2-1 rồi chơi realtime. Muốn luyện tay thì đấu với máy.' },
];
// quân cờ trang trí ở phần đầu trang: vị trí tuyệt đối trong khung cố định nên không làm xô lệch bố cục
const FLOATERS = [
  { g: '帥', cls: 'left-2 top-4 h-24 w-24 from-coral to-cinnabar text-5xl font-han', r: '-8deg', d: '0s' },
  { g: '♞', cls: 'right-4 top-0 h-28 w-28 from-violet to-sky text-6xl', r: '8deg', d: '-1.5s' },
  { g: '炮', cls: 'left-16 bottom-2 h-24 w-24 from-amber to-coral text-5xl font-han', r: '6deg', d: '-3s' },
  { g: '♛', cls: 'right-8 bottom-6 h-24 w-24 from-sky to-mint text-5xl', r: '-6deg', d: '-4.5s' },
];

export default function Hub() {
  const ids = Object.keys(GAME_META) as GameId[];
  return (
    <Shell>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-coral to-amber text-xl text-navy-900">♟&#xFE0E;</span>
          KHO GAME
        </Link>
        <Link href="/join" className="btn-ghost px-4 py-2 text-sm">Nhập mã phòng</Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-14 pt-4 md:grid-cols-[1.15fr_0.85fr] md:pt-10">
        <div>
          <p className="inline-block rounded-full border border-mint/40 bg-mint/10 px-4 py-1 text-sm font-semibold text-mint">● Chơi realtime · Không cần tài khoản</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Rủ bạn vào,<br />
            <span className="bg-gradient-to-r from-coral via-amber to-mint bg-clip-text text-transparent">chơi liền tay!</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-paper/75">Kho game cờ trực tuyến: tạo phòng, gửi mã cho bạn bè và đấu ngay. Hoặc luyện tay cùng máy với ba mức độ khó.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#games" className="btn-gold px-7 py-3.5 text-lg">Chơi ngay</a>
            <Link href="/join" className="btn-ghost px-7 py-3.5 text-lg">Có mã phòng?</Link>
          </div>
          <dl className="mt-9 grid max-w-md grid-cols-3 gap-3 text-center">
            {[[String(ids.length), 'game'], ['3', 'mức độ máy'], ['2', 'người / phòng']].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <dt className="text-2xl font-extrabold text-amber">{v}</dt><dd className="text-xs text-paper/65">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div aria-hidden className="relative mx-auto hidden h-80 w-full max-w-sm sm:block">
          <div className="absolute inset-6 rounded-[2.5rem] border border-white/10 bg-white/5" />
          {FLOATERS.map(f => (
            <span key={f.g} className={`floaty absolute grid place-items-center rounded-full bg-gradient-to-br text-white shadow-2xl ${f.cls}`}
              style={{ '--r': f.r, animationDelay: f.d } as React.CSSProperties}>{f.g}{/[♞♛]/.test(f.g) ? '\uFE0E' : ''}</span>
          ))}
        </div>
      </section>

      <section id="games" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-14">
        <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">Chọn game để chơi</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map(id => {
            const m = GAME_META[id];
            return (
              <Link key={id} href={`/play/${id}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-navy-800 transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber">
                <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${m.gradient}`}>
                  <span aria-hidden className="font-han text-7xl text-white drop-shadow-lg transition duration-300 group-hover:scale-110">{m.icon}</span>
                  <span className="absolute right-3 top-3 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white">Realtime</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-2xl font-extrabold">{m.name}</h3>
                  <p className="text-sm text-paper/70">{m.tagline}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.tags.map(t => <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{t}</span>)}
                  </div>
                  <span className="mt-auto pt-3 font-bold text-amber transition group-hover:translate-x-1">Chơi ngay →</span>
                </div>
              </Link>
            );
          })}
          {ids.length % 3 === 2 && (
          <div className="flex min-h-[22rem] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/15 p-6 text-center text-paper/60">
            <span aria-hidden className="text-4xl">✨</span>
            <p className="font-bold text-paper/80">Game mới sắp có mặt</p>
            <p className="text-sm">Kho game sẽ còn được bổ sung thêm.</p>
          </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">Chơi cùng bạn bè chỉ 3 bước</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map(s => (
            <li key={s.n} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <span className={`grid h-11 w-11 place-items-center rounded-full text-lg font-extrabold text-navy-900 ${s.color}`}>{s.n}</span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-paper/70">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-paper/50">Kho Game · Chơi vui, thắng thua đều là bạn.</footer>
    </Shell>
  );
}
