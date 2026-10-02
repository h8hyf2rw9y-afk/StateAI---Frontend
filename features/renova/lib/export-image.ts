import { toJpeg } from "html-to-image";

/** Base width of the share card in CSS pixels. The JPG always has this composition, whatever the browser width. */
export const SHARE_CARD_WIDTH = 1080;

/** Device-pixel multiplier for the exported JPG: 2 gives a 2160px-wide image, sharp on phones and when zoomed in WhatsApp. */
export const EXPORT_PIXEL_RATIO = 2;

/**
 * Renders ONLY the given node (the share card) to a JPG on a real white
 * background, client-side — nothing is uploaded anywhere. The node must be
 * the unscaled card itself (not the scaled preview wrapper): html-to-image
 * clones it and measures its own layout box, so the preview's CSS transform
 * never leaks into the image.
 *
 * Waits for web fonts first so text is not measured with a fallback font.
 */
export async function renderNodeToJpeg(node: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  // A freshly loaded INE image must finish decoding before html-to-image clones the card.
  await Promise.all(Array.from(node.querySelectorAll("img")).map((img) => img.decode()));
  const dataUrl = await toJpeg(node, {
    pixelRatio: EXPORT_PIXEL_RATIO,
    backgroundColor: "#ffffff",
    quality: 0.94,
    width: node.offsetWidth,
    height: node.offsetHeight,
  });
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("JPG generation returned no image");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: "image/jpeg" });
}

export function jpegFileFromBlob(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "image/jpeg" });
}

/** Saves the file through a temporary link — the universal fallback when the browser cannot share files. */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** True when this browser can hand the file to the native share sheet (Web Share API level 2). */
export function canShareFile(file: File): boolean {
  return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [file] });
}

export type ShareOutcome = "shared" | "cancelled" | "downloaded";

/**
 * Shares the image through the native share sheet when available (on a phone
 * this includes WhatsApp); otherwise downloads it so the person can attach it
 * to a WhatsApp group themselves. Never sends anything automatically.
 */
export async function shareOrDownload(file: File, title: string): Promise<ShareOutcome> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  downloadFile(file);
  return "downloaded";
}
