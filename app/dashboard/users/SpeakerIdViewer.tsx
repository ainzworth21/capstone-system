"use client";

import { useState } from "react";

export default function SpeakerIdViewer({
  filename,
  speakerName,
}: {
  filename: string | null;
  speakerName: string;
}) {
  const [open, setOpen] = useState(false);

  if (!filename) {
    return <span className="text-muted" style={{ fontSize: ".8rem" }}>No ID uploaded</span>;
  }

  const src = `/speaker-ids/${filename}`;

  return (
    <>
      <button
        type="button"
        className="speaker-id-thumb-btn"
        onClick={() => setOpen(true)}
        title="View ID photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`ID of ${speakerName}`} className="speaker-id-thumb" />
        <span>View ID</span>
      </button>

      {open && (
        <div className="speaker-id-modal" role="dialog" aria-modal="true">
          <div className="speaker-id-modal-backdrop" onClick={() => setOpen(false)} />
          <div className="speaker-id-modal-panel">
            <div className="speaker-id-modal-header">
              <strong>ID — {speakerName}</strong>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`ID of ${speakerName}`} className="speaker-id-full" />
          </div>
        </div>
      )}
    </>
  );
}
