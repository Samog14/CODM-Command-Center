"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Match, MatchStatus, SearchPlayer, SystemSetting } from "@/lib/types";
import { fmtDateTime, formatCCP } from "@/lib/tiers";
import { useSession } from "@/components/session";
import { EmptyState, ErrorBox, FormField, Loading, PageHead, StatusBadge } from "@/components/ui";
import { EventsTab } from "@/components/events-admin";
import { RegistrationsTab } from "@/components/registrations-admin";

type Tab = "queue" | "settings" | "players" | "events" | "registrations";

const QUEUE_STATUSES: MatchStatus[] = ["AWAITING_CONFIRMATION", "DISPUTED", "UNDER_REVIEW"];

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const isMod = isAdmin || session?.user.role === "MODERATOR";
  const [tab, setTab] = useState<Tab>("queue");
  const [regEventId, setRegEventId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = searchParams.get("tab");
    const ev = searchParams.get("eventId");
    if (t === "registrations" || t === "events" || t === "settings" || t === "players" || t === "queue") {
      setTab(t);
      setRegEventId(ev ?? undefined);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;
    if (!session?.token) {
      router.replace("/login");
    }
  }, [ready, session?.token, router]);

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <Loading />
        </div>
      </div>
    );
  }

  if (!session?.token || !isMod) {
    return (
      <div className="section">
        <div className="container container-narrow">
          <PageHead eyebrow="Staff area" title="Admin center" />
          <ErrorBox message="You do not have staff access. This area is restricted to admins and moderators." />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="Staff area"
          title="Admin center"
          action={
            <span className="badges">
              <span className="badge st-live">
                <span className="dot" /> {session.user.role}
              </span>
              <span className="badge">{session.user.codName}</span>
            </span>
          }
        />
        <div className="tabs">
          <button className={tab === "queue" ? "tab active" : "tab"} onClick={() => setTab("queue")}>
            Review queue
          </button>
          {isMod ? (
            <button className={tab === "events" ? "tab active" : "tab"} onClick={() => setTab("events")}>
              Events
            </button>
          ) : null}
          {isMod ? (
            <button
              className={tab === "registrations" ? "tab active" : "tab"}
              onClick={() => setTab("registrations")}
            >
              Registrations
            </button>
          ) : null}
          {isAdmin ? (
            <button
              className={tab === "settings" ? "tab active" : "tab"}
              onClick={() => setTab("settings")}
            >
              Settings
            </button>
          ) : null}
          {isAdmin ? (
            <button
              className={tab === "players" ? "tab active" : "tab"}
              onClick={() => setTab("players")}
            >
              Players
            </button>
          ) : null}
        </div>
        <div className="mt-lg">
          {tab === "queue" ? (
            <QueueTab />
          ) : tab === "events" ? (
            <EventsTab />
          ) : tab === "registrations" ? (
            <RegistrationsTab key={regEventId ?? "all"} initialEventId={regEventId} />
          ) : tab === "settings" ? (
            <SettingsTab />
          ) : (
            <PlayersTab />
          )}
        </div>
      </div>
    </div>
  );
}

function QueueTab() {
  const [status, setStatus] = useState<MatchStatus>("AWAITING_CONFIRMATION");
  const [rows, setRows] = useState<Match[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await api.get<Match[]>(`/matches?status=${status}&limit=50`);
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load queue");
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, fn: (id: string) => Promise<unknown>) {
    setBusyId(id);
    setErr(null);
    try {
      await fn(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectRow(id: string) {
    await act(id, () => api.patch(`/matches/${id}/reject`, { reason }));
    setRejectingId(null);
    setReason("");
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="tabs">
        {QUEUE_STATUSES.map((s) => (
          <button
            key={s}
            className={status === s ? "tab active" : "tab"}
            onClick={() => setStatus(s)}
          >
            {s.split("_").join(" ")}
          </button>
        ))}
      </div>
      <ErrorBox message={err} />
      <div className="card ds-table-scroll">
        <table className="ds-table dense-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Challenger</th>
              <th>Opponent</th>
              <th>Score</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "22px 12px" }}>
                  <EmptyState>Queue is clear on {status.split("_").join(" ").toLowerCase()}</EmptyState>
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td className="meta nowrap">{fmtDateTime(m.createdAt)}</td>
                  <td>
                    <strong>{m.challenger.codName}</strong>
                    <span className="meta" style={{ marginLeft: 6 }}>
                      {m.challengerConfirmed ? "✓ confirm" : "—"}
                    </span>
                  </td>
                  <td>
                    <strong>{m.opponent.codName}</strong>
                    <span className="meta" style={{ marginLeft: 6 }}>
                      {m.opponentConfirmed ? "✓ confirm" : "—"}
                    </span>
                  </td>
                  <td className="num-col">
                    {m.challengerScore != null && m.opponentScore != null
                      ? `${m.challengerScore}–${m.opponentScore}`
                      : "—"}
                  </td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="right">
                    {rejectingId === m.id ? (
                      <form
                        className="row"
                        style={{ gap: 6, justifyContent: "flex-end" }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          rejectRow(m.id);
                        }}
                      >
                        <input
                          className="input"
                          style={{ width: 220, minHeight: 32, padding: "6px 10px" }}
                          required
                          minLength={3}
                          placeholder="Rejection reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <button className="btn btn-danger minia" disabled={busyId === m.id} type="submit">
                          Reject
                        </button>
                        <button
                          className="btn btn-secondary minia"
                          type="button"
                          onClick={() => setRejectingId(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span className="action-btns">
                        {m.status === "AWAITING_CONFIRMATION" ? (
                          <button
                            className="btn btn-primary minia"
                            disabled={busyId === m.id}
                            onClick={() => act(m.id, (id) => api.patch(`/matches/${id}/verify`))}
                          >
                            Verify
                          </button>
                        ) : null}
                        {m.status === "DISPUTED" ? (
                          <button
                            className="btn btn-primary minia"
                            disabled={busyId === m.id}
                            onClick={() => act(m.id, (id) => api.post(`/matches/${id}/review`))}
                          >
                            Open review
                          </button>
                        ) : null}
                        {m.status === "UNDER_REVIEW" ? (
                          <>
                            <button
                              className="btn btn-primary minia"
                              disabled={busyId === m.id}
                              onClick={() => act(m.id, (id) => api.patch(`/matches/${id}/verify`))}
                            >
                              Verify
                            </button>
                            <button
                              className="btn btn-danger minia"
                              disabled={busyId === m.id}
                              onClick={() => setRejectingId(m.id)}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        <a className="btn btn-secondary minia" href={`/matches/${m.id}`}>
                          Open
                        </a>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Verifying settles CCP immediately and writes the ledger entries and audit log. Rejecting
        closes the match with no CCP movement.
      </p>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const all = await api.get<SystemSetting[]>("/settings");
      setSettings(all);
      setValues(Object.fromEntries(all.map((s) => [s.key, s.value])));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load settings");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(s: SystemSetting) {
    setSaving(s.key);
    setErr(null);
    try {
      await api.put("/settings", {
        key: s.key,
        value: values[s.key] ?? s.value,
        type: s.type,
        description: s.description ?? undefined,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <ErrorBox message={err} />
      <div className="card ds-table-scroll">
        <table className="ds-table dense-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Type</th>
              <th>Value</th>
              <th>Description</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "22px 12px" }}>
                  <EmptyState>No settings loaded</EmptyState>
                </td>
              </tr>
            ) : (
              settings.map((s) => (
                <tr key={s.key}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {s.key}
                  </td>
                  <td>
                    <span className="badge">{s.type}</span>
                  </td>
                  <td>
                    <input
                      className="input"
                      style={{ minWidth: 160, minHeight: 32, padding: "6px 10px" }}
                      value={values[s.key] ?? s.value}
                      onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                      aria-label={`Value for ${s.key}`}
                    />
                  </td>
                  <td className="meta">{s.description}</td>
                  <td className="right">
                    <button
                      className="btn btn-primary minia"
                      disabled={saving === s.key}
                      onClick={() => save(s)}
                    >
                      {saving === s.key ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Every save is audited. Scoring rules, CCP starting values, K-factor placeholders and
        division thresholds all live here — nothing scoring-related is hard-coded.
      </p>
    </div>
  );
}

function PlayersTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SearchPlayer[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newCcp, setNewCcp] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    setErr(null);
    if (!term.trim()) {
      setRows([]);
      return;
    }
    try {
      const found = await api.get<SearchPlayer[]>(`/players?q=${encodeURIComponent(term.trim())}&limit=20`);
      setRows(found);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) search(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  async function override(id: string) {
    const ccp = Number(newCcp[id]);
    const rea = (reason[id] ?? "").trim();
    if (!Number.isFinite(ccp) || ccp < 0) {
      setErr("CCP must be a non-negative number");
      return;
    }
    if (rea.length < 3) {
      setErr("A reason of at least 3 characters is required for an override");
      return;
    }
    setBusyId(id);
    setErr(null);
    try {
      await api.post(`/players/${id}/ccp-override`, { newCcp: ccp, reason: rea });
      await search(q);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Override failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="search" style={{ maxWidth: 360 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          className="input"
          type="search"
          placeholder="Search player by codName…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ErrorBox message={err} />
      <div className="card ds-table-scroll">
        <table className="ds-table dense-table">
          <thead>
            <tr>
              <th>Player</th>
              <th className="num-col">CCP</th>
              <th>Standing</th>
              <th>Override to</th>
              <th>Reason</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "22px 12px" }}>
                  <EmptyState>Search to manage a player&rsquo;s CCP manually</EmptyState>
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.codName}</strong>
                  </td>
                  <td className="num-col">{formatCCP(p.ccp)}</td>
                  <td>
                    {p.provisional ? (
                      <span className="badge st-pending">Provisional</span>
                    ) : (
                      <span className="badge st-verified">Established</span>
                    )}
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      style={{ width: 110, minHeight: 32, padding: "6px 10px" }}
                      value={newCcp[p.id] ?? ""}
                      onChange={(e) => setNewCcp((v) => ({ ...v, [p.id]: e.target.value }))}
                      placeholder="new CCP"
                      aria-label={`New CCP for ${p.codName}`}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      style={{ width: 200, minHeight: 32, padding: "6px 10px" }}
                      value={reason[p.id] ?? ""}
                      onChange={(e) => setReason((v) => ({ ...v, [p.id]: e.target.value }))}
                      placeholder="why?"
                    />
                  </td>
                  <td className="right">
                    <button
                      className="btn btn-primary minia"
                      disabled={busyId === p.id}
                      onClick={() => override(p.id)}
                    >
                      {busyId === p.id ? "…" : "Apply"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Manual overrides write a CCPTransaction (ADMIN_OVERRIDE) and an audit log entry together —
        never a silent number change.
      </p>
    </div>
  );
}