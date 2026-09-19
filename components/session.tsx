"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAuthToken } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { AppSkeleton, Footer, TopNav } from "./chrome";

const STORAGE_KEY = "ccp.session";

export interface Session {
  token: string;
  user: Profile;
}

interface SessionValue {
  session: Session | null;
  ready: boolean;
  login: (s: Session) => void;
  logout: () => void;
  refresh: () => Promise<boolean>;
}

const Ctx = createContext<SessionValue | null>(null);

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        if (parsed?.token) {
          setSession(parsed);
          setAuthToken(parsed.token);
        }
      }
    } catch {
      // ignore corrupt sessions
    }
    setReady(true);
  }, []);

  const login = useCallback((s: Session) => {
    setSession(s);
    setAuthToken(s.token);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // storage may be unavailable; keep in-memory session
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setAuthToken(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.token) return false;
    try {
      const user = await api.get<Profile>("/auth/me", { auth: true });
      setSession((prev) => (prev ? { ...prev, user } : prev));
      return true;
    } catch {
      return false;
    }
  }, [session?.token]);

  if (!ready) return <AppSkeleton />;

  return (
    <Ctx.Provider value={{ session, ready, login, logout, refresh }}>
      <TopNav />
      <main id="main">{children}</main>
      <Footer />
    </Ctx.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSession must be used inside <AppShell>");
  return value;
}