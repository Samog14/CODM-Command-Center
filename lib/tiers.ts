import type { SystemSetting } from "./types";

export const TIER_ORDER = [
  "RECRUIT",
  "ROOKIE",
  "VETERAN",
  "ELITE",
  "MASTER",
  "GRANDMASTER",
  "CHAMPION",
  "LEGENDARY",
] as const;

const TIER_CLASS: Record<string, string> = {
  RECRUIT: "t-recruit",
  ROOKIE: "t-rookie",
  VETERAN: "t-veteran",
  ELITE: "t-elite",
  MASTER: "t-master",
  GRANDMASTER: "t-grandmaster",
  CHAMPION: "t-champion",
  LEGENDARY: "t-legendary",
};

export function tierClass(tier: string | null | undefined): string {
  return TIER_CLASS[(tier ?? "RECRUIT").toUpperCase()] ?? "t-recruit";
}

/**
 * Client-side mirror of the backend DivisionService: reads the same
 * division.*Min SystemSettings rows and computes the highest tier whose
 * threshold the CCP reaches. Never hard-codes thresholds.
 */
export function computeTier(ccp: number, settings: SystemSetting[]): string {
  const byKey = new Map(settings.map((s) => [s.key, s.value]));
  let tier: string = "RECRUIT";
  for (const label of TIER_ORDER) {
    const raw = byKey.get(`division.${label.toLowerCase()}Min`);
    if (raw !== undefined && ccp >= (Number(raw) || 0)) {
      tier = label;
    }
  }
  return tier;
}

export const TXN_LABELS: Record<string, string> = {
  MATCH_VERIFIED: "Match verified",
  PROVISIONAL_PLACEMENT: "Provisional placement",
  KOTH_REWARD: "King of the Hill reward",
  TOURNAMENT_REWARD: "Tournament reward",
  TOURNAMENT_WILDCARD_ENTRY: "Wildcard entry",
  ADMIN_OVERRIDE: "Admin override",
  ANTI_FARMING_ADJUSTMENT: "Anti-farming adjustment",
};

export const TXN_CLASSES: Record<string, string> = {
  MATCH_VERIFIED: "st-verified",
  PROVISIONAL_PLACEMENT: "st-verified",
  KOTH_REWARD: "st-gold",
  TOURNAMENT_REWARD: "st-gold",
  TOURNAMENT_WILDCARD_ENTRY: "st-pending",
  ADMIN_OVERRIDE: "st-disputed",
  ANTI_FARMING_ADJUSTMENT: "st-disputed",
};

export function fmtTxnReason(reason: string): string {
  return TXN_LABELS[reason] ?? reason.split("_").join(" ").toLowerCase();
}

export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCCP(n: number): string {
  return n.toLocaleString("en-US");
}