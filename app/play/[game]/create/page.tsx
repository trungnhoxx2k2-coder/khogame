'use client';
import { FormEvent, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { ErrorText, Shell } from '@/components/ui';
import { api } from '@/lib/api';
import { GAME_META } from '@/lib/games/meta';
import { ENGINES, isGameId } from '@/lib/games/registry';
import { resolveName, usePlayer } from '@/lib/player';

export default function CreateRoom({ params }: { params: { game: string } }) {
  if (!isGameId(params.game)) notFound();
  const game = params.game;
  const multi = ENGINES[game].maxPlayers > 2; // game nhiều người: không dùng đồng hồ
  const router = useRouter();
  const player = usePlayer();
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (player.ready) setName(player.name); }, [player.ready, player.name]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const finalName = resolveName(name);
      player.setName(finalName);
      const { code } = await api<{ code: string }>('/api/rooms', { name: finalName, playerId: player.id, minutes: multi ? 0 : minutes, game });
      router.push(`/game/${code}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.'); setBusy(false); }
  };

  return (
    <Shell back={{ href: `/play/${game}`, label: GAME_META[game].name }}>
      <section className="mx-auto max-w-md px-5 py-12">
        <form onSubmit={submit} className="card space-y-5">
          <h1 className="text-2xl font-extrabold">Tạo phòng {GAME_META[game].name}</h1>
          <label className="block space-y-1 text-sm">Tên người chơi
            <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="Để trống sẽ tự đặt tên" />
          </label>
          {!multi && <fieldset className="space-y-2 text-sm">
            <legend className="mb-1">Thời gian mỗi người</legend>
            <div className="grid grid-cols-3 gap-2">
              {[[5, '5 phút'], [10, '10 phút'], [0, 'Không giới hạn']].map(([m, label]) => (
                <button type="button" key={m} onClick={() => setMinutes(Number(m))} className={Number(m) === minutes ? 'btn-gold px-2' : 'btn-ghost px-2'}>{label}</button>
              ))}
            </div>
          </fieldset>}
          {error && <ErrorText>{error}</ErrorText>}
          <button className="btn-gold w-full" disabled={busy || !player.ready}>{busy ? 'Đang tạo...' : 'Tạo phòng'}</button>
        </form>
      </section>
    </Shell>
  );
}
