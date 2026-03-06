import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "../context/_AuthContext";
import { API_BASE_URL } from "../../config";

const { width } = Dimensions.get("window");
const GAP = 10;
const H_PAD = 14;
const COL_WIDTH = (width - H_PAD * 2 - GAP) / 2;
const ROW_H = 130;

export default function Photos() {
  const { token } = useContext(AuthContext);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const getEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/?my_events=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to fetch events");
      }

      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      getEvents();
    }
  }, [token]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  // Layout pattern: wide, tall+normal pair, wide
  // wide  = spans full row
  // tall  = left col, 2 rows tall
  // normal = right col, 1 row
  const renderGrid = () => {
    const items: React.ReactNode[] = [];
    let i = 0;

    while (i < events.length) {
      const isFirst = i === 0;
      const remaining = events.length - i;

      if (isFirst || remaining === 1) {
        // Wide card — full row
        const event = events[i];
        items.push(
          <Pressable
            key={event.id}
            style={[styles.card, styles.cardWide]}
            onPress={() => router.push(`/events/${event.id}`)}
          >
            <Image
              source={{ uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/1400/700` }}
              style={styles.cardImage}
            />
            <View style={styles.cardOverlay} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statText}>👥 {event.member_count} members</Text>
                <View style={styles.statDivider} />
                <Text style={styles.statText}>📷 {event.photo_count} photos</Text>
              </View>
            </View>
          </Pressable>
        );
        i += 1;
      } else {
        // Tall (left) + 1–2 normal (right) pair
        const tallEvent = events[i];
        const rightEvents = events.slice(i + 1, i + 3);

        items.push(
          <View key={`group-${i}`} style={styles.gridRow}>
            {/* Tall card */}
            <Pressable
              style={[styles.card, styles.cardTall]}
              onPress={() => router.push(`/events/${tallEvent.id}`)}
            >
              <Image
                source={{ uri: `https://picsum.photos/seed/${tallEvent.id.slice(0, 8)}/400/600` }}
                style={styles.cardImage}
              />
              <View style={styles.cardOverlay} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{tallEvent.title}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>👥 {tallEvent.member_count}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>📷 {tallEvent.photo_count}</Text>
                </View>
              </View>
            </Pressable>

            {/* Right column — up to 2 normal cards */}
            <View style={styles.rightCol}>
              {rightEvents.map((event) => (
                <Pressable
                  key={event.id}
                  style={[styles.card, styles.cardNormal]}
                  onPress={() => router.push(`/events/${event.id}`)}
                >
                  <Image
                    source={{ uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/400/300` }}
                    style={styles.cardImage}
                  />
                  <View style={styles.cardOverlay} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statText}>👥 {event.member_count}</Text>
                      <View style={styles.statDivider} />
                      <Text style={styles.statText}>📷 {event.photo_count}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              {/* Fill empty slot if only one right card */}
              {rightEvents.length === 1 && <View style={styles.cardNormal} />}
            </View>
          </View>
        );

        i += 1 + rightEvents.length;
      }
    }

    return items;
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Grid */}
        <View style={styles.grid}>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>No events yet. Join one to get started!</Text>
          ) : (
            renderGrid()
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f2f5fa",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingText: {
    padding: 20,
    fontSize: 15,
    color: "#6b7280",
  },

  // Grid layout
  grid: {
    padding: H_PAD,
    gap: GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: GAP,
    height: ROW_H * 2 + GAP,
  },
  rightCol: {
    flex: 1,
    gap: GAP,
  },

  // Card base
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#dde4ee",
  },
  cardWide: {
    width: "100%",
    height: ROW_H * 1.4,
  },
  cardTall: {
    width: COL_WIDTH,
    flex: 1,
  },
  cardNormal: {
    flex: 1,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // Card text
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingBottom: 10,
    justifyContent: "flex-end",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  statText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 40,
  },
});
