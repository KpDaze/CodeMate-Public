import { assertDocument } from "./queries.ts";
import type { BoxLook, TextLook, VisualDocument } from "./types.ts";

/**
 * One built-in design so the editor can be tried before any project is imported.
 * Every piece is its own object in the visual model.
 */

const ink = "#171a22";
const muted = "#5c6370";
const paper = "#f7f8fa";
const card = "#ffffff";
const line = "#e6e8ee";
const accent = "#2f6bff";
const onAccent = "#ffffff";

const serif: TextLook = {
  fontFamily: "Fraunces",
  fontSize: 40,
  weight: "semibold",
  color: ink,
  align: "center",
  placeX: 50,
  placeY: 0,
};

const sans: TextLook = {
  fontFamily: "Source Sans 3",
  fontSize: 16,
  weight: "regular",
  color: muted,
  align: "center",
  placeX: 50,
  placeY: 0,
};

const buttonText: TextLook = {
  fontFamily: "Source Sans 3",
  fontSize: 16,
  weight: "semibold",
  color: onAccent,
  align: "center",
  placeX: 50,
  placeY: 50,
};

const pageBox: BoxLook = {
  background: paper,
  borderOn: false,
  borderColor: line,
  borderThickness: 1,
  cornerRadius: 0,
  spaceInside: 20,
};

const cardBox: BoxLook = {
  background: card,
  borderOn: true,
  borderColor: line,
  borderThickness: 1,
  cornerRadius: 20,
  spaceInside: 16,
};

const buttonBox: BoxLook = {
  background: accent,
  borderOn: false,
  borderColor: accent,
  borderThickness: 1,
  cornerRadius: 24,
  spaceInside: 12,
};

export const demoDocument: VisualDocument = {
  id: "demo-welcome",
  name: "Welcome",
  rootId: "welcome",
  elements: {
    welcome: {
      id: "welcome",
      kind: "container",
      name: "Welcome",
      children: ["greeting", "introduction", "cover", "today", "continue", "extra", "extra2"],
      width: { mode: "fill" },
      height: { mode: "hug" },
      boxLook: pageBox,
    },
    greeting: {
      id: "greeting",
      kind: "heading",
      name: "Greeting",
      children: [],
      width: { mode: "hug" },
      height: { mode: "hug" },
      content: "Good morning",
      textLook: serif,
      boxPlaceX: 50,
    },
    introduction: {
      id: "introduction",
      kind: "text",
      name: "Introduction",
      children: [],
      width: { mode: "fill" },
      height: { mode: "hug" },
      content: "Each piece on this page can be changed on its own.",
      textLook: sans,
      boxPlaceX: 50,
    },
    cover: {
      id: "cover",
      kind: "image",
      name: "Cover picture",
      children: [],
      width: { mode: "fill" },
      height: { mode: "fixed", value: 220 },
    },
    today: {
      id: "today",
      kind: "card",
      name: "Today",
      children: ["waiting", "open"],
      width: { mode: "fill" },
      height: { mode: "hug" },
      boxLook: cardBox,
    },
    waiting: {
      id: "waiting",
      kind: "text",
      name: "Waiting note",
      children: [],
      width: { mode: "fill" },
      height: { mode: "hug" },
      content: "Three things are waiting.",
      textLook: sans,
    },
    open: {
      id: "open",
      kind: "button",
      name: "Open",
      children: [],
      width: { mode: "hug" },
      height: { mode: "fixed", value: 44 },
      content: "Open",
      textLook: buttonText,
      boxLook: buttonBox,
    },
    continue: {
      id: "continue",
      kind: "button",
      name: "Continue",
      children: [],
      width: { mode: "fill" },
      height: { mode: "fixed", value: 48 },
      content: "Continue",
      textLook: buttonText,
      boxLook: buttonBox,
    },
    extra: {
      id: "extra",
      kind: "text",
      name: "More of the page",
      children: [],
      width: { mode: "fill" },
      height: { mode: "hug" },
      content:
        "This page is longer than the phone, so a normal swipe can move it. The extra lines are only here so the page can scroll past the bottom of the screen. Keep going. There is more of the page under this. A swipe from the heading, the picture, or this text should move the page, not the piece.",
      textLook: sans,
      boxPlaceX: 50,
    },
    extra2: {
      id: "extra2",
      kind: "text",
      name: "Further down",
      children: [],
      width: { mode: "fill" },
      height: { mode: "hug" },
      content:
        "Further down the page. This block is here so the phone has somewhere to scroll. It should sit below the first extra note, past the bottom of the screen.",
      textLook: sans,
      boxPlaceX: 50,
    },
  },
};

assertDocument(demoDocument);
