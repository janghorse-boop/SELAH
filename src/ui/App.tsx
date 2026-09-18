import { useState } from "react";
import { startCapture, type CaptureHandle } from "../audio/capture";
import { spectrumToBands } from "../analysis/bands";

export default function App() {
  const [bands, setBands] = useState<number[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [handle, setHandle] = useState<CaptureHandle | null>(null);

  async function start() {
    try {
      const h = await startCapture({
        onFrame: (s) => setBands(spectrumToBands(s, 31)),
        onError: (_kind, m) => { setMsg(m); setHandle(null); },
        onInterrupt: (ms) => setMsg(`측정이 ${Math.round(ms)}ms 끊겼습니다`),
      });
      setHandle(h);
      setMsg(h.report.message ?? "제약 3종 모두 적용됨");
    } catch {
      /* onError 에서 이미 알렸다 */
    }
  }

  return (
    <div className="p-4 font-sans">
      <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={start} disabled={!!handle}>
        마이크 열기
      </button>
      <p className="mt-3 text-sm text-red-700">{msg}</p>
      <div className="mt-4 flex h-40 items-end gap-px">
        {bands.map((v, i) => (
          <div key={i} className="flex-1 bg-green-600" style={{ height: `${Math.max(0, (v + 100) / 100) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
