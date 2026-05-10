"use client";

import { regenerateProjectKeyAction, type RegenerateKeyState } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { Copy, Check } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

type KeyRow = {
  id: string;
  environment: string;
  key_value: string | null;
  key_prefix: string;
  enabled: boolean;
  last_used_at: string | null;
};

const initialState: RegenerateKeyState = {};
type EnvFormat = "vite" | "next" | "cra" | "plain";

export function KeyManager({ projectId, keys }: { projectId: string; keys: KeyRow[] }) {
  const [state, action, pending] = useActionState(regenerateProjectKeyAction, initialState);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [envFormat, setEnvFormat] = useState<EnvFormat>("vite");
  const rows = useMemo(() => {
    return (["development", "production"] as const).map((environment) => ({
      environment,
      key: keys.find((item) => item.environment === environment)
    }));
  }, [keys]);

  const envLine = useMemo(() => {
    if (!state.key || !state.environment) return "";
    return envLineFor(state.environment, state.key);
  }, [envFormat, state.environment, state.key]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    window.setTimeout(() => setCopiedValue(null), 1500);
  }

  function variableNameFor(environment: string) {
    const suffix = environment === "development" ? "SNAPBUG_DEV_KEY" : "SNAPBUG_LIVE_KEY";
    if (envFormat === "vite") return `VITE_${suffix}`;
    if (envFormat === "next") return `NEXT_PUBLIC_${suffix}`;
    if (envFormat === "cra") return `REACT_APP_${suffix}`;
    return suffix;
  }

  function envLineFor(environment: string, key: string) {
    return `${variableNameFor(environment)}=${key}`;
  }

  function maskedKey(key: string) {
    const match = key.match(/^(pk_(?:dev|live)_)(.+)$/);
    if (!match) return "************";
    const [, prefix, rest] = match;
    const tail = rest.slice(-4);
    return `${prefix}************${tail}`;
  }

  function maskedEnvLineFor(environment: string, key: string) {
    return `${variableNameFor(environment)}=${maskedKey(key)}`;
  }

  return (
    <div className="stack">
      <p className="muted">
        Pick the client app type, copy the env line into that client app&apos;s <code>.env.local</code>, then restart its dev server.
        Old hash-only keys need one regeneration because the full value was not stored before.
      </p>

      <label className="stack">
        <span className="muted">Client app env format</span>
        <Select value={envFormat} onChange={(event) => setEnvFormat(event.target.value as EnvFormat)}>
          <option value="vite">Vite / React / Vue / SvelteKit client: VITE_</option>
          <option value="next">Next.js browser env: NEXT_PUBLIC_</option>
          <option value="cra">Create React App: REACT_APP_</option>
          <option value="plain">Plain variable name</option>
        </Select>
      </label>

      <div className="stack">
        {rows.map((row) => (
          <div className="key-row" key={row.environment}>
            <div className="row between">
              <div className="row">
                <span className={row.environment === "development" ? "badge dev" : "badge prod"}>{row.environment}</span>
                <span className="muted">Last used: {row.key?.last_used_at ? new Date(row.key.last_used_at).toLocaleString() : "Never"}</span>
              </div>
              <form action={action}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="environment" value={row.environment} />
                <Button variant="secondary" disabled={pending}>
                  {row.key ? "Regenerate" : "Generate"}
                </Button>
              </form>
            </div>
            <div>
                {row.key?.key_value ? (
                  <div className="row">
                    <code className="code" style={{ flex: 1 }}>{maskedEnvLineFor(row.environment, row.key.key_value)}</code>
                    <button className="button secondary" type="button" onClick={() => copyText(envLineFor(row.environment, row.key!.key_value!))}>
                      {copiedValue === envLineFor(row.environment, row.key.key_value) ? <Check size={16} /> : <Copy size={16} />}
                      {copiedValue === envLineFor(row.environment, row.key.key_value) ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : row.key?.key_prefix ? (
                  <span className="muted">{row.key.key_prefix} (old key, regenerate once to show full value)</span>
                ) : (
                  <span className="muted">No key generated</span>
                )}
            </div>
          </div>
        ))}
      </div>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.key ? (
        <div className="widget-toast">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          Key regenerated successfully
        </div>
      ) : null}
      {state.key ? (
        <div className="stack">
          <p className="muted">Copy this new {state.environment} variable now. It cannot be shown again later.</p>
          <div className="row">
            <div className="code" style={{ flex: 1 }}>{state.key && state.environment ? maskedEnvLineFor(state.environment, state.key) : envLine}</div>
            <button className="button secondary" type="button" onClick={() => copyText(envLine)}>
              {copiedValue === envLine ? <Check size={16} /> : <Copy size={16} />}
              {copiedValue === envLine ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
