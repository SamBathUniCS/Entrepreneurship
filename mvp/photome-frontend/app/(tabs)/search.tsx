import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
} from "react-native";

const PLACEHOLDER_EVENTS = [
  {
    id: "1",
    title: "Summer Party",
    date: "2026-03-01",
    description: "Outdoor drinks and music all night",
    image: "https://picsum.photos/seed/party/120/120",
  },
  {
    id: "2",
    title: "Society Formal",
    date: "2026-03-12",
    description: "Black tie ONLY event",
    image: "https://picsum.photos/seed/formal/120/120",
  },
  {
    id: "3",
    title: "Football Tournament",
    date: "2026-03-20",
    description: "Game highlights gallery.",
    image: "https://picsum.photos/seed/football/120/120",
  },
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function Search() {
  const [q, setQ] = useState("");
  const [events, setEvents] = useState(PLACEHOLDER_EVENTS);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(s) ||
        (e.description || "").toLowerCase().includes(s)
    );
  }, [q, events]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
        }}
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search events…"
          autoCapitalize="none"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: "#fff",
          }}
        />
        <Pressable
          onPress={() => setQ("")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7 }}>No matching events.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              borderWidth: 1,
              borderColor: "#eee",
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Image
              source={{ uri: item.image }}
              style={{ width: 64, height: 64, borderRadius: 12 }}
            />

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>
                {formatDate(item.date)}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>
                {item.title}
              </Text>
              <Text numberOfLines={2} style={{ opacity: 0.75 }}>
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}