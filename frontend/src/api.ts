export type SavedAnswer = { questionId: number; transcript: string; audioMime: string; audioBytes: number; duration: number; updatedAt: string };
export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.message === 'string' ? body.message : 'İşlem tamamlanamadı. Backend bağlantısını kontrol edin.', response.status);
  }
  return response.json();
}
