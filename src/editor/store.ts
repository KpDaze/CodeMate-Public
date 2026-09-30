import { create } from "zustand";
import { demoDocument } from "@/model/demo-document";
import { reorderRelative } from "@/model/edit";
import { findParent } from "@/model/queries";
import type { BoxLook, Measure, TextLook, VisualDocument } from "@/model/types";

export type EditorMode = "edit" | "preview";

export interface DropHint {
  dragId: string;
  overId: string;
  place: "before" | "after";
}

interface EditorState {
  document: VisualDocument;
  selectedId: string;
  mode: EditorMode;
  drop: DropHint | null;
  select: (id: string) => void;
  setMode: (mode: EditorMode) => void;
  patch: (id: string, partial: Partial<VisualDocument["elements"][string]>) => void;
  patchText: (id: string, partial: Partial<TextLook>) => void;
  patchBox: (id: string, partial: Partial<BoxLook>) => void;
  setMeasure: (id: string, axis: "width" | "height", measure: Measure) => void;
  setDrop: (drop: DropHint | null) => void;
  moveRelative: (id: string, overId: string, place: "before" | "after") => void;
  moveStep: (id: string, direction: -1 | 1) => void;
  remove: (id: string) => void;
}

function replaceElement(
  document: VisualDocument,
  id: string,
  next: VisualDocument["elements"][string],
): VisualDocument {
  return {
    ...document,
    elements: { ...document.elements, [id]: next },
  };
}

export const useEditor = create<EditorState>((set, get) => ({
  document: demoDocument,
  selectedId: "greeting",
  mode: "edit",
  drop: null,
  select: (id) => {
    if (!get().document.elements[id]) return;
    set({ selectedId: id });
  },
  setMode: (mode) => set({ mode }),
  patch: (id, partial) => {
    const current = get().document.elements[id];
    if (!current) return;
    set({
      document: replaceElement(get().document, id, { ...current, ...partial }),
    });
  },
  patchText: (id, partial) => {
    const current = get().document.elements[id];
    if (!current?.textLook) return;
    get().patch(id, { textLook: { ...current.textLook, ...partial } });
  },
  patchBox: (id, partial) => {
    const current = get().document.elements[id];
    if (!current?.boxLook) return;
    get().patch(id, { boxLook: { ...current.boxLook, ...partial } });
  },
  setMeasure: (id, axis, measure) => {
    const current = get().document.elements[id];
    if (!current) return;
    get().patch(id, { [axis]: measure });
  },
  setDrop: (drop) => set({ drop }),
  moveRelative: (id, overId, place) => {
    const document = get().document;
    const parent = findParent(document, id);
    if (!parent) return;
    const children = reorderRelative(parent.children, id, overId, place);
    if (children === parent.children) return;
    set({
      document: replaceElement(document, parent.id, { ...parent, children }),
      drop: null,
    });
  },
  moveStep: (id, direction) => {
    const document = get().document;
    const parent = findParent(document, id);
    if (!parent) return;
    const index = parent.children.indexOf(id);
    const neighbor = parent.children[index + direction];
    if (!neighbor) return;
    get().moveRelative(id, neighbor, direction < 0 ? "before" : "after");
  },
  remove: (id) => {
    const document = get().document;
    if (id === document.rootId) return;
    const parent = findParent(document, id);
    if (!parent) return;
    const drop = new Set<string>();
    const walk = (nodeId: string) => {
      drop.add(nodeId);
      for (const childId of document.elements[nodeId]?.children ?? []) walk(childId);
    };
    walk(id);
    const elements = { ...document.elements };
    for (const key of drop) delete elements[key];
    elements[parent.id] = { ...parent, children: parent.children.filter((childId) => childId !== id) };
    set({
      document: { ...document, elements },
      selectedId: parent.id,
    });
  },
}));
