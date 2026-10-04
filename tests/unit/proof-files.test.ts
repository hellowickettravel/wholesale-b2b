import { describe, expect, it } from "vitest";
import { checkProofFile, PROOF_LIMITS, sniffProofFile } from "@/lib/proof-files";

const pad = (head: number[] | string, len = 64) => {
  const h = typeof head === "string" ? [...head].map((c) => c.charCodeAt(0)) : head;
  const b = new Uint8Array(len);
  b.set(h);
  return b;
};
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = (() => { const b = pad("RIFF"); b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8); return b; })();
const HEIC = (() => { const b = pad([0, 0, 0, 24]); b.set([..."ftypheic"].map((c) => c.charCodeAt(0)), 4); return b; })();
const PDF = pad("%PDF-1.7\n");
const HTML = pad("<!doctype html><script>");
const SVG = pad("<svg xmlns=");
const EXE = pad([0x4d, 0x5a, 0x90, 0x00]);

describe("proof files", () => {
  it("recognises each accepted type by its bytes", () => {
    expect([JPEG, PNG, WEBP, HEIC, PDF].map((b) => sniffProofFile(b)?.ext)).toEqual(["jpg", "png", "webp", "heic", "pdf"]);
    expect([HTML, SVG, EXE, new Uint8Array(4)].map(sniffProofFile)).toEqual([null, null, null, null]);
  });
  it("photo: pictures only; document: pictures or PDF; signature: PNG only", () => {
    expect("ext" in checkProofFile("photo", JPEG)).toBe(true);
    expect("error" in checkProofFile("photo", PDF)).toBe(true);
    expect("ext" in checkProofFile("document", PDF)).toBe(true);
    expect("ext" in checkProofFile("document", HEIC)).toBe(true);
    expect("ext" in checkProofFile("signature", PNG)).toBe(true);
    expect("error" in checkProofFile("signature", JPEG)).toBe(true);
    for (const kind of ["photo", "document", "signature"] as const) {
      expect("error" in checkProofFile(kind, HTML)).toBe(true);
      expect("error" in checkProofFile(kind, SVG)).toBe(true);
      expect("error" in checkProofFile(kind, new Uint8Array(0))).toBe(true);
    }
  });
  it("refuses files over the size limit", () => {
    const big = new Uint8Array(PROOF_LIMITS.photo + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkProofFile("photo", big)).toEqual({ error: "The delivery photo is too large (4 MB at most)." });
    const sig = new Uint8Array(PROOF_LIMITS.signature + 1);
    sig.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(checkProofFile("signature", sig)).toEqual({ error: "The signature is too large (512 KB at most)." });
  });
});
