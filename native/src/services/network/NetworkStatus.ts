import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

/**
 * Network reachability is tracked entirely separately from GNSS. A phone
 * with no cellular/Wi-Fi signal can still have a perfectly good GNSS fix —
 * conflating the two ("offline" reading as "app broken") is exactly what
 * the offline-first requirement warns against. This hook reports real
 * NetInfo state only; it is never inferred from GNSS or faked.
 */
export function useNetworkStatus(): { online: boolean | null; type: string } {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(setState);
    NetInfo.fetch().then(setState);
    return unsubscribe;
  }, []);

  if (!state) return { online: null, type: "unknown" };
  return {
    online: state.isConnected === true && state.isInternetReachable !== false,
    type: state.type,
  };
}
