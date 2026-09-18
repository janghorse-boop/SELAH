// PNG 를 직접 쓴다. node 기본 모듈만으로 충분하다.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [13, 17, 23];       // #0d1117
const ACCENT = [240, 136, 62]; // #f0883e — 로고의 L
const LIGHT = [230, 237, 243]; // #e6edf3

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** 막대 셋짜리 RTA 글리프. (x, y) → [r, g, b] */
function painter(size) {
  const pad = Math.round(size * 0.22);
  const inner = size - pad * 2;
  const barW = Math.round(inner * 0.22);
  const gap = Math.round((inner - barW * 3) / 2);
  const baseY = size - pad;
  const bars = [
    { x: pad, h: 0.45, c: LIGHT },
    { x: pad + barW + gap, h: 0.78, c: ACCENT },
    { x: pad + (barW + gap) * 2, h: 0.58, c: LIGHT },
  ];
  return (x, y) => {
    for (const b of bars) {
      const top = baseY - Math.round(inner * b.h);
      if (x >= b.x && x < b.x + barW && y >= top && y < baseY) return b.c;
    }
    return BG;
  };
}

function png(size) {
  const paint = painter(size);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // 필터 없음
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 비트 깊이
  ihdr[9] = 2;  // 트루컬러 RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
for (const size of [192, 512]) {
  const file = `public/icon-${size}.png`;
  writeFileSync(file, png(size));
  console.log(`${file} 생성`);
}
