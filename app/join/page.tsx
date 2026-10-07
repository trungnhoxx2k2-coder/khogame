'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorText, Shell } from '@/components/ui';
import { api } from '@/lib/api';
import { resolveName, usePlayer } from '@/lib/player';

export default function JoinRoom() {
  const router = useRouter();
  const player = usePlayer();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (player.ready) setName(player.name); }, [player.ready, player.name]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Mã phòng gồm 6 ký tự.');
    setBusy(true); setError('');
    try {
      const finalName = resolveName(name);
      player.setName(finalName);
      const res = await api<{ code: string }>('/api/rooms/join', { code, name: finalName, playerId: player.id });
      router.push(`/game/${res.code}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.'); setBusy(false); }
  };

  return (
    <Shell back={{ href: '/', label: 'Kho game' }}>
      <section className="mx-auto max-w-md px-5 py-12">
        <form onSubmit={submit} className="card space-y-5">
          <h1 className="text-2xl font-extrabold">Tham gia phòng</h1>
          <label className="block space-y-1 text-sm">Tên người chơi
            <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="Để trống sẽ tự đặt tên" />
          </label>
          <label className="block space-y-1 text-sm">Nhập mã phòng
            <input className="input text-center font-mono text-2xl uppercase tracking-[0.3em]" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} placeholder="A7K92P" autoComplete="off" />
          </label>
          {error && <ErrorText>{error}</ErrorText>}
          <button className="btn-gold w-full" disabled={busy || !player.ready}>{busy ? 'Đang vào phòng...' : 'THAM GIA'}</button>
        </form>
      </section>
    </Shell>
  );
}
