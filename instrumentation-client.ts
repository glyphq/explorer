const diagnosticsEnabled = process.env.NEXT_PUBLIC_EXPLORER_DIAGNOSTICS === "true";

type DiagnosticKind = "unhandled-rejection" | "window-error";

function recordDiagnostic(kind: DiagnosticKind) {
  if (!diagnosticsEnabled || typeof window === "undefined") return;

  try {
    performance.mark(`glyph-explorer:${kind}`);
    window.dispatchEvent(new CustomEvent("glyph-explorer:diagnostic", {
      detail: { kind, timestamp: Date.now() },
    }));
  } catch {
    // Diagnostics must never affect rendering or interaction.
  }
}

if (diagnosticsEnabled && typeof window !== "undefined") {
  window.addEventListener("error", () => recordDiagnostic("window-error"));
  window.addEventListener("unhandledrejection", () => recordDiagnostic("unhandled-rejection"));
}
