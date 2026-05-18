"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/projects", label: "Projects" },
  { href: "/test-client", label: "Test client" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop nav — hidden on mobile */}
      <nav className="nav nav-desktop">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>

      {/* Hamburger — hidden on desktop */}
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="17" y2="6" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="14" x2="17" y2="14" />
          </svg>
        )}
      </button>

      {/* Mobile panel */}
      {open && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <nav className="mobile-nav-panel">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`mobile-nav-link${isActive(href) ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
