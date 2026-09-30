import type { RefObject } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { toByteArray } from "base64-js";
import * as UPNG from "upng-js";
import { rgbToHex } from "@/model/color";
import { layerRows } from "@/model/queries";
import { useEditor } from "./store";
import { contains, measure, type Runtime } from "./runtime";

/** Match the original: text's exact ink, actual image pixels, then box background. */
export async function sampleColor(
  x: number,
  y: number,
  canvas: RefObject<View | null>,
  runtime: Runtime,
): Promise<string | null> {
  const visual = useEditor.getState().document;
  const rows = layerRows(visual).reverse();
  for (const row of rows) {
    const e = visual.elements[row.id];
    const refs = runtime.geometry.get(row.id);
    if (!refs) continue;
    const frame = await measure(refs.frame);
    if (!frame || !contains(frame, x, y)) continue;
    if (e.kind === "image") {
      const bounds = await measure(canvas);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
      const base64 = await captureRef(canvas, {
        format: "png",
        result: "base64",
      });
      const bytes = toByteArray(base64);
      const png = UPNG.decode(bytes.buffer as ArrayBuffer);
      const pixels = new Uint8Array(UPNG.toRGBA8(png)[0]);
      const px = Math.min(
        png.width - 1,
        Math.max(0, Math.round(((x - bounds.x) / bounds.width) * png.width)),
      );
      const py = Math.min(
        png.height - 1,
        Math.max(0, Math.round(((y - bounds.y) / bounds.height) * png.height)),
      );
      const i = (py * png.width + px) * 4;
      return pixels[i + 3] < 40
        ? null
        : rgbToHex(pixels[i], pixels[i + 1], pixels[i + 2]);
    }
    const words = await measure(refs.words);
    if (words && e.textLook && contains(words, x, y)) return e.textLook.color;
    if (e.boxLook) return e.boxLook.background;
  }
  return "#ffffff";
}
