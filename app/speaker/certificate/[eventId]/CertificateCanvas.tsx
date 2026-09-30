"use client";
import { useEffect, useRef, useState } from "react";
import { CertificateTemplate } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { drawFittedName } from "@/lib/certificate-fit-name";

/** Landscape A4 at ~96dpi */
const W = 1123;
const H = 794;

interface Props {
  template: CertificateTemplate;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  speaker: string;
  verificationCode: string;
  verifyUrl: string;
}

export default function CertificateCanvas({
  template,
  studentName,
  eventTitle,
  eventDate,
  speaker,
  verificationCode,
  verifyUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = W;
      canvas.height = H;

      const drawForeground = () => {
        const x = (template.name_x / 100) * W;
        const y = (template.name_y / 100) * H;
        drawFittedName(ctx, studentName, x, y, {
          fontSize: template.name_font_size,
          fontFamily: template.name_font,
          color: template.name_color,
          maxWidth: W * 0.78,
          minFontSize: 18,
          maxLines: 2,
        });
        setReady(true);
      };

      const drawDefaultBg = () => {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#134429");
        grad.addColorStop(1, "#2d7a50");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 12;
        ctx.strokeRect(24, 24, W - 48, H - 48);
        ctx.strokeStyle = "#e0bc6a";
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, W - 80, H - 80);

        ctx.fillStyle = "#c9a84c";
        ctx.font = `bold 32px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText("CAVITE STATE UNIVERSITY", W / 2, 100);
        ctx.font = `bold 26px Georgia, serif`;
        ctx.fillText("CERTIFICATE OF APPRECIATION", W / 2, 145);

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `18px Georgia, serif`;
        ctx.fillText("This is to certify that", W / 2, 195);

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `italic 20px Georgia, serif`;
        ctx.fillText(`has successfully participated in`, W / 2, 360);
        ctx.font = `bold 24px Georgia, serif`;
        ctx.fillStyle = "#c9a84c";
        const maxW = W - 200;
        const words = eventTitle.split(" ");
        let line = "";
        let ty = 400;
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (ctx.measureText(test).width > maxW) {
            ctx.fillText(line, W / 2, ty);
            line = w;
            ty += 32;
          } else line = test;
        }
        if (line) ctx.fillText(line, W / 2, ty);

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `16px Georgia, serif`;
        ctx.fillText(`held on ${formatDate(eventDate)}`, W / 2, ty + 48);
        if (speaker) {
          ctx.fillText(`Resource Person: ${speaker}`, W / 2, ty + 76);
        }

        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = `13px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          "Official digital certificate · Cavite State University · A4",
          W / 2,
          H - 48
        );
      };

      if (template.image_filename) {
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          ctx.drawImage(img, 0, 0, W, H);
          drawForeground();
        };
        img.onerror = () => {
          if (cancelled) return;
          drawDefaultBg();
          drawForeground();
        };
        img.src = `/certificates/${template.image_filename}`;
      } else {
        drawDefaultBg();
        drawForeground();
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [
    template,
    studentName,
    eventTitle,
    eventDate,
    speaker,
    verificationCode,
  ]);

  function downloadCert() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `CvSU_Certificate_${verificationCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="card card-gold" style={{ marginBottom: "1.25rem" }}>
        <div
          className="card-body"
          style={{
            display: "flex",
            gap: "1.25rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontWeight: 800,
                color: "var(--primary-dark)",
                marginBottom: ".25rem",
              }}
            >
              University-Certified Digital Certificate (A4)
            </div>
            <p className="text-muted" style={{ fontSize: ".875rem", margin: 0 }}>
              Issued by Cavite State University. Authenticity can be checked via
              the verification code or verify page (no QR on the certificate).
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "var(--gray-500)",
              }}
            >
              Verification Code
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontWeight: 800,
                fontSize: "1.125rem",
                color: "var(--gold-dark)",
                letterSpacing: ".04em",
              }}
            >
              {verificationCode}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: ".35rem" }}
              onClick={copyCode}
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--gray-100)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
            border: "3px solid var(--gold)",
          }}
        />
      </div>

      {ready && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <button onClick={downloadCert} className="btn btn-gold btn-lg">
            Download Certificate
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-lg"
          >
            Print
          </button>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-gold btn-lg"
          >
            Open Verify Page
          </a>
        </div>
      )}

      <div className="alert alert-info" style={{ marginBottom: 0 }}>
        <span>
          Share this link for verification:{" "}
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 700, wordBreak: "break-all" }}
          >
            {verifyUrl}
          </a>
        </span>
      </div>
    </div>
  );
}
