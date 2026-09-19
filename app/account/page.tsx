"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CCPTransaction, Match, Profile, SystemSetting } from "@/lib/types";
import { computeTier, fmtDateTime, fmtTxnReason, formatCCP, TXN_CLASSES } from "@/lib/tiers";
import { useSession } from "@/components/session";
import {
  Avatar,
  EmptyState,
  ErrorBox,
  Loading,
  PageHead,
  StatusBadge,
  TierBadge,
} from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const { session, ready, logout, refresh } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [txns, setTxns] = useState<CCPTransaction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const uid = session?.token ? session.user.id : null;

  useEffect(() => {
    if (!ready) return;
    if (!uid) {
      router.replace("/login");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [prof, t, m, s] = await Promise.all([
          api.get<Profile>("/auth/me"),
          api.get<CCPTransaction[]>(`/players/${uid}/transactions?limit=50`),
          api.get<Match[]>(`/players/${uid}/matches?limit=20`),
          api.get<SystemSetting[]>("/settings"),
        ]);
        if (!alive) return;
        setProfile(prof);
        setTxns(t);
        setMatches(m);
        setSettings(s);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not load account");
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, uid, router]);

  if (!ready) return <div className="section"><div className="container"><Loading /></div></div>;
  if (!session?.token) return null;

  const tier = profile && settings.length ? computeTier(profile.ccp, settings) : null;
  const gained = txns.reduce((sum, t) => sum + Math.max(0, t.amount), 0);
  const lost = txns.reduce((sum, t) => sum + Math.min(0, t.amount), 0);

  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="Command account"
          title="Player profile"
          action={
            <span className="row" style={{ gap: 10 }}>
              <Link className="btn btn-primary btn-sm" href="/matches/new">
                New challenge
              </Link>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
              >
                Sign out
              </button>
            </span>
          }
        />

        {err ? <ErrorBox message={err} /> : null}

        <div className="grid-2-1">
          <div className="stack">
            <section className="card">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <Avatar name={profile?.codName ?? "?"} size="lg" tier={tier} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 22 }}>{profile?.codName}</h3>
                  <div className="badges mt-xs">
                    {profile && <TierBadge tier={tier} />}
                    {profile?.provisional ? (
                      <span className="badge st-pending">
                        <span className="dot" /> Provisional
                      </span>
                    ) : (
                      <span className="badge st-verified">
                        <span className="dot" /> Established
                      </span>
                    )}
                    {profile && (
                      <span className="badge">
                        {profile.role === "ADMIN"
                          ? "Admin"
                          : profile.role === "MODERATOR"
                            ? "Moderator"
                            : "Operator"}
                      </span>
                    )}
                  </div>
                  <p className="meta mt-sm">
                    {profile?.email} · joined {fmtDateTime(profile?.createdAt).split(",")[0]}
                  </p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="row-between">
                <div>
                  <div className="kpi-num num" style={{ fontSize: 44 }}>
                    {profile ? formatCCP(profile.ccp) : "—"}
                  </div>
                  <div className="kpi-label">CCP standing</div>
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <span className="trend t-up">▲ {formatCCP(gained)} earned</span>
                  <span className="trend t-down">▼ {formatCCP(Math.abs(lost))} moved</span>
                  <span className="meta">{profile?._count.ccpTransactions ?? 0} ledger entries</span>
                </div>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Recent fights <span className="arrow">▸</span>
                </p>
                <h4>My matches</h4>
              </div>
              <Link className="btn btn-secondary btn-sm" href="/matches/new">
                Challenge
              </Link>
            </div>
            <div className="stack" style={{ gap: 0 }}>
              {matches.length === 0 ? (
                <EmptyState>No matches yet</EmptyState>
              ) : (
                matches.slice(0, 8).map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="log-row" style={{ paddingBlock: 13 }}>
                    <span className="meta">{fmtDateTime(m.createdAt).split(",")[0]}</span>
                    <h3 style={{ fontSize: 14.5 }}>
                      {m.challenger.codName} <span className="muted-2">v</span> {m.opponent.codName}
                      {m.challengerScore != null && m.opponentScore != null ? (
                        <span className="mono muted" style={{ marginLeft: 8 }}>
                          {m.challengerScore}–{m.opponentScore}
                        </span>
                      ) : null}
                    </h3>
                    <span className="pull">
                      <StatusBadge status={m.status} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>
                Ledger <span className="arrow">▸</span>
              </p>
              <h3>CCP transactions</h3>
            </div>
          </div>
          <div className="card ds-table-scroll">
            <table className="ds-table dense-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Reason</th>
                  <th className="num-col">Amount</th>
                  <th className="num-col">Standing</th>
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "20px 12px" }}>
                      <EmptyState>No CCP movement yet</EmptyState>
                    </td>
                  </tr>
                ) : (
                  txns.map((t) => (
                    <tr key={t.id}>
                      <td className="meta nowrap">{fmtDateTime(t.createdAt)}</td>
                      <td>
                        <span className={`badge ${TXN_CLASSES[t.reason] ?? ""}`}>{fmtTxnReason(t.reason)}</span>
                      </td>
                      <td
                        className={`num-col ${t.amount >= 0 ? "t-up" : "t-down"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {formatCCP(t.amount)}
                      </td>
                      <td className="num-col">
                        {formatCCP(t.oldValue)} → {formatCCP(t.newValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}