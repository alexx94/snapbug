"use client";

import { Button } from "@/components/ui/button";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  title: string;
};

export function ConfirmModal({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  onCancel,
  onConfirm,
  pending = false,
  title
}: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-modal="true" className="confirm-modal" role="dialog">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <div className="row between">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
