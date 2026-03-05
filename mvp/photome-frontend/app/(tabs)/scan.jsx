import React, { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const onBarcodeScanned = useCallback(({ data }) => {
    if (locked) return;
    setLocked(true);

    try {
      const parsed = JSON.parse(data);
      if (parsed?.type === "event" && parsed?.eventId) {
        router.push(`/event/${parsed.eventId}`);
      }
    } catch (_e) {
      // non-JSON QR – ignore or show message
    } finally {
      setTimeout(() => setLocked(false), 1200);
    }
  }, [locked]);

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Camera access needed</Text>
        <Pressable onPress={requestPermission} style={{ backgroundColor: "#1677ff", padding: 14, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "900" }}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />
    </View>
  );
}
