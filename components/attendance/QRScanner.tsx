"use client";
import { useEffect, useRef, useState } from "react";

declare global { interface Window { jsQR: any; } }

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scanLog, setScanLog] = useState<{ name: string; course: string; time: string }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scannedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); stopScanner(); };
  }, []);

  async function startScanner() {
    if (!navigator.mediaDevices) {
      setResult({ type: "error", message: "Camera not supported in this browser." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setScanning(true);

      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !window.jsQR || video.readyState !== 4) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) processQR(code.data);
      }, 500);
    } catch (err: any) {
      setResult({ type: "error", message: "Camera access denied: " + err.message });
    }
  }

  function stopScanner() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScanning(false);
  }

  async function processQR(token: string) {
    if (scannedRef.current.has(token)) return;
    scannedRef.current.add(token);

    const res = await fetch("/api/attendance/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    if (data.success) {
      setResult({ type: "success", message: `${data.name} — Attendance recorded!` });
      setScanLog((l) => [{ name: data.name, course: data.course ?? "", time: new Date().toLocaleTimeString() }, ...l.slice(0, 19)]);
    } else {
      setResult({ type: "error", message: `${data.message}${data.name ? " — " + data.name : ""}` });
      setTimeout(() => scannedRef.current.delete(token), 3000);
    }
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="card">
      <div className="card-header"><h3>Camera Scanner</h3></div>
      <div className="card-body">
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <video ref={videoRef} autoPlay playsInline
            style={{ width: "100%", borderRadius: "var(--radius-lg)", border: "3px solid var(--gold)", display: scanning ? "block" : "none" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!scanning && (
            <div style={{ width: "100%", height: 200, background: "var(--gray-200)", borderRadius: "var(--radius-lg)", border: "3px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-500)", fontSize: "1.125rem" }}>
              Camera inactive
            </div>
          )}
        </div>

        {result && (
          <div className={`alert alert-${result.type === "success" ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>
            {result.message}
          </div>
        )}

        <div style={{ display: "flex", gap: ".75rem" }}>
          {!scanning ? (
            <button className="btn btn-gold" onClick={startScanner}>▶ Start Scanner</button>
          ) : (
            <button className="btn btn-secondary" onClick={stopScanner}>⏹ Stop</button>
          )}
        </div>

        {scanLog.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ marginBottom: ".75rem", fontSize: ".9375rem" }}>Recent Scans ({scanLog.length})</h4>
            <ul style={{ listStyle: "none", maxHeight: 200, overflowY: "auto" }}>
              {scanLog.map((s, i) => (
                <li key={i} style={{ padding: ".5rem 0", borderBottom: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{s.name}</strong>
                    <div style={{ fontSize: ".8rem", color: "var(--gray-500)" }}>{s.course}</div>
                  </div>
                  <span style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>{s.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
