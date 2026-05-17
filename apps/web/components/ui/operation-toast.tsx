"use client";

import { Toast } from "@/components/ui/toast";

export type OperationToastState = {
  id: number;
  message: string;
  type: "success" | "error";
} | null;

export function OperationToast({ toast }: { toast: OperationToastState }) {
  if (!toast) return null;
  return <Toast key={toast.id} success={toast.type === "success" ? toast.message : undefined} error={toast.type === "error" ? toast.message : undefined} />;
}
