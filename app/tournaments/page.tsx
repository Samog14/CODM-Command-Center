"use client";

import Link from "next/link";
import { EventsBoard } from "@/components/events";
import { PageHead } from "@/components/ui";

export default function TournamentsPage() {
  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="Tournaments"
          title="Season events"
          lead="Scheduled brackets paid in CCP, with paid wildcard entries for players who didn't qualify on points."
        />

        <EventsBoard
          types={["TOURNAMENT", "QUALIFIER"]}
          limit={100}
          empty="No brackets are scheduled yet — check the admin center for upcoming events."
        />

        <section className="card" style={{ marginTop: "var(--gap-lg)" }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Wildcard entries <span className="arrow">▸</span>
          </p>
          <h3>Every paid entry is verified server-side</h3>
          <p className="lead" style={{ fontSize: 14, marginTop: 8 }}>
            Wildcard registrations are a distinct entry type carrying their own CCP rule, and seats
            unlock only after the Paystack webhook signature is verified on the API. A client-side
            &ldquo;payment toast&rdquo; is never trusted.
          </p>
          <div className="chips mt-md">
            <span className="chip">
              <i /> entryType: standard
            </span>
            <span className="chip">
              <i /> entryType: wildcard
            </span>
          </div>
          <div className="mt-md">
            <Link className="btn btn-secondary btn-sm" href="/matches/new">
              Keep building your standing
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}