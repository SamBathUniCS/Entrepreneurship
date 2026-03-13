import React, { useMemo, useState } from "react";
import { View, TextInput, FlatList, Pressable, Text } from "react-native";
import { router } from "expo-router";
import EventCard from "../../components/EventCard";
import styles from "../../styles/searchStyles";
import { mockEvents } from "../../data/mockEvents";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockEvents;
    return mockEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search events..."
          style={styles.input}
        />

        {/* NEW: QR scan button */}
        <Pressable
          style={styles.qrButton}
          onPress={() => router.push("/(tabs)/scan")}
        >
          <Text style={styles.qrButtonText}>Scan</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() =>
              router.push({
                pathname: "/event/[eventId]",
                params: { eventId: item.id },
              })
            }
          />
        )}
      />
    </View>
  );
}