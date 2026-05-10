"use client";

import { useEffect, useState } from "react";

export function ArtifactViewer({
  reportId,
  artifact
}: {
  reportId: string;
  artifact: { id: string; kind: string; content_type: string };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/reports/${reportId}/artifacts/${artifact.id}/signed-url`);
      const body = (await response.json()) as { signedUrl?: string; error?: string };
      if (!response.ok || !body.signedUrl) {
        if (!cancelled) setError(body.error || "Could not load artifact");
        return;
      }

      if (cancelled) return;
      setUrl(body.signedUrl);

      if (artifact.content_type === "application/json") {
        const jsonResponse = await fetch(body.signedUrl);
        const raw = await jsonResponse.text();
        if (!cancelled) setText(raw);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [artifact.content_type, artifact.id, reportId]);

  if (error) return <p className="error">{error}</p>;
  if (!url) return <p className="muted">Loading artifact...</p>;

  if (artifact.content_type.startsWith("image/")) {
    return (
      <>
        <img
          alt={artifact.kind}
          src={url}
          onClick={() => setExpanded(true)}
          style={{ border: "2px solid var(--border)", borderRadius: 8, maxWidth: "100%", cursor: "zoom-in" }}
        />
        {expanded ? (
          <div className="artifact-lightbox" onClick={() => setExpanded(false)}>
            <img alt={artifact.kind} src={url} className="artifact-lightbox-img" />
          </div>
        ) : null}
      </>
    );
  }

  return <pre className="code">{text || "Loading..."}</pre>;
}
