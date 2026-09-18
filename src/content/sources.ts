export type ZoneKind = "cut" | "problem" | "body" | "clarity" | "air";

export type Zone = { from: number; to: number; label: string; kind: ZoneKind };
export type Problem = { symptom: string; detail: string; range: [number, number] };

export type SourceGuide = {
  id: string;
  name: string;
  subtitle: string;
  /** 하이패스 권장 문구. 필요 없으면 null */
  highPass: string | null;
  zones: Zone[];
  problems: Problem[];
  /** 마이크를 쓰는 소스만. 라인 소스는 null */
  howlBands: number[] | null;
  howlNote: string | null;
  /** 다른 악기와 자리 다투는 대역에 대한 안내 */
  conflicts: string[];
};

export const GUIDE_FOOTER =
  "이 숫자는 출발점이지 정답이 아닙니다. 예배당마다 다릅니다 — 가이드를 보고 짐작한 뒤 RTA 로 확인하고, 맞으면 조정하십시오. 숫자만 보고 그대로 넣으면 더 나빠질 수 있습니다.";

export const SOURCES: SourceGuide[] = [
  {
    id: "preacher",
    name: "강대상 설교자",
    subtitle: "구즈넥 · 핀마이크 — 하울링이 가장 자주 나는 자리",
    highPass: "하이패스 80~100Hz — 연단 진동과 에어컨 저역을 잘라냅니다. 말소리는 그 아래에 없습니다.",
    zones: [
      { from: 20, to: 80, label: "잘라냄", kind: "cut" },
      { from: 200, to: 400, label: "먹먹함", kind: "problem" },
      { from: 400, to: 1000, label: "기본 음색", kind: "body" },
      { from: 1000, to: 4000, label: "말 또렷함", kind: "clarity" },
      { from: 6000, to: 8000, label: "치찰음", kind: "air" },
    ],
    problems: [
      {
        symptom: "먹먹하다 · 답답하다",
        detail: "200~400Hz 가 부풀었습니다. 마이크에 너무 가까이 붙거나 연단이 소리를 되쏘면 생깁니다.",
        range: [200, 400],
      },
      {
        symptom: "말이 안 들린다",
        detail: "2~4kHz 가 부족합니다. 자음(ㅅ·ㅊ·ㅌ)이 여기 있어서, 볼륨을 올리는 것보다 이 대역을 올리는 편이 낫습니다.",
        range: [2000, 4000],
      },
      {
        symptom: "스- 츠- 소리가 쏜다",
        detail: "6~8kHz 치찰음입니다. 깎으면 답답해지니 조금만, 또는 디에서를 씁니다.",
        range: [6000, 8000],
      },
    ],
    howlBands: [250, 1000, 3150],
    howlNote: "지향성 마이크가 모니터 스피커 쪽을 향할 때 가장 자주 납니다. 각도부터 보고, 그래도 나면 깎습니다.",
    conflicts: [],
  },
  {
    id: "vocal",
    name: "찬양인도 보컬",
    subtitle: "핸드마이크 — 움직이므로 예측이 어렵습니다",
    highPass: "하이패스 100~120Hz",
    zones: [
      { from: 20, to: 100, label: "잘라냄", kind: "cut" },
      { from: 150, to: 250, label: "부풀음", kind: "problem" },
      { from: 250, to: 1000, label: "몸통", kind: "body" },
      { from: 3000, to: 5000, label: "존재감", kind: "clarity" },
      { from: 10000, to: 20000, label: "공기감", kind: "air" },
    ],
    problems: [
      {
        symptom: "웅웅거린다",
        detail: "150~250Hz 근접효과입니다. 마이크에 가까이 붙을수록 심해집니다.",
        range: [150, 250],
      },
      {
        symptom: "반주에 묻힌다",
        detail: "3~5kHz 존재감이 부족합니다. 볼륨을 올리기 전에 여기를 봅니다.",
        range: [3000, 5000],
      },
      {
        symptom: "거칠고 쏜다",
        detail: "6~8kHz 가 과합니다. 조금만 깎습니다.",
        range: [6000, 8000],
      },
    ],
    howlBands: [315, 800, 3150],
    howlNote: "핸드마이크는 움직이므로 예측이 어렵습니다. 인도자가 모니터 앞으로 걸어갈 때 집중됩니다.",
    conflicts: [],
  },
  {
    id: "synth",
    name: "신디사이저",
    subtitle: "라인 · DI — 대역이 가장 넓습니다",
    highPass: null,
    zones: [
      { from: 20, to: 100, label: "베이스에 양보", kind: "cut" },
      { from: 100, to: 1000, label: "몸통", kind: "body" },
      { from: 1000, to: 3000, label: "보컬과 겹침", kind: "problem" },
      { from: 3000, to: 20000, label: "빛깔", kind: "air" },
    ],
    problems: [
      {
        symptom: "저역이 탁하다",
        detail: "100Hz 이하를 깎아 베이스에 자리를 내줍니다. 신디가 저역을 다 차지하면 베이스가 사라집니다.",
        range: [20, 100],
      },
      {
        symptom: "보컬이 묻힌다",
        detail: "1~3kHz 를 살짝 비워 보컬 자리를 만듭니다.",
        range: [1000, 3000],
      },
      {
        symptom: "넓게 퍼져 산만하다",
        detail: "스테레오 폭을 줄입니다. EQ 문제가 아닐 수 있습니다.",
        range: [200, 2000],
      },
    ],
    howlBands: null,
    howlNote: "선으로 직접 들어오므로 하울링이 원리적으로 나지 않습니다.",
    conflicts: ["베이스기타 (60~120Hz)", "보컬 (1~3kHz)"],
  },
  {
    id: "acoustic",
    name: "어쿠스틱기타",
    subtitle: "픽업 · DI",
    highPass: "하이패스 80Hz",
    zones: [
      { from: 20, to: 80, label: "잘라냄", kind: "cut" },
      { from: 200, to: 250, label: "통울림", kind: "problem" },
      { from: 250, to: 1000, label: "몸통", kind: "body" },
      { from: 3000, to: 5000, label: "픽업 날카로움", kind: "problem" },
      { from: 8000, to: 20000, label: "현 소리", kind: "air" },
    ],
    problems: [
      {
        symptom: "박스 소리 · 통울림",
        detail: "200~250Hz 입니다. 어쿠스틱기타에서 가장 흔한 문제입니다.",
        range: [200, 250],
      },
      {
        symptom: "얇고 날카롭다",
        detail: "3~5kHz 픽업 특유의 소리입니다. 조금 깎으면 자연스러워집니다.",
        range: [3000, 5000],
      },
      {
        symptom: "답답하고 갇혀 있다",
        detail: "8kHz 이상 현 소리가 부족합니다.",
        range: [8000, 16000],
      },
    ],
    howlBands: [100, 125, 160, 200],
    howlNote: "마이크를 함께 쓸 때만 납니다. 바디 공명이 원인이므로 EQ 보다 사운드홀 커버가 먼저입니다.",
    conflicts: ["보컬 (2~4kHz)"],
  },
  {
    id: "bass",
    name: "베이스기타",
    subtitle: "DI",
    highPass: "하이패스 40Hz — 그 아래는 스피커만 괴롭힙니다.",
    zones: [
      { from: 20, to: 40, label: "잘라냄", kind: "cut" },
      { from: 80, to: 120, label: "무게", kind: "body" },
      { from: 200, to: 400, label: "탁함", kind: "problem" },
      { from: 700, to: 1000, label: "손가락 소리", kind: "clarity" },
    ],
    problems: [
      {
        symptom: "있는지 없는지 모르겠다",
        detail: "700Hz~1kHz 를 올립니다. 저역을 올리는 게 아닙니다 — 베이스가 들리는 것은 이 대역입니다.",
        range: [700, 1000],
      },
      {
        symptom: "웅웅거린다",
        detail: "200~400Hz 를 깎습니다.",
        range: [200, 400],
      },
      {
        symptom: "킥드럼과 뭉친다",
        detail: "킥 60Hz / 베이스 100Hz 로 자리를 나눕니다. 둘 다 같은 대역을 올리면 서로 잡아먹습니다.",
        range: [50, 120],
      },
    ],
    howlBands: null,
    howlNote: "선으로 직접 들어오므로 하울링이 원리적으로 나지 않습니다.",
    conflicts: ["킥드럼 (50~120Hz)"],
  },
  {
    id: "eguitar",
    name: "일렉기타",
    subtitle: "앰프 마이킹 또는 모델러 직결",
    highPass: "하이패스 100Hz",
    zones: [
      { from: 20, to: 100, label: "잘라냄", kind: "cut" },
      { from: 400, to: 800, label: "박스 소리", kind: "problem" },
      { from: 800, to: 2000, label: "몸통", kind: "body" },
      { from: 2000, to: 4000, label: "쏘는 소리", kind: "problem" },
      { from: 6000, to: 20000, label: "거침", kind: "air" },
    ],
    problems: [
      {
        symptom: "먹먹하고 답답하다",
        detail: "400~800Hz 박스 소리를 깎습니다.",
        range: [400, 800],
      },
      {
        symptom: "귀를 찌른다",
        detail: "2~4kHz 가 과합니다.",
        range: [2000, 4000],
      },
      {
        symptom: "보컬을 덮는다",
        detail: "2~4kHz 를 비워 보컬 자리를 만듭니다. 기타를 줄이는 것보다 자리를 나누는 편이 낫습니다.",
        range: [2000, 4000],
      },
    ],
    howlBands: [250, 500, 1000],
    howlNote: "앰프를 마이킹할 때만 납니다. 모델러 직결이면 나지 않습니다.",
    conflicts: ["보컬 (2~4kHz)", "신디사이저 (1~3kHz)"],
  },
  {
    id: "edrum",
    name: "전자드럼",
    subtitle: "라인 — 다루기 쉬운 대신 과하게 만지면 나빠집니다",
    highPass: null,
    zones: [
      { from: 50, to: 80, label: "킥", kind: "body" },
      { from: 100, to: 300, label: "탐 · 스네어 몸통", kind: "body" },
      { from: 4000, to: 6000, label: "스네어 때리는 소리", kind: "clarity" },
      { from: 8000, to: 20000, label: "하이햇 · 심벌", kind: "air" },
    ],
    problems: [
      {
        symptom: "킥이 안 느껴진다",
        detail: "50~80Hz 를 올립니다. 다만 베이스와 겹치지 않게 60Hz 부근으로 좁게 봅니다.",
        range: [50, 80],
      },
      {
        symptom: "스네어가 약하다",
        detail: "5kHz 를 올립니다. 200Hz(몸통)를 올리면 커지기만 하고 또렷해지지는 않습니다.",
        range: [4000, 6000],
      },
      {
        symptom: "심벌이 쏜다",
        detail: "8kHz 이상을 조금만 깎습니다. 전자드럼 음원은 이미 EQ 가 되어 있어 조금씩 만져야 합니다.",
        range: [8000, 16000],
      },
    ],
    howlBands: null,
    howlNote: "선으로 직접 들어오므로 하울링이 원리적으로 나지 않습니다.",
    conflicts: ["베이스기타 — 킥 60Hz / 베이스 100Hz 로 나눕니다"],
  },
];
