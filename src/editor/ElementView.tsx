import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect as SvgRect,
  Circle,
  Path,
} from "react-native-svg";
import { useEditor } from "./store";
import { findParent } from "@/model/queries";
import { resizeFromEdge, type ResizeEdge } from "@/model/edit";
import type { VisualElement } from "@/model/types";
import { C } from "./ui";
import { nativeFont } from "./fonts";
import { measure, useRuntime, type Rect } from "./runtime";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const HANDLES: {
  edge: ResizeEdge;
  label: string;
  style: ViewStyle;
  horizontal?: boolean;
  vertical?: boolean;
}[] = [
  {
    edge: "n",
    label: "Resize top",
    style: { left: "50%", top: -8, marginLeft: -16, width: 32, height: 16 },
    horizontal: true,
  },
  {
    edge: "s",
    label: "Resize bottom",
    style: { left: "50%", bottom: -8, marginLeft: -16, width: 32, height: 16 },
    horizontal: true,
  },
  {
    edge: "e",
    label: "Resize right",
    style: { right: -8, top: "50%", marginTop: -16, width: 16, height: 32 },
    vertical: true,
  },
  {
    edge: "w",
    label: "Resize left",
    style: { left: -8, top: "50%", marginTop: -16, width: 16, height: 32 },
    vertical: true,
  },
  {
    edge: "ne",
    label: "Resize top right",
    style: { right: -8, top: -8, width: 16, height: 16 },
  },
  {
    edge: "nw",
    label: "Resize top left",
    style: { left: -8, top: -8, width: 16, height: 16 },
  },
  {
    edge: "se",
    label: "Resize bottom right",
    style: { right: -8, bottom: -8, width: 16, height: 16 },
  },
  {
    edge: "sw",
    label: "Resize bottom left",
    style: { left: -8, bottom: -8, width: 16, height: 16 },
  },
];
type Drag = {
  x: number;
  y: number;
  time: number;
  words: boolean;
  selected: boolean;
  cancelled: boolean;
  claimed: boolean;
  axis: "across" | "order" | null;
  frame: Rect | null;
  slot: Rect | null;
  word: Rect | null;
  fingerY: number;
};

export function ElementView({ id }: { id: string }) {
  const element = useEditor((s) => s.document.elements[id]);
  const visual = useEditor((s) => s.document);
  const editing = useEditor((s) => s.mode === "edit");
  const selected = useEditor((s) => s.selectedId === id);
  const runtime = useRuntime();
  const frame = useRef<View>(null);
  const slot = useRef<View>(null);
  const words = useRef<View>(null);
  const pull = useRef(new Animated.Value(0)).current;
  const pullNumber = useRef(0);
  const drag = useRef<Drag | null>(null);
  const latest = useRef({ element, visual, editing, selected, runtime });
  latest.current = { element, visual, editing, selected, runtime };
  useEffect(() => {
    runtime.geometry.set(id, { frame, slot, words });
    return () => {
      runtime.geometry.delete(id);
    };
  }, [id, runtime.geometry]);
  const compensate = () => {
    const d = drag.current;
    if (!d?.claimed || d.axis !== "order" || !d.frame) return;
    void measure(frame).then((rect) => {
      if (!rect || drag.current !== d || !d.frame) return;
      const layoutTop = rect.y - pullNumber.current;
      const offset = d.frame.y + (d.fingerY - d.y) - layoutTop;
      pullNumber.current = offset;
      pull.setValue(offset);
    });
  };
  useLayoutEffect(compensate, [visual, pull]);
  const start = (event: GestureResponderEvent, onWords: boolean) => {
    if (!editing) return;
    event.stopPropagation();
    const { pageX: x, pageY: y } = event.nativeEvent;
    const d: Drag = {
      x,
      y,
      time: Date.now(),
      words: onWords,
      selected,
      cancelled: false,
      claimed: false,
      axis: null,
      frame: null,
      slot: null,
      word: null,
      fingerY: y,
    };
    drag.current = d;
    void Promise.all([measure(frame), measure(slot), measure(words)]).then(
      ([f, s, w]) => {
        if (drag.current !== d) return;
        d.frame = f;
        d.slot = s;
        d.word = w;
        d.words = Boolean(
          onWords &&
            f &&
            w &&
            (f.width - w.width >= 8 || f.height - w.height >= 8),
        );
      },
    );
  };
  const finish = () => {
    drag.current = null;
    pullNumber.current = 0;
    pull.setValue(0);
    latest.current.runtime.setBusy(false);
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          const d = drag.current;
          const state = latest.current;
          if (
            !d ||
            !d.selected ||
            !state.editing ||
            id === state.visual.rootId ||
            d.cancelled ||
            !d.frame ||
            !d.slot
          )
            return false;
          const distance = Math.hypot(g.dx, g.dy);
          if (distance < 8) return false;
          if (d.words) {
            if (Date.now() - d.time < 450) {
              if (distance > 28) d.cancelled = true;
              return false;
            }
            return true;
          }
          if (Date.now() - d.time <= 180 && Math.abs(g.dy) > Math.abs(g.dx)) {
            d.cancelled = true;
            return false;
          }
          return true;
        },
        onPanResponderGrant: () => {
          const d = drag.current;
          if (d) {
            d.claimed = true;
            latest.current.runtime.setBusy(true);
          }
        },
        onPanResponderMove: (_, g) => {
          const d = drag.current;
          if (!d?.frame || !d.slot) return;
          const state = useEditor.getState();
          const { frame: f, slot: s } = d;
          if (d.words && d.word) {
            const w = d.word;
            const roomX = f.width - w.width;
            const roomY = f.height - w.height;
            state.patchText(id, {
              placeX:
                roomX < 8
                  ? 0
                  : Math.round(
                      clamp(
                        ((g.moveX - f.x - w.width / 2) / roomX) * 100,
                        0,
                        100,
                      ) * 10,
                    ) / 10,
              placeY:
                roomY < 8
                  ? 0
                  : Math.round(
                      clamp(
                        ((g.moveY - f.y - w.height / 2) / roomY) * 100,
                        0,
                        100,
                      ) * 10,
                    ) / 10,
            });
            return;
          }
          if (!d.axis)
            d.axis = Math.abs(g.dx) > Math.abs(g.dy) ? "across" : "order";
          if (d.axis === "across") {
            const left = f.x - s.x + g.dx;
            const free = s.width - f.width;
            if (free >= 8)
              state.patch(id, {
                boxPlaceX:
                  Math.round(clamp((left / free) * 100, 0, 100) * 10) / 10,
              });
            else {
              const width = Math.max(
                32,
                Math.round(Math.min(f.width, Math.max(32, s.width - 24))),
              );
              state.patch(id, {
                width: { mode: "fixed", value: width },
                boxPlaceX:
                  Math.round(
                    clamp((left / Math.max(1, s.width - width)) * 100, 0, 100) *
                      10,
                  ) / 10,
              });
            }
          } else {
            d.fingerY = g.moveY;
            compensate();
            const parent = findParent(state.document, id);
            if (!parent) return;
            const i = parent.children.indexOf(id);
            const next = latest.current.runtime.geometry.get(
              parent.children[i + 1],
            );
            const prev = latest.current.runtime.geometry.get(
              parent.children[i - 1],
            );
            void Promise.all([
              next ? measure(next.slot) : null,
              prev ? measure(prev.slot) : null,
            ]).then(([n, p]) => {
              if (drag.current !== d) return;
              if (n && d.fingerY > n.y + n.height / 2)
                useEditor.getState().moveStep(id, 1);
              else if (p && d.fingerY < p.y + p.height / 2)
                useEditor.getState().moveStep(id, -1);
            });
          }
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    [id],
  );
  if (!element) return null;
  const root = visual.rootId === id;
  const box = element.boxLook;
  const look = element.textLook;
  const across =
    element.width.mode === "fill" ? 0 : clamp(element.boxPlaceX ?? 0, 0, 100);
  const frameStyle: ViewStyle = {
    minWidth: 0,
    maxWidth: "100%",
    position: "relative",
    flexShrink: element.width.mode === "hug" ? 1 : 0,
    width:
      element.width.mode === "fixed"
        ? element.width.value
        : element.width.mode === "fill"
          ? "100%"
          : undefined,
    height:
      element.height.mode === "fixed"
        ? element.height.value
        : element.height.mode === "fill" && !root
          ? "100%"
          : undefined,
    alignSelf: element.height.mode === "fill" ? "stretch" : "flex-start",
    gap: element.kind === "container" ? 16 : element.kind === "card" ? 12 : 0,
    backgroundColor: box?.background,
    borderRadius: box?.cornerRadius,
    padding: box?.spaceInside,
    borderWidth: box?.borderOn ? box.borderThickness : 0,
    borderColor: box?.borderColor,
  };
  return (
    <View
      ref={slot}
      collapsable={false}
      pointerEvents="box-none"
      style={{
        flexDirection: "row",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        marginTop: element.spaceBefore ?? 0,
        flexGrow: element.height.mode === "fill" ? 1 : 0,
      }}
    >
      <View
        pointerEvents="none"
        style={{ flexGrow: across, flexBasis: 0, flexShrink: 1 }}
      />
      <Animated.View
        ref={frame}
        collapsable={false}
        testID={"element-" + id}
        {...pan.panHandlers}
        onLayout={compensate}
        onTouchStart={(e) => start(e, false)}
        onTouchEnd={(e) => {
          if (!editing) return;
          e.stopPropagation();
          const d = drag.current;
          if (
            d &&
            !d.claimed &&
            !d.cancelled &&
            Math.hypot(e.nativeEvent.pageX - d.x, e.nativeEvent.pageY - d.y) < 8
          )
            useEditor.getState().select(id);
        }}
        style={[
          frameStyle,
          {
            zIndex: selected && editing ? 1 : 0,
            transform: [{ translateY: pull }],
          },
        ]}
      >
        {element.kind === "image" ? (
          <View
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              overflow: "hidden",
              borderRadius: 12,
            }}
          >
            <CoverArt label={element.name} />
          </View>
        ) : null}
        {look && element.kind !== "container" && element.kind !== "card" ? (
          <>
            <View
              pointerEvents="none"
              style={{
                flexGrow: look.placeY,
                flexShrink: 1,
                flexBasis: 0,
                minHeight: 0,
              }}
            />
            <View
              pointerEvents="box-none"
              style={{
                flexDirection: "row",
                minWidth: 0,
                alignSelf: "stretch",
              }}
            >
              <View
                pointerEvents="none"
                style={{ flexGrow: look.placeX, flexShrink: 1, flexBasis: 0 }}
              />
              <View
                ref={words}
                collapsable={false}
                style={{ flexShrink: 1, maxWidth: "100%" }}
                onTouchStart={(e) => start(e, true)}
              >
                <Text
                  allowFontScaling={false}
                  style={{
                    fontFamily: nativeFont(look.fontFamily, look.weight),
                    fontSize: look.fontSize,
                    color: look.color,
                    textAlign: look.align,
                    lineHeight:
                      look.fontSize *
                      (look.lineHeight ??
                        (element.kind === "heading" ? 1.15 : 1.4)),
                    letterSpacing: look.letterSpacing ?? 0,
                    includeFontPadding: false,
                    textTransform:
                      look.textCase === "upper"
                        ? "uppercase"
                        : look.textCase === "lower"
                          ? "lowercase"
                          : look.textCase === "title"
                            ? "capitalize"
                            : "none",
                  }}
                  numberOfLines={look.wrap === "single" ? 1 : undefined}
                  ellipsizeMode="clip"
                >
                  {element.content}
                </Text>
              </View>
              <View
                pointerEvents="none"
                style={{
                  flexGrow: 100 - look.placeX,
                  flexShrink: 1,
                  flexBasis: 0,
                }}
              />
            </View>
            <View
              pointerEvents="none"
              style={{
                flexGrow: 100 - look.placeY,
                flexShrink: 1,
                flexBasis: 0,
                minHeight: 0,
              }}
            />
          </>
        ) : null}
        {element.children.map((child) => (
          <ElementView key={child} id={child} />
        ))}
        {selected && editing ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderWidth: 2,
              borderColor: C.accent,
              borderRadius: (box?.cornerRadius ?? 0) + 2,
            }}
          />
        ) : null}
        {selected && editing && !root
          ? HANDLES.map((h) => <ResizeHandle key={h.edge} id={id} handle={h} />)
          : null}
      </Animated.View>
      <View
        pointerEvents="none"
        style={{ flexGrow: 100 - across, flexShrink: 1, flexBasis: 0 }}
      />
    </View>
  );
}

function ResizeHandle({
  id,
  handle,
}: {
  id: string;
  handle: (typeof HANDLES)[number];
}) {
  const runtime = useRuntime();
  const latest = useRef(runtime);
  latest.current = runtime;
  const start = useRef<{
    width: number;
    height: number;
    placeX: number;
    spaceBefore: number;
    parentWidth: number;
  } | null>(null);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          e.stopPropagation();
          latest.current.setBusy(true);
          const geometry = latest.current.geometry.get(id);
          if (!geometry) return;
          void Promise.all([
            measure(geometry.frame),
            measure(geometry.slot),
          ]).then(([f, s]) => {
            const el = useEditor.getState().document.elements[id];
            if (f && s)
              start.current = {
                width: f.width,
                height: f.height,
                placeX: el.boxPlaceX ?? 0,
                spaceBefore: el.spaceBefore ?? 0,
                parentWidth: s.width,
              };
          });
        },
        onPanResponderMove: (_, g) => {
          if (!start.current) return;
          const next = resizeFromEdge(handle.edge, g.dx, g.dy, start.current);
          const patch: Partial<VisualElement> = {};
          if (/[ew]/.test(handle.edge)) {
            patch.width = { mode: "fixed", value: Math.round(next.width) };
            patch.boxPlaceX = Math.round(next.placeX * 10) / 10;
          }
          if (/[ns]/.test(handle.edge)) {
            patch.height = { mode: "fixed", value: Math.round(next.height) };
            if (handle.edge.includes("n"))
              patch.spaceBefore =
                Math.round(start.current.spaceBefore + start.current.height) -
                Math.round(next.height);
          }
          useEditor.getState().patch(id, patch);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          start.current = null;
          latest.current.setBusy(false);
        },
        onPanResponderTerminate: () => {
          start.current = null;
          latest.current.setBusy(false);
        },
      }),
    [id, handle.edge],
  );
  return (
    <View
      {...pan.panHandlers}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      accessibilityRole="adjustable"
      accessibilityLabel={handle.label}
      testID={"resize-" + handle.edge}
      style={[
        {
          position: "absolute",
          zIndex: 20,
          alignItems: "center",
          justifyContent: "center",
        },
        handle.style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          width: handle.horizontal ? 16 : handle.vertical ? 6 : 10,
          height: handle.horizontal ? 6 : handle.vertical ? 16 : 10,
          borderWidth: 1,
          borderColor: "white",
          backgroundColor: C.accent,
          borderRadius: 1,
        }}
      />
    </View>
  );
}
export function CoverArt({ label }: { label: string }) {
  return (
    <Svg
      viewBox="0 0 320 180"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      accessibilityLabel={label}
    >
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f6b07a" />
          <Stop offset="0.45" stopColor="#e36b8a" />
          <Stop offset="1" stopColor="#6a4c93" />
        </LinearGradient>
      </Defs>
      <SvgRect width="320" height="180" fill="url(#sky)" />
      <Circle cx="250" cy="42" r="16" fill="#ffe7b3" />
      <Path
        d="M0 110 C80 78 140 130 210 100 C250 84 280 96 320 80 L320 180 L0 180 Z"
        fill="#2f6b4f"
      />
      <Path
        d="M0 140 C90 118 160 156 320 128 L320 180 L0 180 Z"
        fill="#1e4634"
      />
    </Svg>
  );
}
