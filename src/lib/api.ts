import { getIdToken } from "./firebase";
const BASE = import.meta.env.VITE_API_BASE;

export async function api(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  const headers: Record<string,string> = { "content-type": "application/json", ...(init.headers as any) };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || res.statusText || `HTTP ${res.status}`);
  return body;
}