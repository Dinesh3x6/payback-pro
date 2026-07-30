"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HandCoins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface FormValues {
  email: string;
  password: string;
}

export default function SignInPage() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold justify-center mb-8">
          <HandCoins size={22} /> PayBack Reminder
        </Link>
        <div className="stub-card p-6 pt-8">
          <h1 className="text-xl font-display font-semibold text-center">Welcome back</h1>
          <p className="text-sm text-ink-muted text-center mt-1">Sign in to your ledger</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-xs text-rust mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label-text">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && <p className="text-xs text-rust mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-ink-muted mt-5">
          Don't have an account?{" "}
          <Link href="/sign-up" className="font-medium text-ink dark:text-paper underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
