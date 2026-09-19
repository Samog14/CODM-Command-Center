"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Match, SearchPlayer } from "@/lib/types";
import { formatCCP } from "@/lib/tiers";
import { useSession } from "@/components/session";
import { Avatar, ErrorBox, FormField, PageHead } from "@/components/ui";

export default function NewMatchPage() {
  const router = useRouter();
  const { session, ready } = useSession();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [pick, setPick] = useState<SearchPlayer | null>(null);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session?.token) {
      router.replace("/login");
      return;
    }
  }, [ready, session?.token, router]);

  useEffect(() => {
    if (!pick) return;
    setQ(pick.codName);
  }, [pick]);

  useEffect(() => {
    const term = q.trim();
    if (pick) {
      setResults([]);
      return;
    }
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await api.get<SearchPlayer[]>(`/players?q=${encodeURIComponent(term)}&limit=8`);
        if (alive) setResults(found);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, pick]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pick) {
      setErr("Pick an opponent from the search results first");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const match = await api.post<Match>("/matches", { opponentCodName: pick.codName });
      router.push(`/matches/${match.id}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Challenge failed");
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <div className="container container-narrow">
        <PageHead
          eyebrow="Challenge"
          title="New match"
          lead="Search an operator and throw down. Both players must confirm the result before a moderator verification round — CCP moves only after that round clears."
        />

        <form onSubmit={submit} className="stack" style={{ gap: "var(--gap-md)" }}>
          <ErrorBox message={err} />
          <FormField
            label="Opponent codName"
            hint="At least 2 characters to search. Provisional players are fair game."
          >
            <input
              className="input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (pick && e.target.value !== pick.codName) setPick(null);
              }}
              placeholder="Search codName…"
              autoComplete="off"
            />
          </FormField>

          {q.trim().length >= 2 && !pick ? (
            <div className="card-2" style={{ padding: 8 }} role="listbox" aria-label="Search results">
              {searching && results.length === 0 ? (
                <p className="meta" style={{ padding: 10 }}>
                  Searching…
                </p>
              ) : results.length === 0 ? (
                <p className="meta" style={{ padding: 10 }}>
                  No operators found for &ldquo;{q}&rdquo;
                </p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="log-row"
                    style={{ width: "100%", paddingBlock: 10, textAlign: "left", border: 0 }}
                    onClick={() => setPick(r)}
                    role="option"
                    aria-selected={false}
                  >
                    <span className="row" style={{ gap: 10 }}>
                      <Avatar name={r.codName} size="sm" />
                      <strong style={{ fontSize: 14 }}>{r.codName}</strong>
                      {r.provisional ? <span className="badge st-pending">Provisional</span> : null}
                    </span>
                    <span className="mono muted">{formatCCP(r.ccp)} CCP</span>
                    <span className="pull">select ▸</span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {pick ? (
            <div className="panel-line">
              <span className="meta">Challenging</span>
              <div className="row mt-xs">
                <Avatar name={pick.codName} size="sm" />
                <strong style={{ fontSize: 15 }}>{pick.codName}</strong>
                <span className="mono muted">{formatCCP(pick.ccp)} CCP</span>
              </div>
            </div>
          ) : null}

          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !pick}>
            {busy ? "Sending challenge…" : "Send challenge"}
          </button>
        </form>
      </div>
    </div>
  );
}