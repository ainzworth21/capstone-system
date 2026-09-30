"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window { QRCode: any; }
}

export default function QRDisplay({ token }: { token: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
    script.onload = () => {
      if (ref.current && window.QRCode) {
        ref.current.innerHTML = "";
        new window.QRCode(ref.current, {
          text: token,
          width: 200, height: 200,
          colorDark: "#134429", colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H,
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [token]);

  return (
    <div
      ref={ref}
      style={{
        display: "inline-block", padding: 12, background: "#fff",
        border: "4px solid var(--gold)", borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-gold)",
      }}
    />
  );
}
