import { useEffect, useState } from "react";

/** 지금 화면 꺼짐 방지가 실제로 걸려 있는가. */
export type WakeLockStatus = "pending" | "held" | "unavailable";

/**
 * 화면이 보이는 중에 잠금이 **연달아** 풀렸을 때 다시 잡아 볼 횟수.
 * 세 번 잡자마자 회수당했다면 그 폰에서는 안 되는 것이다.
 */
const RELEASE_RETRY_LIMIT = 3;

/**
 * 잡은 지 이 시간 안에 풀리면 「되풀이」로 본다.
 *
 * 세는 것은 **횟수가 아니라 되풀이**다. 배터리 절약이 회수할 때는 잡자마자
 * 풀리지만, 정상적인 회수는 한참 뒤에 드문드문 일어난다. 누적 횟수로 재면
 * 90분 예배 동안 멀쩡히 네 번 다시 잡은 것만으로 「잠글 수 없다」는
 * 거짓 경고가 뜬다 — 이 앱이 가장 하지 말아야 할 일이다.
 */
const SPIN_WINDOW_MS = 5000;

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
    // 화면이 보이는 중에 풀렸을 때 **연달아** 다시 잡아 본 횟수.
    // 배터리 절약 모드는 「허락했다가 곧바로 회수」를 되풀이할 수 있다.
    // 한계가 없으면 잡기→풀림이 쉬지 않고 도는데 상태는 held 로 남아,
    // 정작 「화면이 꺼질 수 있다」는 경고가 끝내 뜨지 않는다.
    let retries = 0;
    setStatus("pending");

    const acquire = async () => {
      if (cancelled || lock) return; // 이미 잡고 있으면 다시 요청하지 않는다
      try {
        const got = await navigator.wakeLock.request("screen");
        if (cancelled) { got.release().catch(() => {}); return; }
        lock = got;
        const heldAt = Date.now();
        setStatus("held");
        got.addEventListener("release", () => {
          lock = null;
          if (cancelled) return;
          if (document.visibilityState !== "visible") {
            // 화면을 벗어난 것뿐이다. 돌아오면 onVisible 이 다시 잡는다.
            setStatus("pending");
            return;
          }
          if (Date.now() - heldAt > SPIN_WINDOW_MS) {
            // 한참 잡고 있다가 풀렸다 — 되풀이가 아니라 한 번의 회수다.
            // 예산을 새로 준다.
            retries = 0;
          }
          // 보이는 중에 풀렸다. 배터리 절약 등이 회수한 것이므로 몇 번은
          // 다시 잡아 본다. pending 으로 두면 화면은 멀쩡해 보이는데
          // 실제로는 꺼진다. 다만 되풀이가 멈추지 않으면 그 폰에서는
          // 잠글 수 없다는 뜻이니, 조용히 계속 매달리지 말고 사실대로 알린다.
          if (retries >= RELEASE_RETRY_LIMIT) {
            setStatus("unavailable");
            return;
          }
          retries++;
          void acquire();
        });
      } catch {
        // 배터리 절약 모드 등. 「된다」고 말하면 안 된다.
        if (!cancelled) setStatus("unavailable");
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // 화면으로 돌아왔다 — 아까 실패했더라도 사정이 달라졌을 수 있으니
      // 재시도 예산을 새로 준다.
      retries = 0;
      void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);

  return { status };
}
