import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { FONTS, WEIGHT_LABEL, weightsFor } from "@/model/fonts";
import type { FontWeightName, Measure } from "@/model/types";
import { nativeFont } from "./fonts";
import { Button, C, Label, s } from "./ui";

export function WordsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={s.column}>
      <Label style={s.muted}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        testID="words"
        multiline
        allowFontScaling={false}
        style={[
          s.input,
          { height: 64, paddingVertical: 6, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}
export function FontField({
  family,
  onChange,
}: {
  family: string;
  onChange: (family: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const shown = FONTS.filter((f) =>
    (f.label + " " + f.id).toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <View style={s.column}>
      <Label style={s.muted}>Font</Label>
      <Button
        label="Font"
        onPress={() => setOpen(!open)}
        style={{ height: 36, backgroundColor: C.desk, paddingHorizontal: 12 }}
      >
        <View
          style={[s.row, { width: "100%", justifyContent: "space-between" }]}
        >
          <Label
            numberOfLines={1}
            style={{
              fontFamily: nativeFont(family, "regular"),
              fontSize: 28,
              flexShrink: 1,
            }}
          >
            {FONTS.find((f) => f.id === family)?.label ?? family}
          </Label>
          <Label>{open ? "▴" : "▾"}</Label>
        </View>
      </Button>
      {open ? (
        <View style={{ backgroundColor: C.desk, borderRadius: 8 }}>
          <TextInput
            accessibilityLabel="Search fonts"
            testID="font-search"
            placeholder="Search fonts"
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            allowFontScaling={false}
            style={[
              s.input,
              {
                borderWidth: 0,
                borderBottomWidth: 1,
                backgroundColor: "transparent",
                paddingHorizontal: 12,
              },
            ]}
          />
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 160 }}
            keyboardShouldPersistTaps="handled"
          >
            {shown.length === 0 ? (
              <Label style={{ padding: 12 }}>No font with that name.</Label>
            ) : (
              shown.map((font) => (
                <Button
                  key={font.id}
                  label={font.label}
                  selected={font.id === family}
                  testID={"font-" + font.id}
                  onPress={() => {
                    onChange(font.id);
                    setOpen(false);
                  }}
                  style={{
                    height: 36,
                    alignItems: "flex-start",
                    paddingHorizontal: 12,
                  }}
                >
                  <Label
                    numberOfLines={1}
                    style={{
                      fontFamily: nativeFont(font.id, "regular"),
                      fontSize: 16,
                    }}
                  >
                    {font.label}
                  </Label>
                </Button>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
export function WeightField({
  family,
  value,
  onChange,
}: {
  family: string;
  value: FontWeightName;
  onChange: (v: FontWeightName) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.column}>
      <Label style={s.muted}>Weight</Label>
      <Button
        label="Weight"
        onPress={() => setOpen(!open)}
        style={{ height: 36, backgroundColor: C.desk }}
      >
        <View
          style={[s.row, { width: "100%", justifyContent: "space-between" }]}
        >
          <Label>{WEIGHT_LABEL[value]}</Label>
          <Label>{open ? "▴" : "▾"}</Label>
        </View>
      </Button>
      {open ? (
        <View style={{ backgroundColor: C.desk, borderRadius: 8 }}>
          {weightsFor(family).map((weight) => (
            <Button
              key={weight}
              selected={value === weight}
              onPress={() => {
                onChange(weight);
                setOpen(false);
              }}
              style={{ height: 36, alignItems: "flex-start" }}
            >
              {WEIGHT_LABEL[weight]}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}
export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  decimal = false,
  field,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
  decimal?: boolean;
  field?: string;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  useEffect(() => setDraft(value == null ? "" : String(value)), [value]);
  return (
    <View
      style={decimal ? s.column : [s.row, { justifyContent: "space-between" }]}
    >
      <Label style={[s.muted, { fontSize: decimal ? 14 : 12 }]}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        testID={field}
        allowFontScaling={false}
        keyboardType={decimal ? "decimal-pad" : "numeric"}
        value={draft}
        style={[
          s.input,
          decimal
            ? { height: 44, fontSize: 16, paddingHorizontal: 12 }
            : { width: 64 },
        ]}
        onChangeText={(text) => {
          setDraft(text);
          if (!text.trim() && !decimal) return;
          const n = Number(text);
          const v = decimal ? n : Math.round(n);
          if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
        onBlur={() => {
          if (decimal || !draft.trim() || value == null) return;
          const n = Number(draft);
          if (Number.isFinite(n))
            onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
      />
    </View>
  );
}
export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.column}>
      <Label style={s.muted}>{label}</Label>
      <View
        accessibilityLabel={label}
        style={[
          s.row,
          { gap: 4, padding: 4, borderRadius: 8, backgroundColor: C.desk },
        ]}
      >
        {options.map((o) => (
          <Button
            key={o.id}
            selected={o.id === value}
            onPress={() => onChange(o.id)}
            style={{
              flex: 1,
              backgroundColor: o.id === value ? C.surface : "transparent",
            }}
          >
            <Label
              style={{
                fontSize: 12,
                color: o.id === value ? C.accent : C.muted,
              }}
            >
              {o.label}
            </Label>
          </Button>
        ))}
      </View>
    </View>
  );
}
export function SizeField({
  axis,
  measure,
  onChange,
}: {
  axis: "width" | "height";
  measure: Measure;
  onChange: (v: Measure) => void;
}) {
  return (
    <View style={s.column}>
      <Choices
        label={axis === "width" ? "Width" : "Height"}
        value={measure.mode}
        options={[
          { id: "hug", label: "Own size" },
          {
            id: "fill",
            label: axis === "width" ? "Across the page" : "Down the page",
          },
        ]}
        onChange={(mode) => {
          if (mode === "hug" || mode === "fill") onChange({ mode });
        }}
      />
      <NumberField
        label="Exact pixels"
        field={axis}
        value={measure.mode === "fixed" ? measure.value : null}
        min={32}
        max={1200}
        onChange={(value) => onChange({ mode: "fixed", value })}
      />
    </View>
  );
}
