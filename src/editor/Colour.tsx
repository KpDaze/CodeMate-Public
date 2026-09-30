import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  exactHex,
  hexToRgb,
  hsvToHex,
  rgbToHsv,
  type Hsv,
} from "@/model/color";
import { useEditor } from "./store";
import { useRuntime } from "./runtime";
import { Button, C, Label, s } from "./ui";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
function ColourPad({
  hsv,
  hueOnly,
  onChange,
  onDrag,
}: {
  hsv: Hsv;
  hueOnly?: boolean;
  onChange: (hsv: Hsv) => void;
  onDrag: (dragging: boolean) => void;
}) {
  const ref = useRef<View>(null);
  const latest = useRef({ hsv, onChange, onDrag });
  latest.current = { hsv, onChange, onDrag };
  const size = useRef({ width: 1, height: 1 });
  const origin = useRef({ x: 0, y: 0 });
  const begin = useRef({ x: 0, y: 0 });
  const update = (x: number, y: number) => {
    const { hsv, onChange } = latest.current;
    onChange(
      hueOnly
        ? { ...hsv, h: clamp(x / size.current.width) * 360 }
        : {
            ...hsv,
            s: clamp(x / size.current.width),
            v: clamp(1 - y / size.current.height),
          },
    );
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          e.stopPropagation();
          latest.current.onDrag(true);
          const n = e.nativeEvent;
          origin.current = {
            x: n.pageX - n.locationX,
            y: n.pageY - n.locationY,
          };
          begin.current = { x: n.locationX, y: n.locationY };
          update(n.locationX, n.locationY);
        },
        onPanResponderMove: (_, g) =>
          update(begin.current.x + g.dx, begin.current.y + g.dy),
        onPanResponderRelease: () => latest.current.onDrag(false),
        onPanResponderTerminate: () => latest.current.onDrag(false),
      }),
    [hueOnly],
  );
  const pure = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  return (
    <View
      ref={ref}
      {...pan.panHandlers}
      accessibilityLabel={hueOnly ? "Hue" : "Saturation and value"}
      testID={hueOnly ? "hue" : "sv"}
      onLayout={(e) => {
        size.current = e.nativeEvent.layout;
      }}
      style={{ height: hueOnly ? 8 : 64, borderRadius: hueOnly ? 99 : 6 }}
    >
      {hueOnly ? (
        <LinearGradient
          pointerEvents="none"
          colors={["#f00", "#ff0", "#0f0", "#0ff", "#00f", "#f0f", "#f00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: 99,
          }}
        />
      ) : (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={["#fff", pure]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: 6,
            }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "#000"]}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: 6,
            }}
          />
        </>
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${(hueOnly ? hsv.h / 360 : hsv.s) * 100}%`,
          top: hueOnly ? "50%" : `${(1 - hsv.v) * 100}%`,
          width: 10,
          height: 10,
          marginLeft: -5,
          marginTop: -5,
          borderRadius: 5,
          borderColor: "#fff",
          borderWidth: 2,
          backgroundColor: hueOnly ? pure : hsvToHex(hsv),
          boxShadow: "0 0 0 1px #1b1e27",
        }}
      />
    </View>
  );
}
function Rainbow() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      {Array.from({ length: 120 }, (_, i) => {
        const a = (i * Math.PI) / 60 - Math.PI / 2,
          b = ((i + 1.1) * Math.PI) / 60 - Math.PI / 2;
        return (
          <Path
            key={i}
            fill={hsvToHex({ h: i * 3, s: 1, v: 1 })}
            d={`M14 14 L${14 + 14 * Math.cos(a)} ${14 + 14 * Math.sin(a)} A14 14 0 0 1 ${14 + 14 * Math.cos(b)} ${14 + 14 * Math.sin(b)} Z`}
          />
        );
      })}
    </Svg>
  );
}
export function Colour({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const elements = useEditor((s) => s.document.elements);
  const runtime = useRuntime();
  const [draft, setDraft] = useState(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const dragging = useRef(false);
  const rgb = hexToRgb(value) ?? { r: 0, g: 0, b: 0 };
  const [hsv, setHsv] = useState(() => rgbToHsv(rgb.r, rgb.g, rgb.b));
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!dragging.current) {
      const rgb = hexToRgb(value);
      if (rgb) setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  }, [value]);
  // A property change/unmount ends its own sampling session.
  useEffect(
    () => () => {
      if (picking) runtime.setPick(null);
    },
    [picking, runtime.setPick],
  );
  const colours: string[] = [];
  const add = (raw?: string) => {
    const hex = raw ? exactHex(raw) : null;
    if (hex && !colours.includes(hex.toLowerCase()))
      colours.push(hex.toLowerCase());
  };
  for (const element of Object.values(elements)) {
    add(element.textLook?.color);
    add(element.boxLook?.background);
    if (element.boxLook?.borderOn) add(element.boxLook.borderColor);
  }
  add(value);
  const apply = (hex: string) => {
    const exact = exactHex(hex);
    if (exact) {
      setDraft(exact);
      onChange(exact);
    }
  };
  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    onChange(hex);
  };
  const pick = () => {
    if (picking) {
      runtime.setPick(null);
      setPicking(false);
    } else {
      setPicking(true);
      runtime.setPick({
        apply: (hex) => {
          apply(hex);
          setPicking(false);
        },
        cancel: () => setPicking(false),
      });
    }
  };
  return (
    <View testID="colour" style={{ gap: 8 }}>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {colours.map((hex) => {
          const rgb = hexToRgb(hex)!;
          return (
            <Button
              key={hex}
              label={hex}
              selected={hex === value.toLowerCase()}
              onPress={() => apply(hex)}
              style={{
                height: 28,
                width: 28,
                paddingHorizontal: 0,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.line,
                backgroundColor: hex,
              }}
            >
              {hex === value.toLowerCase() ? (
                <Label
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: rgb.r + rgb.g + rgb.b > 520 ? C.ink : "#fff",
                  }}
                >
                  ✓
                </Label>
              ) : null}
            </Button>
          );
        })}
        <Button
          label="Open colour picker"
          onPress={() => setPickerOpen(!pickerOpen)}
          style={{
            width: 28,
            height: 28,
            paddingHorizontal: 0,
            borderRadius: 14,
            outlineColor: C.accent,
            outlineWidth: pickerOpen ? 2 : 0,
            outlineOffset: 2,
          }}
        >
          <Rainbow />
        </Button>
      </View>
      {pickerOpen ? (
        <>
          <ColourPad
            hsv={hsv}
            onChange={commit}
            onDrag={(on) => {
              dragging.current = on;
            }}
          />
          <ColourPad
            hueOnly
            hsv={hsv}
            onChange={commit}
            onDrag={(on) => {
              dragging.current = on;
            }}
          />
        </>
      ) : null}
      <View
        style={[
          s.row,
          {
            paddingTop: 4,
            paddingBottom: 8,
            marginTop: 4,
            backgroundColor: C.surface,
          },
        ]}
      >
        <Label style={{ fontSize: 12, color: C.muted }}>Hex</Label>
        <TextInput
          accessibilityLabel="Hex"
          testID="hex"
          value={draft}
          allowFontScaling={false}
          autoCorrect={false}
          autoCapitalize="none"
          style={[s.input, { flex: 1, minWidth: 0 }]}
          onChangeText={(text) => {
            setDraft(text);
            const exact = exactHex(text);
            if (exact) onChange(exact);
          }}
        />
        <Button
          label={picking ? "Cancel eyedropper" : "Eyedropper"}
          testID="eyedropper"
          selected={picking}
          onPress={pick}
          style={{ width: 32, paddingHorizontal: 0 }}
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={picking ? C.accent : C.ink}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="m2 22 1-1h3l9-9" />
            <Path d="M3 21v-3l9-9" />
            <Path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3L15 6" />
          </Svg>
        </Button>
      </View>
      {picking ? (
        <Label style={{ fontSize: 12, color: C.muted }}>
          Tap a colour on the page.
        </Label>
      ) : null}
    </View>
  );
}
