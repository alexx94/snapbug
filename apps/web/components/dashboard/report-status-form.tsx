"use client";

import { updateReportAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { useRef, useState } from "react";

export function ReportStatusForm({ reportId, status, priority }: { reportId: string; status: string; priority: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) return;
    event.preventDefault();
    setConfirmOpen(true);
  }

  function confirm() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form className="stack" action={updateReportAction} onSubmit={submit} ref={formRef}>
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
        <Button>Update</Button>
      </form>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-modal" role="dialog">
            <h2>Update report?</h2>
            <p className="muted">This will change the report status and priority for everyone viewing this project.</p>
            <div className="row between">
              <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirm}>
                Confirm update
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
