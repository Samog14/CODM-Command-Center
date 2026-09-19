"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import { api } from "@/lib/api";
import { DateTimeSelect } from "@/components/datetime-select";
import { FlyerCropper } from "@/components/flyer-cropper";
import { StatusPill } from "@/components/events";
import { formatCCP, fmtDateTime } from "@/lib/tiers";
import { EmptyState, ErrorBox } from "./ui";
import type { CCPEvent, EventType, RegistrationMode } from "@/lib/types";
import { EVENT_TYPE_LABELS, NEXT_STATUS, REGISTRATION_MODE_LABELS } from "@/lib/events";

const EVENT_TYPES: EventType[] = ["TOURNAMENT", "KOTH", "QUALIFIER", "MIXER", "COMMUNITY", "OTHER"];
const REGISTRATION_MODES: Array<RegistrationMode | null> = [null, "SOLO", "DUO", "SQUAD"];

export interface EventPayload {
  title: string;
  type: EventType;
  startsAt: string | null;
  endsAt: string | null;
  description: string | null;
  flyerUrl: string | null;
  prizeCcp: number | null;
  entryNote: string | null;
  registrationMode?: RegistrationMode | null;
  featured?: boolean;
}

interface EventFormProps {
  initial?: CCPEvent | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: (payload: EventPayload) => void;
  onCancel?: () => void;
}

export function EventForm({ initial, busy, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "TOURNAMENT");
  const [starts, setStarts] = useState<string | null>(initial?.startsAt ?? null);
  const [ends, setEnds] = useState<string | null>(initial?.endsAt ?? null);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [flyerUrl, setFlyerUrl] = useState(initial?.flyerUrl ?? "");
  const [prize, setPrize] = useState(initial?.prizeCcp != null ? String(initial.prizeCcp) : "");
  const [entryNote, setEntryNote] = useState(initial?.entryNote ?? "");
  const [mode, setMode] = useState<RegistrationMode | null>(initial?.registrationMode ?? null);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError("Title needs at least 3 characters");
      return;
    }
    if (!starts) {
      setError("Event start date is required");
      return;
    }
    const prizeCcp = prize.trim() === "" ? null : Number(prize);
    if (prizeCcp != null && (!Number.isFinite(prizeCcp) || prizeCcp < 0)) {
      setError("Prize pool must be a non-negative number");
      return;
    }
    if (flyerUrl.trim() && !/^https?:\/\/\S+$/i.test(flyerUrl.trim())) {
      setError("Flyer URL must be a valid http(s) link");
      return;
    }
    onSubmit({
      title: title.trim(),
      type,
      startsAt: starts,
      endsAt: ends,
      description: description.trim() || null,
      flyerUrl: flyerUrl.trim() || null,
      prizeCcp,
      entryNote: entryNote.trim() || null,
      registrationMode: mode,
      featured,
    });
  }

  return (
    <form className="card" onSubmit={submit} style={{ padding: 18 }}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span>Title</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. 4v4 Fall Showdown"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DateTimeSelect label="Start" value={starts} onChange={setStarts} />
        <DateTimeSelect label="End" value={ends} onChange={setEnds} clearable />
        {initial ? (
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <FlyerUploadButton eventId={initial.id} onUploaded={setFlyerUrl} />
            <span className="meta">Uploading replaces the URL above.</span>
          </div>
        ) : null}
        <div className="grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span>Prize pool (CCP)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="e.g. 1500"
            />
          </label>
          <label className="field">
            <span>Flyer image URL</span>
            <input
              className="input"
              type="url"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>
        <label className="field">
          <span>Entry note (optional)</span>
          <input
            className="input"
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
            maxLength={200}
            placeholder="e.g. Free for season pass holders"
          />
        </label>
        <div className="grid-2" style={{ gap: 12 }}>
          <label className="field">
            <span>Registration mode</span>
            <select
              className="input"
              value={mode ?? ""}
              onChange={(e) => setMode(e.target.value === "" ? null : (e.target.value as RegistrationMode))}
            >
              <option value="">Not taking registrations</option>
              {REGISTRATION_MODES.filter((m): m is RegistrationMode => m !== null).map((m) => (
                <option key={m} value={m}>
                  {REGISTRATION_MODE_LABELS[m]} ({m === "SOLO" ? "1 player" : m === "DUO" ? "2 players" : "4 players"})
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ justifyContent: "flex-end", gap: 8 }}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              aria-label="Feature this event on the homepage"
            />
            <span>Feature on homepage</span>
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="Map pool, rules, broadcast link…"
          />
        </label>
        {flyerUrl.trim() ? (
          <figure className="flyer-frame" style={{ maxWidth: 240 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin flyer preview */}
            <img src={flyerUrl.trim()} alt="" />
          </figure>
        ) : null}
        <ErrorBox message={error} />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </button>
          {onCancel ? (
            <button className="btn btn-secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

interface FlyerUploadButtonProps {
  eventId: string;
  onUploaded: (publicUrl: string) => void;
  compact?: boolean;
}

const FLYER_MAX_BYTES = 20 * 1024 * 1024;

export function FlyerUploadButton({ eventId, onUploaded, compact }: FlyerUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objUrl = useRef<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "signing" | "uploading" | "saving">("idle");
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ src: string; origName: string } | null>(null);

  async function upload(file: File) {
    setUploadErr(null);
    try {
      setPhase("signing");
      const signed = await api.post<{ key: string; uploadUrl: string; publicUrl: string }>(
        `/events/${eventId}/flyer-upload-url`,
        {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          maxSizeBytes: FLYER_MAX_BYTES,
        },
      );
      setPhase("uploading");
      const res = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        throw new Error(`Storage upload failed (${res.status})`);
      }
      setPhase("saving");
      await api.patch<CCPEvent>(`/events/${eventId}`, { flyerUrl: signed.publicUrl });
      onUploaded(signed.publicUrl);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Flyer upload failed");
    } finally {
      setPhase("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function releaseObjectUrl() {
    if (objUrl.current) {
      URL.revokeObjectURL(objUrl.current);
      objUrl.current = null;
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadErr("Only image files (PNG, JPEG, WebP, GIF) are supported");
      return;
    }
    if (file.size > FLYER_MAX_BYTES) {
      setUploadErr("Flyers must be under 20 MB");
      return;
    }
    setUploadErr(null);
    releaseObjectUrl();
    objUrl.current = URL.createObjectURL(file);
    setCrop({ src: objUrl.current, origName: file.name });
  }

  function onCropped(blob: Blob) {
    const name = (crop?.origName ?? "flyer").replace(/\.[^.]+$/, "");
    releaseObjectUrl();
    setCrop(null);
    void upload(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
  }

  function onCropCancel() {
    releaseObjectUrl();
    setCrop(null);
  }

  const labels: Record<typeof phase, string> = {
    idle: "Upload flyer",
    signing: "Signing…",
    uploading: "Uploading…",
    saving: "Saving…",
  };

  return (
    <span className="stack" style={{ gap: 4 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={onPick}
      />
      <button
        className={`btn ${compact ? "btn-secondary minia" : "btn-secondary"}`}
        disabled={phase !== "idle"}
        onClick={() => inputRef.current?.click()}
      >
        {labels[phase]}
      </button>
      {uploadErr ? (
        <span className="meta" style={{ color: "var(--bad)" }}>
          {uploadErr}
        </span>
      ) : null}

      {crop ? <FlyerCropper src={crop.src} onApply={onCropped} onCancel={onCropCancel} /> : null}
    </span>
  );
}

const FLYER_STYLE: CSSProperties = {
  width: 56,
  height: 56,
  objectFit: "cover",
  borderRadius: 6,
  border: "1px solid var(--border-strong)",
  display: "block",
};

export function EventsTab() {
  const [events, setEvents] = useState<CCPEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const list = await api.get<CCPEvent[]>("/events?all=1&limit=100");
      setEvents(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load events");
    }
  }

  const loadEvents = useCallback(() => {
    load();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function createEvent(payload: EventPayload) {
    await guard(async () => {
      await api.post("/events", payload);
      setCreating(false);
      await load();
    });
  }

  async function updateEvent(id: string, payload: Partial<EventPayload>) {
    await guard(async () => {
      await api.patch(`/events/${id}`, payload);
      setEditingId(null);
      await load();
    });
  }

  async function setStatus(id: string, status: CCPEvent["status"]) {
    await guard(async () => {
      await api.post(`/events/${id}/status`, { status });
      await load();
    });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this event? Only drafts and cancelled events can be deleted.")) return;
    await guard(async () => {
      await api.del(`/events/${id}`);
      await load();
    });
  }

  const editing = events.find((e) => e.id === editingId) ?? null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {!creating && !editing ? (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Schedule event
          </button>
        </div>
      ) : null}

      {creating ? (
        <EventForm
          submitLabel="Create draft"
          busy={busy}
          onCancel={() => setCreating(false)}
          onSubmit={createEvent}
        />
      ) : null}

      {editing ? (
        <EventForm
          initial={editing}
          submitLabel="Save changes"
          busy={busy}
          onCancel={() => setEditingId(null)}
          onSubmit={(payload) => updateEvent(editing.id, payload)}
        />
      ) : null}

      <ErrorBox message={err} />

      <div className="card ds-table-scroll">
        <table className="ds-table dense-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Mode</th>
              <th>Entries</th>
              <th>Starts</th>
              <th className="num-col">Prize</th>
              <th>Flyer</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "22px 12px" }}>
                  <EmptyState>No events yet — schedule the first one</EmptyState>
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.title}</strong>
                    {ev.entryNote ? (
                      <span className="meta" style={{ display: "block", whiteSpace: "normal" }}>
                        {ev.entryNote}
                      </span>
                    ) : null}
                    {ev.featured ? (
                      <span className="badge st-gold" style={{ marginLeft: 6 }}>
                        ★ Featured
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {ev.registrationMode ? (
                      <span className="badge">{REGISTRATION_MODE_LABELS[ev.registrationMode]}</span>
                    ) : (
                      <span className="meta">—</span>
                    )}
                  </td>
                  <td>
                    <a className="btn btn-secondary minia" href={`/admin?tab=registrations&eventId=${ev.id}`}>
                      {ev._count?.registrations ?? 0}
                    </a>
                  </td>
                  <td className="nowrap">{fmtDateTime(ev.startsAt)}</td>
                  <td className="num-col">{ev.prizeCcp != null ? formatCCP(ev.prizeCcp) : "—"}</td>
                  <td>
                    {ev.flyerUrl ? (
                      <a href={ev.flyerUrl} target="_blank" rel="noreferrer" aria-label={`Flyer for ${ev.title}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- tiny admin flyer thumbnail */}
                        <img src={ev.flyerUrl} alt="" style={FLYER_STYLE} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusPill status={ev.status} />
                  </td>
                  <td className="right">
                    <span className="action-btns">
                      <button
                        className="btn btn-secondary minia"
                        disabled={busy}
                        onClick={() => setEditingId(editingId === ev.id ? null : ev.id)}
                      >
                        {editingId === ev.id ? "Close" : "Edit"}
                      </button>
                      <button
                        className="btn btn-secondary minia"
                        disabled={busy}
                        onClick={() => updateEvent(ev.id, { featured: !ev.featured })}
                        aria-pressed={ev.featured}
                      >
                        {ev.featured ? "Unfeature" : "Feature"}
                      </button>
                      <FlyerUploadButton eventId={ev.id} compact onUploaded={() => load()} />
                      {NEXT_STATUS[ev.status].map((s) => (
                        <button
                          key={s}
                          className="btn btn-primary minia"
                          disabled={busy}
                          onClick={() => setStatus(ev.id, s)}
                        >
                          {s === "PUBLISHED"
                            ? "Publish"
                            : s === "CANCELLED"
                              ? "Cancel"
                              : s.split("_").join(" ").replace(/^\w/, (c) => c.toUpperCase())}
                        </button>
                      ))}
                      {ev.status === "DRAFT" || ev.status === "CANCELLED" ? (
                        <button
                          className="btn btn-danger minia"
                          disabled={busy}
                          onClick={() => remove(ev.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Events move through a strict lifecycle — draft → published → open → live → completed — and
        every change is written to the audit log. Flyers upload straight to Supabase Storage from
        your device, or paste an image URL when you create or edit an event.
      </p>
    </div>
  );
}