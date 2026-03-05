import React from "react";
import { View, Text, Image } from "react-native";

export default function MutualFriendsRow({ count = 0, profiles = [] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
      <View style={{ flexDirection: "row", marginRight: 10 }}>
        {profiles.slice(0, 3).map((uri, idx) => (
          <Image
            key={uri}
            source={{ uri }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              marginLeft: idx === 0 ? 0 : -8,
              borderWidth: 2,
              borderColor: "white",
            }}
          />
        ))}
      </View>
      <Text style={{ color: "#6b7280" }}>
        {count} mutual friend{count === 1 ? "" : "s"} in event
      </Text>
    </View>
  );
}