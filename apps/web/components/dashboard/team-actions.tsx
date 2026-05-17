"use client";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/fields";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { Check, Copy, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<OperationToastState>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInviteLink(null);

    const response = await fetch(`/api/projects/${projectId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; inviteLink?: string };
    setPending(false);

    if (!response.ok || !body.inviteLink) {
      setError(body.error || "Could not create invite");
      setToast({ id: Date.now(), message: body.error || "Could not create invite", type: "error" });
      return;
    }

    setEmail("");
    setInviteLink(body.inviteLink);
    setToast({ id: Date.now(), message: "Invite created", type: "success" });
    router.refresh();
  }

  async function copyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setToast({ id: Date.now(), message: "Invite link copied", type: "success" });
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <OperationToast toast={toast} />
      <div className="row">
        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="developer@example.com" type="email" required />
        <Button disabled={pending}>
          <Send size={16} />
          {pending ? "Inviting..." : "Invite"}
        </Button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {inviteLink ? (
        <div className="row">
          <code className="code" style={{ flex: 1 }}>{inviteLink}</code>
          <button className="button secondary" type="button" onClick={copyInvite}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function RemoveMemberButton({ projectId, userId }: { projectId: string; userId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<OperationToastState>(null);
  const router = useRouter();

  async function remove() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);

    const response = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error || "Could not remove member");
      setToast({ id: Date.now(), message: body.error || "Could not remove member", type: "error" });
      return;
    }

    setToast({ id: Date.now(), message: "Member removed", type: "success" });
    router.refresh();
  }

  return (
    <div className="stack compact-actions">
      <OperationToast toast={toast} />
      <Button type="button" variant="secondary" onClick={() => setConfirmOpen(true)} disabled={pending}>
        <Trash2 size={16} />
        {pending ? "Removing..." : "Remove"}
      </Button>
      {error ? <span className="error">{error}</span> : null}
      {confirmOpen ? (
        <ConfirmModal
          confirmLabel="Remove member"
          description="This member will lose access to this project. Their developer token will no longer work for development reports on this project."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={remove}
          pending={pending}
          title="Remove member?"
        />
      ) : null}
    </div>
  );
}
