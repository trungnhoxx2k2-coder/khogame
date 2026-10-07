'use client';
import { useEffect, useState } from 'react';
import type { RoomSnapshot } from '@/lib/protocol';
import { Shell } from '@/components/ui';
import { GAME_META, sideInfo } from '@/lib/games/meta';

function copy(text: string): boolean {
  try {
    if (navigator.clipboard) { void navigator.clipboard.writeText(text); return true; }
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok; // dự phòng khi chạy qua HTTP (IP mạng LAN)
  } catch { return false; }
}

type Props = { snap: RoomSnapshot; receivedAt: number; onCancel: () => void; onLeave: () => void; onStart: () => void };

export function RoomWaiting({ snap, receivedAt, onCancel, onLeave, onStart }: Props) {
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const counting = snap.startsIn !== null;
  const left = snap.startsIn === null ? 0 : Math.max(0, snap.startsIn - (now - receivedAt));
  const n = snap.players.length;

  return (
    <Shell>
      <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="card text-center">
          <p className="mb-1 font-bold text-gold">{GAME_META[snap.game].name}</p>
          {!counting ? (
            <>
              <p className="text-sm text-paper/70">Phòng đã được tạo. Chia sẻ mã phòng cho bạn bè.</p>
              <p className="my-4 select-all rounded-xl bg-navy-900 py-4 font-mono text-5xl font-extrabold tracking-[0.25em] text-gold">{snap.code}</p>
              <div className="flex justify-center gap-3">
                <button className="btn-gold" onClick={() => { setCopied(copy(snap.code)); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Đã sao chép ✓' : 'Copy mã phòng'}</button>
                {snap.host ? <button className="btn-ghost" onClick={onCancel}>Hủy phòng</button> : <button className="btn-ghost" onClick={onLeave}>Rời phòng</button>}
              </div>
              <ul className="mt-5 space-y-2 text-left">
                {snap.players.map((p, i) => <li key={i} className="rounded-xl bg-navy-900/60 px-4 py-2">{i + 1}. {p.name}{i === 0 ? ' (chủ phòng)' : ''}{!p.connected && ' · mất kết nối'}</li>)}
              </ul>
              <p className="mt-3 text-sm text-paper/70">{n}/{snap.maxPlayers} người chơi</p>
              {snap.minPlayers < snap.maxPlayers && snap.host && (
                <button className="btn-gold mt-4 w-full" disabled={n < snap.minPlayers} onClick={onStart}>{n < snap.minPlayers ? `Cần ít nhất ${snap.minPlayers} người` : `Bắt đầu với ${n} người`}</button>
              )}
              {snap.minPlayers < snap.maxPlayers && !snap.host && n >= snap.minPlayers && <p className="mt-4 animate-pulse text-paper/70">Đang chờ chủ phòng bắt đầu...</p>}
              {n < snap.minPlayers && <p className="mt-4 animate-pulse text-paper/70">Đang chờ người chơi tham gia...</p>}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3">
                {snap.players.map((p, i) => (
                  <div key={i} className="min-w-[5rem]"><p>{sideInfo(snap.game, p.side).dot} {sideInfo(snap.game, p.side).label}</p><p className="max-w-[8rem] truncate font-bold">{p.name}</p></div>
                ))}
              </div>
              <p key={Math.ceil(left / 1000)} className="pop mt-6 text-6xl font-extrabold text-gold">{left > 0 ? Math.ceil(left / 1000) : 'BẮT ĐẦU'}</p>
            </>
          )}
        </div>
      </section>
    </Shell>
  );
}
