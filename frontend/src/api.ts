export type SavedAnswer = { questionId: number; transcript: string; audioMime: string; audioBytes: number; duration: number; updatedAt: string };
export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.message === 'string' ? body.message : 'İşlem tamamlanamadı. Backend bağlantısını kontrol edin.');
  }
  return response.json();
}
