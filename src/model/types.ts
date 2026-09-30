/**
 * CodeMate's visual model.
 * A document is a set of ordinary pieces. It is not a phone, a tablet, a website, or a desktop app.
 * What someone is making can change later. These pieces stay the same.
 */

export const ELEMENT_KINDS = [
  "container",
  "text",
  "heading",
  "button",
  "image",
  "card",
  "input",
] as const;

export type ElementKind = (typeof ELEMENT_KINDS)[number];

/** Words on a heading, text, or button. Not a framework text style. */
export type FontWeightName = "regular" | "medium" | "semibold" | "bold";

export type TextAlignName = "left" | "center" | "right" | "justify";

export type TextWrapName = "wrap" | "single";

export type TextCaseName = "none" | "upper" | "lower" | "title";

export interface TextLook {
  fontFamily: string;
  fontSize: number;
  weight: FontWeightName;
  /** Exact hex, including the casing the user entered. */
  color: string;
  /** How lines of words line up with each other. A shortcut, not the only position. */
  align: TextAlignName;
  /** 0 is the left, 50 the centre, 100 the right. Where the words sit inside the box. */
  placeX: number;
  /** 0 is the top, 50 the middle, 100 the bottom. */
  placeY: number;
  /** Multiplier. 1.4 is ordinary text. Absent means the usual size for that kind of piece. */
  lineHeight?: number;
  /** Extra space between letters, in pixels. */
  letterSpacing?: number;
  /** wrap keeps lines. single stays on one line. */
  wrap?: TextWrapName;
  /** How the letters are cased. Absent means leave them as typed. */
  textCase?: TextCaseName;
}

/** The box around a container, card, or button. */
export interface BoxLook {
  background: string;
  borderOn: boolean;
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  /** Space inside the edges. Technically called padding. */
  spaceInside: number;
}
export type Measure =
  | { mode: "fill" }
  | { mode: "hug" }
  | { mode: "fixed"; value: number };

export interface VisualElement {
  id: string;
  kind: ElementKind;
  name: string;
  /** Child ids, top to bottom. This order is what Layers and Properties show. */
  children: string[];
  width: Measure;
  height: Measure;
  /** Words painted on a heading, text, button, or input. */
  content?: string;
  textLook?: TextLook;
  boxLook?: BoxLook;
  /**
   * 0 is the left and 100 is the right.
   * Only applies when this piece is narrower than the group it sits in.
   */
  boxPlaceX?: number;
  /** Extra space above this piece, so the top edge can resize without leaving the stack. */
  spaceBefore?: number;
}

export interface VisualDocument {
  id: string;
  name: string;
  rootId: string;
  elements: Record<string, VisualElement>;
}
