"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";
import { useSession } from "@/components/session";
import { ErrorBox, FormField } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useSession();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const created = params.get("created") === "1";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const session = await api.post<LoginResponse>(
        "/auth/login",
        { identity, password },
        { auth: false },
      );
      login(session);
      router.replace("/account");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="container container-narrow">
      {created ? (
        <div className="card" style={{ borderLeft: "3px solid var(--ok)", padding: "14px 16px", marginBottom: 18 }}>
          <p style={{ color: "var(--ok)", fontSize: 13, margin: 0 }}>
            Account created. Sign in to take the field.
          </p>
        </div>
      ) : null}
      <div className="card glow-blue">
        <p className="eyebrow">
          Welcome back <span className="arrow">▸</span>
        </p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Sign in</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          Use your codName or email.
        </p>

        <form onSubmit={submit} className="stack mt-lg" style={{ gap: "var(--gap-md)" }}>
          <ErrorBox message={err} />
          <FormField label="codName or email">
            <input
              className="input"
              required
              autoComplete="username"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="youroperator"
            />
          </FormField>
          <FormField label="Password">
            <input
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="meta mt-md" style={{ textAlign: "center" }}>
          New to the arena? <Link href="/register">Create a codName</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="section mesh">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}