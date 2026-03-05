import { StyleSheet } from "react-native";
import { colors, spacing, radius } from "./theme";

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  cameraWrap: {
    width: "100%",
    height: 420,
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: "#000",
  },
  hint: {
    textAlign: "center",
    color: colors.muted,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});