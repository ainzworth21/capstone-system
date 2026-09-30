import { redirect } from "next/navigation";

/** Legacy route — redirects to unified quiz preview. */
export default async function SpeakerQuizPreviewRedirect({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/dashboard/preview/quiz/${eventId}?from=speakers`);
}
