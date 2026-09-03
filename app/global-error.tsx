"use client";

const colors = {
  accent: "#ccfcfb",
  background: "#000000",
  muted: "#a8a29e",
  text: "#f5f5f4",
};

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ margin: 0, background: colors.background, color: colors.text, fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: "36rem", textAlign: "center" }}>
            <title>Explorer unavailable | Glyph Explorer</title>
            <p style={{ margin: 0, color: colors.muted, fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Glyph Explorer</p>
            <h1 style={{ margin: "0.75rem 0 0", fontSize: "clamp(2rem, 8vw, 3.5rem)", lineHeight: 1, letterSpacing: "-0.06em" }}>The explorer could not start</h1>
            <p style={{ margin: "1rem auto 0", maxWidth: "28rem", color: colors.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Reload the application. Your lookup can be entered again after the explorer recovers.
            </p>
            <button
              onClick={retry}
              style={{ marginTop: "1.75rem", minHeight: "44px", border: 0, borderRadius: "10px", padding: "0.7rem 1rem", background: colors.accent, color: colors.background, cursor: "pointer", fontWeight: 650 }}
              type="button"
            >
              Reload explorer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
