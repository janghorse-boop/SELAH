import { useState } from "react";
import {
  APP_MAKER,
  APP_TAGLINE,
  DISCLAIMER_NOT_A_METER,
  DISCLAIMER_NO_INTERVENTION,
} from "../../appInfo";

const SEEN_KEY = "selah.seenIntro";

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function FirstRunNotice({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <div className="text-base font-bold">읽고 시작해 주십시오</div>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
            {DISCLAIMER_NO_INTERVENTION}
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            {DISCLAIMER_NOT_A_METER}
          </div>
        </div>
        <button className="mt-4 w-full rounded-lg bg-neutral-800 py-2.5 text-sm font-semibold text-white" onClick={onClose}>
          확인했습니다
        </button>
      </div>
    </div>
  );
}

export function StartScreen({ go }: { go: (r: "rehearsal" | "worship" | "guide" | "settings" | "about") => void }) {
  const [showIntro, setShowIntro] = useState(() => !readSeen());

  function closeIntro() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // 저장이 막혀 있으면 다음에 또 보인다. 안 보이는 것보다 낫다.
    }
    setShowIntro(false);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col px-5 py-8">
      {showIntro && <FirstRunNotice onClose={closeIntro} />}
      <div className="mt-8 text-center">
        <div className="text-4xl font-extrabold tracking-tight">
          SE<span className="text-orange-500">L</span>AH
        </div>
        <div className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
          RTA · {APP_TAGLINE}
        </div>
      </div>

      <div className="mt-auto space-y-2.5">
        <button className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white" onClick={() => go("rehearsal")}>
          리허설 모드 시작
        </button>
        <button className="w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white" onClick={() => go("worship")}>
          예배 모드 시작
        </button>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="rounded-lg bg-neutral-100 py-2.5 text-xs" onClick={() => go("guide")}>가이드</button>
          <button className="rounded-lg bg-neutral-100 py-2.5 text-xs" onClick={() => go("settings")}>설정</button>
        </div>
      </div>

      <button className="mt-6 text-center text-[10px] tracking-wide text-neutral-400" onClick={() => go("about")}>
        made by <span className="font-semibold text-neutral-500">{APP_MAKER}</span>
      </button>
    </div>
  );
}
