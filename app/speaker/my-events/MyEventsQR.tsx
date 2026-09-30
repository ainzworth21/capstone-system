"use client";
import { useState } from "react";
import QRDisplay from "@/app/confirmation/QRDisplay";

export default function MyEventsQR({ token, title }: { token: string; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Show QR</button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setOpen(false)}>
          <div style={{ background: "var(--surface)", borderRadius: "1.25rem", padding: "2rem", maxWidth: 320, width: "90%", textAlign: "center", borderTop: "4px solid var(--gold)", boxShadow: "var(--shadow-md)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "1.25rem" }}>{title}</h3>
            <QRDisplay token={token} />
            <p className="text-muted" style={{ fontSize: ".875rem", margin: "1rem 0" }}>
              Show this at the event entrance for check-in.
            </p>
            <button onClick={() => setOpen(false)} className="btn btn-secondary btn-block">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
