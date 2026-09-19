"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { api } from "@/lib/api";
import type { CCPTransaction, EvidenceItem, Match } from "@/lib/types";
import { fmtDateTime, formatCCP, fmtTxnReason } from "@/lib/tiers";
import { useSession } from "@/components/session";
import { Avatar, EmptyState, ErrorBox, FormField, Loading, PageHead, StatusBadge } from "@/components/ui";

type Outcome = "challenger_win" | "opponent_win" | "disconnect";
type EvKind = "SCREENSHOT" | "VIDEO" | "MATCH_RESULT_LINK";

const EVIDENCE_MAX_BYTES = 100 * 1024 * 1024;

function MatchDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session, ready } = useSession();

  const [match, setMatch] = useState<Match | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cs, setCs] = useState("0");
  const [os, setOs] = useState("0");
  const [outcome, setOutcome] = useState<Outcome>("challenger_win");

  const [evKind, setEvKind] = useState<EvKind>("SCREENSHOT");
  const [evUrl, setEvUrl] = useState("");
  const [evNote, setEvNote] = useState("");
  const [evFile, setEvFile] = useState<File | null>(null);
  const evFileRef = useRef<HTMLInputElement | null>(null);

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const m = await api.get<Match>(`/matches/${matchId}`);
      setMatch(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load match");
    }
  }, [matchId]);

  useEffect(() => {
    if (!ready) return;
    if (!session?.token) {
      router.replace(`/login?next=/matches/${matchId}`);
      return;
    }
    load();
  }, [ready, session?.token, matchId, load, router]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!match) {
    return (
      <div className="section">
        <div className="container">
          {err ? <ErrorBox message={err} /> : <Loading />}
        </div>
      </div>
    );
  }

  const me = session?.user.id;
  const isChallenger = match.challengerId === me;
  const isOpponent = match.opponentId === me;
  const isParticipant = isChallenger || isOpponent;
  const isMod = !!session && (session.user.role === "ADMIN" || session.user.role === "MODERATOR");

  const csN = match.challengerScore;
  const osN = match.opponentScore;
  const hasScore = csN != null && osN != null;
  const winnerId =
    match.outcome === "challenger_win"
      ? match.challengerId
      : match.outcome === "opponent_win"
        ? match.opponentId
        : hasScore
          ? csN > osN
            ? match.challengerId
            : osN > csN
              ? match.opponentId
              : null
          : null;

  const myConfirmed = isChallenger
    ? match.challengerConfirmed
    : isOpponent
      ? match.opponentConfirmed
      : null;

  const settlements = (match.transactions ?? []).filter((t) => t.reason === "MATCH_VERIFIED");
  const ccpAfter = (playerId: string, txns: CCPTransaction[]) =>
    txns.find((t) => t.playerId === playerId)?.newValue;

  async function accept() {
    await run(() => api.patch(`/matches/${matchId}/accept`));
  }
  async function submitResult() {
    await run(() =>
      api.patch(`/matches/${matchId}/result`, {
        challengerScore: Number(cs),
        opponentScore: Number(os),
        outcome,
      }),
    );
  }
  async function confirm() {
    await run(() => api.patch(`/matches/${matchId}/confirm`));
  }
  async function dispute() {
    await run(() => api.patch(`/matches/${matchId}/dispute`));
  }
  function onEvidenceFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const wantVideo = evKind === "VIDEO";
    const typeOk = wantVideo ? f.type.startsWith("video/") : f.type.startsWith("image/");
    if (!typeOk) {
      setActionErr(wantVideo ? "Choose a video file from your device" : "Choose an image file (PNG, JPEG, WebP) from your device");
      setEvFile(null);
    } else if (f.size > EVIDENCE_MAX_BYTES) {
      setActionErr("Evidence must be under 100 MB");
      setEvFile(null);
    } else {
      setActionErr(null);
      setEvFile(f);
    }
  }

  async function addEvidence() {
    if (evFile) {
      setBusy(true);
      setActionErr(null);
      try {
        const signed = await api.post<{ key: string; uploadUrl: string; publicUrl: string }>(
          `/matches/${matchId}/evidence/upload-url`,
          {
            fileName: evFile.name,
            contentType: evFile.type || "application/octet-stream",
            maxSizeBytes: EVIDENCE_MAX_BYTES,
          },
        );
        const res = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": evFile.type || "application/octet-stream" },
          body: evFile,
        });
        if (!res.ok) {
          throw new Error(`Storage upload failed (${res.status})`);
        }
        await api.post(`/matches/${matchId}/evidence`, {
          kind: evKind,
          url: signed.publicUrl,
          note: evNote || undefined,
        });
        setEvFile(null);
        setEvUrl("");
        setEvNote("");
      } catch (err) {
        setActionErr(err instanceof Error ? err.message : "Evidence upload failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    await run(() =>
      api.post(`/matches/${matchId}/evidence`, { kind: evKind, url: evUrl, note: evNote || undefined }).then(() => {
        setEvUrl("");
        setEvNote("");
      }),
    );
  }
  async function openReview() {
    await run(() => api.post(`/matches/${matchId}/review`));
  }
  async function verify() {
    await run(() => api.patch(`/matches/${matchId}/verify`));
  }
  async function rejectMatch() {
    await run(() => api.patch(`/matches/${matchId}/reject`, { reason: rejectReason }));
    setRejecting(false);
  }

  return (
    <div className="section">
      <div className="container">
        <Link className="meta" href="/account">
          ← Back to account
        </Link>
        <PageHead
          eyebrow={`Match record · ${fmtDateTime(match.createdAt)}`}
          title={`${match.challenger.codName} vs ${match.opponent.codName}`}
          action={<StatusBadge status={match.status} />}
        />

        <ErrorBox message={err} />
        <ErrorBox message={actionErr} />

        <div className="faceoff">
          <FaceoffPanel
            side="challenger"
            codName={match.challenger.codName}
            ccp={match.challenger.ccp}
            ccpAfter={settlements.length ? ccpAfter(match.challengerId, settlements) : undefined}
            won={winnerId === match.challengerId}
          />
          <div className="faceoff-vs">
            {hasScore ? (
              <div className="row" style={{ gap: 10 }}>
                <span className="faceoff-score">{csN}</span>
                <span aria-hidden="true">–</span>
                <span className="faceoff-score">{osN}</span>
              </div>
            ) : (
              <span>VS</span>
            )}
          </div>
          <FaceoffPanel
            side="opponent"
            codName={match.opponent.codName}
            ccp={match.opponent.ccp}
            ccpAfter={settlements.length ? ccpAfter(match.opponentId, settlements) : undefined}
            won={winnerId === match.opponentId}
          />
        </div>

        <div className="chips mt-lg" style={{ justifyContent: "center" }}>
          <span className="chip">
            <i className="t-flat" /> {match.challengerConfirmed ? "challenger confirmed" : "challenger pending"}
          </span>
          <span className="chip">
            <i className="t-flat" /> {match.opponentConfirmed ? "opponent confirmed" : "opponent pending"}
          </span>
          {hasScore ? (
            <span className="chip">
              <i className="t-flat" /> outcome: {match.outcome?.split("_").join(" ") ?? "—"}
            </span>
          ) : null}
          {match.status === "VERIFIED" || match.status === "REJECTED" ? (
            <span className="chip">
              <i className="t-flat" /> settled {fmtDateTime(match.verifiedAt)}
            </span>
          ) : null}
        </div>

        <div className="grid-2-1 mt-lg">
          <section className="card stack" style={{ gap: 14 }}>
            <div className="row-between">
              <div>
                <h4>Evidence</h4>
                <p className="meta mt-xs">
                  Verification requires at least one entry. Upload a screenshot or clip straight from
                  your device, or link an in-game match page.
                </p>
              </div>
            </div>

            {(match.evidence?.length ?? 0) === 0 ? (
              <EmptyState>No evidence filed yet</EmptyState>
            ) : (
              <div className="grid-2">
                {(match.evidence ?? []).map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`evidence ${match.status === "VERIFIED" ? "evidence-verified" : ""}`}
                  >
                    <span className="ev-label">
                      <strong>{ev.kind.split("_").join(" ")}</strong>
                      {ev.note}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {isParticipant && match.status !== "VERIFIED" && match.status !== "REJECTED" ? (
              <form
                className="stack"
                style={{ gap: "var(--gap-sm)", borderTop: "1px solid var(--border)", paddingTop: 18 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addEvidence();
                }}
              >
                <div className="grid-2">
                  <FormField label="Kind">
                    <select
                      className="select"
                      value={evKind}
                      onChange={(e) => {
                        const k = e.target.value as EvKind;
                        setEvKind(k);
                        if (k === "MATCH_RESULT_LINK") setEvFile(null);
                        else if (evFile && (k === "VIDEO") !== evFile.type.startsWith("video/")) {
                          setEvFile(null);
                        }
                      }}
                    >
                      <option value="SCREENSHOT">Screenshot</option>
                      <option value="VIDEO">Video</option>
                      <option value="MATCH_RESULT_LINK">Match result link</option>
                    </select>
                  </FormField>
                  {evKind === "MATCH_RESULT_LINK" ? (
                    <FormField label="URL">
                      <input
                        className="input"
                        required
                        placeholder="https://…"
                        value={evUrl}
                        onChange={(e) => setEvUrl(e.target.value)}
                      />
                    </FormField>
                  ) : (
                    <FormField label={evKind === "VIDEO" ? "Video clip" : "Proof image"}>
                      <div className="row" style={{ gap: 10, alignItems: "center" }}>
                        <input
                          ref={evFileRef}
                          type="file"
                          accept={evKind === "VIDEO" ? "video/*" : "image/*"}
                          onChange={onEvidenceFile}
                          style={{ display: "none" }}
                          aria-label={`Choose ${evKind === "VIDEO" ? "video" : "image"} from device`}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => evFileRef.current?.click()}
                        >
                          {evFile ? "Replace file" : "Choose from device"}
                        </button>
                        {evFile ? (
                          <span
                            className="mono muted"
                            style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}
                          >
                            {evFile.name}
                          </span>
                        ) : (
                          <span className="meta">no file chosen</span>
                        )}
                        {evFile ? (
                          <button type="button" className="btn btn-secondary minia" onClick={() => setEvFile(null)}>
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </FormField>
                  )}
                </div>
                <FormField label="Note (optional)">
                  <input
                    className="input"
                    value={evNote}
                    onChange={(e) => setEvNote(e.target.value)}
                    placeholder="e.g. round 4 screenshot, lobby scoreboard"
                  />
                </FormField>
                <div>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busy || (evKind === "MATCH_RESULT_LINK" ? !evUrl : !evFile)}
                    type="submit"
                  >
                    {busy ? "Filing…" : "File evidence"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="card stack" style={{ gap: 14 }}>
            <h4>Actions</h4>

            {!isParticipant && !isMod ? (
              <p className="meta">Only the challenger, the opponent, or moderators can act on this match.</p>
            ) : null}

            {match.status === "PENDING" && isOpponent ? (
              <div>
                <button className="btn btn-primary btn-block" disabled={busy} onClick={accept}>
                  {busy ? "…" : "Accept challenge"}
                </button>
                <p className="meta mt-xs">
                  CCP only moves once the match is verified with evidence.
                </p>
              </div>
            ) : null}

            {match.status === "ACCEPTED" && isParticipant ? (
              <form
                className="stack"
                style={{ gap: "var(--gap-sm)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitResult();
                }}
              >
                <div className="grid-2" style={{ gap: "var(--gap-sm)" }}>
                  <FormField label={`${match.challenger.codName} score`}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={cs}
                      onChange={(e) => setCs(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField label={`${match.opponent.codName} score`}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      required
                    />
                  </FormField>
                </div>
                <FormField label="Outcome">
                  <select
                    className="select"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as Outcome)}
                  >
                    <option value="challenger_win">{match.challenger.codName} won</option>
                    <option value="opponent_win">{match.opponent.codName} won</option>
                    <option value="disconnect">Disconnect / forfeit</option>
                  </select>
                </FormField>
                <button className="btn btn-primary btn-block" disabled={busy} type="submit">
                  {busy ? "Submitting…" : "Submit result"}
                </button>
              </form>
            ) : null}

            {match.status === "COMPLETED" && isParticipant && myConfirmed === false ? (
              <div className="stack" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-block" disabled={busy} onClick={confirm}>
                  {busy ? "…" : "Confirm result"}
                </button>
                <p className="meta">
                  {match.challengerConfirmed && !match.opponentConfirmed
                    ? "Waiting for the opponent to confirm."
                    : !match.challengerConfirmed && match.opponentConfirmed
                      ? "Waiting for the challenger to confirm."
                      : "Both confirmations send the result to verification."}
                </p>
              </div>
            ) : null}

            {match.status === "AWAITING_CONFIRMATION" && isParticipant ? (
              <div className="stack" style={{ gap: 10 }}>
                <button className="btn btn-danger btn-block" disabled={busy} onClick={dispute}>
                  {busy ? "…" : "Dispute result"}
                </button>
                <p className="meta">Disputes go straight to a moderator review round.</p>
              </div>
            ) : null}

            {match.status === "AWAITING_CONFIRMATION" && isMod && isParticipant !== true ? (
              <div className="stack" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-block" disabled={busy} onClick={verify}>
                  {busy ? "…" : "Verify & settle CCP"}
                </button>
                <p className="meta">Automatically rejected if no evidence has been filed.</p>
              </div>
            ) : null}

            {match.status === "AWAITING_CONFIRMATION" && isMod && isParticipant ? (
              <p className="meta">You play in this match, so a moderator on the bench verifies it.</p>
            ) : null}

            {match.status === "DISPUTED" && isMod ? (
              <div className="stack" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-block" disabled={busy} onClick={openReview}>
                  {busy ? "…" : "Open review"}
                </button>
                <p className="meta">Opening review puts the match under you. Verify or reject from there.</p>
              </div>
            ) : null}

            {match.status === "UNDER_REVIEW" && isMod ? (
              <div className="stack" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-block" disabled={busy} onClick={verify}>
                  {busy ? "…" : "Verify & settle CCP"}
                </button>
                {!rejecting ? (
                  <button className="btn btn-danger btn-block" disabled={busy} onClick={() => setRejecting(true)}>
                    Reject match
                  </button>
                ) : (
                  <form
                    className="stack"
                    style={{ gap: 8 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      rejectMatch();
                    }}
                  >
                    <FormField label="Rejection reason (shown in audit log)">
                      <input
                        className="input"
                        required
                        minLength={3}
                        placeholder="e.g. score does not match submission"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </FormField>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-danger btn-block" disabled={busy} type="submit">
                        {busy ? "…" : "Reject"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => setRejecting(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}

            {match.status === "VERIFIED" || match.status === "REJECTED" ? (
              <p className="meta">
                {match.status === "VERIFIED"
                  ? "CCP settled on this result. This match is closed."
                  : "This match was rejected and carries no CCP."}
              </p>
            ) : null}
          </section>
        </div>

        {settlements.length > 0 ? (
          <section className="section" style={{ paddingBottom: 0 }}>
            <h3 style={{ marginBottom: 14 }}>CCP settlement</h3>
            <div className="card ds-table-scroll">
              <table className="ds-table dense-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th className="num-col">Before</th>
                    <th className="num-col">Δ</th>
                    <th className="num-col">After</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((t) => (
                    <tr key={t.id}>
                      <td>{t.playerId === match.challengerId ? match.challenger.codName : match.opponent.codName}</td>
                      <td className="num-col">{formatCCP(t.oldValue)}</td>
                      <td className={`num-col ${t.amount >= 0 ? "t-up" : "t-down"}`} style={{ fontWeight: 600 }}>
                        {t.amount >= 0 ? "+" : ""}
                        {formatCCP(t.amount)}
                      </td>
                      <td className="num-col">
                        <strong>{formatCCP(t.newValue)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function FaceoffPanel({
  side,
  codName,
  ccp,
  ccpAfter,
  won,
}: {
  side: "challenger" | "opponent";
  codName: string;
  ccp: number;
  ccpAfter?: number;
  won: boolean;
}) {
  return (
    <div className={`faceoff-panel ${won ? "win" : ""}`}>
      <span className="meta">{side === "challenger" ? "Challenger" : "Opponent"}</span>
      <Avatar name={codName} size="lg" />
      <strong className="ladder-player" style={{ fontSize: 17 }}>
        {codName}
      </strong>
      <span className="mono muted">
        {formatCCP(ccp)} CCP{ccpAfter !== undefined && ccpAfter !== ccp ? ` → ${formatCCP(ccpAfter)}` : ""}
      </span>
      {won ? <span className="badge st-verified">Winner</span> : null}
    </div>
  );
}

export default function MatchDetailPage() {
  return (
    <Suspense>
      <MatchDetail />
    </Suspense>
  );
}