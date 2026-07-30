import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api`,
});

// Attach the JWT (stored in localStorage after login) to every outgoing request.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("pbp_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralize the "unwrap { success, data }" shape used by every backend response.
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get(url, { params });
  return res.data.data as T;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post(url, body);
  return res.data.data as T;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put(url, body);
  return res.data.data as T;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch(url, body);
  return res.data.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete(url);
  return res.data.data as T;
}
