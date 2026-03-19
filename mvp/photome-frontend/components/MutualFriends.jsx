import React from "react";
import { View, Image, Text } from "react-native";

export default function MutualFriends({ urls = [], label = "Mutuals in event" }) {
  const shown = urls.slice(0, 3);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row" }}>
        {shown.map((u, idx) => (
          <Image
            key={u}
            source={{ uri: u }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              marginLeft: idx === 0 ? 0 : -10,
              borderWidth: 2,
              borderColor: "white",
            }}
          />
        ))}
      </View>
      <Text style={{ opacity: 0.75 }}>{label}</Text>
    </View>
  );
}