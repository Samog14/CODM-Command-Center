"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { eventsApi } from "@/lib/events";
import { REGISTRATION_MODE_LABELS } from "@/lib/events";
import type { CCPEvent, EventRegistration } from "@/lib/types";
import { fmtDateTime } from "@/lib/tiers";
import { EmptyState, ErrorBox } from "./ui";

export function RegistrationsTab({ initialEventId }: { initialEventId?: string }) {
  const [events, setEvents] = useState<CCPEvent[]>([]);
  const [eventId, setEventId] = useState<string>(initialEventId ?? "");
  const [rows, setRows] = useState<EventRegistration[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await eventsApi.allRegistrations(eventId || undefined);
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load registrations");
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    api
      .get<CCPEvent[]>("/events?all=1&limit=100")
      .then((list) => {
        if (mounted) setEvents(list);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  async function withdraw(reg: EventRegistration) {
    if (!reg.eventId) return;
    if (!window.confirm(`Withdraw "${reg.teamName ?? reg.captain.codName}" from "${reg.event?.title ?? "this event"}"?`)) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await eventsApi.withdraw(reg.eventId, reg.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="field" style={{ minWidth: 260 }}>
          <span>Filter by event</span>
          <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} · {ev._count?.registrations ?? 0} entries
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorBox message={err} />
      <div className="card ds-table-scroll">
        <table className="ds-table dense-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Mode</th>
              <th>Members</th>
              <th>Captain</th>
              <th>Contact</th>
              <th>Note</th>
              <th>Event</th>
              <th>Registered</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "22px 12px" }}>
                  <EmptyState>No registrations{eventId ? " for this event" : ""} yet — signups appear here live.</EmptyState>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.teamName ?? r.captain.codName}</strong>
                  </td>
                  <td>
                    <span className="badge">{REGISTRATION_MODE_LABELS[r.mode]}</span>
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    {r.members.length > 0 ? r.members.map((m) => m.codName).join(", ") : "—"}
                  </td>
                  <td>
                    {r.captain.codName}
                    {r.captain.email ? (
                      <span className="meta" style={{ display: "block", whiteSpace: "nowrap" }}>
                        {r.captain.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="meta">{r.contact ?? "—"}</td>
                  <td className="meta" style={{ whiteSpace: "normal" }}>
                    {r.note ?? "—"}
                  </td>
                  <td className="meta" style={{ whiteSpace: "normal" }}>
                    {r.event?.title ?? `event ${r.eventId}`}
                    {r.event ? (
                      <span className="meta" style={{ display: "block" }}>
                        {fmtDateTime(r.event.startsAt)}
                      </span>
                    ) : null}
                  </td>
                  <td className="meta nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td className="right">
                    <button
                      className="btn btn-danger minia"
                      disabled={busy}
                      onClick={() => withdraw(r)}
                    >
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Registrations are the team name + IGNs only — admin actions here are written to the audit log.
      </p>
    </div>
  );
}