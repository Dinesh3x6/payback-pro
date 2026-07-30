"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

interface FormValues {
  name: string;
  upiId: string;
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (user) reset({ name: user.name, upiId: user.upiId ?? "" });
  }, [user, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.patch("/auth/me", values);
      await refresh();
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not save settings");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Navbar title="Settings" />
      <main className="px-5 py-6 max-w-lg mx-auto">
        <div className="stub-card p-6 pt-7">
          <span className="label-text">Profile</span>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-4">
            <div>
              <label className="label-text">Full name</label>
              <input className="input-field" {...register("name", { required: true })} />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input className="input-field opacity-60" value={user?.email ?? ""} disabled />
            </div>
            <div>
              <label className="label-text">Your UPI ID</label>
              <input className="input-field" placeholder="yourname@okhdfcbank" {...register("upiId")} />
              <p className="text-xs text-ink-muted mt-1.5">
                Used to generate the UPI QR codes borrowers scan to pay you back.
              </p>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
