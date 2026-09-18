import { useEffect, useState } from "react";

/** 지금 화면 꺼짐 방지가 실제로 걸려 있는가. */
export type WakeLockStatus = "pending" | "held" | "unavailable";

/**
 * 감시 중에는 폰이 저절로 잠기지 않게 잡아 둔다.
 *
 * **「기능이 있다」와 「실제로 걸렸다」를 구분한다.** 배터리 절약 모드에서는
 * API 가 있어도 요청이 거부된다. 그때 「지원함」이라고만 말하면 앱은
 * 안내를 안 띄우는데 화면은 실제로 꺼진다 — 예배 중에 감시가 멈춘 줄도 모른다.
 * 그래서 요청 결과까지 보고 `unavailable` 을 내보낸다.
 *
 * 시작 직후의 `pending` 동안에는 경고를 띄우지 않는다. 안 그러면 매번
 * 경고가 깜빡였다 사라진다.
 */
export function useWakeLock(active: boolean) {
  const [status, setStatus] = useState<WakeLockStatus>("pending");

  useEffect(() => {
    if (!active) { setStatus("pending"); return; }
    if (!("wakeLock" in navigator)) { setStatus("unavailable"); return; }

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    setStatus("pending");

    const acquire = async () => {
      if (cancelled || lock) return; // 이미 잡고 있으면 다시 요청하지 않는다
      try {
        const got = await navigator.wakeLock.request("screen");
        if (cancelled) { void got.release(); return; }
        lock = got;
        setStatus("held");
        got.addEventListener("release", () => {
          lock = null;
          if (!cancelled) setStatus("pending");
        });
      } catch {
        // 배터리 절약 모드 등. 「된다」고 말하면 안 된다.
        if (!cancelled) setStatus("unavailable");
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
      lock = null;
    };
  }, [active]);

  return { status };
}
