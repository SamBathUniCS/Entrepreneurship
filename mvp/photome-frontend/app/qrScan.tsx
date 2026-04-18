import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { COLORS, FONT_SIZES, SPACING } from "./theme";

export default function QrScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    // Expect "photome://event/{eventId}"
    const match = data.match(/photome:\/\/event\/([0-9a-f-]{36})/i);
    if (match) {
      const eventId = match[1];
      router.replace(`/events/${eventId}`);
    } else {
      Alert.alert(
        "Unknown QR Code",
        "This QR code doesn't link to a PhotoMe event.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }],
      );
    }
  }

  // Not yet determined
  if (!permission) {
    return <View style={s.container} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            <Text style={s.backTxt}>Back</Text>
          </Pressable>
        </View>
        <View style={s.center}>
          <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
          <Text style={s.title}>Camera Access Needed</Text>
          <Text style={s.subtitle}>
            Allow camera access to scan event QR codes
          </Text>
          <Pressable style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnTxt}>Allow Camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.full}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      {/* Dark overlay with cutout */}
      <View style={s.overlay}>
        <View style={s.topShade} />
        <View style={s.middleRow}>
          <View style={s.sideShade} />
          <View style={s.scanBox}>
            {/* Corner brackets */}
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
          </View>
          <View style={s.sideShade} />
        </View>
        <View style={s.bottomShade}>
          <Text style={s.hint}>
            Point your camera at a PhotoMe event QR code
          </Text>
          {scanned && (
            <Pressable style={s.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={s.rescanTxt}>Scan Again</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Back button */}
      <SafeAreaView style={s.headerFloat}>
        <Pressable style={s.backBtnFloat} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const BOX = 240;
const CORNER = 24;
const BORDER = 4;
const SHADE = "rgba(0,0,0,0.6)";

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl },
  header: { height: 56, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.md, paddingHorizontal: SPACING.xl },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: 999,
    alignSelf: "flex-start",
  },
  backTxt: { fontSize: FONT_SIZES.small, fontWeight: "600", color: COLORS.textPrimary },
  title: { fontSize: FONT_SIZES.sectionTitle, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center" },
  subtitle: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, textAlign: "center" },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: 12, marginTop: SPACING.sm },
  permBtnTxt: { color: "#fff", fontWeight: "700", fontSize: FONT_SIZES.body },

  // Camera overlay
  overlay: { ...StyleSheet.absoluteFillObject },
  topShade: { flex: 1, backgroundColor: SHADE },
  middleRow: { flexDirection: "row", height: BOX },
  sideShade: { flex: 1, backgroundColor: SHADE },
  scanBox: { width: BOX, height: BOX },
  bottomShade: { flex: 1, backgroundColor: SHADE, alignItems: "center", paddingTop: SPACING.xl, gap: SPACING.md },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: FONT_SIZES.body, textAlign: "center", paddingHorizontal: SPACING.xl },
  rescanBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: 12 },
  rescanTxt: { color: "#fff", fontWeight: "700", fontSize: FONT_SIZES.body },

  // Corner brackets
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#fff", borderWidth: BORDER },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  headerFloat: { position: "absolute", top: 0, left: 0, right: 0 },
  backBtnFloat: { margin: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
});
