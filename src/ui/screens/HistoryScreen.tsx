import { useState } from "react";
import { clearSessions, loadSessions } from "../../storage/sessions";

function fmt(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function label(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function HistoryScreen({ onExit }: { onExit: () => void }) {
  const [sessions, setSessions] = useState(() => loadSessions());

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">기록</h1>
        <button className="text-sm text-neutral-500" onClick={onExit}>나가기</button>
      </div>

      {sessions.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">아직 저장된 측정이 없습니다.</p>
      ) : (
        <>
          <div className="space-y-2">
            {sessions.map((s) => {
              const counts = new Map<number, number>();
              for (const h of s.howls) counts.set(h.bandHz, (counts.get(h.bandHz) ?? 0) + 1);
              const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

              return (
                <div key={s.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">
                      {s.mode === "rehearsal" ? "리허설" : "예배"} · {fmt(s.startedAt)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {Math.round((s.endedAt - s.startedAt) / 60000)}분 · {s.bandPlan}밴드
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    하울링 {s.howls.length}회
                    {top.length > 0 && ` — 잦은 대역 ${top.map(([hz, n]) => `${label(hz)}(${n})`).join(" · ")}`}
                  </div>
                  {s.gaps.length > 0 && (
                    <div className="mt-1 text-xs text-amber-600">
                      ⚠ 측정이 {s.gaps.length}회 끊겼습니다 — 비교할 때 감안하십시오
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            className="mt-6 w-full rounded-lg border border-red-300 py-2.5 text-sm text-red-700"
            onClick={() => {
              if (confirm("저장된 기록을 모두 지웁니다. 되돌릴 수 없습니다.")) {
                clearSessions();
                setSessions([]);
              }
            }}
          >
            기록 모두 지우기
          </button>
        </>
      )}
    </div>
  );
}
