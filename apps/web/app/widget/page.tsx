import { WidgetClient } from "@/components/dashboard/widget-client";
import type { SnapBugEnvironment } from "@snapbug/shared/types";

export default async function WidgetPage({
  searchParams
}: {
  searchParams: Promise<{ environment?: string }>;
}) {
  const params = await searchParams;
  const environment = (params.environment === "development" ? "development" : "production") as SnapBugEnvironment;

  return <WidgetClient environment={environment} />;
}
