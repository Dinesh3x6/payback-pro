"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User } from "@/types";

/**
 * Local-auth session hook. Reads the JWT from localStorage, fetches the
 * current user, and exposes login/signup/logout helpers.
 *
 * If you switch AUTH_PROVIDER to "clerk" or "firebase" on the server, swap
 * this hook's internals for the corresponding client SDK (useUser() from
 * @clerk/nextjs, or firebase/auth's onAuthStateChanged) while keeping the
 * same return shape so the rest of the app doesn't need to change.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    const token = window.localStorage.getItem("pbr_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      window.localStorage.removeItem("pbr_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  window.localStorage.setItem("pbr_token", data.token);
  setUser(data.user);
  router.push("/dashboard");
}

  async function signup(name: string, email: string, password: string) {
    const { data } = await api.post("/auth/signup", { name, email, password });
    window.localStorage.setItem("pbr_token", data.token);
    setUser(data.user);
    router.push("/dashboard");
  }

  function logout() {
    window.localStorage.removeItem("pbr_token");
    setUser(null);
    router.push("/sign-in");
  }

  return { user, loading, login, signup, logout, refresh: fetchMe };
}
