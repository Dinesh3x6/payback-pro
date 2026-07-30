export function saveToken(token: string) {
  window.localStorage.setItem("pbp_token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pbp_token");
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("pbp_token");
}

export function parseToken(): any | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export function isAdmin(): boolean {
  const payload = parseToken();
  return !!payload?.isAdmin;
}
