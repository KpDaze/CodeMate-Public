import { createContext, useContext } from "react";
import type { RefObject } from "react";
import { View } from "react-native";

export type Rect = { x: number; y: number; width: number; height: number };
export type Geometry = {
  frame: RefObject<View | null>;
  slot: RefObject<View | null>;
  words: RefObject<View | null>;
};
export type PickRequest = { apply: (hex: string) => void; cancel: () => void };
export interface Runtime {
  geometry: Map<string, Geometry>;
  setBusy: (busy: boolean) => void;
  pick: PickRequest | null;
  setPick: (pick: PickRequest | null) => void;
  viewport: Rect;
  reveal: (id: string) => void;
}
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("Missing editor runtime");
  return value;
}
export function measure(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height }),
    );
  });
}
export function contains(r: Rect, x: number, y: number) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}
