const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api";
const TOKEN_KEY = "pulse_api_token_v1";

export const tokenStore = {
  get: () => window.localStorage.getItem(TOKEN_KEY),
  set: (value: string | null) =>
    value
      ? window.localStorage.setItem(TOKEN_KEY, value)
      : window.localStorage.removeItem(TOKEN_KEY),
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Token ${token}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) tokenStore.set(null);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string; [key: string]: unknown };
      message = data.detail ?? Object.values(data).flat().join(" ") ?? message;
    } catch {
      /* response has no JSON body */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

export function websocketUrl() {
  const base = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "");
  return `${base}/ws/chat/?token=${encodeURIComponent(tokenStore.get() ?? "")}`;
}
