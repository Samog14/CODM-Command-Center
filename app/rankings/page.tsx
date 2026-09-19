"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RankingRow } from "@/lib/types";
import { formatCCP } from "@/lib/tiers";
import { Avatar, EmptyState, ErrorBox, PageHead, TierBadge } from "@/components/ui";

export default function RankingsPage() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get<RankingRow[]>("/rankings?limit=100", { auth: false });
        if (alive) setRows(data);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not load rankings");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = term ? rows.filter((r) => r.codName.toLowerCase().includes(term)) : rows;

  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="Regional ladder"
          title="Standings"
          lead="Every verified 1v1 moves CCP. Standings are recomputed live from settled matches — no editorial picks."
          action={
            <div className="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="input"
                type="search"
                placeholder="Find a player…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Filter players"
                style={{ width: 260 }}
              />
            </div>
          }
        />

        {err ? <ErrorBox message={err} /> : null}

        <div className="card ds-table-scroll">
          <table className="ds-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Division</th>
                <th className="num-col">CCP</th>
                <th style={{ width: 92 }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !err ? (
                <tr>
                  <td colSpan={5} style={{ padding: "26px 12px" }}>
                    <EmptyState>No ranked players yet</EmptyState>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "26px 12px" }}>
                    <EmptyState>No player matches &ldquo;{q}&rdquo;</EmptyState>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.codName}>
                    <td className="num-col">{r.rank}</td>
                    <td>
                      <span className="row" style={{ gap: 12 }}>
                        <Avatar name={r.codName} size="sm" tier={r.tier} />
                        <span>
                          <span className="ladder-player" style={{ display: "inline-block" }}>
                            {r.codName}
                          </span>
                          {r.provisional ? (
                            <span className="meta" style={{ marginLeft: 8 }}>
                              provisional
                            </span>
                          ) : (
                            <span className="meta" style={{ marginLeft: 8 }}>
                              {r.rank <= 10 ? "tipped for legendary" : "established"}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      <TierBadge tier={r.tier} />
                    </td>
                    <td className="num-col">
                      <strong>{formatCCP(r.ccp)}</strong>
                    </td>
                    <td className="right">
                      <span className="trend t-new">▲ season 1</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}