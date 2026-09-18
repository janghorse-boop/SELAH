export type BandPlan = 31 | 15 | 10;
export type Sensitivity = "low" | "normal" | "high";

/** AnalyserNode.getFloatFrequencyData 의 결과. db[i] 는 i*binHz 의 레벨(dBFS). */
export type Spectrum = {
  db: Float32Array;
  binHz: number;
};

export type PeakInfo = {
  bin: number;
  hz: number;
  db: number;
  /** 이웃 대비 솟은 정도 (dB) */
  pnpr: number;
  /** 전체 평균 대비 (dB) */
  papr: number;
  /** 위쪽 배음(2f·3f) 대비 (dB). 클수록 배음이 없다 = 하울링답다 */
  phpr: number;
  /**
   * 아래쪽(f/2·f/3) 대비 (dB). 작으면 이 봉우리가 남의 배음이라는 뜻이다.
   * 이것이 없으면 220Hz 목소리의 440Hz 배음이 하울링으로 통과한다.
   */
  shpr: number;
};

export type HowlCandidate = {
  hz: number;
  db: number;
  /** = pnpr. 컷 권고량 계산에 쓴다 */
  prominence: number;
};

export type CutAdvice = {
  /** 반올림된 슬라이더 이름 */
  bandHz: number;
  cutDb: number;
  /** 탐지된 정확한 주파수 (파라메트릭 EQ 표시용) */
  exactHz: number;
  q: number;
  /** 15밴드 이하일 때 띄울 경고. 31밴드면 null */
  wideBandWarning: string | null;
};
