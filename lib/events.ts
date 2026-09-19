import { api } from "./api";
import type { CCPEvent, EventRegistration, EventStatus, EventType, RegisterInput, RegistrationMode } from "./types";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TOURNAMENT: "Tournament",
  KOTH: "King of the Hill",
  QUALIFIER: "Qualifier",
  MIXER: "Mixer",
  COMMUNITY: "Community",
  OTHER: "Other",
};

export const REGISTRATION_MODE_LABELS: Record<RegistrationMode, string> = {
  SOLO: "Solo",
  DUO: "Duo",
  SQUAD: "4-man Squad",
};

export const MODE_TEAM_SIZE: Record<RegistrationMode, number> = { SOLO: 1, DUO: 2, SQUAD: 4 };

export function registrationOpen(ev: CCPEvent): boolean {
  return !!ev.registrationMode && (ev.status === "PUBLISHED" || ev.status === "OPEN");
}

export function teamSizeLabel(mode?: RegistrationMode | null): string {
  return mode ? `${MODE_TEAM_SIZE[mode]}-man` : "";
}

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; cls: string; live?: boolean }
> = {
  DRAFT: { label: "Draft", cls: "st-grey" },
  PUBLISHED: { label: "Published", cls: "st-live", live: true },
  OPEN: { label: "Registration open", cls: "st-verified" },
  LIVE: { label: "Live", cls: "st-live", live: true },
  COMPLETED: { label: "Completed", cls: "st-gold" },
  CANCELLED: { label: "Cancelled", cls: "st-disputed" },
};

export function statusPillMeta(status: EventStatus) {
  return EVENT_STATUS_META[status];
}

/** Client-side mirror of the backend event state machine.
 * Keep in sync with apps/backend/src/services/event-state.service.ts. */
export const NEXT_STATUS: Record<EventStatus, readonly EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["OPEN", "LIVE", "DRAFT", "CANCELLED"],
  OPEN: ["LIVE", "PUBLISHED", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function countdownLabel(startsAt: string): string {
  const ms = new Date(startsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "Started";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `in ${days}d ${hours}h` : `in ${hours}h`;
}

export function eventRange(ev: CCPEvent): string {
  const start = new Date(ev.startsAt);
  if (Number.isNaN(start.getTime())) return "—";
  if (!ev.endsAt) {
    return start.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const end = new Date(ev.endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startT = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endT = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${startT} – ${sameDay ? endT : end.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export function formatPrize(prizeCcp?: number | null): string | null {
  if (prizeCcp == null) return null;
  return `${prizeCcp.toLocaleString("en-US")} CCP`;
}

export const eventsApi = {
  list: (limit = 50) => api.get<CCPEvent[]>(`/events?limit=${limit}`),
  featured: (limit = 8) => api.get<CCPEvent[]>(`/events?featured=1&limit=${limit}`),
  get: (id: string) => api.get<CCPEvent>(`/events/${id}`),
  roster: (id: string) => api.get<EventRegistration[]>(`/events/${id}/registrations`),
  register: (id: string, input: RegisterInput) =>
    api.post<EventRegistration>(`/events/${id}/registrations`, input, { auth: true }),
  withdraw: (id: string, registrationId: string) =>
    api.del<{ id: string }>(`/events/${id}/registrations/${registrationId}`, { auth: true }),
  allRegistrations: (eventId?: string) =>
    api.get<EventRegistration[]>(`/registrations${eventId ? `?eventId=${eventId}` : ""}`, { auth: true }),
};