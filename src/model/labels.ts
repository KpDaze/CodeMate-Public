import type { ElementKind, Measure } from "./types.ts";

export const KIND_LABEL: Record<ElementKind, string> = {
  container: "Container",
  text: "Text",
  heading: "Heading",
  button: "Button",
  image: "Image",
  card: "Card",
  input: "Input",
};

export function formatMeasure(measure: Measure, axis: "width" | "height"): string {
  if (measure.mode === "hug") return "Fits content";
  if (measure.mode === "fill") return axis === "width" ? "Full width" : "Full height";
  return String(measure.value);
}
