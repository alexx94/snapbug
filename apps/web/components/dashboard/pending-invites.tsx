"use client";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type PendingInvite = {
  id: string;
  project_id: string;
  project_name: string;
  invited_by_email: string | null;
  expires_at: string;
  created_at: string;
};

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const [rows, setRows] = useState(invites);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<OperationToastState>(null);
  const [confirmAction, setConfirmAction] = useState<{ inviteId: string; action: "accept" | "decline" } | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const linkInvite = params.get("invite");
  const linkToken = params.get("token");

  function askRespond(inviteId: string, action: "accept" | "decline") {
    setConfirmAction({ inviteId, action });
  }

  async function respond(inviteId: string, action: "accept" | "decline") {
    const label = action === "accept" ? "accept" : "decline";
    setPendingId(inviteId);
    setError(null);
    setConfirmAction(null);

    const response = await fetch(`/api/invites/${inviteId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkInvite === inviteId && linkToken ? { token: linkToken } : {})
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; projectId?: string };
    setPendingId(null);

    if (!response.ok) {
      setError(body.error || `Could not ${label} invite`);
      setToast({ id: Date.now(), message: body.error || `Could not ${label} invite`, type: "error" });
      return;
    }

    setRows((current) => current.filter((invite) => invite.id !== inviteId));
    setToast({ id: Date.now(), message: action === "accept" ? "Invite accepted" : "Invite declined", type: "success" });
    router.refresh();
    if (action === "accept" && body.projectId) router.push(`/projects/${body.projectId}`);
  }

  if (!rows.length) return null;

  return (
    <div className="stack">
      <OperationToast toast={toast} />
      <div className="row between card-heading">
        <h2 className="card-title">Pending invites</h2>
        <span className="muted">{rows.length} pending</span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="attachment-list">
        {rows.map((invite) => (
          <div className="pending-invite-card" key={invite.id}>
            <div>
              <span className="muted">Project invite</span>
              <strong>{invite.project_name}</strong>
              <p className="muted">
                Invited by {invite.invited_by_email || "project owner"} - expires {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="pending-invite-actions">
              <Button type="button" variant="secondary" disabled={pendingId === invite.id} onClick={() => askRespond(invite.id, "decline")}>
                {pendingId === invite.id ? "Processing..." : "Decline"}
              </Button>
              <Button type="button" disabled={pendingId === invite.id} onClick={() => askRespond(invite.id, "accept")}>
                {pendingId === invite.id ? "Processing..." : "Accept"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {confirmAction ? (
        <ConfirmModal
          confirmLabel={confirmAction.action === "accept" ? "Accept invite" : "Decline invite"}
          description={`This will ${confirmAction.action} the project invitation.`}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => respond(confirmAction.inviteId, confirmAction.action)}
          pending={pendingId === confirmAction.inviteId}
          title={confirmAction.action === "accept" ? "Accept invite?" : "Decline invite?"}
        />
      ) : null}
    </div>
  );
}
