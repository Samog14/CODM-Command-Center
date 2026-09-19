"use client";

import Link from "next/link";
import { EventsBoard } from "@/components/events";
import { PageHead } from "@/components/ui";

export default function KothPage() {
  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="King of the Hill"
          title="The throne"
          lead="A weekly mini-season within the ladder: dethrone the current king, then defend on every Friday qualifier."
        />

        <EventsBoard
          types={["KOTH"]}
          limit={50}
          empty="No King of the Hill session is scheduled yet — admins publish qualifiers here."
        />

        <div className="king-card glow-gold" style={{ marginTop: "var(--gap-lg)" }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            How it works <span className="arrow">▸</span>
          </p>
          <p className="lead" style={{ marginTop: 8 }}>
            The crown holder earns a gold KOTH reward every week they hold it, and qualifiers are
            open to everyone with an established standing. Rewards are governed by SystemSettings —
            nothing is hard-coded.
          </p>
          <div className="mt-md">
            <Link className="btn btn-gold" href="/rankings">
              Climb the ladder in the meantime
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}