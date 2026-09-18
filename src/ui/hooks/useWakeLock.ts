import { useEffect, useState } from "react";

/**
 * 감시 중에는 폰이 저절로 잠기지 않게 잡아 둔다.
 * 지원하지 않는 브라우저에서는 supported=false 를 돌려주고,
 * 화면에서 "화면이 꺼질 수 있습니다" 를 안내한다 — 조용히 넘어가지 않는다.
 */
export function useWakeLock(active: boolean) {
  const [supported] = useState(() => "wakeLock" in navigator);

  useEffect(() => {
    if (!active || !supported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* 배터리 절약 모드 등. 안내는 supported 로 갈음한다 */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active, supported]);

  return { supported };
}
