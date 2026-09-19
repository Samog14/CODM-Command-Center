"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { fromLocalInput, toLocalInput } from "@/lib/events";

const DATE_LOOKAHEAD_DAYS = 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateLabel(d: Date, today: Date): string {
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days === 0) {
    return `Today · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (days === 1) {
    return `Tomorrow · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  const base = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return d.getFullYear() === today.getFullYear()
    ? base
    : `${base}, ${d.getFullYear()}`;
}

function dateOptions(selected: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selected) {
    const sel = new Date(`${selected}T00:00:00`);
    if (!Number.isNaN(sel.getTime())) {
      out.push({ label: dateLabel(sel, today), value: selected });
      seen.add(selected);
    }
  }

  for (let i = 0; i < DATE_LOOKAHEAD_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const v = dateValue(d);
    if (seen.has(v)) continue;
    out.push({ label: dateLabel(d, today), value: v });
  }
  return out;
}

function timeOptions(selected: string): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  if (selected) {
    out.push({ label: selected, value: selected });
    seen.add(selected);
  }
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const v = `${pad(h)}:${pad(m)}`;
      if (seen.has(v)) continue;
      out.push({ label: v, value: v });
    }
  }
  return out;
}

export interface DateTimeSelectProps {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  clearable?: boolean;
}

export function DateTimeSelect({ label, value, onChange, clearable }: DateTimeSelectProps) {
  const [draft, setDraft] = useState<{ date: string; time: string }>(() => splitLocal(value));

  useEffect(() => {
    if (value) {
      setDraft(splitLocal(value));
    }
  }, [value]);

  function setDate(date: string) {
    const next = { ...draft, date };
    setDraft(next);
    if (next.date && next.time) {
      onChange(fromLocalInput(`${next.date}T${next.time}`));
    }
  }

  function setTime(time: string) {
    const next = { ...draft, time };
    setDraft(next);
    if (next.date && next.time) {
      onChange(fromLocalInput(`${next.date}T${next.time}`));
    }
  }

  function clear() {
    setDraft({ date: "", time: "" });
    onChange(null);
  }

  const dates = useMemo(() => dateOptions(draft.date), [draft.date]);
  const times = useMemo(() => timeOptions(draft.time), [draft.time]);

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="grid-2" style={{ gap: 8 }}>
        <label className="field">
          <span>{label} date</span>
          <select
            className="input"
            value={draft.date}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setDate(e.target.value)}
          >
            <option value="" disabled>
              {draft.date ? "" : "Choose date…"}
            </option>
            {dates.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{label} time</span>
          <select
            className="input"
            value={draft.time}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTime(e.target.value)}
          >
            <option value="" disabled>
              {draft.time ? "" : "Choose time…"}
            </option>
            {times.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {clearable && (draft.date || draft.time) ? (
        <button type="button" className="btn btn-ghost minia" onClick={clear}>
          Clear {label.toLowerCase()} · no end time
        </button>
      ) : null}
    </div>
  );
}

function splitLocal(value: string | null): { date: string; time: string } {
  const local = toLocalInput(value);
  const [date, time] = local ? local.split("T") : ["", ""];
  return { date, time };
}