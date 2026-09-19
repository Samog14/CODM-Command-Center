"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { ErrorBox, FormField } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [codName, setCodName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post<Profile>("/auth/register", { codName, email, password }, { auth: false });
      router.push("/login?created=1");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign-up failed");
      setBusy(false);
    }
  }

  return (
    <div className="section mesh">
      <div className="container container-narrow">
        <div className="card glow-blue">
          <p className="eyebrow">
            Take the field <span className="arrow">▸</span>
          </p>
          <h1 style={{ fontSize: "var(--fs-h2)" }}>Create a codName</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            New operators start provisional. Win verified 1v1s to climb into a division.
          </p>

          <form onSubmit={submit} className="stack mt-lg" style={{ gap: "var(--gap-md)" }}>
            <ErrorBox message={err} />
            <FormField label="CODName" hint="3–30 chars · letters, numbers, dash, dot, underscore">
              <input
                className="input"
                required
                autoComplete="username"
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_.\-]+"
                value={codName}
                onChange={(e) => setCodName(e.target.value)}
                placeholder="youroperator"
              />
            </FormField>
            <FormField label="Email">
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Password" hint="At least 8 characters">
              <input
                className="input"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="meta mt-md" style={{ textAlign: "center" }}>
            Already ranked? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}