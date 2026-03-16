import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  style?: object;
};

export const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  style,
}: ButtonProps) => {
  const bgColor = (() => {
    if (disabled) return COLORS.border;
    switch (variant) {
      case "primary": return COLORS.primary;
      case "secondary": return COLORS.secondary;
      case "outline": return COLORS.surface;
      case "danger": return COLORS.error;
      default: return COLORS.primary;
    }
  })();

  const textColor = (() => {
    if (disabled) return COLORS.textMuted;
    switch (variant) {
      case "primary": return COLORS.surface;
      case "secondary": return COLORS.surface;
      case "outline": return COLORS.primary;
      case "danger": return COLORS.surface;
      default: return COLORS.surface;
    }
  })();

  const paddingVertical = (() => {
    switch (size) {
      case "sm": return SPACING.sm;
      case "md": return SPACING.md;
      case "lg": return SPACING.lg;
      default: return SPACING.md;
    }
  })();

  const borderWidth = variant === "outline" ? 1 : 0;
  const borderColor = variant === "outline" ? COLORS.primary : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: bgColor,
          paddingVertical,
          paddingHorizontal: SPACING.lg,
          borderRadius: 12,
          borderWidth,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: textColor, fontSize: FONT_SIZES.body, fontWeight: "700" }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
