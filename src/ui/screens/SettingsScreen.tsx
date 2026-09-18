import { useState } from "react";
import type { BandPlan, Sensitivity } from "../../analysis/types";
import { saveSettings, isStorageAvailable, type Settings } from "../../storage/settings";

const PLANS: { v: BandPlan; label: string; note: string }[] = [
  { v: 31, label: "31밴드", note: "1/3 옥타브 · 가장 흔한 구성" },
  { v: 15, label: "15밴드", note: "2/3 옥타브" },
  { v: 10, label: "10밴드", note: "1 옥타브 · 하울링만 콕 집기 어렵습니다" },
];

const SENS: { v: Sensitivity; label: string; note: string }[] = [
  { v: "low", label: "낮음", note: "오탐이 적습니다 (0.7초)" },
  { v: "normal", label: "보통", note: "기본 (0.5초)" },
  { v: "high", label: "높음", note: "빨리 잡습니다 (0.35초)" },
];

export function SettingsScreen({
  settings,
  onChange,
  onExit,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onExit: () => void;
}) {
  const [calibText, setCalibText] = useState(
    settings.calibrationDb === null ? "" : String(settings.calibrationDb),
  );

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    saveSettings(next);
    onChange(next);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">설정</h1>
        <button className="text-sm text-neutral-500" onClick={onExit}>나가기</button>
      </div>

      {!isStorageAvailable() && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          이 브라우저에서는 설정과 기록을 저장할 수 없습니다(시크릿 모드 등). 측정은 정상 동작합니다.
        </div>
      )}

      <div className="text-[10px] uppercase tracking-wider text-neutral-400">EQ 밴드 수</div>
      <div className="mt-1.5 space-y-1.5">
        {PLANS.map((p) => (
          <button
            key={p.v}
            onClick={() => update({ bandPlan: p.v })}
            className={`w-full rounded-lg border px-3 py-2.5 text-left ${
              settings.bandPlan === p.v ? "border-blue-600 bg-blue-50" : "border-neutral-200"
            }`}
          >
            <div className="text-sm font-semibold">{p.label}</div>
            <div className="text-[11px] text-neutral-500">{p.note}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-[10px] uppercase tracking-wider text-neutral-400">하울링 감도</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {SENS.map((s) => (
          <button
            key={s.v}
            onClick={() => update({ sensitivity: s.v })}
            className={`rounded-lg border px-2 py-2 ${
              settings.sensitivity === s.v ? "border-blue-600 bg-blue-50" : "border-neutral-200"
            }`}
          >
            <div className="text-xs font-semibold">{s.label}</div>
            <div className="text-[10px] leading-tight text-neutral-500">{s.note}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-[10px] uppercase tracking-wider text-neutral-400">절대 dB 보정</div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
        기본은 상대 레벨만 보여줍니다. 소음계와 비교한 차이(dB)를 넣으면 그만큼 더해 보여줍니다.
        <b> 근사치입니다.</b> 비우면 상대 레벨로 돌아갑니다.
      </p>
      <input
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        inputMode="decimal"
        placeholder="예: 12"
        value={calibText}
        onChange={(e) => {
          setCalibText(e.target.value);
          const n = Number(e.target.value);
          update({ calibrationDb: e.target.value.trim() === "" || Number.isNaN(n) ? null : n });
        }}
      />

      <label className="mt-6 flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={settings.showParametric}
          onChange={(e) => update({ showParametric: e.target.checked })}
        />
        <span className="text-sm">파라메트릭 EQ 용 정확한 주파수와 Q 도 표시</span>
      </label>
    </div>
  );
}
