/** New order of sibling ids. `index` is the slot after `id` is lifted out. */
export function reorderToIndex(children: string[], id: string, index: number): string[] {
  const without = children.filter((child) => child !== id);
  const at = Math.max(0, Math.min(index, without.length));
  const next = [...without.slice(0, at), id, ...without.slice(at)];
  return next.join("|") === children.join("|") ? children : next;
}

export function reorderRelative(
  children: string[],
  id: string,
  overId: string,
  place: "before" | "after",
): string[] {
  if (id === overId) return children;
  const without = children.filter((child) => child !== id);
  let index = without.indexOf(overId);
  if (index < 0) return children;
  if (place === "after") index += 1;
  return reorderToIndex(children, id, index);
}

/** Which edge or corner is being resized. */
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeStart {
  width: number;
  height: number;
  placeX: number;
  spaceBefore: number;
  parentWidth: number;
}

export interface ResizeResult {
  width: number;
  height: number;
  placeX: number;
  spaceBefore: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Resize from an edge or corner.
 * Pulling the left edge also shifts the piece so the right edge stays put.
 * Pulling the top edge uses the space above the piece so the bottom edge stays put when it can.
 */
export function resizeFromEdge(edge: ResizeEdge, dx: number, dy: number, start: ResizeStart): ResizeResult {
  const west = edge === "w" || edge === "nw" || edge === "sw";
  const east = edge === "e" || edge === "ne" || edge === "se";
  const north = edge === "n" || edge === "nw" || edge === "ne";
  const south = edge === "s" || edge === "sw" || edge === "se";
  const parentWidth = Math.max(1, start.parentWidth);
  const maxW = Math.max(32, parentWidth);
  const minW = Math.min(32, maxW);

  let width = start.width;
  let height = start.height;
  if (east) width = start.width + dx;
  if (west) width = start.width - dx;
  if (south) height = start.height + dy;
  if (north) height = start.height - dy;
  width = clamp(width, minW, maxW);
  height = clamp(height, 32, 1600);

  let placeX = start.placeX;
  if (east || west) {
    const startFree = Math.max(0, parentWidth - start.width);
    const startLeft = (clamp(start.placeX, 0, 100) / 100) * startFree;
    const left = west ? startLeft + (start.width - width) : startLeft;
    const free = Math.max(0, parentWidth - width);
    const nextLeft = clamp(left, 0, free);
    placeX = free < 1 ? 0 : (nextLeft / free) * 100;
  }

  let spaceBefore = start.spaceBefore;
  if (north) {
    const bottom = start.spaceBefore + start.height;
    spaceBefore = clamp(bottom - height, -1200, 800);
  }

  return { width, height, placeX, spaceBefore };
}
