import type { VisualDocument, VisualElement } from "./types.ts";

export function getElement(doc: VisualDocument, id: string): VisualElement {
  const element = doc.elements[id];
  if (!element) throw new Error(`Unknown element: ${id}`);
  return element;
}

export function findParent(doc: VisualDocument, id: string): VisualElement | null {
  for (const element of Object.values(doc.elements)) {
    if (element.children.includes(id)) return element;
  }
  return null;
}

/** 1-based place among brothers and sisters. Null for the top of the design. */
export function orderLabel(doc: VisualDocument, id: string): string | null {
  const parent = findParent(doc, id);
  if (!parent) return null;
  const index = parent.children.indexOf(id);
  if (index < 0) return null;
  return `${index + 1} of ${parent.children.length}`;
}

export function positionLabel(doc: VisualDocument, id: string): string {
  const parent = findParent(doc, id);
  if (!parent) return "The whole design";
  return `Inside ${parent.name}`;
}

export function layerRows(doc: VisualDocument): { id: string; depth: number }[] {
  const rows: { id: string; depth: number }[] = [];
  function walk(id: string, depth: number) {
    rows.push({ id, depth });
    for (const childId of getElement(doc, id).children) walk(childId, depth + 1);
  }
  walk(doc.rootId, 0);
  return rows;
}

export function assertDocument(doc: VisualDocument): void {
  if (!doc.elements[doc.rootId]) throw new Error("Document has no root element.");
  const seen = new Set<string>();
  function walk(id: string) {
    if (seen.has(id)) throw new Error(`Element appears twice: ${id}`);
    seen.add(id);
    const element = getElement(doc, id);
    for (const childId of element.children) walk(childId);
  }
  walk(doc.rootId);
  for (const id of Object.keys(doc.elements)) {
    if (!seen.has(id)) throw new Error(`Element is not in the design: ${id}`);
  }
}
