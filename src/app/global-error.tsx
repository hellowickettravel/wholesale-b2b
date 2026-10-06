"use client";

import "./globals.css";

/** Last resort when even the root layout fails: no fonts or components, so plain inline styles in the brand colours. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 16, background: "#b3321f", color: "#2a1c14" }}>
        <title>Something went wrong</title>
        <div style={{ textAlign: "center", padding: "32px 28px 36px", maxWidth: 420, background: "#fffbf1", borderRadius: 12, outline: "1.5px solid #b3321f", outlineOffset: -6, boxShadow: "0 1px 0 rgb(42 28 20 / 0.35), 0 14px 24px -14px rgb(42 28 20 / 0.55)" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#5e4938", fontSize: 17, margin: "12px 0 0" }}>Nothing you did caused this. Please try again in a moment.</p>
          {error.digest ? <p style={{ color: "#5e4938", fontSize: 14, margin: "12px 0 0" }}>Reference: {error.digest}</p> : null}
          <button onClick={() => retry()} style={{ marginTop: 20, height: 48, padding: "0 24px", borderRadius: 12, border: 0, background: "#2f4a2b", color: "#fffbf1", fontWeight: 700, fontSize: 17, cursor: "pointer", boxShadow: "0 2px 0 #213720" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
