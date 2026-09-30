import { notFound, redirect } from "next/navigation";
import { findOne } from "@/lib/db";
import { Bridge } from "@/lib/types";

export default async function CreateBridgeEventPage({
  params,
}: {
  params: Promise<{ bridgeId: string }>;
}) {
  const { bridgeId } = await params;
  const bridge = findOne<Bridge>("bridges", (item) => item.id === bridgeId);
  if (!bridge) notFound();
  if (bridge.is_active === false) redirect(`/dashboard/bridges/${bridge.id}?tab=events&inactive=1`);

  redirect(
    `/dashboard/events/create?bridge_id=${encodeURIComponent(bridge.id)}&bridge_name=${encodeURIComponent(bridge.title)}`
  );
}