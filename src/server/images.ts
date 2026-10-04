import "server-only";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const TYPES = [
  { ext: "jpg", type: "image/jpeg", test: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", test: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: "webp",
    type: "image/webp",
    test: (b: Uint8Array) =>
      String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" && String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP",
  },
] as const;

export type CheckedImage = { bytes: Uint8Array; ext: string; contentType: string };

/**
 * Checks an uploaded photo by its bytes (not the browser's claimed type or file name):
 * JPEG, PNG or WebP, at most 5 MB. Returns an error message for the form otherwise.
 */
export async function checkImage(file: FormDataEntryValue | null): Promise<CheckedImage | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { error: "Choose a photo to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Photos must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = TYPES.find((t) => bytes.length > 12 && t.test(bytes));
  if (!kind) return { error: "Use a JPEG, PNG or WebP photo." };
  return { bytes, ext: kind.ext, contentType: kind.type };
}
