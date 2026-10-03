"use client";

import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f8f6f1", color: "#18211d" }}>
        <title>Something went wrong</title>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#5e6863" }}>Please try again in a moment.</p>
          {error.digest ? <p style={{ fontFamily: "monospace", fontSize: 12, color: "#8a928e" }}>Reference: {error.digest}</p> : null}
          <button onClick={() => retry()} style={{ marginTop: 16, height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "#1d5b45", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
