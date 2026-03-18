/**
 * api.ts — central fetch wrapper used by every screen.
 * Mirrors the tester's api() function exactly.
 */
import { API_BASE_URL } from "./config";

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiFetch<T = any>(
  method: string,
  path: string,
  token: string | null,
  body?: object | FormData,
  isForm?: boolean,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body
        ? isForm
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    });
    let data: T;
    try {
      data = await res.json();
    } catch {
      data = null as any;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: { detail: e.message } as any };
  }
}

/** Full URL for a backend-proxied image (relative path → absolute). */
export function imgUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith("http")) return relativePath;
  // API_BASE_URL ends with /api/v1 — strip that for the media proxy
  return `${API_BASE_URL.replace("/api/v1", "")}${relativePath}`;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
