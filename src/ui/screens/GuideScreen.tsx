import { useState } from "react";
import { SOURCES, GUIDE_FOOTER, type SourceGuide, type ZoneKind } from "../../content/sources";
import { formatHz } from "../../analysis/bands";

const ZONE_COLOR: Record<ZoneKind, string> = {
  cut: "bg-neutral-500",
  problem: "bg-amber-600",
  body: "bg-blue-600",
  clarity: "bg-green-600",
  air: "bg-purple-600",
};

/** 띠 안에 이름을 적을 수 있는 최소 폭(%). 이보다 좁으면 글자가 잘린다. */
const MIN_LABEL_PCT = 8;

/** 20Hz~20kHz 로그 축에서의 위치(%) */
function logPos(hz: number): number {
  const lo = Math.log10(20);
  const hi = Math.log10(20000);
  return ((Math.log10(hz) - lo) / (hi - lo)) * 100;
}

function Card({
  s,
  onOpenRta,
}: {
  s: SourceGuide;
  onOpenRta: (range: [number, number]) => void;
}) {
  const narrowZones = s.zones.filter((z) => logPos(z.to) - logPos(z.from) < MIN_LABEL_PCT);

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="text-base font-bold">{s.name}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{s.subtitle}</div>

      <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">주파수 지도</div>
      <div className="relative mt-1.5 h-7 overflow-hidden rounded bg-neutral-100">
        {s.zones.map((z) => {
          const width = logPos(z.to) - logPos(z.from);
          return (
            <div
              key={`${z.from}-${z.to}`}
              className={`absolute top-0 flex h-full items-center justify-center text-[8.5px] font-semibold text-white ${ZONE_COLOR[z.kind]}`}
              style={{ left: `${logPos(z.from)}%`, width: `${width}%` }}
              title={`${z.label} ${formatHz(z.from)}~${formatHz(z.to)}Hz`}
            >
              {width >= MIN_LABEL_PCT ? z.label : ""}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[8px] text-neutral-400">
        <span>20</span><span>100</span><span>1k</span><span>10k</span><span>20k</span>
      </div>
      {/*
        좁아서 띠 안에 이름이 안 들어간 구간은 아래에 적는다.
        어쿠스틱 「통울림」은 폭이 3.2%, 전자드럼 「스네어 때리는 소리」는 5.9% 라
        그냥 두면 글자가 잘리거나 삐져나온다 — 지도가 거짓말을 하게 된다.
      */}
      {narrowZones.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-neutral-500">
          {narrowZones.map((z) => (
            <span key={`${z.from}-${z.to}`} className="inline-flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-sm ${ZONE_COLOR[z.kind]}`} />
              {z.label} {formatHz(z.from)}~{formatHz(z.to)}Hz
            </span>
          ))}
        </div>
      )}

      {s.highPass && (
        <>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">먼저 할 것</div>
          <div className="mt-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">{s.highPass}</div>
        </>
      )}

      <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">흔한 문제</div>
      <div className="mt-1.5 space-y-1.5">
        {s.problems.map((p) => (
          <div key={p.symptom} className="rounded-lg border-l-[3px] border-amber-500 bg-neutral-50 px-3 py-2">
            <div className="text-xs font-semibold">{p.symptom}</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-neutral-600">{p.detail}</div>
            <button
              className="mt-1.5 text-[11px] font-medium text-blue-600"
              onClick={() => onOpenRta(p.range)}
            >
              → {formatHz(p.range[0])}~{formatHz(p.range[1])}Hz 를 RTA 로 보기
            </button>
          </div>
        ))}
      </div>

      {/*
        둘을 배타적으로 두면 안 된다. 어쿠스틱·일렉기타는 하울링 대역과
        자리 다툼을 **둘 다** 가지고 있어서, 한쪽만 그리면 「보컬과 겹친다」가
        화면에 아예 나오지 않는다.
      */}
      {s.howlBands ? (
        <>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">하울링 주의</div>
          <div className="mt-1.5 rounded-lg border-l-[3px] border-red-600 bg-red-50 px-3 py-2">
            <div className="text-xs font-semibold text-red-800">
              {s.howlBands.map(formatHz).join(" · ")} Hz
            </div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-neutral-700">{s.howlNote}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">하울링 없음</div>
          <div className="mt-1.5 rounded-lg border-l-[3px] border-green-600 bg-green-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-700">
            {s.howlNote}
          </div>
        </>
      )}

      {s.conflicts.length > 0 && (
        <>
          <div className="mt-4 text-[10px] uppercase tracking-wider text-neutral-400">자리 다투는 대역</div>
          <ul className="mt-1.5 list-inside list-disc rounded-lg bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-700">
            {s.conflicts.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </>
      )}

      <div className="mt-3 border-t border-neutral-200 pt-2.5 text-[10px] leading-relaxed text-neutral-500">
        {GUIDE_FOOTER}
      </div>
    </div>
  );
}

export function GuideScreen({
  onOpenRta,
  onExit,
}: {
  onOpenRta: (range: [number, number]) => void;
  onExit: () => void;
}) {
  const [openId, setOpenId] = useState<string>(SOURCES[0].id);
  const current = SOURCES.find((s) => s.id === openId)!;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">소스별 가이드</h1>
        <button className="text-sm text-neutral-500" onClick={onExit}>나가기</button>
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                s.id === openId ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <Card s={current} onOpenRta={onOpenRta} />
    </div>
  );
}
