"use client";

import "./globals.css";

/** Last resort when even the root layout fails: no fonts or components, so plain inline styles in the brand colours. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 16, background: "#0b2a5b", color: "#0f1b2d" }}>
        <title>Something went wrong</title>
        <div style={{ textAlign: "center", padding: "32px 28px 36px", maxWidth: 420, background: "#ffffff", borderRadius: 16, boxShadow: "0 24px 56px -16px rgb(0 0 0 / 0.45)" }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#46546a", fontSize: 16, margin: "12px 0 0" }}>Nothing you did caused this. Please try again in a moment.</p>
          {error.digest ? <p style={{ color: "#46546a", fontSize: 14, margin: "12px 0 0" }}>Reference: {error.digest}</p> : null}
          <button onClick={() => retry()} style={{ marginTop: 20, height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#d81f26", color: "#ffffff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
