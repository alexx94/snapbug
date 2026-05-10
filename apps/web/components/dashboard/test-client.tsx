"use client";

import { SnapBug } from "@snapbug/sdk";
import { useEffect, useMemo, useState } from "react";

export function TestClient() {
  const [mode, setMode] = useState<"development" | "production">("development");
  const [mounted, setMounted] = useState(false);

  const keys = useMemo(
    () => ({
      development: process.env.NEXT_PUBLIC_SNAPBUG_DEV_KEY,
      production: process.env.NEXT_PUBLIC_SNAPBUG_LIVE_KEY
    }),
    []
  );

  const activeKey = mode === "development" ? keys.development : keys.production;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !activeKey || activeKey.includes("replace")) return;

    SnapBug.init({
      developmentKey: keys.development,
      productionKey: keys.production,
      environment: mode,
      apiBaseUrl: process.env.NEXT_PUBLIC_SNAPBUG_API_BASE_URL || window.location.origin,
      captureReplay: false,
      trigger: mode === "development" ? "widget" : "none",
      presentation: mode === "production" ? "modal" : "popover"
    });

    return () => SnapBug.destroy();
  }, [activeKey, keys.development, keys.production, mode, mounted]);

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
              <pre className="code">{"NEXT_PUBLIC_SNAPBUG_DEV_KEY=pk_dev_...\nNEXT_PUBLIC_SNAPBUG_LIVE_KEY=pk_live_..."}</pre>
            </li>
            <li>
              <strong>Initialize in your app</strong>
              <pre className="code">{"import { SnapBug } from '@snapbug/sdk';\n\nSnapBug.init({\n  developmentKey: import.meta.env.VITE_SNAPBUG_DEV_KEY,\n  productionKey: import.meta.env.VITE_SNAPBUG_LIVE_KEY,\n});"}</pre>
            </li>
            <li><strong>Restart dev server</strong> and the widget appears in dev mode.</li>
          </ol>
        </div>

        <div className="card stack">
          <h2 className="card-title">Live test</h2>
          <select className="select" value={mode} onChange={(event) => setMode(event.target.value as "development" | "production")}>
            <option value="development">Development key</option>
            <option value="production">Production key</option>
          </select>
          <button className="button" type="button" onClick={() => SnapBug.open({ presentation: "modal" })}>
            Report a problem
          </button>
          <button className="button secondary" type="button" onClick={generateLogs}>
            Generate console logs
          </button>
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
