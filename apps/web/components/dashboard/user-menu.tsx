"use client";

import Link from "next/link";
import { useState } from "react";

export function UserMenu({ email, fullName, signOut }: { email: string; fullName: string | null; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const initials = (fullName || email).charAt(0).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="user-avatar">{initials}</span>
        <span className="user-menu-email">{email}</span>
      </button>
      {open ? (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} role="presentation" />
          <div className="user-menu-dropdown">
            {fullName ? <strong>{fullName}</strong> : null}
            <span className="muted" style={{ fontSize: "0.85rem" }}>{email}</span>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />
            <Link href="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
              Settings
            </Link>
            <form action={signOut}>
              <button type="submit" className="user-menu-item" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "inherit", font: "inherit", padding: "0.4rem 0" }}>
                Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
