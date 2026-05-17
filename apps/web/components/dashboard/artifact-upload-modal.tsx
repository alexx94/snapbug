"use client";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/fields";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArtifactUploadModal({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<OperationToastState>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch(`/api/reports/${reportId}/attachments`, {
      method: "POST",
      body: new FormData(event.currentTarget)
    });
    const body = (await response.json()) as { error?: string };

    setPending(false);

    if (!response.ok) {
      setError(body.error || "Could not upload attachment");
      setToast({ id: Date.now(), message: body.error || "Could not upload attachment", type: "error" });
      return;
    }

    setOpen(false);
    setToast({ id: Date.now(), message: "Attachment uploaded", type: "success" });
    router.refresh();
  }

  return (
    <>
      <OperationToast toast={toast} />
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Upload size={16} />
        Add attachment
      </Button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-modal upload-modal" role="dialog">
            <div>
              <h2>Add attachment</h2>
              <p className="muted">Upload screenshots, notes, JSON, Markdown, text, or PDF documentation.</p>
            </div>
            <form className="artifact-upload" onSubmit={submit}>
              <Input name="displayName" placeholder="Attachment name" />
              <Textarea name="description" placeholder="Short note or context" />
              <Input accept="image/png,image/jpeg,application/json,text/plain,text/markdown,application/pdf" name="file" required type="file" />
              {error ? <p className="error">{error}</p> : null}
              <div className="row between">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
