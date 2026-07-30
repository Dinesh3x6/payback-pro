"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password });
      saveToken(res.data.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold justify-center mb-8">
          <HandCoins size={22} /> PayBack Pro
        </Link>
        <div className="stub-card p-6 pt-8">
          <h1 className="text-xl font-display font-semibold text-center">Create your ledger</h1>
          <p className="text-sm text-ink-muted text-center mt-1">Free — no card required</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label-text">Full name</label>
              <input
                className="input-field"
                placeholder="Your Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-rust">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-ink-muted mt-5">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink dark:text-paper underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
