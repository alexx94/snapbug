"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Phase = "idle" | "loading" | "success" | "error";

export function InviteModal({ inviteId, token }: { inviteId: string; token: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  async function handle(action: "accept" | "decline") {
    setPhase("loading");
    const res = await fetch(`/api/invites/${inviteId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; projectId?: string };

    if (!res.ok) {
      setPhase("error");
      setMessage(body.error || `Could not ${action} invite`);
      setTimeout(() => router.push("/projects"), 2500);
      return;
    }

    setPhase("success");
    const redirectTo = action === "accept" && body.projectId ? `/projects/${body.projectId}` : "/projects";
    setMessage(action === "accept" ? "Invite accepted! Redirecting to project..." : "Invite declined. Redirecting...");
    setTimeout(() => router.push(redirectTo), 1500);
  }

  return (
    <div className="invite-modal-overlay">
      <div className="invite-modal">
        {phase === "loading" ? (
          <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "1rem 0" }}>
            <div className="invite-modal-spinner" />
            <p className="muted">Processing...</p>
          </div>
        ) : phase === "success" ? (
          <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "1rem 0" }}>
            <strong>{message}</strong>
          </div>
        ) : phase === "error" ? (
          <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "1rem 0" }}>
            <strong style={{ color: "var(--error, #c00)" }}>{message}</strong>
            <p className="muted">Redirecting back to projects...</p>
          </div>
        ) : (
          <div className="stack">
            <div className="stack" style={{ gap: "0.25rem" }}>
              <strong style={{ fontSize: "1.1rem" }}>Project invite</strong>
              <p className="muted">You have a pending invitation to join a project. Accept to become a member, or decline to dismiss.</p>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.5rem" }}>
              <Button type="button" variant="secondary" onClick={() => handle("decline")}>
                Decline
              </Button>
              <Button type="button" onClick={() => handle("accept")}>
                Accept invite
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
