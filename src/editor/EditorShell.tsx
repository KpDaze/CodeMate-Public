import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import {
  Box,
  Heading,
  Image,
  RectangleHorizontal,
  Square,
  TextCursorInput,
  Type,
} from "lucide-react-native";
import { useEditor } from "./store";
import { Button, C, Label, s } from "./ui";
import { ElementView } from "./ElementView";
import { FloatingEditor } from "./FloatingEditor";
import {
  RuntimeContext,
  measure,
  type Geometry,
  type PickRequest,
  type Rect,
} from "./runtime";
import { sampleColor } from "./sampling";
import { layerRows } from "@/model/queries";
import { KIND_LABEL } from "@/model/labels";

export function EditorShell() {
  const [layers, setLayers] = useState(false);
  const [controls, setControls] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<PickRequest | null>(null);
  const visual = useEditor((s) => s.document);
  const selected = useEditor((s) => s.selectedId);
  const mode = useEditor((s) => s.mode);
  const editing = mode === "edit";
  const dimensions = useWindowDimensions();
  const host = useRef<View>(null);
  const canvas = useRef<View>(null);
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(0);
  const heldOffset = useRef(0);
  const geometry = useRef(new Map<string, Geometry>()).current;
  const [viewport, setViewport] = useState<Rect>({
    x: 0,
    y: 0,
    width: dimensions.width,
    height: dimensions.height - 52,
  });
  const setGestureBusy = useCallback((on: boolean) => {
    if (on) heldOffset.current = offset.current;
    setBusy(on);
  }, []);
  const reveal = useCallback(
    (id: string) => {
      const refs = geometry.get(id);
      if (!refs) return;
      void measure(refs.frame).then((rect) => {
        if (!rect) return;
        const above = rect.y < viewport.y;
        const below = rect.y + rect.height > viewport.y + viewport.height;
        const delta = above
          ? rect.y - viewport.y
          : below
            ? rect.y + rect.height - viewport.y - viewport.height
            : 0;
        if (delta)
          scroller.current?.scrollTo({
            y: Math.max(0, offset.current + delta),
            animated: false,
          });
      });
    },
    [geometry, viewport],
  );
  const runtime = useMemo(
    () => ({
      geometry,
      setBusy: setGestureBusy,
      pick,
      setPick,
      viewport,
      reveal,
    }),
    [geometry, setGestureBusy, pick, viewport, reveal],
  );
  const cancelPick = () => {
    pick?.cancel();
    setPick(null);
  };
  return (
    <RuntimeContext.Provider value={runtime}>
      <View style={{ flex: 1, backgroundColor: C.surface }}>
        <View
          style={[
            s.row,
            {
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 16,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: C.line,
            },
          ]}
        >
          <View style={[s.row, { flex: 1, minWidth: 0 }]}>
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: C.accent,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Label style={{ color: "#fff", fontWeight: "600" }}>C</Label>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label
                style={{ fontSize: 16, lineHeight: 18.4, fontWeight: "600" }}
              >
                CodeMate
              </Label>
              <Label numberOfLines={1} style={{ fontSize: 12, color: C.muted }}>
                {visual.name}
              </Label>
            </View>
          </View>
          <View style={s.row}>
            <Button
              testID="edit"
              onPress={() => {
                if (!editing) useEditor.getState().setMode("edit");
                setControls(!editing || !controls);
                if (controls) cancelPick();
              }}
              style={{ height: 28, backgroundColor: C.accent }}
            >
              <Label style={{ fontSize: 12, fontWeight: "500", color: "#fff" }}>
                Edit
              </Label>
            </Button>
            {editing ? (
              <Button
                onPress={() => {
                  cancelPick();
                  setLayers(true);
                }}
                style={{ height: 28, borderWidth: 1, borderColor: C.line }}
              >
                Layers
              </Button>
            ) : null}
            <Button
              onPress={() => {
                cancelPick();
                useEditor.getState().setMode(editing ? "preview" : "edit");
              }}
              style={{ height: 28, borderWidth: 1, borderColor: C.accent }}
            >
              <Label
                style={{ fontSize: 12, fontWeight: "500", color: C.accent }}
              >
                {editing ? "Preview" : "Back"}
              </Label>
            </Button>
          </View>
        </View>
        <View
          ref={host}
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={() => {
            void measure(host).then((rect) => {
              if (rect) setViewport(rect);
            });
          }}
        >
          <View
            ref={canvas}
            collapsable={false}
            style={{ flex: 1, backgroundColor: "#fff" }}
          >
            <ScrollView
              ref={scroller}
              testID="canvas"
              scrollEnabled={!busy && !pick}
              nestedScrollEnabled
              bounces={false}
              overScrollMode="never"
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                if (busy && Math.abs(y - heldOffset.current) > 0.5)
                  scroller.current?.scrollTo({
                    y: heldOffset.current,
                    animated: false,
                  });
                else offset.current = y;
              }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 112 }}
            >
              <View style={{ flex: 1 }}>
                <ElementView id={visual.rootId} />
              </View>
            </ScrollView>
          </View>
          {pick ? (
            <View
              testID="eyedrop-layer"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
              }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                const { pageX, pageY } = event.nativeEvent;
                const request = pick;
                void sampleColor(pageX, pageY, canvas, runtime)
                  .then((hex) => {
                    if (hex) request.apply(hex);
                    else request.cancel();
                    setPick(null);
                  })
                  .catch((error) => {
                    console.error("Colour sampling failed", error);
                    request.cancel();
                    setPick(null);
                  });
              }}
            />
          ) : null}
          {editing && controls ? (
            <FloatingEditor
              onClose={() => {
                cancelPick();
                setControls(false);
              }}
            />
          ) : null}
          {editing && layers ? (
            <View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 40,
                flexDirection: "row",
              }}
            >
              <Button
                label="Close layers"
                onPress={() => setLayers(false)}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "100%",
                  borderRadius: 0,
                  backgroundColor: "rgba(27,30,39,0.28)",
                }}
              />
              <View
                style={{
                  width: Math.min(320, viewport.width * 0.85),
                  backgroundColor: C.surface,
                  borderRightWidth: 1,
                  borderRightColor: C.line,
                }}
              >
                <View
                  style={{
                    alignItems: "flex-end",
                    borderBottomWidth: 1,
                    borderBottomColor: C.line,
                  }}
                >
                  <Button
                    onPress={() => setLayers(false)}
                    style={{ height: 44, paddingHorizontal: 16 }}
                  >
                    <Label>Close</Label>
                  </Button>
                </View>
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: C.line,
                  }}
                >
                  <Label style={{ fontWeight: "500" }}>Layers</Label>
                </View>
                <ScrollView
                  testID="layers"
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  {layerRows(visual).map((row) => {
                    const e = visual.elements[row.id];
                    const Icon = {
                      container: Square,
                      card: Box,
                      heading: Heading,
                      text: Type,
                      button: RectangleHorizontal,
                      image: Image,
                      input: TextCursorInput,
                    }[e.kind];
                    return (
                      <Button
                        key={e.id}
                        label={e.name + ", " + KIND_LABEL[e.kind]}
                        selected={selected === e.id}
                        onPress={() => {
                          useEditor.getState().select(e.id);
                          setLayers(false);
                          reveal(e.id);
                        }}
                        style={{
                          height: 44,
                          paddingLeft: [12, 32, 48, 64][Math.min(row.depth, 3)],
                          paddingRight: 12,
                          borderRadius: 0,
                          backgroundColor:
                            selected === e.id ? C.soft : "transparent",
                        }}
                      >
                        <View style={[s.row, { width: "100%" }]}>
                          <Icon
                            size={16}
                            color={selected === e.id ? C.accent : C.muted}
                          />
                          <Label
                            numberOfLines={1}
                            style={{ flex: 1, fontWeight: "500" }}
                          >
                            {e.name}
                          </Label>
                          <Label style={s.muted}>{KIND_LABEL[e.kind]}</Label>
                        </View>
                      </Button>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </RuntimeContext.Provider>
  );
}
