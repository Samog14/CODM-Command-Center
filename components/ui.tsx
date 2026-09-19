import type { ReactNode } from "react";
import type { MatchStatus } from "@/lib/types";
import { tierClass } from "@/lib/tiers";

export function Avatar({
  name,
  size,
  tier,
}: {
  name: string;
  size?: "sm" | "lg";
  tier?: string | null;
}) {
  const base = size === "lg" ? "avatar avatar-lg" : size === "sm" ? "avatar avatar-sm" : "avatar";
  const tint = tier ? ` avatar-t-${tier.toLowerCase()}` : "";
  return (
    <span className={`${base}${tint}`} aria-hidden="true">
      {name.slice(0, 2).toUpperCase()}
      {tier ? <span className="tier-notch" /> : null}
    </span>
  );
}

export function TierBadge({ tier }: { tier?: string | null }) {
  const t = (tier ?? "RECRUIT").toUpperCase();
  return <span className={`badge tier ${tierClass(t)}`}>{t}</span>;
}

const STATUS_META: Record<MatchStatus, { label: string; cls: string; live?: boolean }> = {
  PENDING: { label: "Pending", cls: "st-pending" },
  ACCEPTED: { label: "Accepted", cls: "st-pending" },
  COMPLETED: { label: "Awaiting confirm", cls: "st-pending" },
  AWAITING_CONFIRMATION: { label: "Awaiting verify", cls: "st-pending" },
  DISPUTED: { label: "Disputed", cls: "st-disputed" },
  UNDER_REVIEW: { label: "Under review", cls: "st-live", live: true },
  VERIFIED: { label: "Verified", cls: "st-verified" },
  REJECTED: { label: "Rejected", cls: "st-grey" },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`badge ${m.cls}`}>
      {m.live ? <span className="dot" /> : null}
      {m.label}
    </span>
  );
}

export function PageHead({
  eyebrow,
  title,
  lead,
  action,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div className="stack">
        <p className="eyebrow">
          {eyebrow} <span className="arrow">▸</span>
        </p>
        <h2>{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  return <div className="empty-state">Loading…</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="card"
      style={{ borderLeft: "3px solid var(--bad)", padding: "14px 16px", marginBottom: 18 }}
      role="alert"
    >
      <p style={{ color: "var(--bad)", fontSize: 13, margin: 0 }}>{message}</p>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="meta">{hint}</span> : null}
    </label>
  );
}