"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { useWorkspace, Role } from "@/lib/workspace-context";
import { Plus, Users, Shield, Clock, Trash2, Mail, Activity } from "lucide-react";
import toast from "react-hot-toast";

export default function TeamSettingsPage() {
  const { activeWorkspace, activeRole, createWorkspace, inviteMember, removeMember } = useWorkspace();
  
  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Staff");

  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName);
    setNewWsName("");
    toast.success("New Workspace Created");
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole !== "Owner" && activeRole !== "Admin") {
      toast.error("You don't have permission to invite members.");
      return;
    }
    if (!inviteEmail) return;
    inviteMember(inviteEmail, inviteRole);
    setInviteEmail("");
    toast.success("Invitation sent");
  };

  const handleRemove = (id: string) => {
    if (activeRole !== "Owner" && activeRole !== "Admin") {
      toast.error("You don't have permission to remove members.");
      return;
    }
    removeMember(id);
    toast.success("Member removed");
  };

  return (
    <div>
      <Navbar title="Team & Workspace" />
      <main className="px-5 py-6 max-w-5xl mx-auto space-y-8">
        
        {/* Workspace Info */}
        <section className="stub-card p-6 border-l-4 border-moss">
          <h2 className="text-xl font-display font-semibold mb-1">{activeWorkspace.name}</h2>
          <p className="text-sm text-ink-muted">You are viewing the current workspace. Your role is: <span className="font-semibold text-moss uppercase">{activeRole}</span></p>
        </section>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Team Members List */}
          <section className="md:col-span-2 stub-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium flex items-center gap-2"><Users size={18} /> Team Members</h3>
              <span className="badge bg-paper-muted dark:bg-ink text-xs">{activeWorkspace.members.length} Users</span>
            </div>
            
            <div className="space-y-4">
              {activeWorkspace.members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 border border-line dark:border-ink-light rounded-card hover:bg-paper-muted/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-moss/20 text-moss flex items-center justify-center font-bold">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.name}</p>
                      <p className="text-xs text-ink-muted">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-paper-muted dark:bg-ink rounded-md">{m.role}</span>
                    {m.id !== "u_me" && (activeRole === "Owner" || activeRole === "Admin") && (
                      <button onClick={() => handleRemove(m.id)} className="text-ink-muted hover:text-rust transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Side Actions (Invite & Create WS) */}
          <div className="space-y-6">
            
            {/* Invite Form */}
            <section className="stub-card p-6">
              <h3 className="font-medium flex items-center gap-2 mb-4"><Mail size={16} /> Invite Member</h3>
              {activeRole === "Owner" || activeRole === "Admin" ? (
                <form onSubmit={handleInvite} className="space-y-3">
                  <div>
                    <label className="label-text">Email Address</label>
                    <input type="email" required className="input-field" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-text">Assign Role</label>
                    <select className="input-field" value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
                      <option value="Admin">Admin (Full Access)</option>
                      <option value="Manager">Manager (Edit Access)</option>
                      <option value="Staff">Staff (View Only)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full text-sm h-9">Send Invite</button>
                </form>
              ) : (
                <div className="p-3 bg-amber-light/20 text-amber text-xs rounded-card border border-amber/20">
                  <Shield size={14} className="inline mr-1" /> Only Owners and Admins can invite new members.
                </div>
              )}
            </section>

            {/* Create Workspace Form */}
            <section className="stub-card p-6">
              <h3 className="font-medium flex items-center gap-2 mb-4"><Plus size={16} /> New Workspace</h3>
              <form onSubmit={handleCreateWs} className="space-y-3">
                <input required type="text" className="input-field" placeholder="e.g. Acme Corp Finances" value={newWsName} onChange={e => setNewWsName(e.target.value)} />
                <button type="submit" className="btn-secondary w-full text-sm h-9 border border-line dark:border-ink-light">Create Workspace</button>
              </form>
            </section>

          </div>
        </div>

        {/* Workspace Activity Log */}
        <section className="stub-card p-6">
          <h3 className="font-medium flex items-center gap-2 mb-4"><Activity size={18} /> Workspace Activity Log</h3>
          <div className="bg-paper-muted dark:bg-ink rounded-card p-4 max-h-60 overflow-y-auto font-mono text-xs space-y-2">
            {activeWorkspace.activity.map((msg, idx) => (
              <div key={idx} className="flex gap-3 text-ink-muted border-b border-line dark:border-ink-light pb-2 last:border-0 last:pb-0">
                <Clock size={12} className="shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
            {activeWorkspace.activity.length === 0 && <p className="text-center py-4">No recent activity.</p>}
          </div>
        </section>

      </main>
    </div>
  );
}
