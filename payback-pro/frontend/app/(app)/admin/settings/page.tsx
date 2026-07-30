"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { apiGet, apiPut } from "@/lib/api";
import { Save } from "lucide-react";
import { cx } from "@/lib/utils";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet("/admin/settings").then(res => setSettings(res));
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + `/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.localStorage.getItem('pbp_token')}`
        },
        body: JSON.stringify(settings)
      });
      alert("Settings saved successfully.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <div className="p-10 flex justify-center text-ink-muted">Loading Settings...</div>;

  return (
    <div>
      <Navbar title="Global Settings" />
      <main className="max-w-3xl mx-auto px-5 py-6">
        
        <form onSubmit={saveSettings} className="bg-white dark:bg-ink border border-line dark:border-ink-light rounded-xl overflow-hidden p-6 space-y-6">
          
          <div>
            <h3 className="text-lg font-display font-semibold mb-1">Administrator Settings</h3>
            <p className="text-sm text-ink-muted mb-4">Configure the root administrator account email.</p>
            <div>
              <label className="block text-sm font-medium mb-1">Admin Email Address</label>
              <input 
                type="email" 
                required
                className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                value={settings.adminEmail}
                onChange={e => setSettings({...settings, adminEmail: e.target.value})}
              />
            </div>
          </div>

          <hr className="border-line dark:border-ink-light" />

          <div>
            <h3 className="text-lg font-display font-semibold mb-1">SMTP Settings</h3>
            <p className="text-sm text-ink-muted mb-4">Configure the global mail server used to send emails.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Host</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                  value={settings.smtpHost || ""}
                  onChange={e => setSettings({...settings, smtpHost: e.target.value})}
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Port</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                  value={settings.smtpPort || ""}
                  onChange={e => setSettings({...settings, smtpPort: parseInt(e.target.value) || 0})}
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Username</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                  value={settings.smtpUser || ""}
                  onChange={e => setSettings({...settings, smtpUser: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SMTP Password</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                  value={settings.smtpPass || ""}
                  onChange={e => setSettings({...settings, smtpPass: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Sender Email ("From" address)</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 bg-paper-muted dark:bg-ink-light border border-line dark:border-ink-light rounded-lg focus:outline-none focus:border-moss transition"
                  value={settings.smtpFrom || ""}
                  onChange={e => setSettings({...settings, smtpFrom: e.target.value})}
                  placeholder="noreply@paybackpro.com"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className={cx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition",
                saving ? "bg-moss/70 cursor-not-allowed" : "bg-moss hover:bg-moss/90 shadow-lg shadow-moss/20"
              )}
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
