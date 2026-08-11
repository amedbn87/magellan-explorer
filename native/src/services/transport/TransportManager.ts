import type { TransportDescriptor, TransportId } from "../../data/types";
import type { LocationPayloadV1 } from "./payload";
import { encodeLocationPayload } from "./payload";

/**
 * TransportManager — LocationPayload -> TransportManager -> QR / BT / Wi-Fi Direct / LAN.
 * In this native build, only the QR transport is actually implemented end to
 * end (generation via `qrcode`, scanning via expo-camera). The others report
 * their honest capability state and NEVER simulate success — implementing
 * them for real is future work (BLE via react-native-ble-plx, Wi-Fi Direct
 * has no maintained Expo-compatible library as of this writing, NFC via
 * react-native-nfc-manager). See MASTER PROMPT section 14.
 */
export const TRANSPORTS: TransportDescriptor[] = [
  {
    id: "qr",
    name: "QR code",
    detail: "Offline visual transfer via camera scan. Fully implemented.",
    state: "READY",
    worksInBrowser: true,
  },
  {
    id: "bluetooth",
    name: "Bluetooth",
    detail: "Android BLE GATT transfer. Not yet implemented — planned via react-native-ble-plx.",
    state: "PERMISSION_REQUIRED",
    worksInBrowser: false,
  },
  {
    id: "wifi-direct",
    name: "Wi-Fi Direct",
    detail: "Android Wi-Fi P2P peer transfer. Not yet implemented — requires a custom Expo Module.",
    state: "SUPPORTED",
    worksInBrowser: false,
  },
  {
    id: "local-network",
    name: "Local network",
    detail: "Same-LAN socket transfer with mDNS discovery. Not yet implemented.",
    state: "AVAILABLE",
    worksInBrowser: false,
  },
  {
    id: "nfc",
    name: "NFC",
    detail: "Planned transport. Not implemented on any platform yet.",
    state: "UNAVAILABLE",
    worksInBrowser: false,
  },
];

export const TRANSPORT_STATE_LABEL: Record<TransportDescriptor["state"], string> = {
  SUPPORTED: "Supported",
  AVAILABLE: "Available",
  CONNECTED: "Connected",
  READY: "Ready",
  PERMISSION_REQUIRED: "Permission required",
  UNAVAILABLE: "Unavailable",
};

export type SendResult =
  | { ok: true; transport: TransportId; encoded: string }
  | { ok: false; transport: TransportId; reason: string };

export function getTransport(id: TransportId): TransportDescriptor {
  return TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[0]!;
}

export function send(id: TransportId, payload: LocationPayloadV1): SendResult {
  const t = getTransport(id);
  if (id !== "qr") {
    return {
      ok: false,
      transport: id,
      reason: `${t.name} is not implemented yet, so no transfer was performed.`,
    };
  }
  return { ok: true, transport: id, encoded: encodeLocationPayload(payload) };
}
