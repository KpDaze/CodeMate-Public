import type { PropsWithChildren } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";

export const C = {
  bg: "#f3f4f6",
  surface: "#ffffff",
  ink: "#1b1e27",
  muted: "#6b7280",
  line: "#e5e7eb",
  accent: "#2f6bff",
  soft: "#e7efff",
  desk: "#eef0f3",
};
export function Label({ style, ...props }: TextProps) {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  const lineHeight =
    ({ 12: 16, 14: 20, 16: 24, 18: 28 } as Record<number, number>)[fontSize] ??
    fontSize * 1.5;
  return (
    <Text
      allowFontScaling={false}
      {...props}
      style={[s.text, { lineHeight }, style]}
    />
  );
}
export function Button({
  children,
  onPress,
  label,
  selected,
  style,
  testID,
}: PropsWithChildren<{
  onPress: () => void;
  label?: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={[s.button, style]}
    >
      {typeof children === "string" ? (
        <Label style={{ fontSize: 12, color: selected ? C.accent : C.ink }}>
          {children}
        </Label>
      ) : (
        children
      )}
    </Pressable>
  );
}
export const s = StyleSheet.create({
  text: { fontSize: 14, color: C.ink, includeFontPadding: false },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  column: { gap: 4 },
  button: {
    height: 32,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: C.muted },
  input: {
    height: 32,
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.surface,
    includeFontPadding: false,
  },
});
