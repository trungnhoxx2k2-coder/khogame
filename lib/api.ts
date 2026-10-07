/**
 * Địa chỉ server realtime (Express + Socket.IO).
 * Production (Vercel): BẮT BUỘC đặt NEXT_PUBLIC_SERVER_URL trỏ tới server đã deploy riêng (Render, Railway, Fly.io...).
 * Lưu ý: biến NEXT_PUBLIC_* được nhúng lúc build, đổi giá trị xong phải deploy lại web.
 */
export const serverUrl = (): string => {
  const env = process.env.NEXT_PUBLIC_SERVER_URL;
  if (env) return env.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return `http://${window.location.hostname}:4000`; // chạy thử trong máy / mạng LAN
  throw new Error('Web chưa được cấu hình địa chỉ server: hãy đặt biến NEXT_PUBLIC_SERVER_URL rồi deploy lại.');
};

export async function api<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const base = serverUrl(); // lỗi cấu hình hiện nguyên văn cho người dùng
  let res: Response;
  try {
    res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Không kết nối được máy chủ trò chơi. Máy chủ có thể đang khởi động (đợi khoảng 1 phút rồi thử lại) hoặc chưa chạy.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Có lỗi xảy ra.');
  return data as T;
}
