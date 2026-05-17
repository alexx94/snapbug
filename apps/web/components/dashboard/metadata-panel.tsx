"use client";

import { useState } from "react";

type MetadataPanelProps = {
  browser: unknown;
  viewport: unknown;
  metadata: unknown;
  userAgent: string | null;
  pageUrl: string;
  origin: string;
  createdAt: string;
};

export function MetadataPanel({ browser, viewport, metadata, userAgent, pageUrl, origin, createdAt }: MetadataPanelProps) {
  const [view, setView] = useState<"summary" | "raw">("summary");
  const browserInfo = asRecord(browser);
  const viewportInfo = asRecord(viewport);
  const parsedAgent = parseUserAgent(userAgent || "");
  const raw = { browser, viewport, metadata, userAgent, pageUrl, origin, createdAt };
  const items = [
    ["Browser", parsedAgent.browser || "Unknown"],
    ["Operating system", parsedAgent.os || String(browserInfo.platform || "Unknown")],
    ["Language", String(browserInfo.language || "Unknown")],
    ["Cookies", typeof browserInfo.cookieEnabled === "boolean" ? (browserInfo.cookieEnabled ? "Enabled" : "Disabled") : "Unknown"],
    ["Viewport", viewportLabel(viewportInfo)],
    ["Device pixel ratio", String(viewportInfo.devicePixelRatio || "Unknown")],
    ["Created", new Date(createdAt).toLocaleString()]
  ];

  return (
    <div className="stack">
      <div className="inline-tabs" role="tablist" aria-label="Metadata view">
        <button aria-selected={view === "summary"} onClick={() => setView("summary")} role="tab" type="button">
          Metadata
        </button>
        <button aria-selected={view === "raw"} onClick={() => setView("raw")} role="tab" type="button">
          Raw data
        </button>
      </div>

      {view === "summary" ? (
        <div className="metadata-grid">
          {items.map(([label, value]) => (
            <div className="metadata-item" key={label}>
              <span>{label}</span>
              <strong title={value}>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <pre className="code">{JSON.stringify(raw, null, 2)}</pre>
      )}
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function viewportLabel(viewport: Record<string, unknown>) {
  const width = Number(viewport.width);
  const height = Number(viewport.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return "Unknown";
  return `${width} x ${height}`;
}

function parseUserAgent(userAgent: string) {
  const browser =
    match(userAgent, /(Edg)\/([\d.]+)/, "Edge") ||
    match(userAgent, /(Chrome)\/([\d.]+)/, "Chrome") ||
    match(userAgent, /(Firefox)\/([\d.]+)/, "Firefox") ||
    match(userAgent, /(Version)\/([\d.]+).*Safari/, "Safari");
  const os =
    userAgent.includes("Windows") ? "Windows" :
    userAgent.includes("Mac OS X") ? "macOS" :
    userAgent.includes("Android") ? "Android" :
    /iPhone|iPad/.test(userAgent) ? "iOS" :
    userAgent.includes("Linux") ? "Linux" :
    "";
  return { browser, os };
}

function match(userAgent: string, pattern: RegExp, label: string) {
  const result = userAgent.match(pattern);
  return result ? `${label} ${result[2] || ""}`.trim() : "";
}
