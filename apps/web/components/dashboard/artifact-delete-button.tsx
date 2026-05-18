"use client";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArtifactDeleteButton({ reportId, artifactId, displayName }: { reportId: string; artifactId: string; displayName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<OperationToastState>(null);

  async function handleDelete() {
    setPending(true);
    const res = await fetch(`/api/reports/${reportId}/attachments/${artifactId}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    setConfirming(false);

    if (!res.ok) {
      setToast({ id: Date.now(), message: body.error || "Could not delete attachment", type: "error" });
      return;
    }

    setToast({ id: Date.now(), message: "Attachment deleted", type: "success" });
    router.refresh();
  }

  return (
    <>
      <OperationToast toast={toast} />
      <Button variant="secondary" type="button" onClick={() => setConfirming(true)}>
        <Trash2 size={16} />
        Delete
      </Button>
      {confirming ? (
        <ConfirmModal
          title="Delete attachment?"
          description={`This will permanently delete "${displayName}".`}
          confirmLabel="Delete"
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
          pending={pending}
        />
      ) : null}
    </>
  );
}
