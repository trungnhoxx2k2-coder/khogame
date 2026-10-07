'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameView } from '@/components/GameView';
import { RoomWaiting } from '@/components/lobby/RoomWaiting';
import { Shell } from '@/components/ui';
import { api } from '@/lib/api';
import { usePlayer } from '@/lib/player';
import { useOnlineGame } from '@/lib/useOnlineGame';

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Shell>
      <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <div className="card space-y-3 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="text-paper/70">{text}</p><Link href="/" className="btn-gold">Về kho game</Link></div>
      </section>
    </Shell>
  );
}

export default function OnlineGame({ params }: { params: { roomCode: string } }) {
  const code = params.roomCode.toUpperCase();
  const router = useRouter();
  const player = usePlayer();
  const g = useOnlineGame(code);
  const s = g.snap;

  if (g.fatal) return <Message title="Không vào được phòng" text={g.fatal} />;
  if (!s) return g.offline
    ? <Message title="Không kết nối được máy chủ" text="Máy chủ trò chơi có thể đang khởi động (đợi khoảng 1 phút, trang sẽ tự thử lại) hoặc chưa chạy." />
    : <Message title="Đang kết nối..." text="Đang vào phòng, vui lòng đợi." />;
  if (s.status === 'CANCELLED') return <Message title="Phòng đã bị hủy" text="Người tạo phòng đã hủy phòng này." />;

  const leave = () => { g.leave(); router.push('/'); };
  if (s.status === 'WAITING') {
    return <RoomWaiting snap={s} receivedAt={g.receivedAt} onStart={g.start} onLeave={leave} onCancel={() => { void api(`/api/rooms/${code}?playerId=${player.id}`, undefined, 'DELETE').catch(() => undefined); router.push('/'); }} />;
  }
  const opp = s.players.find(p => p.side !== s.you);
  const notice = !g.connected ? 'Bạn đã mất kết nối, đang kết nối lại...' : opp && !opp.connected && s.status === 'PLAYING' ? 'Đối thủ đã mất kết nối. Đang chờ kết nối lại (tối đa 60 giây)...' : null;
  return (
    <Shell>
      <GameView state={s.state} you={s.you} players={s.players} clocks={s.clocks} clocksAt={g.receivedAt} notice={notice} error={g.error}
        onMove={g.move} onResign={g.resign} onLeave={leave} onRematch={g.rematch}
        rematchDisabled={s.rematch.you} rematchNote={s.rematch.you ? 'Đang chờ đối thủ đồng ý chơi lại...' : s.rematch.opponent ? 'Đối thủ muốn chơi lại.' : undefined} />
    </Shell>
  );
}
