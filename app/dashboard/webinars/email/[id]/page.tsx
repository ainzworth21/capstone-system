import { redirect } from "next/navigation";

export default async function WebinarEmailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/events/email/${id}`);
}
