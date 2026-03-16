import React, { useContext, useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, Image,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";

interface Event {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  member_count: number;
  is_member: boolean;
  status: string;
  created_at: string;
}

export default function Home() {
  const { token, user } = useContext(AuthContext);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [publicEvents, setPublicEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    loadEvents();
  }, [token]);

  async function loadEvents() {
    setLoading(true);
    const [mine, all] = await Promise.all([
      apiFetch("GET", "/events/?my_events=true", token),
      apiFetch("GET", "/events/", token),
    ]);
    if (mine.ok) setMyEvents(mine.data ?? []);
    if (all.ok) {
      const notMine = (all.data ?? []).filter((e: Event) => !e.is_member);
      setPublicEvents(notMine.slice(0, 4));
    }
    setLoading(false);
  }

  const greeting = user
    ? `Hey, @${user.username} 👋`
    : "Welcome to PhotoMe";

  const recentEvents = myEvents.slice(0, 5);
  const current = recentEvents[carouselIndex] ?? null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>PhotoMe</Text>
          <Text style={styles.heroGreeting}>{greeting}</Text>
          <Text style={styles.heroSubtitle}>Because every moment has your moment</Text>
        </View>

        {/* Discover — public events */}
        <Text style={styles.sectionTitle}>Discover Events</Text>
        {loading ? (
          <ActivityIndicator color="#1677ff" style={{ margin: 20 }} />
        ) : publicEvents.length === 0 ? (
          <Text style={styles.emptyText}>No public events to discover right now.</Text>
        ) : (
          <View style={styles.discoverList}>
            {publicEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.discoverCard}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <Image
                  source={{ uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/120/120` }}
                  style={styles.discoverImage}
                />
                <View style={styles.discoverText}>
                  <Text style={styles.discoverTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.discoverMeta}>
                    👥 {event.member_count} · 📷 {event.photo_count}
                  </Text>
                  {event.description ? (
                    <Text style={styles.discoverDesc} numberOfLines={1}>{event.description}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Recent Events — my events carousel */}
        <Text style={styles.sectionTitle}>Your Recent Events</Text>
        {myEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>You haven't joined any events yet.</Text>
            <TouchableOpacity
              style={styles.emptyCardBtn}
              onPress={() => router.push("/(tabs)/search")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCardBtnTxt}>Browse Events →</Text>
            </TouchableOpacity>
          </View>
        ) : current ? (
          <>
            <Pressable
              style={styles.recentCard}
              onPress={() => router.push(`/events/${current.id}`)}
            >
              <Image
                source={{ uri: `https://picsum.photos/seed/${current.id.slice(0, 8)}/700/400` }}
                style={styles.recentImage}
              />
              <Text style={styles.recentTitle} numberOfLines={1}>{current.title}</Text>
              <Text style={styles.recentMeta}>
                👥 {current.member_count} members · 📷 {current.photo_count} photos
              </Text>
            </Pressable>
            {recentEvents.length > 1 && (
              <View style={styles.carouselControls}>
                <Pressable
                  style={styles.carouselButton}
                  onPress={() => setCarouselIndex((i) => (i === 0 ? recentEvents.length - 1 : i - 1))}
                >
                  <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </Pressable>
                <Text style={styles.carouselDots}>
                  {recentEvents.map((_, i) => (i === carouselIndex ? "●" : "○")).join(" ")}
                </Text>
                <Pressable
                  style={styles.carouselButton}
                  onPress={() => setCarouselIndex((i) => (i === recentEvents.length - 1 ? 0 : i + 1))}
                >
                  <Ionicons name="chevron-forward" size={24} color="#1f2937" />
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* FAB — QR scan / join event */}
      <Pressable style={styles.fab} onPress={() => router.push("/qr-scan")}>
        <Ionicons name="qr-code-outline" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f6f6" },
  scrollContent: { paddingBottom: 120 },

  hero: {
    backgroundColor: "#1e88e5",
    paddingTop: 28, paddingHorizontal: 24, paddingBottom: 28,
  },
  heroTitle:    { color: "#fff", fontSize: 28, fontWeight: "800" },
  heroGreeting: { color: "#e0f0ff", fontSize: 15, fontWeight: "600", marginTop: 6 },
  heroSubtitle: { color: "#bbdeff", fontSize: 13, marginTop: 4 },

  sectionTitle: {
    fontSize: 18, fontWeight: "800", color: "#111827",
    marginTop: 22, marginBottom: 12, paddingHorizontal: 20,
  },
  emptyText: { color: "#9ca3af", fontSize: 14, paddingHorizontal: 20 },

  discoverList: { gap: 10, paddingHorizontal: 20 },
  discoverCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  discoverImage:  { width: 52, height: 52, borderRadius: 10 },
  discoverText:   { flex: 1 },
  discoverTitle:  { fontSize: 15, fontWeight: "700", color: "#111827" },
  discoverMeta:   { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  discoverDesc:   { fontSize: 12, color: "#6b7280", marginTop: 2 },

  recentCard: {
    marginHorizontal: 20, backgroundColor: "#fff",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  recentImage:  { width: "100%", height: 170 },
  recentTitle:  { fontSize: 17, fontWeight: "800", color: "#111827", padding: 14, paddingBottom: 4 },
  recentMeta:   { fontSize: 12, color: "#6b7280", paddingHorizontal: 14, paddingBottom: 14 },

  carouselControls: {
    marginTop: 12, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 40,
  },
  carouselButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  carouselDots: { fontSize: 12, color: "#9ca3af", letterSpacing: 4 },

  emptyCard: {
    marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 14,
    padding: 24, alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  emptyCardText:   { fontSize: 14, color: "#6b7280", textAlign: "center" },
  emptyCardBtn:    { backgroundColor: "#1677ff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyCardBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  fab: {
    position: "absolute", bottom: 26, alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#5b3df5", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
