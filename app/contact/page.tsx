"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHead, EmptyState, ErrorBox } from "@/components/ui";

interface ContactSetting {
  key: string;
  value: string;
}

type Channel =
  | { kind: "whatsapp"; label: string; value: string; href: string }
  | { kind: "snapchat"; label: string; value: string; href: string }
  | { kind: "email"; label: string; value: string; href: string };

function buildChannels(settings: ContactSetting[]): Channel[] {
  const find = (suffix: string) => settings.find((s) => s.key === `contact.${suffix}`)?.value.trim();

  const channels: Channel[] = [];
  const whatsapp = find("whatsapp");
  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, "");
    channels.push({
      kind: "whatsapp",
      label: "WhatsApp",
      value: whatsapp,
      href: `https://wa.me/${digits}`,
    });
  }
  const snapchat = find("snapchat");
  if (snapchat) {
    channels.push({
      kind: "snapchat",
      label: "Snapchat",
      value: snapchat,
      href: `https://snapchat.com/add/${encodeURIComponent(snapchat.replace(/^@/, ""))}`,
    });
  }
  const email = find("email");
  if (email) {
    channels.push({
      kind: "email",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
    });
  }
  return channels;
}

function ChannelIcon({ kind }: { kind: Channel["kind"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {kind === "whatsapp" ? (
        <>
          <path d="M12 3a8.5 8.5 0 0 0-7.3 12.7L3.5 20.5l5-1.2A8.5 8.5 0 1 0 12 3Z" />
          <path d="M9 8.5c0 4 2.5 6.5 6.5 6.5" />
        </>
      ) : kind === "snapchat" ? (
        <>
          <path d="M12 3c2.5 0 5 2 5 5.2 0 1.6-.4 2.8-1.2 4 .6.3 1.6.4 2.4-.2.3-.2.6.2.4.5-.7 1.4-2.6 2-4.6 1.8-.3 1.2-1.3 2-2.9 2.4-.6.2-1.3.2-2.1.2-.8 0-1.5 0-2.1-.2-1.6-.4-2.6-1.2-2.9-2.4-2 .2-3.9-.4-4.6-1.8-.2-.3.1-.7.4-.5.8.6 1.8.5 2.4.2-.8-1.2-1.2-2.4-1.2-4 0-3.2 2.5-5.2 5-5.2Z" />
          <path d="M7.5 18.5c1 .7 2.5 1 4.5 1s3.5-.3 4.5-1" />
        </>
      ) : (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 8l8 5.5L20 8" />
        </>
      )}
    </svg>
  );
}

export default function ContactPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const settings = await api.get<ContactSetting[]>("/settings/public");
        setChannels(buildChannels(settings));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load contact details");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="section">
      <div className="container">
        <PageHead
          eyebrow="Get in touch"
          title="Contact the staff"
          lead="Questions about the ladder, disputes, tournament entries, or payments? Reach an admin directly."
        />

        <ErrorBox message={err} />

        {loading ? (
          <EmptyState>Loading contact channels…</EmptyState>
        ) : channels.length === 0 ? (
          <EmptyState>
            Contact channels have not been published yet — the admin can add WhatsApp, Snapchat, or
            an email from the staff area (Settings tab).
          </EmptyState>
        ) : (
          <div className="grid-2" style={{ gap: 16 }}>
            {channels.map((c) => (
              <a key={c.kind} className="card" href={c.href} target="_blank" rel="noreferrer" style={{ display: "block", padding: 22 }}>
                <span
                  className="avatar avatar-sm"
                  style={{ color: "var(--accent-mist)", border: "1px solid var(--border-strong)", width: 44, height: 44 }}
                >
                  <ChannelIcon kind={c.kind} />
                </span>
                <p style={{ fontWeight: 600, fontSize: 15, marginTop: 12, marginBottom: 2 }}>{c.label}</p>
                <p className="meta" style={{ whiteSpace: "normal" }}>
                  {c.value}
                </p>
                <p className="meta" style={{ marginTop: 10, color: "var(--accent-mist)" }}>
                  Open {c.label} <span className="arrow">→</span>
                </p>
              </a>
            ))}
          </div>
        )}

        <p className="meta" style={{ marginTop: "var(--gap-lg)" }}>
          Match disputes are handled through the match itself — open the match and file a dispute so
          a moderator can review the evidence. This page is for everything else.
        </p>
      </div>
    </div>
  );
}