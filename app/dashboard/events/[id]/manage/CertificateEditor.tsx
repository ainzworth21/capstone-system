"use client";
import { useState, useRef, useEffect } from "react";
import { CertificateTemplate } from "@/lib/types";
import { drawFittedName } from "@/lib/certificate-fit-name";

const FONTS = ["Georgia", "Times New Roman", "Arial", "Trebuchet MS", "Verdana", "Palatino"];

export default function CertificateEditor({
  eventId,
  initialData,
  eventTitle,
  recipientType = "student",
}: {
  eventId: string;
  initialData: CertificateTemplate | null;
  eventTitle: string;
  recipientType?: "student" | "speaker";
}) {
  const isSpeaker = recipientType === "speaker";
  const [settings, setSettings] = useState({
    name_x:         initialData?.name_x         ?? 50,
    name_y:         initialData?.name_y         ?? 60,
    name_font_size: initialData?.name_font_size ?? 36,
    name_color:     initialData?.name_color     ?? "#1a5c38",
    name_font:      initialData?.name_font      ?? "Georgia",
    image_filename: initialData?.image_filename ?? null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");
  const [preview,   setPreview]   = useState<string | null>(
    initialData?.image_filename ? `/certificates/${initialData.image_filename}` : null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  function set(k: string, v: any) { setSettings((s) => ({ ...s, [k]: v })); }

  // Redraw preview canvas whenever settings change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 720, H = 510;
    canvas.width = W; canvas.height = H;

    const draw = (bg?: HTMLImageElement) => {
      if (bg) {
        ctx.drawImage(bg, 0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#134429"); grad.addColorStop(1, "#2d7a50");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "#c9a84c"; ctx.lineWidth = 8;
        ctx.strokeRect(14, 14, W - 28, H - 28);
        ctx.fillStyle = "#c9a84c";
        ctx.font = `bold 22px Georgia`;
        ctx.textAlign = "center";
        ctx.fillText(
          isSpeaker
            ? "CERTIFICATE OF APPRECIATION"
            : "CERTIFICATE OF PARTICIPATION",
          W / 2,
          80
        );
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `14px Georgia`;
        ctx.fillText(
          isSpeaker
            ? "This is to certify that"
            : "This is to certify that",
          W / 2,
          125
        );
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `italic 14px Georgia`;
        ctx.fillText(
          isSpeaker
            ? `served as Resource Person for ${eventTitle}`
            : `has successfully participated in ${eventTitle}`,
          W / 2,
          260
        );
      }
      // Draw name at configured position (auto-fit long names)
      const x = (settings.name_x / 100) * W;
      const y = (settings.name_y / 100) * H;
      drawFittedName(
        ctx,
        isSpeaker
          ? "Dr. Maria Cristina Reyes-Santos"
          : "Juan Miguel Angel dela Cruz y Santos",
        x,
        y,
        {
          fontSize: settings.name_font_size,
          fontFamily: settings.name_font,
          color: settings.name_color,
          maxWidth: W * 0.78,
          minFontSize: 16,
          maxLines: 2,
        }
      );
    };

    if (preview) {
      const img = new Image();
      img.onload = () => draw(img);
      img.onerror = () => draw();
      img.src = preview;
    } else { draw(); }
  }, [settings, preview, eventTitle, isSpeaker]);

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/certificate/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setMsg(data.error); return; }
    set("image_filename", data.filename);
    setPreview(`/certificates/${data.filename}`);
    setMsg("Image uploaded!");
  }

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch(`/api/certificate/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, recipient_type: recipientType }),
    });
    setSaving(false);
    setMsg(res.ok ? "Certificate template saved!" : "Failed to save.");
  }

  function clearImage() {
    set("image_filename", null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
      {/* Controls */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0 }}>
            {isSpeaker ? "Speaker Certificate Designer" : "Student Certificate Designer"}
          </h3>
          <button className="btn btn-gold" onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>

        {msg && <div className={`alert alert-${!msg.toLowerCase().startsWith("failed") && !msg.toLowerCase().includes("error") ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>{msg}</div>}

        {/* Background Image */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header"><h3>Background Image</h3></div>
          <div className="card-body">
            <p style={{ fontSize: ".875rem", color: "var(--gray-500)", marginBottom: "1rem" }}>
              Upload your own certificate design (JPG/PNG/WebP, max 10MB). The{" "}
              {isSpeaker ? "speaker" : "student"}&apos;s name will be overlaid at your
              configured position.
            </p>
            <div style={{ display: "flex", gap: ".75rem", alignItems: "center", flexWrap: "wrap" }}>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={uploadImage} style={{ display: "none" }} />
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading} type="button">
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
              {settings.image_filename && (
                <button className="btn btn-danger btn-sm" onClick={clearImage} type="button">
                  Remove Image
                </button>
              )}
            </div>
            {settings.image_filename && (
              <div style={{ marginTop: ".75rem", fontSize: ".8125rem", color: "var(--gray-500)" }}>
                Current: <code>{settings.image_filename}</code>
              </div>
            )}
          </div>
        </div>

        {/* Name Position */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header"><h3>Name Position &amp; Style</h3></div>
          <div className="card-body">
            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Horizontal Position (%)</label>
                <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
                  <input type="range" min={0} max={100} value={settings.name_x}
                    onChange={(e) => set("name_x", Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--primary)" }} />
                  <span style={{ minWidth: 36, textAlign: "right", fontWeight: 600 }}>{settings.name_x}%</span>
                </div>
                <div className="form-hint">0 = left edge, 50 = center, 100 = right edge</div>
              </div>
              <div className="form-group">
                <label className="form-label">Vertical Position (%)</label>
                <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
                  <input type="range" min={0} max={100} value={settings.name_y}
                    onChange={(e) => set("name_y", Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--primary)" }} />
                  <span style={{ minWidth: 36, textAlign: "right", fontWeight: 600 }}>{settings.name_y}%</span>
                </div>
                <div className="form-hint">0 = top, 50 = middle, 100 = bottom</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Font Size (px)</label>
                <input type="number" className="form-control" min={12} max={120}
                  value={settings.name_font_size}
                  onChange={(e) => set("name_font_size", Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Name Color</label>
                <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
                  <input type="color" value={settings.name_color}
                    onChange={(e) => set("name_color", e.target.value)}
                    style={{ width: 48, height: 40, cursor: "pointer", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", padding: 2 }} />
                  <input className="form-control" value={settings.name_color}
                    onChange={(e) => set("name_color", e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Font Family</label>
              <select className="form-control" value={settings.name_font}
                onChange={(e) => set("name_font", e.target.value)}>
                {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <div style={{ fontWeight: 700, marginBottom: ".75rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          Live Preview
          <span style={{ fontSize: ".8rem", color: "var(--gray-500)", fontWeight: 400 }}>
            (long sample name — auto-fit matches issued certificates)
          </span>
        </div>
        <canvas ref={canvasRef}
          style={{ width: "100%", borderRadius: "var(--radius-lg)", border: "3px solid var(--gold)", boxShadow: "var(--shadow-gold)" }} />
        <div style={{ fontSize: ".75rem", color: "var(--gray-500)", marginTop: ".5rem", textAlign: "center" }}>
          The actual certificate will show the {isSpeaker ? "speaker" : "participant"}&apos;s real name.
        </div>
      </div>
    </div>
  );
}
