import QRCode from "qrcode";

self.onmessage = async (event: MessageEvent<{ value: string; size: number }>) => {
  const { value, size } = event.data;
  try {
    // QR encoding stays completely off the Android WebView/UI thread.
    const svg = await QRCode.toString(value, {
      type: "svg",
      width: size,
      margin: 2,
      errorCorrectionLevel: "L",
      color: { dark: "#000000", light: "#ffffff" },
    });
    self.postMessage({ ok: true, svg });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : "QR generation failed" });
  }
};
