import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, ScrollView, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useEditor } from "./store";
import { Button, C, Label, s } from "./ui";
import {
  Choices,
  FontField,
  NumberField,
  SizeField,
  WeightField,
  WordsField,
} from "./fields";
import { Colour } from "./Colour";
import { KIND_LABEL } from "@/model/labels";
import { weightsFor } from "@/model/fonts";
import type { TextAlignName, VisualElement } from "@/model/types";
import { measure, useRuntime } from "./runtime";

const LABELS = {
  words: "Words",
  font: "Font",
  weight: "Style / weight",
  size: "Size",
  colour: "Colour",
  background: "Background",
  border: "Border",
  corners: "Corners",
  inside: "Space inside",
  box: "Width and height",
  place: "Where this piece sits",
  sit: "Where the words sit",
  leading: "Line height",
  tracking: "Letter spacing",
  wrap: "Text wrap",
  case: "Text transform",
};
type Control = keyof typeof LABELS;
function controlsFor(e: VisualElement): Control[] {
  const text = ["heading", "text", "button"].includes(e.kind);
  const box = ["container", "card", "button"].includes(e.kind);
  const list: Control[] = [];
  if (text)
    list.push(
      "words",
      "font",
      "weight",
      "size",
      "colour",
      "sit",
      "leading",
      "tracking",
      "wrap",
      "case",
    );
  if (box) list.push("background", "border", "corners", "inside");
  if (text || box || e.kind === "image") list.push("box");
  list.push("place");
  return list;
}

export function FloatingEditor({ onClose }: { onClose: () => void }) {
  const element = useEditor((s) => s.document.elements[s.selectedId]);
  const runtime = useRuntime();
  const [place, setPlace] = useState({ x: 16, y: 120 });
  const [more, setMore] = useState(false);
  const [active, setActive] = useState<Control | null>(null);
  const size = useRef({ width: 260, height: 120 });
  const origin = useRef(place);
  const latest = useRef({ place, runtime });
  latest.current = { place, runtime };
  const placed = useRef(false);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          origin.current = latest.current.place;
        },
        onPanResponderMove: (_, g) => {
          const bounds = latest.current.runtime.viewport;
          setPlace({
            x: Math.min(
              Math.max(8, origin.current.x + g.dx),
              Math.max(8, bounds.width - size.current.width - 8),
            ),
            y: Math.min(
              Math.max(8, origin.current.y + g.dy),
              Math.max(8, bounds.height - size.current.height - 8),
            ),
          });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );
  const initialPlace = () => {
    if (placed.current) return;
    placed.current = true;
    const geometry = runtime.geometry.get(element.id);
    if (!geometry) return;
    void measure(geometry.frame).then((rect) => {
      if (!rect) return;
      let top = rect.y + rect.height - runtime.viewport.y + 12;
      if (top + size.current.height > runtime.viewport.height - 76)
        top = rect.y - runtime.viewport.y - size.current.height - 12;
      setPlace({ x: 16, y: Math.max(8, top) });
    });
  };
  return (
    <View
      testID="floating-editor"
      onLayout={(e) => {
        size.current = e.nativeEvent.layout;
        initialPlace();
      }}
      style={{
        position: "absolute",
        zIndex: 30,
        left: place.x,
        top: place.y,
        width: Math.min(260, runtime.viewport.width - 48),
        maxHeight: Math.min(runtime.viewport.height * 0.72, 512),
        borderRadius: 24,
        backgroundColor: C.surface,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(20,24,40,0.16)",
      }}
    >
      <View style={[s.row, { paddingHorizontal: 10, paddingVertical: 8 }]}>
        <View
          {...pan.panHandlers}
          testID="editor-drag"
          style={[s.row, { flex: 1 }]}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {element.kind === "image" ? (
              <Svg
                width={16}
                height={16}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.accent}
                strokeWidth={1.6}
              >
                <Rect x={3} y={4} width={14} height={12} rx={2} />
                <Circle cx={7.5} cy={8} r={1.2} fill={C.accent} stroke="none" />
                <Path d="M4 14l4-3 2.5 2 2-1.5L16 14" />
              </Svg>
            ) : (
              <Label style={{ fontWeight: "600", color: C.accent }}>
                {["heading", "text", "button", "input"].includes(element.kind)
                  ? "T"
                  : "□"}
              </Label>
            )}
          </View>
          <Label numberOfLines={1} style={{ flex: 1, fontWeight: "500" }}>
            {KIND_LABEL[element.kind]}
          </Label>
        </View>
        <Button
          label="Close editor"
          testID="close-editor"
          onPress={onClose}
          style={{ width: 32, paddingHorizontal: 0 }}
        >
          <Label style={{ fontSize: 18, color: C.muted }}>×</Label>
        </Button>
      </View>
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={{
          flexShrink: 1,
          maxHeight: Math.min(runtime.viewport.height * 0.62, 448),
        }}
        contentContainerStyle={{
          gap: 6,
          paddingHorizontal: 10,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        {element.textLook ? <AlignRow element={element} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {active ? (
            <Button
              label="Back"
              onPress={() => {
                setActive(null);
                setMore(false);
              }}
              style={{ width: 28, height: 28, paddingHorizontal: 0 }}
            >
              <Label style={s.muted}>‹</Label>
            </Button>
          ) : null}
          <Button
            label="More"
            testID="more"
            onPress={() => setMore(!more)}
            style={{ flex: 1, backgroundColor: C.desk, paddingHorizontal: 10 }}
          >
            <View
              style={[
                s.row,
                { width: "100%", justifyContent: "space-between" },
              ]}
            >
              <Label>More</Label>
              <Label>{more ? "▴" : "▾"}</Label>
            </View>
          </Button>
        </View>
        {more ? (
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{
              maxHeight: 160,
              backgroundColor: C.desk,
              borderRadius: 16,
            }}
          >
            {controlsFor(element).map((id, i, list) => (
              <Button
                key={id}
                label={LABELS[id]}
                testID={"control-" + id}
                onPress={() => {
                  setActive(id);
                  setMore(false);
                }}
                style={{
                  paddingHorizontal: 10,
                  borderBottomWidth: i < list.length - 1 ? 1 : 0,
                  borderBottomColor: C.line,
                  borderRadius: 0,
                }}
              >
                <View
                  style={[
                    s.row,
                    { width: "100%", justifyContent: "space-between" },
                  ]}
                >
                  <Label>
                    {id === "words" && element.kind === "button"
                      ? "Button text"
                      : LABELS[id]}
                  </Label>
                  <Label style={s.muted}>›</Label>
                </View>
              </Button>
            ))}
          </ScrollView>
        ) : null}
        {active && !more ? (
          <ActiveControl id={active} element={element} />
        ) : null}
      </ScrollView>
    </View>
  );
}
function AlignRow({ element }: { element: VisualElement }) {
  const options: { id: TextAlignName; label: string }[] = [
    { id: "left", label: "Left" },
    { id: "center", label: "Centre" },
    { id: "right", label: "Right" },
    { id: "justify", label: "Justify" },
  ];
  return (
    <View
      style={[
        s.row,
        { gap: 4, padding: 2, borderRadius: 12, backgroundColor: C.desk },
      ]}
      accessibilityLabel="Align"
    >
      {options.map((o) => {
        const selected = element.textLook?.align === o.id;
        return (
          <Button
            key={o.id}
            label={o.label}
            selected={selected}
            onPress={() =>
              useEditor.getState().patchText(element.id, {
                align: o.id,
                placeX: o.id === "left" ? 0 : o.id === "center" ? 50 : 100,
              })
            }
            style={{
              flex: 1,
              backgroundColor: selected ? C.surface : "transparent",
              boxShadow: selected
                ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)"
                : undefined,
            }}
          >
            <View style={{ width: 20, gap: 4 }}>
              {[
                16,
                o.id === "justify" ? 16 : 12,
                o.id === "justify" ? 16 : 10,
              ].map((w, i) => (
                <View
                  key={i}
                  style={{
                    width: w,
                    height: 2,
                    borderRadius: 99,
                    backgroundColor: selected ? C.accent : C.muted,
                    alignSelf:
                      o.id === "center"
                        ? "center"
                        : o.id === "right"
                          ? "flex-end"
                          : "flex-start",
                  }}
                />
              ))}
            </View>
          </Button>
        );
      })}
    </View>
  );
}
function ActiveControl({
  id,
  element: e,
}: {
  id: Control;
  element: VisualElement;
}) {
  const { patch, patchText, patchBox, setMeasure, moveStep } = useEditor();
  const look = e.textLook,
    box = e.boxLook;
  if (id === "words")
    return (
      <WordsField
        label={e.kind === "button" ? "Button text" : "Words"}
        value={e.content ?? ""}
        onChange={(content) => patch(e.id, { content })}
      />
    );
  if (id === "font" && look)
    return (
      <FontField
        family={look.fontFamily}
        onChange={(fontFamily) => {
          const supported = weightsFor(fontFamily);
          patchText(e.id, {
            fontFamily,
            weight: supported.includes(look.weight)
              ? look.weight
              : supported[0],
          });
        }}
      />
    );
  if (id === "weight" && look)
    return (
      <WeightField
        family={look.fontFamily}
        value={look.weight}
        onChange={(weight) => patchText(e.id, { weight })}
      />
    );
  if (id === "size" && look)
    return (
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Label>Size</Label>
        <View style={s.row}>
          <Button
            label="Smaller"
            onPress={() =>
              patchText(e.id, {
                fontSize: Math.max(10, Math.round(look.fontSize - 1)),
              })
            }
            style={{ width: 32, backgroundColor: C.desk }}
          >
            −
          </Button>
          <Label style={{ width: 32, textAlign: "center" }}>
            {look.fontSize}
          </Label>
          <Button
            label="Larger"
            onPress={() =>
              patchText(e.id, {
                fontSize: Math.min(96, Math.round(look.fontSize + 1)),
              })
            }
            style={{ width: 32, backgroundColor: C.desk }}
          >
            +
          </Button>
        </View>
      </View>
    );
  if (id === "colour" && look)
    return (
      <Colour
        value={look.color}
        onChange={(color) => patchText(e.id, { color })}
      />
    );
  if (id === "background" && box)
    return (
      <Colour
        value={box.background}
        onChange={(background) => patchBox(e.id, { background })}
      />
    );
  if (id === "border" && box)
    return (
      <View style={{ gap: 12 }}>
        <Choices
          label="Border"
          value={box.borderOn ? "on" : "off"}
          options={[
            { id: "off", label: "Off" },
            { id: "on", label: "On" },
          ]}
          onChange={(v) => patchBox(e.id, { borderOn: v === "on" })}
        />
        {box.borderOn ? (
          <>
            <Colour
              value={box.borderColor}
              onChange={(borderColor) => patchBox(e.id, { borderColor })}
            />
            <NumberField
              label="Border thickness"
              value={box.borderThickness}
              min={1}
              max={16}
              field="border"
              onChange={(borderThickness) =>
                patchBox(e.id, { borderThickness })
              }
            />
          </>
        ) : null}
      </View>
    );
  if (id === "corners" && box)
    return (
      <NumberField
        label="Corners"
        value={box.cornerRadius}
        min={0}
        max={80}
        field="corners"
        onChange={(cornerRadius) => patchBox(e.id, { cornerRadius })}
      />
    );
  if (id === "inside" && box)
    return (
      <NumberField
        label="Space inside"
        value={box.spaceInside}
        min={0}
        max={80}
        field="space"
        onChange={(spaceInside) => patchBox(e.id, { spaceInside })}
      />
    );
  if (id === "box")
    return (
      <View style={{ gap: 12 }}>
        <SizeField
          axis="width"
          measure={e.width}
          onChange={(m) => setMeasure(e.id, "width", m)}
        />
        <SizeField
          axis="height"
          measure={e.height}
          onChange={(m) => setMeasure(e.id, "height", m)}
        />
      </View>
    );
  if (id === "sit" && look)
    return (
      <View style={{ gap: 8 }}>
        <Label style={{ fontSize: 12, color: C.muted }}>
          Drag the words inside the box. That does not move the box.
        </Label>
        <Choices
          label="Snap"
          value={
            look.placeY === 0
              ? "top"
              : look.placeY === 100
                ? "bottom"
                : look.placeY === 50
                  ? "middle"
                  : ""
          }
          options={[
            { id: "top", label: "Top" },
            { id: "middle", label: "Middle" },
            { id: "bottom", label: "Bottom" },
          ]}
          onChange={(v) =>
            patchText(e.id, {
              placeY: v === "top" ? 0 : v === "bottom" ? 100 : 50,
            })
          }
        />
      </View>
    );
  if (id === "place")
    return (
      <View style={{ gap: 8 }}>
        {e.width.mode === "fill" ? (
          <Label style={s.muted}>
            It spans the full width, so it cannot slide sideways.
          </Label>
        ) : (
          <Choices
            label="Across"
            value={
              (e.boxPlaceX ?? 0) === 0
                ? "left"
                : (e.boxPlaceX ?? 0) === 100
                  ? "right"
                  : "center"
            }
            options={[
              { id: "left", label: "Left" },
              { id: "center", label: "Centre" },
              { id: "right", label: "Right" },
            ]}
            onChange={(v) =>
              patch(e.id, {
                boxPlaceX: v === "left" ? 0 : v === "right" ? 100 : 50,
              })
            }
          />
        )}
        <Label style={s.muted}>
          Drag the move mark to slide it or to change its order. The edge marks
          change its size.
        </Label>
        <View style={s.row}>
          <Button
            testID="earlier"
            onPress={() => moveStep(e.id, -1)}
            style={{ flex: 1, backgroundColor: C.desk }}
          >
            Earlier
          </Button>
          <Button
            testID="later"
            onPress={() => moveStep(e.id, 1)}
            style={{ flex: 1, backgroundColor: C.desk }}
          >
            Later
          </Button>
        </View>
      </View>
    );
  if (id === "leading" && look)
    return (
      <NumberField
        decimal
        label="Line height"
        field="line-height"
        value={look.lineHeight ?? (e.kind === "heading" ? 1.15 : 1.4)}
        min={0.8}
        max={3}
        onChange={(lineHeight) => patchText(e.id, { lineHeight })}
      />
    );
  if (id === "tracking" && look)
    return (
      <NumberField
        decimal
        label="Letter spacing"
        field="letter-spacing"
        value={look.letterSpacing ?? 0}
        min={-2}
        max={20}
        onChange={(letterSpacing) => patchText(e.id, { letterSpacing })}
      />
    );
  if (id === "wrap" && look)
    return (
      <Choices
        label="Text wrap"
        value={look.wrap ?? "wrap"}
        options={[
          { id: "wrap", label: "Wrap" },
          { id: "single", label: "One line" },
        ]}
        onChange={(wrap) => patchText(e.id, { wrap })}
      />
    );
  if (id === "case" && look)
    return (
      <Choices
        label="Text transform"
        value={look.textCase ?? "none"}
        options={[
          { id: "none", label: "As typed" },
          { id: "upper", label: "Upper" },
          { id: "lower", label: "Lower" },
          { id: "title", label: "Title" },
        ]}
        onChange={(textCase) => patchText(e.id, { textCase })}
      />
    );
  return null;
}
