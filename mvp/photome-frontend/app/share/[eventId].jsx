import React, { useMemo, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export default function ShareEvent() {
  const { eventId } = useLocalSearchParams();
  const ref = useRef(null);

  const payload = useMemo(
    () => JSON.stringify({ type: "event", eventId }),
    [eventId]
  );

  async function shareCard() {
    const uri = await captureRef(ref, { format: "png", quality: 1 });
    await Sharing.shareAsync(uri);
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View
        ref={ref}
        collapsable={false}
        style={{
          padding: 16,
          borderWidth: 1,
          borderRadius: 16,
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "900" }}>
          Scan to open event
        </Text>
        <QRCode value={payload} size={220} />
        <Text style={{ opacity: 0.7 }}>Event ID: {String(eventId)}</Text>
      </View>

      <Pressable
        onPress={shareCard}
        style={{
          backgroundColor: "#1677ff",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>Share QR Card</Text>
      </Pressable>
    </View>
  );
}
