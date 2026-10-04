/**
 * Proof-of-delivery file rules (DECISIONS D9, D35). Pure: the server checks every upload by its
 * bytes (never the file name or the browser's claimed type); the page uses the same limits to
 * warn early. Vercel caps a request body at 4.5 MB, so the phone shrinks photos before sending.
 */
export type ProofFileKind = "photo" | "document" | "signature";

export const PROOF_LIMITS: Record<ProofFileKind, number> = {
  photo: 4 * 1024 * 1024,
  document: 4 * 1024 * 1024,
  signature: 512 * 1024,
};
/** Whole request, below Vercel's 4.5 MB body limit. */
export const PROOF_MAX_TOTAL = 4_400_000;

type Sniffed = { ext: "jpg" | "png" | "webp" | "heic" | "pdf"; contentType: string };

const ALLOWED: Record<ProofFileKind, Sniffed["ext"][]> = {
  photo: ["jpg", "png", "webp", "heic"],
  document: ["jpg", "png", "webp", "heic", "pdf"],
  signature: ["png"],
};

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/** What the bytes really are, or null if none of the accepted types. */
export function sniffProofFile(b: Uint8Array): Sniffed | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if (b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a) return { ext: "png", contentType: "image/png" };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  if (ascii(b, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(b, 8, 12))) return { ext: "heic", contentType: "image/heic" };
  if (ascii(b, 0, 5) === "%PDF-") return { ext: "pdf", contentType: "application/pdf" };
  return null;
}

const LABEL: Record<ProofFileKind, string> = { photo: "The delivery photo", document: "The signed document", signature: "The signature" };

export function checkProofFile(kind: ProofFileKind, bytes: Uint8Array): Sniffed | { error: string } {
  if (bytes.length === 0) return { error: `${LABEL[kind]} is empty.` };
  if (bytes.length > PROOF_LIMITS[kind]) {
    const max = PROOF_LIMITS[kind];
    return { error: `${LABEL[kind]} is too large (${max >= 1024 * 1024 ? `${max / 1024 / 1024} MB` : `${max / 1024} KB`} at most).` };
  }
  const t = sniffProofFile(bytes);
  if (!t || !ALLOWED[kind].includes(t.ext)) {
    return {
      error:
        kind === "signature"
          ? "The signature could not be read. Clear it and sign again."
          : kind === "photo"
            ? "The delivery photo must be a JPEG, PNG, WebP or HEIC picture."
            : "The signed document must be a photo (JPEG, PNG, WebP, HEIC) or a PDF.",
    };
  }
  return t;
}
