export type Role = "USER" | "MODERATOR" | "ADMIN";

export type MatchStatus =
  | "PENDING"
  | "ACCEPTED"
  | "COMPLETED"
  | "AWAITING_CONFIRMATION"
  | "DISPUTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export type EvidenceKind = "SCREENSHOT" | "VIDEO" | "MATCH_RESULT_LINK";
export type SettingType = "NUMBER" | "STRING" | "BOOLEAN" | "JSON";
export type CCPTxnReason =
  | "MATCH_VERIFIED"
  | "PROVISIONAL_PLACEMENT"
  | "KOTH_REWARD"
  | "TOURNAMENT_REWARD"
  | "TOURNAMENT_WILDCARD_ENTRY"
  | "ADMIN_OVERRIDE"
  | "ANTI_FARMING_ADJUSTMENT";

export interface ApiEnvelope<T> {
  data: T;
  error: null;
}

export interface ApiErrorBody {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export interface PlayerRef {
  id: string;
  codName: string;
  ccp: number;
}

export interface SearchPlayer extends PlayerRef {
  provisional: boolean;
  role: Role;
}

export interface RankingRow {
  rank: number;
  codName: string;
  ccp: number;
  tier: string;
  provisional: boolean;
}

export interface Profile {
  id: string;
  codName: string;
  email: string;
  role: Role;
  ccp: number;
  provisional: boolean;
  createdAt: string;
  _count: { ccpTransactions: number };
}

export interface Match {
  id: string;
  status: MatchStatus;
  challengerId: string;
  opponentId: string;
  challenger: PlayerRef;
  opponent: PlayerRef;
  challengerScore?: number | null;
  opponentScore?: number | null;
  outcome?: string | null;
  challengerConfirmed: boolean;
  opponentConfirmed: boolean;
  acceptedAt?: string | null;
  completedAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  evidence?: EvidenceItem[];
  transactions?: CCPTransaction[];
}

export interface EvidenceItem {
  id: string;
  matchId: string;
  uploaderId: string;
  kind: EvidenceKind;
  url: string;
  note?: string | null;
  createdAt: string;
}

export interface CCPTransaction {
  id: string;
  playerId: string;
  reason: CCPTxnReason;
  amount: number;
  oldValue: number;
  newValue: number;
  adminId?: string | null;
  matchId?: string | null;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  type: SettingType;
  description?: string | null;
}

export interface LoginResponse {
  token: string;
  user: Profile;
}

export type EventType = "TOURNAMENT" | "KOTH" | "QUALIFIER" | "MIXER" | "COMMUNITY" | "OTHER";

export type EventStatus = "DRAFT" | "PUBLISHED" | "OPEN" | "LIVE" | "COMPLETED" | "CANCELLED";

export type RegistrationMode = "SOLO" | "DUO" | "SQUAD";

export interface CCPEvent {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startsAt: string;
  endsAt?: string | null;
  description?: string | null;
  flyerUrl?: string | null;
  prizeCcp?: number | null;
  entryNote?: string | null;
  registrationMode?: RegistrationMode | null;
  featured?: boolean;
  _count?: { registrations: number };
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  mode: RegistrationMode;
  teamName: string | null;
  members: Array<{ codName: string }>;
  createdAt: string;
  captain: { codName: string; email?: string };
  contact?: string | null;
  note?: string | null;
  eventId?: string;
  event?: {
    id: string;
    title: string;
    type: EventType;
    startsAt: string;
    status: EventStatus;
  };
}

export interface RegisterInput {
  teamName?: string;
  teammates?: string[];
  contact?: string;
  note?: string;
}