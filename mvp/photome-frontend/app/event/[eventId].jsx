import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MutualFriends from "../../components/MutualFriends";

export default function EventDetails() {
  const { eventId } = useLocalSearchParams();

  const event = useMemo(
    () => ({
      id: String(eventId),
      title: "Summer Party",
      date: "2026-03-20",
      location: "Bath, SU Terrace",
      description: "Music, photos, and a shared gallery.",
      mutuals: [
        "https://picsum.photos/seed/u1/80/80",
        "https://picsum.photos/seed/u2/80/80",
        "https://picsum.photos/seed/u3/80/80",
      ],
    }),
    [eventId]
  );

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "900" }}>{event.title}</Text>
      <Text style={{ opacity: 0.75 }}>
        {event.date} • {event.location}
      </Text>

      <MutualFriends urls={event.mutuals} label="Mutual friends joined" />

      <Text style={{ marginTop: 8, opacity: 0.85 }}>{event.description}</Text>

      <Pressable
        style={{
          marginTop: 12,
          backgroundColor: "#1677ff",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
        onPress={() => {
          // TODO: call POST /events/{id}/join
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>Join Event</Text>
      </Pressable>

      <Pressable
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
        onPress={() => router.push(`/share/${event.id}`)}
      >
        <Text style={{ fontWeight: "900" }}>Share as QR Code</Text>
      </Pressable>

      <Pressable
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
        onPress={() => router.push("/(tabs)/photos")}
      >
        <Text style={{ fontWeight: "900" }}>View Photos</Text>
      </Pressable>
    </View>
  );
}
