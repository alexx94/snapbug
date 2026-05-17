"use client";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Select } from "@/components/ui/fields";
import { OperationToast, type OperationToastState } from "@/components/ui/operation-toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export function ReportStatusForm({ reportId, status, priority }: { reportId: string; status: string; priority: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<OperationToastState>(null);
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) return;
    event.preventDefault();
    setConfirmOpen(true);
  }

  async function confirm() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    setPending(true);
    setError(null);

    const formData = new FormData(formRef.current!);
    const response = await fetch(`/api/reports/${reportId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: formData.get("status"),
        priority: formData.get("priority")
      })
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };

    confirmedRef.current = false;
    setPending(false);

    if (!response.ok) {
      setError(body.error || "Could not update report");
      setToast({ id: Date.now(), message: body.error || "Could not update report", type: "error" });
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("success", "Report updated");
    nextParams.set("toast", Date.now().toString());
    nextParams.delete("error");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    router.refresh();
  }

  return (
    <>
      <OperationToast toast={toast} />
      <form className="stack" onSubmit={submit} ref={formRef}>
        <input type="hidden" name="reportId" value={reportId} />
        <label className="stack">
          <span className="muted">Status</span>
          <Select name="status" defaultValue={status}>
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </label>
        <label className="stack">
          <span className="muted">Priority</span>
          <Select name="priority" defaultValue={priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <Button disabled={pending}>{pending ? "Updating..." : "Update"}</Button>
      </form>

      {confirmOpen ? (
        <ConfirmModal
          confirmLabel="Confirm update"
          description="This will change the report status and priority for everyone viewing this project."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirm}
          pending={pending}
          title="Update report?"
        />
      ) : null}
    </>
  );
}
