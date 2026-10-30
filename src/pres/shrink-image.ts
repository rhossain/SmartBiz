/**
 * src/pres/shrink-image.ts — a picked image, shrunk in the browser before upload (product
 * photos).
 *
 * The longer side becomes at most 800 px (never enlarged) and the result is a JPEG at quality
 * 0.85, so a phone photo of several MB becomes roughly 60–150 KB and fits the upload limit
 * with room to spare. The answer is base64, as the JSON upload carries it. Anything that is not
 * an image the browser can decode gives null (the screen then says the file could not be used).
 * Browser-only (canvas, createImageBitmap); the screens take it as an injectable so DOM tests
 * can pass a stand-in.
 */
export interface ShrunkImage {
  readonly contentType: "image/jpeg";
  readonly data: string;
}

export const MAX_PHOTO_SIDE = 800;

const toBase64 = (bytes: Uint8Array): string => {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

export const shrinkImage = async (file: File): Promise<ShrunkImage | null> => {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (ctx === null) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
    if (blob === null) return null;
    return { contentType: "image/jpeg", data: toBase64(new Uint8Array(await blob.arrayBuffer())) };
  } catch {
    return null;
  }
};
