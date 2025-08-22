import { getIdToken } from "./firebase";
const BASE = import.meta.env.VITE_API_BASE;

export async function api(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  const headers: Record<string,string> = { "content-type": "application/json", ...(init.headers as any) };
  if (token) headers.authorization = `Bearer ${token}`;
  
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  
  // Check if response is JSON
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    // If we got HTML, it's likely a CORS error or wrong URL
    if (contentType?.includes("text/html")) {
      throw new Error(`Broker returned non-JSON response (HTML). Check VITE_API_BASE (${BASE}) or CORS configuration.`);
    }
    throw new Error(`Broker returned non-JSON response (${contentType}). Check VITE_API_BASE or CORS.`);
  }
  
  const body = await res.json().catch(() => {
    throw new Error("Failed to parse JSON response from broker");
  });
  
  if (!res.ok) {
    throw new Error(body?.message || body?.detail || res.statusText || `HTTP ${res.status}`);
  }
  
  return body;
}