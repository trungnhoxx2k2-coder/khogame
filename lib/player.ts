'use client';
import { useEffect, useState } from 'react';

// id lưu theo tab (sessionStorage): F5 vẫn giữ id để kết nối lại, mở tab mới = người chơi mới (tiện test 2 tab)
// randomUUID chỉ có trên HTTPS/localhost nên cần phương án dự phòng khi chơi qua IP mạng LAN
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
export const resolveName = (n: string) => n.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;

export function usePlayer() {
  const [p, setP] = useState({ id: '', name: '' });
  useEffect(() => {
    let id = sessionStorage.getItem('cotuong:id');
    if (!id) { id = newId(); sessionStorage.setItem('cotuong:id', id); }
    setP({ id, name: localStorage.getItem('cotuong:name') ?? '' });
  }, []);
  const setName = (name: string) => { localStorage.setItem('cotuong:name', name); setP(x => ({ ...x, name })); };
  return { ...p, ready: p.id !== '', setName };
}
