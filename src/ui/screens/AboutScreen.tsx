import {
  APP_MAKER,
  APP_NAME,
  APP_TAGLINE,
  DISCLAIMER_NOT_A_METER,
  DISCLAIMER_NO_INTERVENTION,
} from "../../appInfo";

export function AboutScreen({ onExit }: { onExit: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">정보</h1>
        <button className="text-sm text-neutral-500" onClick={onExit}>나가기</button>
      </div>

      <div className="text-2xl font-extrabold">{APP_NAME}</div>
      <div className="mt-1 text-xs text-neutral-500">{APP_TAGLINE}</div>

      <div className="mt-6 space-y-2.5">
        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
          {DISCLAIMER_NO_INTERVENTION}
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          {DISCLAIMER_NOT_A_METER}
        </div>
      </div>

      <div className="mt-6 text-[10px] uppercase tracking-wider text-neutral-400">남기지 않습니다</div>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
        측정 결과를 <b>어디에도 남기지 않습니다.</b> 화면을 나가면 그대로 사라집니다.
        소리를 녹음하지 않고, 서버로 보내지 않고, 계정도 없습니다.
        이 폰에 저장되는 것은 <b>설정값뿐</b>입니다.
      </p>

      <div className="mt-6 text-[10px] uppercase tracking-wider text-neutral-400">라이선스</div>
      <p className="mt-1.5 text-xs text-neutral-600">
        MIT License · made by <b>{APP_MAKER}</b>
      </p>
      <a
        className="mt-1.5 inline-block text-xs text-blue-600"
        href="https://github.com/janghorse-boop/SELAH"
        target="_blank"
        rel="noreferrer"
      >
        github.com/janghorse-boop/SELAH
      </a>
    </div>
  );
}
