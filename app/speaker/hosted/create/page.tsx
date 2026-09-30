"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Speakers no longer create events — admin assigns topics. */
export default function SpeakerCreateEventRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/speaker/hosted");
  }, [router]);

  return (
    <div className="card">
      <div className="card-body" style={{ padding: "2rem" }}>
        <h3 style={{ marginBottom: ".5rem" }}>Create Event disabled</h3>
        <p className="text-muted" style={{ marginBottom: "1rem" }}>
          The secretariat creates webinars and seminars and assigns you as
          speaker. Open <strong>My Topics</strong> to build or edit your quiz.
        </p>
        <Link href="/speaker/hosted" className="btn btn-gold">
          Go to My Topics
        </Link>
      </div>
    </div>
  );
}
