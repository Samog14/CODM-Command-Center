"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CCPEvent, EventStatus, EventType } from "@/lib/types";
import {
  countdownLabel,
  eventRange,
  EVENT_TYPE_LABELS,
  formatPrize,
  REGISTRATION_MODE_LABELS,
  registrationOpen,
  statusPillMeta,
} from "@/lib/events";
import { ErrorBox, EmptyState, Loading } from "./ui";

type RatioMap = Record<string, number>;

export function FeaturedFlyers() {
  const [events, setEvents] = useState<CCPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<CCPEvent | null>(null);
  const [ratios, setRatios] = useState<RatioMap>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await api.get<CCPEvent[]>("/events?featured=1&limit=6", { auth: false });
        if (alive) setEvents(list);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not load featured events");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading) return null;
  if (err || events.length === 0) return null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="stack">
            <p className="eyebrow">
              Featured <span className="arrow">▸</span>
            </p>
            <h2>Main event flyers</h2>
          </div>
          <Link className="btn btn-secondary btn-sm" href="/tournaments">
            All events
          </Link>
        </div>
        <div className="featured-flyers">
          {events.map((ev) => {
            const ratio = ratios[ev.id];
            return (
              <figure className="featured-flyer" key={ev.id}>
                <button
                  type="button"
                  aria-label={`View full ${ev.title} flyer`}
                  onClick={() => setOpen(ev)}
                  style={ratio ? { aspectRatio: String(ratio) } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- featured flyer is an admin-provided URL */}
                  <img
                    src={ev.flyerUrl ?? ""}
                    alt={`${ev.title} flyer`}
                    loading="lazy"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setRatios((prev) => ({
                          ...prev,
                          [ev.id]: img.naturalWidth / img.naturalHeight,
                        }));
                      }
                    }}
                  />
                </button>
                <figcaption>
                  <Link href={`/events/${ev.id}`}>
                    <strong>{ev.title}</strong>
                  </Link>
                  <span className="meta" style={{ display: "block" }}>
                    {eventRange(ev)}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {open ? (
        <div
          className="flyer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Full ${open.title} flyer`}
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox shows the full flyer */}
          <img src={open.flyerUrl ?? ""} alt={`${open.title} flyer`} onClick={(e) => e.stopPropagation()} />
          <button className="btn btn-secondary flyer-close" onClick={() => setOpen(null)} aria-label="Close full flyer">
            Close
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function StatusPill({ status }: { status: EventStatus }) {
  const m = statusPillMeta(status);
  return (
    <span className={`badge ${m.cls}`}>
      {m.live ? <span className="dot" /> : null}
      {m.label}
    </span>
  );
}

export function useEvents(scope: "public" | "staff" = "public", limit = 100) {
  const [events, setEvents] = useState<CCPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await api.get<CCPEvent[]>(
        scope === "staff" ? `/events?all=1&limit=${limit}` : `/events?limit=${limit}`,
        { auth: scope === "staff" },
      );
      setEvents(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }, [scope, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, err, reload: load };
}

export function EventCard({ event }: { event: CCPEvent }) {
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  return (
    <article className="card event-card">
      {event.flyerUrl ? (
        <button
          type="button"
          className="flyer-frame flyer-frame-btn"
          aria-label={`View full ${event.title} flyer`}
          onClick={() => setViewing(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- flyers are arbitrary admin-provided URLs */}
          <img src={event.flyerUrl} alt={`${event.title} flyer`} />
        </button>
      ) : (
        <div className="flyer-frame flyer-frame-empty" aria-hidden="true">
          <span className="ev-flyer-mark">{EVENT_TYPE_LABELS[event.type]}</span>
        </div>
      )}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="badge">{EVENT_TYPE_LABELS[event.type]}</span>
          <StatusPill status={event.status} />
          {event.status !== "COMPLETED" && event.status !== "CANCELLED" ? (
            <span className="chip">
              <i /> {countdownLabel(event.startsAt)}
            </span>
          ) : null}
          {event.registrationMode ? (
            <span className="chip">
              <i /> {REGISTRATION_MODE_LABELS[event.registrationMode]}
            </span>
          ) : null}
        </div>
        <h3 style={{ fontSize: 22 }}>{event.title}</h3>
        {event.description ? <p className="lead" style={{ fontSize: 14 }}>{event.description}</p> : null}
        <p className="meta">{eventRange(event)}</p>
        {formatPrize(event.prizeCcp) ? (
          <p className="meta">
            Prize pool <strong style={{ color: "var(--gold-bright)" }}>{formatPrize(event.prizeCcp)}</strong>
          </p>
        ) : null}
        {event.entryNote ? (
          <p className="meta">
            Entry · <span style={{ color: "var(--fg)" }}>{event.entryNote}</span>
          </p>
        ) : null}
        {registrationOpen(event) && event._count ? (
          <p className="meta">
            {event._count.registrations} {event._count.registrations === 1 ? "entry" : "entries"} so far
          </p>
        ) : null}
        {registrationOpen(event) ? (
          <div>
            <Link className="btn btn-primary btn-sm" href={`/events/${event.id}`}>
              Register
            </Link>
          </div>
        ) : null}
      </div>

      {viewing && event.flyerUrl ? (
        <div className="flyer-overlay" role="dialog" aria-modal="true" aria-label={`Full ${event.title} flyer`} onClick={() => setViewing(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox shows the full flyer */}
          <img src={event.flyerUrl} alt={`${event.title} flyer`} onClick={(e) => e.stopPropagation()} />
          <button className="btn btn-secondary flyer-close" onClick={() => setViewing(false)} aria-label="Close full flyer">
            Close
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function EventsBoard({
  types,
  empty,
  limit = 50,
}: {
  types?: EventType[];
  empty?: string;
  limit?: number;
}) {
  const { events, loading, err } = useEvents("public", limit);
  const filtered = types?.length ? events.filter((e) => types.includes(e.type)) : events;

  if (loading) return <Loading />;
  if (err) return <ErrorBox message={err} />;
  if (filtered.length === 0) return <EmptyState>{empty ?? "Nothing scheduled yet — check back soon."}</EmptyState>;

  return (
    <div className="grid-2">
      {filtered.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}