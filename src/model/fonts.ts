import type { FontWeightName } from "./types.ts";

export interface FontChoice {
  id: string;
  label: string;
  serif: boolean;
  mono?: boolean;
  weights: FontWeightName[];
}

/**
 * Each face is a different construction. Neighbours are not the same sans
 * with the spacing changed.
 */
export const FONTS: FontChoice[] = [
  { id: "Playfair Display", label: "Playfair Display", serif: true, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Fraunces", label: "Fraunces", serif: true, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "EB Garamond", label: "EB Garamond", serif: true, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Libre Baskerville", label: "Libre Baskerville", serif: true, weights: ["regular", "bold"] },
  { id: "Merriweather", label: "Merriweather", serif: true, weights: ["regular", "bold"] },
  { id: "Source Serif 4", label: "Source Serif", serif: true, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Instrument Serif", label: "Instrument Serif", serif: true, weights: ["regular"] },
  { id: "Source Sans 3", label: "Source Sans", serif: false, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Nunito", label: "Nunito", serif: false, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Josefin Sans", label: "Josefin Sans", serif: false, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Space Grotesk", label: "Space Grotesk", serif: false, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Barlow Condensed", label: "Barlow Condensed", serif: false, weights: ["regular", "medium", "semibold", "bold"] },
  { id: "Atkinson Hyperlegible", label: "Atkinson Hyperlegible", serif: false, weights: ["regular", "bold"] },
  { id: "IBM Plex Mono", label: "IBM Plex Mono", serif: false, mono: true, weights: ["regular", "medium", "semibold", "bold"] },
];

const OPTICAL: Record<string, string> = {
  "Source Serif 4": "8..60,400;8..60,500;8..60,600;8..60,700",
  Fraunces: "9..144,400;9..144,500;9..144,600;9..144,700",
};

export const WEIGHT_VALUE: Record<FontWeightName, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/** One stylesheet per family so a single rejected face cannot blank the others. */
export const FONT_STYLESHEETS: string[] = FONTS.map((font) => {
  const family = font.id.replace(/ /g, "+");
  const optical = OPTICAL[font.id];
  const axis = optical
    ? `:opsz,wght@${optical}`
    : `:wght@${font.weights.map((weight) => WEIGHT_VALUE[weight]).join(";")}`;
  return `https://fonts.googleapis.com/css2?family=${family}${axis}&display=swap`;
});

export const WEIGHT_LABEL: Record<FontWeightName, string> = {
  regular: "Regular",
  medium: "Medium",
  semibold: "SemiBold",
  bold: "Bold",
};

export function cssFamily(id: string): string {
  const font = FONTS.find((item) => item.id === id);
  const fallback = font?.mono ? "monospace" : font?.serif ? "serif" : "sans-serif";
  return `"${id}", ${fallback}`;
}

export function weightsFor(id: string): FontWeightName[] {
  return FONTS.find((item) => item.id === id)?.weights ?? ["regular", "bold"];
}
