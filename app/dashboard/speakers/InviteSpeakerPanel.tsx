"use client";

import RegisterSpeakerForm from "@/components/RegisterSpeakerForm";

/** Speakers admin page — same register-by-email flow as Users. */
export default function InviteSpeakerPanel() {
  return (
    <RegisterSpeakerForm
      buttonLabel="Register speaker"
      submitLabel="Register speaker"
    />
  );
}
