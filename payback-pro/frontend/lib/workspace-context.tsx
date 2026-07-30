"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "Owner" | "Admin" | "Manager" | "Staff";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  members: TeamMember[];
  activity: string[];
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeWorkspace: Workspace;
  activeRole: Role;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string) => void;
  inviteMember: (email: string, role: Role) => void;
  removeMember: (memberId: string) => void;
  logActivity: (msg: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const DEFAULT_WORKSPACE: Workspace = {
  id: "ws_default",
  name: "Personal Workspace",
  members: [{ id: "u_me", name: "Me (Owner)", email: "me@payback.com", role: "Owner", joinedAt: new Date().toISOString() }],
  activity: ["Workspace created."]
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("ws_default");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("payback_workspaces");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setWorkspaces(parsed);
          const savedActive = localStorage.getItem("payback_active_ws");
          if (savedActive && parsed.find((w: any) => w.id === savedActive)) {
            setActiveWorkspaceId(savedActive);
          } else {
            setActiveWorkspaceId(parsed[0].id);
          }
        } else {
          setWorkspaces([DEFAULT_WORKSPACE]);
        }
      } catch (e) {
        setWorkspaces([DEFAULT_WORKSPACE]);
      }
    } else {
      setWorkspaces([DEFAULT_WORKSPACE]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("payback_workspaces", JSON.stringify(workspaces));
      localStorage.setItem("payback_active_ws", activeWorkspaceId);
    }
  }, [workspaces, activeWorkspaceId, isLoaded]);

  if (!isLoaded) return null;

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const activeRole: Role = activeWorkspaceId === "ws_default" ? "Owner" : (activeWorkspace.members.find(m => m.id === "u_me")?.role || "Owner");

  const setActiveWorkspace = (id: string) => setActiveWorkspaceId(id);

  const createWorkspace = (name: string) => {
    const newWs: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      members: [{ id: "u_me", name: "Me (Owner)", email: "me@payback.com", role: "Owner", joinedAt: new Date().toISOString() }],
      activity: [`Workspace '${name}' created.`]
    };
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
  };

  const inviteMember = (email: string, role: Role) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      const newMember: TeamMember = {
        id: `u_${Date.now()}`,
        name: email.split("@")[0],
        email,
        role,
        joinedAt: new Date().toISOString()
      };
      return { 
        ...ws, 
        members: [...ws.members, newMember],
        activity: [`Invited ${email} as ${role}.`, ...ws.activity]
      };
    }));
  };

  const removeMember = (memberId: string) => {
    if (memberId === "u_me") return; // cannot remove self
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      const member = ws.members.find(m => m.id === memberId);
      return { 
        ...ws, 
        members: ws.members.filter(m => m.id !== memberId),
        activity: [`Removed ${member?.email} from workspace.`, ...ws.activity]
      };
    }));
  };

  const logActivity = (msg: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== activeWorkspaceId) return ws;
      return { ...ws, activity: [msg, ...ws.activity] };
    }));
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      activeRole,
      setActiveWorkspace,
      createWorkspace,
      inviteMember,
      removeMember,
      logActivity
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return context;
}
