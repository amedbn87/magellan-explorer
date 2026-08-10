import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * Real, scannable QR generated in the browser from the versioned payload.
 *
 * Android WebView notes:
 * QRCode.toCanvas() performs CPU-heavy encoding synchronously before its
 * promise settles. A fixed timeout only delays when that work starts. This
 * version waits for two committed animation frames so route transition and
 * initial paint have completed, uses a cheaper error-correction level, and
 * shows visible progress while the QR is being generated.
 */
export function QrCanvas({ value, size = 240 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let rafId1 = 0;
    let rafId2 = 0;

    setIsGenerating(true);
    setError(null);

    // Wait for two real committed frames rather than a fixed delay, so the
    // encode does not land in the same tick as the route transition.
    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        if (cancelled) return;

        QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          errorCorrectionLevel: "L",
          color: { dark: "#000000ff", light: "#ffffffff" },
        })
          .then(() => {
            if (cancelled) return;
            setError(null);
            setIsGenerating(false);
          })
          .catch((e: unknown) => {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : "QR generation failed");
            setIsGenerating(false);
          });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId1);
      window.cancelAnimationFrame(rafId2);
    };
  }, [value, size]);

  return (
    <div
      className="relative rounded-xl border border-border bg-white p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      <canvas
        ref={ref}
        width={size}
        height={size}
        aria-label="Magellan location QR code"
        role="img"
        className={isGenerating ? "opacity-0" : "opacity-100"}
      />
      {isGenerating ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Generating QR…
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">QR error: {error}</p> : null}
    </div>
  );
}
