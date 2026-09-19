"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusPill } from "@/components/events";
import { useSession } from "@/components/session";
import { ErrorBox, EmptyState, Loading, PageHead } from "@/components/ui";
import {
  eventsApi,
  eventRange,
  formatPrize,
  MODE_TEAM_SIZE,
  REGISTRATION_MODE_LABELS,
  registrationOpen,
} from "@/lib/events";
import type { CCPEvent, EventRegistration, RegistrationMode } from "@/lib/types";

type Mode = RegistrationMode;

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { session } = useSession();

  const [event, setEvent] = useState<CCPEvent | null>(null);
  const [roster, setRoster] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teammates, setTeammates] = useState<string[]>([]);
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [freshReg, setFreshReg] = useState<EventRegistration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [ev, regs] = await Promise.all([
        eventsApi.get(eventId),
        eventsApi.roster(eventId),
      ]);
      setEvent(ev);
      setRoster(regs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this event");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const mode = event?.registrationMode;
    if (mode && mode !== "SOLO") {
      const size = MODE_TEAM_SIZE[mode];
      setTeammates((prev) => {
        const next = Array.from({ length: size - 1 }, (_, i) => prev[i] ?? "");
        return next;
      });
    }
  }, [event?.registrationMode]);

  const myReg =
    freshReg &&
    freshReg.captain.codName.toLowerCase() === session?.user.codName.toLowerCase()
      ? freshReg
      : roster.find(
          (r) => r.captain.codName.toLowerCase() === session?.user.codName.toLowerCase(),
        ) ?? null;

  const open = event ? registrationOpen(event) : false;

  async function submit() {
    if (!event || !session) return;
    setSubmitting(true);
    setFormMsg(null);
    const mode = event.registrationMode as Mode;
    const count = MODE_TEAM_SIZE[mode];
    const members = teammates.map((t) => t.trim()).filter(Boolean);
    if (mode !== "SOLO" && members.length !== count - 1) {
      setFormMsg({ kind: "err", text: `Add the ${count - 1} teammate IGN(s) to ${REGISTRATION_MODE_LABELS[mode]}` });
      setSubmitting(false);
      return;
    }
    try {
      const created = await eventsApi.register(event.id, {
        teamName: teamName.trim() || undefined,
        teammates: members,
        contact: contact.trim() || undefined,
        note: note.trim() || undefined,
      });
      setFreshReg(created);
      setRoster((prev) => [...prev, created]);
      setFormMsg({ kind: "ok", text: "You're on the list" });
    } catch (e) {
      setFormMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not register" });
    } finally {
      setSubmitting(false);
    }
  }

  async function withdraw() {
    if (!event || !myReg) return;
    try {
      await eventsApi.withdraw(event.id, myReg.id);
      setFreshReg(null);
      setRoster((prev) => prev.filter((r) => r.id !== myReg.id));
      setFormMsg({ kind: "ok", text: "Registration withdrawn" });
    } catch (e) {
      setFormMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not withdraw" });
    }
  }

  if (loading && !event) return <Loading />;
  if (!event) {
    return (
      <div className="section">
        <div className="container">
          {err ? <ErrorBox message={err} /> : <EmptyState>Event not found.</EmptyState>}
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="section">
        <div className="container">
          <ErrorBox message={err} />
        </div>
      </div>
    );
  }

  const mode = event.registrationMode as Mode | null;
  const modeSize = mode ? MODE_TEAM_SIZE[mode] : null;

  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow={mode ? `${modeSize}-man · ${REGISTRATION_MODE_LABELS[mode]}` : "Event"}
          title={event.title}
          lead={event.description ?? undefined}
        />

        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: "var(--gap-md)" }}>
          <StatusPill status={event.status} />
          <span className="badge">{eventRange(event)}</span>
          {formatPrize(event.prizeCcp) ? (
            <span className="badge">
              Prize <strong style={{ color: "var(--gold-bright)" }}>{formatPrize(event.prizeCcp)}</strong>
            </span>
          ) : null}
          {event.entryNote ? (
            <span className="badge">
              <i /> {event.entryNote}
            </span>
          ) : null}
        </div>

        {event.flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- event flyers are admin-provided URLs
          <img
            src={event.flyerUrl}
            alt={`${event.title} flyer`}
            className="flyer-frame"
            style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", background: "#000" }}
          />
        ) : null}

        <div className="grid-2" style={{ alignItems: "start", marginTop: "var(--gap-lg)" }}>
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              Entries <span className="arrow">▸</span>
            </p>
            {open ? (
              <h3>Open registration · {roster.length} {roster.length === 1 ? "entry" : "entries"}</h3>
            ) : (
              <h3>{roster.length} {roster.length === 1 ? "entry" : "entries"} so far</h3>
            )}
            {roster.length === 0 ? (
              <EmptyState>Nobody has entered yet — be first.</EmptyState>
            ) : (
              <ul className="roster">
                {roster.map((r) => (
                  <li key={r.id} className="row" style={{ gap: 10, justifyContent: "space-between" }}>
                    <div>
                      <strong style={{ color: "var(--fg)" }}>{r.teamName}</strong>
                      <span className="meta"> · {REGISTRATION_MODE_LABELS[r.mode]}</span>
                      <div className="meta">
                        {r.captain.codName}
                        {r.members.length > 0
                          ? ` + ${r.members.map((m) => m.codName).join(", ")}`
                          : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              Register <span className="arrow">▸</span>
            </p>

            {mode ? (
              <p className="lead" style={{ fontSize: 14 }}>
                This event takes <strong>{REGISTRATION_MODE_LABELS[mode]}</strong> entries
                ({modeSize}-man).
              </p>
            ) : null}

            {!open ? (
              <EmptyState>Registrations are closed for this event.</EmptyState>
            ) : !session ? (
              <EmptyState>
                <Link className="btn btn-primary btn-sm" href="/login">
                  Sign in to register
                </Link>
              </EmptyState>
            ) : myReg ? (
              <div className="stack" style={{ gap: 12 }}>
                <p className="lead" style={{ fontSize: 14 }}>
                  You&rsquo;re registered as <strong>{myReg.teamName}</strong>.
                </p>
                <div>
                  <button className="btn btn-secondary btn-sm" onClick={withdraw} type="button">
                    Withdraw
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="stack"
                style={{ gap: 14 }}
              >
                {mode !== "SOLO" ? (
                  <label className="field">
                    <span>Team name</span>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Team Alpha"
                      maxLength={60}
                      required
                    />
                  </label>
                ) : null}

                {mode && modeSize && modeSize > 1
                  ? teammates.map((value, i) => (
                      <label className="field" key={i}>
                        <span>Teammate {i + 1} IGN</span>
                        <input
                          value={value}
                          onChange={(e) =>
                            setTeammates((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                          }
                          placeholder="In-game name"
                          maxLength={30}
                          required
                        />
                      </label>
                    ))
                  : null}

                <label className="field">
                  <span>Contact (optional)</span>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="WhatsApp / phone"
                    maxLength={60}
                  />
                </label>

                <label className="field">
                  <span>Note (optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything the organizers should know"
                    maxLength={300}
                    rows={3}
                  />
                </label>

                {formMsg ? (
                  <p className={formMsg.kind === "ok" ? "st-verified" : "st-disputed"} role="status">
                    {formMsg.text}
                  </p>
                ) : null}

                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Registering…" : `Register${mode ? ` ${REGISTRATION_MODE_LABELS[mode]}` : ""}`}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {session?.user.role === "ADMIN" || session?.user.role === "MODERATOR" ? (
          <p className="meta" style={{ marginTop: "var(--gap-md)" }}>
            Manage entries from the admin panel →{" "}
            <Link href="/admin?tab=registrations">Registrations</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}