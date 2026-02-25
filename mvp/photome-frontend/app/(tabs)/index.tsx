import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>PhotoMe</Text>

      <Pressable
        style={{
          padding: 14,
          borderWidth: 1,
          borderRadius: 10,
          alignItems: "center",
        }}
        onPress={() => router.push("/(tabs)/search")}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Go to Event Search</Text>
      </Pressable>
    </View>
  );
}