import { redirect } from "next/navigation";

/** Speakers no longer edit event details — quiz only. */
export default async function SpeakerHostedEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/speaker/hosted/${id}`);
}
