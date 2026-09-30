import { getSessionUser } from "@/lib/session";
import { findOne } from "@/lib/db";
import { User } from "@/lib/types";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EditSpeakerForm from "./EditSpeakerForm";

export default async function EditSpeakerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const speaker = findOne<User>("users", (u) => u.id === id && u.role === "organizer");
  if (!speaker) notFound();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Edit Speaker</h1>
          <p className="text-muted">{speaker.email}</p>
        </div>
        <Link href="/dashboard/speakers" className="btn btn-secondary">
          Back to Speakers
        </Link>
      </div>

      <EditSpeakerForm
        speaker={{
          id: speaker.id,
          full_name: speaker.full_name,
          email: speaker.email,
          title_position: speaker.title_position ?? "",
          affiliation: speaker.affiliation ?? "",
          bio: speaker.bio ?? "",
          speaker_active: speaker.speaker_active ?? false,
        }}
      />
    </div>
  );
}
