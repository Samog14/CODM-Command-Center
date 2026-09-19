"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "./session";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Rankings" },
  { href: "/koth", label: "King of the Hill" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/contact", label: "Contact" },
] as const;

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="brand" onClick={onClick}>
      <span className="brand-mark">
        <CrosshairIcon />
      </span>
      <span className="brand-name">
        Command Rankings
        <small>CODM · Regional Hub</small>
      </span>
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const isMod = !!session && (session.user.role === "ADMIN" || session.user.role === "MODERATOR");
  const nav = isMod ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  const primary = nav.map((l) => (
    <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
      {l.label}
    </Link>
  ));

  return (
    <header className="topnav">
      <div className="container topnav-inner">
        <Brand onClick={close} />
        <nav className="topnav-links" aria-label="Primary">
          {primary}
        </nav>
        <div className="topnav-cta">
          {session ? (
            <Link href="/account" className="btn btn-secondary btn-sm">
              {session.user.codName}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </div>
        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <MenuIcon />
        </button>
      </div>
      <nav id="mobile-menu" className={`mobile-menu ${open ? "is-open" : ""}`} aria-label="Mobile">
        {primary}
        {session ? (
          <Link href="/account" onClick={close}>
            Account
          </Link>
        ) : (
          <>
            <Link href="/login" onClick={close}>
              Sign in
            </Link>
            <Link href="/register" onClick={close}>
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="pagefoot">
      <div className="container">
        <div className="foot-grid">
          <div>
            <Brand />
            <p className="muted" style={{ maxWidth: "34ch", marginTop: 14, fontSize: 12.5 }}>
              Community-run 1v1 ladder, evidence-verified rankings, and seasonal tournaments for
              CODM.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li>
                <Link href="/rankings">Rankings</Link>
              </li>
              <li>
                <Link href="/koth">King of the Hill</Link>
              </li>
              <li>
                <Link href="/tournaments">Tournaments</Link>
              </li>
              <li>
                <Link href="/matches/new">New match</Link>
              </li>
              <li>
                <Link href="/contact">Contact staff</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li>
                <Link href="/login">Sign in</Link>
              </li>
              <li>
                <Link href="/register">Register</Link>
              </li>
              <li>
                <Link href="/account">Profile</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>System</h4>
            <ul>
              <li>
                <Link href="/admin">Staff area</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 CODM Command Center — community-run, not affiliated with Activision.</span>
          <span className="mono">ver 0.1 · regional hub</span>
        </div>
      </div>
    </footer>
  );
}

export function AppSkeleton() {
  return (
    <div className="container" style={{ paddingBlock: 120 }}>
      <div className="empty-state">Loading session…</div>
    </div>
  );
}