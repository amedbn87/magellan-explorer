import { useEffect, useState } from "react";

type WorkerResult = { ok: true; svg: string } | { ok: false; error: string };

/** QR renderer whose encoding never executes on the WebView main thread. */
export function QrWorkerView({ value, size = 240 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const worker = new Worker(new URL("./qr-worker.ts", import.meta.url), { type: "module" });
    setSvg(null);
    setError(null);
    setBusy(true);
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (cancelled) return;
      const result = event.data;
      if (result.ok) setSvg(result.svg);
      else setError(result.error);
      setBusy(false);
      worker.terminate();
    };
    worker.onerror = () => {
      if (cancelled) return;
      setError("QR generation failed");
      setBusy(false);
      worker.terminate();
    };
    worker.postMessage({ value, size });
    return () => { cancelled = true; worker.terminate(); };
  }, [value, size]);

  return <div className="relative rounded-xl border border-border bg-white p-3" style={{ width: size + 24, minHeight: size + 24 }}>
    {svg ? <div className="leading-none" style={{ width: size, height: size }} aria-label="Magellan location QR code" role="img" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    {busy ? <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Generating QR…</div> : null}
    {error ? <p className="text-xs text-destructive">QR error: {error}</p> : null}
  </div>;
}
