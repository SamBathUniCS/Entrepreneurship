import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");

  const onBarcodeScanned = useCallback(
    ({ data }) => {
      if (locked) return;
      setLocked(true);
      setMessage("");

      // Expect JSON: {"type":"event","eventId":"uuid"}
      try {
        const parsed = JSON.parse(data);

        if (parsed?.type === "event" && parsed?.eventId) {
          router.push(`/events/${parsed.eventId}`);
          return;
        }
        setMessage("QR code not recognized.");
      } catch {
        // If someone scanned a plain UUID or a URL, handle that too:
        const maybeUuid = String(data).trim();

        // very loose UUID check
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidLike.test(maybeUuid)) {
          router.push(`/events/${maybeUuid}`);
        } else {
          setMessage("QR code not recognized.");
        }
      } finally {
        setTimeout(() => setLocked(false), 1200);
      }
    },
    [locked]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Loading permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
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

      {!!message && (
        <View style={styles.toast}>
          <Text style={{ color: "white", fontWeight: "700" }}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 16, justifyContent: "center", gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  button: { backgroundColor: "#1677ff", padding: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "900" },
  toast: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
});