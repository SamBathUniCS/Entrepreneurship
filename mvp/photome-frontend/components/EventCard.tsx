import React from "react";
import { Pressable, View, Text } from "react-native";
import { Image } from "expo-image";
import MutualFriendsRow from "./MutualFriends";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface EventCardProps {
  event: {
    id: string;
    image: string;
    date: string;
    title: string;
    description: string;
    mutualFriends: number;
    mutualProfiles: string[];
  };
  onPress: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Image
        source={event.image}
        style={{ width: 76, height: 76, borderRadius: 14, marginRight: 12 }}
        contentFit="cover"
      />

      <View style={{ flex: 1 }}>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>
          {formatDate(event.date)}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 2 }}>
          {event.title}
        </Text>
        <Text numberOfLines={2} style={{ color: "#6b7280", marginTop: 4 }}>
          {event.description}
        </Text>

        <MutualFriendsRow
          count={event.mutualFriends}
          profiles={event.mutualProfiles}
        />
      </View>
    </Pressable>
  );
}
