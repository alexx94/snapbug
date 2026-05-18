"use client";

import { SnapBug } from "@snapbug/sdk";
import type { SnapBugWidgetPlacement } from "@snapbug/shared/types";
import { useEffect, useMemo, useState } from "react";

const PLACEMENTS: SnapBugWidgetPlacement[] = ["bottom-right", "bottom-left", "top-right", "top-left"];

export function TestClient() {
  const [mode, setMode] = useState<"development" | "production">("development");
  const [placement, setPlacement] = useState<SnapBugWidgetPlacement>("bottom-right");
  const [captureReplay, setCaptureReplay] = useState(false);
  const [mounted, setMounted] = useState(false);

  const keys = useMemo(
    () => ({
      development: process.env.NEXT_PUBLIC_SNAPBUG_DEV_KEY,
      production: process.env.NEXT_PUBLIC_SNAPBUG_LIVE_KEY
    }),
    []
  );

  const developerToken = process.env.NEXT_PUBLIC_SNAPBUG_DEV_TOKEN;
  const activeKey = mode === "development" ? keys.development : keys.production;
  const keyPrefix = activeKey && !activeKey.includes("replace") ? activeKey.slice(0, 10) + "..." : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !activeKey || activeKey.includes("replace")) return;

    SnapBug.init({
      developmentKey: keys.development,
      productionKey: keys.production,
      developerToken,
      environment: mode,
      apiBaseUrl: process.env.NEXT_PUBLIC_SNAPBUG_API_BASE_URL || window.location.origin,
      captureReplay,
      trigger: mode === "development" ? "widget" : "none",
      placement,
      presentation: mode === "production" ? "modal" : "popover"
    });

    return () => SnapBug.destroy();
  }, [activeKey, captureReplay, developerToken, keys.development, keys.production, mode, mounted, placement]);

  function handlePlacement(value: string) {
    setPlacement(value as SnapBugWidgetPlacement);
  }

  function generateLogs() {
    console.log("SnapBug test log", { mode, at: new Date().toISOString() });
    console.warn("SnapBug warning example");
    console.error("SnapBug error example");
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Test client</h1>
          <p className="page-subtitle">Use this page to verify your SDK integration works end-to-end.</p>
        </div>
      </div>

      <section className="grid two">
        <div className="card stack">
          <h2 className="card-title">Setup guide</h2>
          <ol className="stack" style={{ paddingLeft: "1.25rem", listStyle: "decimal" }}>
            <li>
              <strong>Install the SDK</strong>
              <pre className="code">npm install @snapbug/sdk  # package is private until published</pre>
            </li>
            <li>
              <strong>Create a project</strong> in the <a href="/projects" style={{ textDecoration: "underline" }}>Projects</a> page and copy your keys.
            </li>
            <li>
              <strong>Add keys to <code>.env.local</code></strong>
              <pre className="code">{"NEXT_PUBLIC_SNAPBUG_DEV_KEY=pk_dev_...\nNEXT_PUBLIC_SNAPBUG_LIVE_KEY=pk_live_...\nNEXT_PUBLIC_SNAPBUG_DEV_TOKEN=sbdt_...  # optional, for dev attribution"}</pre>
            </li>
            <li>
              <strong>Initialize in your app</strong>
              <pre className="code">{"import { SnapBug } from '@snapbug/sdk';\n\nSnapBug.init({\n  developmentKey: import.meta.env.VITE_SNAPBUG_DEV_KEY,\n  productionKey: import.meta.env.VITE_SNAPBUG_LIVE_KEY,\n  developerToken: import.meta.env.VITE_SNAPBUG_DEV_TOKEN,\n  captureReplay: true,\n});"}</pre>
            </li>
            <li><strong>Restart dev server</strong> and the widget appears in dev mode.</li>
          </ol>
        </div>

        <div className="card stack">
          <h2 className="card-title">Live test</h2>

          <div className="stack" style={{ gap: "0.5rem" }}>
            <label className="muted" style={{ fontSize: "0.85rem" }}>Environment</label>
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value as "development" | "production")}>
              <option value="development">Development key</option>
              <option value="production">Production key</option>
            </select>
          </div>

          <div className="stack" style={{ gap: "0.5rem" }}>
            <label className="muted" style={{ fontSize: "0.85rem" }}>Widget placement</label>
            <select className="select" value={placement} onChange={(e) => handlePlacement(e.target.value)}>
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" checked={captureReplay} onChange={(e) => setCaptureReplay(e.target.checked)} />
            <span className="muted" style={{ fontSize: "0.85rem" }}>Capture session replay</span>
          </label>

          {keyPrefix ? (
            <p className="muted" style={{ fontSize: "0.8rem" }}>Active key: <code>{keyPrefix}</code>{developerToken ? " + developer token" : ""}</p>
          ) : null}

          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="button" type="button" onClick={() => SnapBug.open({ presentation: "modal" })}>
              Report a problem
            </button>
            <button className="button secondary" type="button" onClick={() => SnapBug.toggle()}>
              Toggle widget
            </button>
            <button className="button secondary" type="button" onClick={() => SnapBug.close()}>
              Close widget
            </button>
            <button className="button secondary" type="button" onClick={generateLogs}>
              Generate console logs
            </button>
          </div>

          {!activeKey || activeKey.includes("replace") ? (
            <p className="error">Add the generated {mode === "development" ? "NEXT_PUBLIC_SNAPBUG_DEV_KEY" : "NEXT_PUBLIC_SNAPBUG_LIVE_KEY"} to .env.local.</p>
          ) : (
            <p className="muted">
              {mode === "development" ? "The dev widget and this button coexist. Widget opens as popover, button opens as modal." : "Production mode: widget is hidden, only the button works."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
