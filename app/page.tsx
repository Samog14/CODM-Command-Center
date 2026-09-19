"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CCPEvent, Match, RankingRow } from "@/lib/types";
import { formatCCP, fmtDate } from "@/lib/tiers";
import { EmptyState, ErrorBox, Loading, StatusBadge, TierBadge } from "@/components/ui";
import { EventCard, FeaturedFlyers } from "@/components/events";

export default function HomePage() {
  const [ladder, setLadder] = useState<RankingRow[]>([]);
  const [feed, setFeed] = useState<Match[]>([]);
  const [nextEvents, setNextEvents] = useState<CCPEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [l, f, ev] = await Promise.all([
          api.get<RankingRow[]>("/rankings?limit=100", { auth: false }),
          api.get<Match[]>("/matches?limit=6", { auth: false }),
          api.get<CCPEvent[]>("/events?limit=3", { auth: false }),
        ]);
        if (!alive) return;
        setLadder(l);
        setFeed(f);
        setNextEvents(ev);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not reach the API");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const topFive = ladder.slice(0, 5);

  return (
    <>
      <div className="hero mesh">
        <div className="container hero-split">
          <div>
            <p className="hero-kicker">
              <span className="live-dot" /> Live · 1v1 ladder — Season 1
            </p>
            <h1 className="stacked-tagline">
              <span className="t-1">Provable</span>
              <span className="t-2">skill.</span>
              <span className="t-3">Honest ranks.</span>
            </h1>
            <p className="lead mt-md">
              Ranked 1v1 matches with verified outcomes. Every score confirmed by both players,
              every result locked on evidence, every rank earned — not bought.
            </p>
            <div className="hero-cta mt-lg">
              <Link className="btn btn-primary btn-lg btn-arrow" href="/register">
                Join the ladder
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/rankings">
                View rankings
              </Link>
            </div>
          </div>
          <RankPreview rows={topFive} loading={!ladder.length && !err} />
        </div>
      </div>

      <div className="container" style={{ paddingBlock: "clamp(20px, 3vw, 34px)" }}>
        {err ? <ErrorBox message={err} /> : null}
        <div className="grid-4">
          <div className="kpi">
            <div className="kpi-num num">{ladder.length ? formatCCP(ladder.length) : "—"}</div>
            <div className="kpi-label">Tracked players</div>
          </div>
          <div className="kpi">
            <div className="kpi-num num">{feed.length ? formatCCP(feed.length) : "—"}</div>
            <div className="kpi-label">Latest verified matches</div>
          </div>
          <div className="kpi kpi-gold">
            <div className="kpi-num">8</div>
            <div className="kpi-label">Divisions · Recruit → Legendary</div>
          </div>
          <div className="kpi kpi-red">
            <div className="kpi-num">S1</div>
            <div className="kpi-label">Season 1 in progress</div>
          </div>
        </div>
      </div>

      {nextEvents.length ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="stack">
                <p className="eyebrow">
                  Up next <span className="arrow">▸</span>
                </p>
                <h2>Scheduled events</h2>
              </div>
              <Link className="btn btn-secondary btn-sm" href="/tournaments">
                All events
              </Link>
            </div>
            <div className="grid-2">
              {nextEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FeaturedFlyers />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="stack">
              <p className="eyebrow">
                Regional ladder <span className="arrow">▸</span>
              </p>
              <h2>Top of the standings</h2>
            </div>
            <Link className="btn btn-secondary btn-sm" href="/rankings">
              Full ladder
            </Link>
          </div>
          <div className="card ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Division</th>
                  <th className="num-col">CCP</th>
                  <th className="right">Standing</th>
                </tr>
              </thead>
              <tbody>
                {ladder.length === 0 && !err ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "26px 12px" }}>
                      <EmptyState>Waiting for the first verified match…</EmptyState>
                    </td>
                  </tr>
                ) : (
                  ladder.map((r) => (
                    <tr key={r.codName}>
                      <td className="num-col">{r.rank}</td>
                      <td>
                        <span className="ladder-player" style={{ display: "inline-block" }}>
                          {r.codName}
                        </span>
                        {r.provisional ? (
                          <span className="meta" style={{ marginLeft: 8 }}>
                            provisional
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <TierBadge tier={r.tier} />
                      </td>
                      <td className="num-col">
                        <strong>{formatCCP(r.ccp)}</strong>
                      </td>
                      <td className="right">
                        <span className="trend t-flat">peer-verified</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="stack">
              <p className="eyebrow">
                Match feed <span className="arrow">▸</span>
              </p>
              <h2>Latest verified results</h2>
            </div>
          </div>
          <div className="card">
            {feed.length === 0 && !err ? (
              <EmptyState>No verified results yet</EmptyState>
            ) : (
              <div className="stack" style={{ gap: 0 }}>
                {feed.map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="log-row">
                    <span className="meta">{fmtDate(m.verifiedAt)}</span>
                    <h3>
                      {m.challenger.codName} <span className="muted-2">def.</span>{" "}
                      {m.opponent.codName}
                      {m.challengerScore != null && m.opponentScore != null ? (
                        <span className="mono muted" style={{ marginLeft: 10 }}>
                          {m.challengerScore}–{m.opponentScore}
                        </span>
                      ) : null}
                    </h3>
                    <span className="pull">
                      <StatusBadge status={m.status} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", justifyContent: "center" }}>
            <div className="stack">
              <p className="eyebrow">
                Common questions <span className="arrow">▸</span>
              </p>
              <h2>Know before you queue</h2>
            </div>
          </div>
          <div className="faq">
            <details>
              <summary>Why was CODM Command Center built?</summary>
              <p>
                To give the regional scene a 1v1 ladder where standing is actually earned. No
                matchmaking luck, no bought boosts — just players challenging each other, proving
                the score, and climbing on verified results. It started as a community ranking and is run by
                players, for players, at no cost to join.
              </p>
            </details>
            <details>
              <summary>Who can join? Do I have to be a pro?</summary>
              <p>
                Anyone who plays CODM. You do not need a minimum rank, a device tier, or any
                professional history — if you can get in-game and play a 1v1, you can climb. New
                players carry a short provisional standing that clears after their first handful of
                verified matches. Register an account and challenge someone from the ladder.
              </p>
            </details>
            <details>
              <summary>How do results become official?</summary>
              <p>
                A match only counts once verified. Both players agree on the outcome, at least
                one piece of evidence is filed (a screenshot or clip uploaded straight from your
                device, or a match-result link), and a moderator confirms it matches the submitted
                score. Only then does CCP move and the result hit the ladder. Disputes jump the
                queue into a moderator review round instead of counting silently.
              </p>
            </details>
            <details>
              <summary>Is CODM Command Center affiliated with CODM?</summary>
              <p>
                No. This is an independent, community-run platform and is not affiliated with,
                endorsed by, or connected to Activision Publishing or Call of Duty: Mobile. The
                1v1 modes are just the arena — rankings, CCP, and divisions are entirely our
                own.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="king-card grid-2-1" style={{ gap: "var(--gap-xl)", alignItems: "center" }}>
            <div className="stack">
              <p className="eyebrow" style={{ marginBottom: 10 }}>
                King of the Hill <span className="arrow">▸</span>
              </p>
              <h3 style={{ fontSize: 26 }}>The throne changes hands weekly.</h3>
              <p className="lead" style={{ marginTop: 8 }}>
                Hold the crown through Friday, end the season sitting on it, and the kingdom is
                yours. Qualifiers open every weekend.
              </p>
              <div className="mt-md">
                <Link className="btn btn-gold" href="/koth">
                  Claim the throne
                </Link>
              </div>
            </div>
            <div className="king-streak">
              <div className="num-big">24h</div>
              <p className="meta">until the next qualifier</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function RankPreview({ rows, loading }: { rows: RankingRow[]; loading: boolean }) {
  return (
    <aside className="rank-preview corners glow-blue" aria-label="Top of the ladder">
      <div className="rp-head">
        <span className="meta">Regional Ladder</span>
        <span className="badge st-verified">
          <span className="dot" /> Live
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState>No ranked players yet</EmptyState>
      ) : (
        rows.map((r) => (
          <div className={r.rank === 1 ? "rp-row live" : "rp-row"} key={r.codName}>
            <span className={r.rank <= 3 ? "rp-rank gold" : "rp-rank"}>{r.rank}</span>
            <span className="rp-name">{r.codName}</span>
            <TierBadge tier={r.tier} />
            <span className="rp-ccp num">{formatCCP(r.ccp)}</span>
          </div>
        ))
      )}
    </aside>
  );
}