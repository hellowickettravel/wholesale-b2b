/**
 * Crops each product photo out of the page images of the Shrivi packaging catalogue (image-only
 * PDF). Every product sits in a light-grey bordered tile with the photo at the top; we find the
 * tiles from their border lines, then the photo inside each tile, and save it as WebP named by
 * page/row/col to match data/source/shrivi-packaging-transcribed.psv.
 *
 *   pdfimages -j <catalogue.pdf> <dir>/p        # page images p-000.jpg … (one per page)
 *   npx tsx scripts/crop-catalogue-photos.mts <dir> <outDir>
 */
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [dir, outDir] = process.argv.slice(2);
if (!dir || !outDir) throw new Error("usage: crop-catalogue-photos.mts <pageDir> <outDir>");
mkdirSync(outDir, { recursive: true });

type Box = { x0: number; x1: number; y0: number; y1: number };

function isBorder(v: number) {
  return v >= 175 && v <= 232;
}

async function boxesOf(file: string) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const px = (x: number, y: number) => data[y * W + x];
  // Horizontal border segments: runs of border-grey 200–260 px long (tiles are ~232 px wide;
  // product photos inside are much narrower, page-wide bands much wider).
  const segs: { x0: number; x1: number; y: number }[] = [];
  for (let y = 0; y < H; y++) {
    let start = -1;
    for (let x = 0; x <= W; x++) {
      const b = x < W && isBorder(px(x, y));
      if (b && start < 0) start = x;
      if (!b && start >= 0) {
        const len = x - start;
        if (len >= 200 && len <= 262) segs.push({ x0: start, x1: x - 1, y });
        start = -1;
      }
    }
  }
  // Collapse consecutive rows of the same line, then pair lines in the same column into boxes.
  const lines: { x0: number; x1: number; y: number }[] = [];
  for (const s of segs) {
    const prev = lines.find((l) => Math.abs(l.x0 - s.x0) <= 6 && s.y - l.y <= 4 && s.y >= l.y);
    if (prev) prev.y = s.y;
    else lines.push({ ...s });
  }
  const boxes: Box[] = [];
  const byCol = new Map<number, typeof lines>();
  for (const l of lines) {
    const key = [...byCol.keys()].find((k) => Math.abs(k - l.x0) <= 8) ?? l.x0;
    byCol.set(key, [...(byCol.get(key) ?? []), l]);
  }
  for (const col of byCol.values()) {
    col.sort((a, b) => a.y - b.y);
    for (let i = 0; i + 1 < col.length; i++) {
      const h = col[i + 1].y - col[i].y;
      if (h >= 200 && h <= 300) {
        boxes.push({ x0: col[i].x0, x1: col[i].x1, y0: col[i].y, y1: col[i + 1].y });
        i++;
      }
    }
  }
  return { boxes, data, W };
}

/** The photo inside a tile: the tallest run of rows that are mostly non-white, and its columns. */
function photoIn(box: Box, data: Buffer, W: number) {
  const x0 = box.x0 + 6;
  const x1 = box.x1 - 6;
  const width = x1 - x0;
  const rows: boolean[] = [];
  for (let y = box.y0 + 4; y < box.y1 - 4; y++) {
    let n = 0;
    for (let x = x0; x < x1; x++) if (data[y * W + x] < 243) n++;
    rows.push(n / width > 0.35);
  }
  let best = { start: 0, len: 0 };
  for (let i = 0, start = -1; i <= rows.length; i++) {
    if (i < rows.length && rows[i]) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start > best.len) best = { start, len: i - start };
      start = -1;
    }
  }
  if (best.len < 60) return null;
  const top = box.y0 + 4 + best.start;
  const bottom = top + best.len;
  let left = x1;
  let right = x0;
  for (let y = top; y < bottom; y += 2) {
    for (let x = x0; x < x1; x++) {
      if (data[y * W + x] < 243) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top };
}

let total = 0;
for (const name of readdirSync(dir).filter((f) => /^p-\d+\.jpg$/.test(f)).sort()) {
  const page = Number(name.match(/\d+/)![0]) + 1;
  const file = path.join(dir, name);
  const { boxes, data, W } = await boxesOf(file);
  // Rows of tiles top to bottom (±20 px), columns left to right.
  boxes.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rowStarts: number[] = [];
  for (const b of boxes) if (!rowStarts.some((y) => Math.abs(y - b.y0) <= 20)) rowStarts.push(b.y0);
  const colStarts = [...new Set(boxes.map((b) => Math.round(b.x0 / 60)))].sort((a, b) => a - b);
  let n = 0;
  for (const b of boxes) {
    const row = rowStarts.findIndex((y) => Math.abs(y - b.y0) <= 20) + 1;
    const col = colStarts.indexOf(Math.round(b.x0 / 60)) + 1;
    const found = photoIn(b, data, W);
    // Almost every tile has its photo at the same spot (measured: 40 px in, 16 px down, 167 px
    // square in a 245 x 272 tile). White products on white backgrounds defeat detection, so use
    // the detected rectangle only when it is full size, else the standard spot.
    const standard = { left: b.x0 + 40, top: b.y0 + 16, width: 167, height: 167 };
    const photo = found && found.width >= 150 && found.height >= 150 ? found : standard;
    // Square canvas on white so every product card has the same shape.
    const side = Math.max(photo.width, photo.height);
    await sharp(file)
      .extract(photo)
      .resize({ width: side, height: side, fit: "contain", background: "#ffffff" })
      .resize(480, 480)
      .webp({ quality: 80 })
      .toFile(path.join(outDir, `p${page}-r${row}-c${col}.webp`));
    n++;
  }
  total += n;
  console.log(`page ${page}: ${boxes.length} tiles, ${n} photos, rows ${rowStarts.length}`);
}
console.log(`total photos ${total}`);
