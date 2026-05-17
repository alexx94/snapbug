"use client";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/fields";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { Box, Check, Code2, Copy, FileCode2, Globe2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

type DeveloperTokenRow = {
  id: string;
  name: string;
  last_used_at: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type EnvFormat = "vite" | "next" | "cra" | "plain";
const envFormats: Array<{ value: EnvFormat; label: string; description: string; Icon: typeof Code2 }> = [
  { value: "vite", label: "Vite", description: "VITE_", Icon: Code2 },
  { value: "next", label: "Next.js", description: "NEXT_PUBLIC_", Icon: Box },
  { value: "cra", label: "CRA", description: "REACT_APP_", Icon: FileCode2 },
  { value: "plain", label: "Plain", description: "No prefix", Icon: Globe2 }
];

export function DeveloperTokensPanel({ tokens }: { tokens: DeveloperTokenRow[] }) {
  const [rows, setRows] = useState(tokens);
  const [name, setName] = useState("Development token");
  const [envFormat, setEnvFormat] = useState<EnvFormat>("vite");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<OperationToastState>(null);
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setToast({ id: Date.now(), message: "Copied to clipboard", type: "success" });
    window.setTimeout(() => setCopied(null), 1500);
  }

  async function createToken() {
    setPending(true);
    setError(null);
    const hasActiveToken = rows.some((row) => !row.revoked_at);
    const response = await fetch(hasActiveToken ? "/api/developer-tokens/regenerate" : "/api/developer-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; token?: string; developerToken?: DeveloperTokenRow };
    setPending(false);

    if (!response.ok || !body.token || !body.developerToken) {
      setError(body.error || "Could not create developer token");
      setToast({ id: Date.now(), message: body.error || "Could not create developer token", type: "error" });
      return;
    }

    setRevealedToken(body.token);
    setRows((current) => [body.developerToken!, ...(hasActiveToken ? current.map((row) => ({ ...row, revoked_at: row.revoked_at || new Date().toISOString() })) : current)]);
    setToast({ id: Date.now(), message: hasActiveToken ? "Developer token regenerated" : "Developer token created", type: "success" });
  }

  async function revoke(tokenId: string) {
    setRevokeTokenId(null);
    setPending(true);
    setError(null);
    const response = await fetch(`/api/developer-tokens/${tokenId}/revoke`, { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error || "Could not revoke developer token");
      setToast({ id: Date.now(), message: body.error || "Could not revoke developer token", type: "error" });
      return;
    }

    setRows((current) => current.map((row) => (row.id === tokenId ? { ...row, revoked_at: new Date().toISOString() } : row)));
    setToast({ id: Date.now(), message: "Developer token revoked", type: "success" });
  }

  const envLine = revealedToken ? `${variableName(envFormat)}=${revealedToken}` : "";

  return (
    <div className="stack">
      <OperationToast toast={toast} />
      <p className="muted">Developer tokens are required for development reports. Tokens expire after 90 days and are shown only once.</p>

      <div className="developer-token-form">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Token name" />
        <Button type="button" onClick={createToken} disabled={pending}>
          <ShieldCheck size={16} />
          {pending ? "Generating..." : "Generate token"}
        </Button>
      </div>

      <div className="env-format-grid" role="radiogroup" aria-label="Developer token env format">
        {envFormats.map(({ value, label, description, Icon }) => (
          <button
            aria-checked={envFormat === value}
            className={`env-format-option${envFormat === value ? " active" : ""}`}
            key={value}
            onClick={() => setEnvFormat(value)}
            role="radio"
            type="button"
          >
            <Icon size={18} />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </button>
        ))}
      </div>

      {revealedToken ? (
        <div className="stack">
          <p className="muted">Copy this token now. It will not be shown again.</p>
          <div className="row">
            <code className="code" style={{ flex: 1 }}>{maskEnvLine(envLine)}</code>
            <button className="button secondary" type="button" onClick={() => copy(envLine)}>
              {copied === envLine ? <Check size={16} /> : <Copy size={16} />}
              {copied === envLine ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="attachment-list">
        {rows.length ? (
          rows.map((token) => (
            <div className="attachment-list-item" key={token.id}>
              <div>
                <strong>{token.name}</strong>
                <p className="muted">
                  Expires {new Date(token.expires_at).toLocaleDateString()} - Last used{" "}
                  {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : "never"}
                </p>
                {token.revoked_at ? <span className="badge priority-critical">Revoked</span> : <span className="badge priority-low">Active</span>}
              </div>
              {!token.revoked_at ? (
                <Button type="button" variant="secondary" onClick={() => setRevokeTokenId(token.id)} disabled={pending}>
                  <Trash2 size={16} />
                  {pending ? "Revoking..." : "Revoke"}
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted">No developer tokens yet.</p>
        )}
      </div>
      {revokeTokenId ? (
        <ConfirmModal
          confirmLabel="Revoke token"
          description="Development ingest using this token will stop working immediately."
          onCancel={() => setRevokeTokenId(null)}
          onConfirm={() => revoke(revokeTokenId)}
          pending={pending}
          title="Revoke developer token?"
        />
      ) : null}
    </div>
  );
}

function variableName(format: EnvFormat) {
  if (format === "vite") return "VITE_SNAPBUG_DEV_TOKEN";
  if (format === "next") return "NEXT_PUBLIC_SNAPBUG_DEV_TOKEN";
  if (format === "cra") return "REACT_APP_SNAPBUG_DEV_TOKEN";
  return "SNAPBUG_DEV_TOKEN";
}

function maskEnvLine(line: string) {
  return line.replace(/sbdt_[A-Za-z0-9_-]+/, "sbdt_************");
}
