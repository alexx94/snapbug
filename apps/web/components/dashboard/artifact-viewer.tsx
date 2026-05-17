"use client";

import { useEffect, useState } from "react";

export function ArtifactViewer({
  reportId,
  artifact,
  initialUrl
}: {
  reportId: string;
  artifact: { id: string; kind: string; content_type: string; display_name?: string | null };
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (initialUrl) {
        if (isTextArtifact(artifact.content_type)) {
          const jsonResponse = await fetch(initialUrl);
          const raw = await jsonResponse.text();
          if (!cancelled) setText(raw);
        }
        return;
      }

      const response = await fetch(`/api/reports/${reportId}/artifacts/${artifact.id}/signed-url`);
      const body = (await response.json()) as { signedUrl?: string; error?: string };
      if (!response.ok || !body.signedUrl) {
        if (!cancelled) setError(body.error || "Could not load artifact");
        return;
      }

      if (cancelled) return;
      setUrl(body.signedUrl);

      if (isTextArtifact(artifact.content_type)) {
        const jsonResponse = await fetch(body.signedUrl);
        const raw = await jsonResponse.text();
        if (!cancelled) setText(raw);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [artifact.content_type, artifact.id, initialUrl, reportId]);

  if (error) return <p className="error">{error}</p>;
  if (!url) return <p className="muted">Loading artifact...</p>;

  if (artifact.content_type.startsWith("image/")) {
    return (
      <>
        <img
          alt={artifact.display_name || artifact.kind}
          className="artifact-image"
          src={url}
          onClick={() => setExpanded(true)}
        />
        {expanded ? (
          <div className="artifact-lightbox" onClick={() => setExpanded(false)}>
            <img alt={artifact.display_name || artifact.kind} src={url} className="artifact-lightbox-img" />
          </div>
        ) : null}
      </>
    );
  }

  if (isTextArtifact(artifact.content_type)) {
    return <pre className="code artifact-text">{text || "Loading..."}</pre>;
  }

  if (artifact.content_type === "application/pdf") {
    return <iframe className="artifact-frame" src={url} title={artifact.display_name || artifact.kind} />;
  }

  return (
    <a className="button secondary" href={url} rel="noreferrer" target="_blank">
      Open artifact
    </a>
  );
}

function isTextArtifact(contentType: string) {
  return contentType === "application/json" || contentType.startsWith("text/");
}
