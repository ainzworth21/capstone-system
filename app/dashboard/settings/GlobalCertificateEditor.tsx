"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CertificateTemplate } from "@/lib/types";
import { drawFittedName } from "@/lib/certificate-fit-name";

const FONTS = ["Georgia", "Times New Roman", "Arial", "Trebuchet MS", "Verdana", "Palatino"];

/** Landscape A4 at ~96dpi */
const A4_W = 1123;
const A4_H = 794;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function paintCertificate(
  canvas: HTMLCanvasElement,
  opts: {
    W: number;
    H: number;
    settings: {
      name_x: number;
      name_y: number;
      name_font_size: number;
      name_color: string;
      name_font: string;
    };
    preview: string | null;
    isSpeaker: boolean;
    sampleName: string;
    fontSizeScale?: number;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { W, H, settings, preview, isSpeaker, sampleName, fontSizeScale = 1 } = opts;
  canvas.width = W;
  canvas.height = H;

  const drawForeground = () => {
    const x = (settings.name_x / 100) * W;
    const y = (settings.name_y / 100) * H;
    const fontPx = Math.round(settings.name_font_size * fontSizeScale);
    drawFittedName(ctx, sampleName, x, y, {
      fontSize: fontPx,
      fontFamily: settings.name_font,
      color: settings.name_color,
      maxWidth: W * 0.78,
      minFontSize: Math.max(12, Math.round(18 * fontSizeScale)),
      maxLines: 2,
    });
  };

  const drawDefaultBg = () => {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#134429");
    grad.addColorStop(1, "#2d7a50");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c9a84c";
    ctx.lineWidth = Math.max(6, Math.round(10 * (W / A4_W)));
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = "#c9a84c";
    ctx.font = `bold ${Math.round(22 * (W / 720))}px Georgia`;
    ctx.textAlign = "center";
    ctx.fillText(
      isSpeaker ? "CERTIFICATE OF APPRECIATION" : "CERTIFICATE OF PARTICIPATION",
      W / 2,
      Math.round(80 * (H / 510))
    );
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `${Math.round(14 * (W / 720))}px Georgia`;
    ctx.fillText("This is to certify that", W / 2, Math.round(125 * (H / 510)));
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `italic ${Math.round(14 * (W / 720))}px Georgia`;
    ctx.fillText(
      isSpeaker
        ? "served as resource speaker for the event"
        : "has successfully participated in the event",
      W / 2,
      Math.round(260 * (H / 510))
    );
  };

  if (preview) {
    try {
      const bg = await loadImage(preview);
      ctx.drawImage(bg, 0, 0, W, H);
      drawForeground();
      return;
    } catch {
      /* fall through */
    }
  }
  drawDefaultBg();
  drawForeground();
}

export default function GlobalCertificateEditor({
  initialData,
  recipientType = "student",
  bridgeId,
}: {
  initialData: CertificateTemplate | null;
  recipientType?: "student" | "speaker";
  bridgeId?: string;
}) {
  const isSpeaker = recipientType === "speaker";
  const sampleName = isSpeaker
    ? "Dr. Maria Cristina Reyes-Santos"
    : "Juan Miguel Angel dela Cruz y Santos";
  const router = useRouter();
  const [settings, setSettings] = useState({
    name_x: initialData?.name_x ?? 50,
    name_y: initialData?.name_y ?? 60,
    name_font_size: initialData?.name_font_size ?? 36,
    name_color: initialData?.name_color ?? "#1a5c38",
    name_font: initialData?.name_font ?? "Georgia",
    image_filename: initialData?.image_filename ?? (null as string | null),
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(
    initialData?.image_filename
      ? `/certificates/${initialData.image_filename}`
      : null
  );
  const [largeOpen, setLargeOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(k: string, v: unknown) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    paintCertificate(canvas, {
      W: Math.round(A4_W * 0.64),
      H: Math.round(A4_H * 0.64),
      settings,
      preview,
      isSpeaker,
      sampleName,
      fontSizeScale: 0.64,
    }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [settings, preview, isSpeaker, sampleName]);

  useEffect(() => {
    if (!largeOpen) return;
    const canvas = largeCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    paintCertificate(canvas, {
      W: A4_W,
      H: A4_H,
      settings,
      preview,
      isSpeaker,
      sampleName,
      fontSizeScale: 1,
    }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [largeOpen, settings, preview, isSpeaker, sampleName]);

  useEffect(() => {
    if (!largeOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLargeOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [largeOpen]);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/certificate/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setMsg(data.error);
      return;
    }
    set("image_filename", data.filename);
    setPreview(`/certificates/${data.filename}`);
    setMsg("Image uploaded.");
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch(bridgeId ? `/api/bridges/${bridgeId}/settings` : "/api/settings/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bridgeId
        ? { section: recipientType === "speaker" ? "speaker_certificate" : "participant_certificate", data: settings }
        : { ...settings, recipient_type: recipientType }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg(
        `${bridgeId ? "Bridge " : ""}${isSpeaker ? "Speaker" : "Participant"} certificate template saved. Position and style are used for live preview and issued certificates.`
      );
      router.refresh();
    } else {
      setMsg("Failed to save.");
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>
              {isSpeaker
                ? "Speaker Certificate Template"
                : "Student Certificate Template"}
            </h3>
            <p className="text-muted" style={{ fontSize: ".875rem", marginTop: ".375rem" }}>
              A4 landscape, no QR on the certificate. Name position matches
              issued downloads.
            </p>
          </div>
          <button
            className="btn btn-gold"
            onClick={save}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>

        {msg && (
          <div
            className={`alert alert-${msg.includes("Failed") ? "error" : "success"}`}
            style={{ marginBottom: "1rem" }}
          >
            {msg}
          </div>
        )}

        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header">
            <h3>Background Image</h3>
          </div>
          <div className="card-body">
            <p
              style={{
                fontSize: ".875rem",
                color: "var(--gray-500)",
                marginBottom: "1rem",
              }}
            >
              Upload your certificate design. The{" "}
              {isSpeaker ? "speaker" : "student"}&apos;s name will be overlaid at
              your configured position.
            </p>
            <div
              style={{
                display: "flex",
                gap: ".75rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadImage}
                style={{ display: "none" }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                type="button"
              >
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
              {settings.image_filename && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    set("image_filename", null);
                    setPreview(null);
                  }}
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
            {settings.image_filename && (
              <div
                style={{
                  marginTop: ".75rem",
                  fontSize: ".8125rem",
                  color: "var(--gray-500)",
                }}
              >
                Current: <code>{settings.image_filename}</code>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Name Position &amp; Style</h3>
          </div>
          <div className="card-body">
            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Horizontal (%)</label>
                <div
                  style={{ display: "flex", gap: ".75rem", alignItems: "center" }}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.name_x}
                    onChange={(e) => set("name_x", Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--primary)" }}
                  />
                  <span style={{ minWidth: 36, fontWeight: 600 }}>
                    {settings.name_x}%
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vertical (%)</label>
                <div
                  style={{ display: "flex", gap: ".75rem", alignItems: "center" }}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.name_y}
                    onChange={(e) => set("name_y", Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--primary)" }}
                  />
                  <span style={{ minWidth: 36, fontWeight: 600 }}>
                    {settings.name_y}%
                  </span>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Font Size (px)</label>
                <input
                  type="number"
                  className="form-control"
                  min={12}
                  max={120}
                  value={settings.name_font_size}
                  onChange={(e) => set("name_font_size", Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div
                  style={{ display: "flex", gap: ".75rem", alignItems: "center" }}
                >
                  <input
                    type="color"
                    value={settings.name_color}
                    onChange={(e) => set("name_color", e.target.value)}
                    style={{
                      width: 48,
                      height: 40,
                      cursor: "pointer",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: 2,
                    }}
                  />
                  <input
                    className="form-control"
                    value={settings.name_color}
                    onChange={(e) => set("name_color", e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Font Family</label>
              <select
                className="form-control"
                value={settings.name_font}
                onChange={(e) => set("name_font", e.target.value)}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: ".75rem",
            marginBottom: ".75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            Live Preview
            <span
              style={{
                fontSize: ".8rem",
                color: "var(--gray-500)",
                fontWeight: 400,
                marginLeft: ".5rem",
              }}
            >
              (matches issued cert)
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setLargeOpen(true)}
          >
            Preview
          </button>
        </div>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            borderRadius: "var(--radius-lg)",
            border: "3px solid var(--gold)",
            boxShadow: "var(--shadow-gold)",
            cursor: "pointer",
          }}
          onClick={() => setLargeOpen(true)}
          title="Click for larger preview"
        />
        <p className="text-muted" style={{ fontSize: ".75rem", marginTop: ".5rem" }}>
          Live preview uses a long sample name so auto-fit (shrink / 2-line wrap)
          matches what participants see. Click Preview for full size.
        </p>
      </div>

      {largeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Certificate large preview"
          onClick={() => setLargeOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 31, 20, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface, #fff)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem",
              maxWidth: "min(960px, 100%)",
              width: "100%",
              boxShadow: "var(--shadow-md)",
              maxHeight: "95vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Certificate Preview</h3>
                <p className="text-muted" style={{ margin: ".25rem 0 0", fontSize: ".875rem" }}>
                  Full A4 preview with name placement (no QR)
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLargeOpen(false)}
              >
                Close
              </button>
            </div>
            <div style={{ textAlign: "center", background: "var(--gray-100)", borderRadius: "var(--radius)", padding: "1rem" }}>
              <canvas
                ref={largeCanvasRef}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "var(--radius)",
                  border: "3px solid var(--gold)",
                  boxShadow: "var(--shadow-gold)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
