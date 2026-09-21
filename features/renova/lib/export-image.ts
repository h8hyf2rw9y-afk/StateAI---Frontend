import { toBlob } from "html-to-image";

/** Base width of the share card in CSS pixels. The PNG always has this composition, whatever the browser width. */
export const SHARE_CARD_WIDTH = 1080;

/** Device-pixel multiplier for the exported PNG: 2 gives a 2160px-wide image, sharp on phones and when zoomed in WhatsApp. */
export const EXPORT_PIXEL_RATIO = 2;

/**
 * Renders ONLY the given node (the share card) to a PNG on a real white
 * background, client-side — nothing is uploaded anywhere. The node must be
 * the unscaled card itself (not the scaled preview wrapper): html-to-image
 * clones it and measures its own layout box, so the preview's CSS transform
 * never leaks into the image.
 *
 * Waits for web fonts first so text is not measured with a fallback font.
 */
export async function renderNodeToPng(node: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const blob = await toBlob(node, {
    pixelRatio: EXPORT_PIXEL_RATIO,
    backgroundColor: "#ffffff",
    width: node.offsetWidth,
    height: node.offsetHeight,
  });
  if (!blob) throw new Error("PNG generation returned no image");
  return blob;
}

export function pngFileFromBlob(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "image/png" });
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
