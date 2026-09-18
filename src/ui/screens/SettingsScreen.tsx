import { useEffect, useState } from "react";
import type { BandPlan, Sensitivity } from "../../analysis/types";
import { saveSettings, isStorageAvailable, type Settings } from "../../storage/settings";
import { labelFor, listAudioInputs, onDeviceChange, type AudioInput } from "../../audio/devices";

const PLANS: { v: BandPlan; label: string; note: string }[] = [
  { v: 31, label: "31밴드", note: "1/3 옥타브 · 가장 흔한 구성" },
  { v: 15, label: "15밴드", note: "2/3 옥타브" },
  { v: 10, label: "10밴드", note: "1 옥타브 · 하울링만 콕 집기 어렵습니다" },
];

/**
 * 보정값 허용 범위(dB). 폰의 dBFS 를 실제 SPL 로 옮기면 보통 +100 안팎이다.
 * 범위를 안 두면 큰 값 하나로 **모든 막대가 동시에 천장(또는 바닥)에 붙어**
 * 대역별 차이가 통째로 사라진다. 오류도 경고도 없이 화면만 쓸모없어진다.
 */
const CALIB_MIN = -200;
const CALIB_MAX = 200;

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
  // 매 렌더마다(= 입력 한 글자마다) 저장소를 실제로 건드리지 않는다.
  const [storageOk] = useState(() => isStorageAvailable());

  const [inputs, setInputs] = useState<AudioInput[]>([]);
  useEffect(() => {
    const refresh = () => { void listAudioInputs().then(setInputs); };
    refresh();
    return onDeviceChange(refresh);
  }, []);

  const typed = calibText.trim();
  const calibInvalid =
    typed !== "" && !(Number.isFinite(Number(typed)) && Number(typed) >= CALIB_MIN && Number(typed) <= CALIB_MAX);

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

      {!storageOk && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          이 브라우저에서는 설정과 기록을 저장할 수 없습니다(시크릿 모드 등). 측정은 정상 동작합니다.
        </div>
      )}

      <div className="text-[10px] uppercase tracking-wider text-neutral-400">입력 기기</div>
      {inputs.length <= 1 ? (
        <p className="mt-1.5 rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          이 브라우저는 입력 기기를 골라줄 수 없습니다. 외부 마이크를 연결하면 자동으로 그쪽으로 넘어갑니다.
          (아이폰 사파리가 이렇습니다)
        </p>
      ) : (
        <div className="mt-1.5 space-y-1.5">
          <button
            onClick={() => update({ deviceId: null, deviceLabel: null })}
            className={`w-full rounded-lg border px-3 py-2.5 text-left ${
              settings.deviceId === null ? "border-blue-600 bg-blue-50" : "border-neutral-200"
            }`}
          >
            <div className="text-sm font-semibold">시스템 기본</div>
            <div className="text-[11px] text-neutral-500">폰이 정한 기기를 씁니다</div>
          </button>
          {inputs.map((d, i) => (
            <button
              key={d.deviceId}
              onClick={() => update({ deviceId: d.deviceId, deviceLabel: labelFor(d, i) })}
              className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                settings.deviceId === d.deviceId ? "border-blue-600 bg-blue-50" : "border-neutral-200"
              }`}
            >
              <div className="text-sm font-semibold">{labelFor(d, i)}</div>
            </button>
          ))}
        </div>
      )}
      {inputs.some((d) => d.label.trim() === "") && (
        <p className="mt-1.5 text-[11px] text-neutral-500">
          마이크를 한 번 허용하면 기기의 실제 이름이 보입니다.
        </p>
      )}

      <div className="mt-6 text-[10px] uppercase tracking-wider text-neutral-400">EQ 밴드 수</div>
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
        <b> 근사치입니다.</b> 비우면 상대 레벨로 돌아갑니다. ({CALIB_MIN} ~ {CALIB_MAX} 사이)
      </p>
      <input
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        inputMode="decimal"
        placeholder="예: 12"
        value={calibText}
        onChange={(e) => {
          setCalibText(e.target.value);
          const raw = e.target.value.trim();
          if (raw === "") { update({ calibrationDb: null }); return; }
          const n = Number(raw);
          // 범위 밖이면 저장하지 않는다. 화면에 왜 안 되는지도 함께 띄운다 —
          // 조용히 무시하면 「입력했는데 왜 안 바뀌지」가 된다.
          if (!Number.isFinite(n) || n < CALIB_MIN || n > CALIB_MAX) return;
          update({ calibrationDb: n });
        }}
      />
      {calibInvalid && (
        <p className="mt-1 text-[11px] text-red-700">
          {CALIB_MIN} ~ {CALIB_MAX} 사이의 숫자만 쓸 수 있습니다. 이 값은 저장되지 않았습니다.
        </p>
      )}

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
