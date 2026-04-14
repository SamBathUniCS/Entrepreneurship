import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

interface Event {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  member_count: number;
  is_member: boolean;
  mutual_friends: number;
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

  const greeting = user ? `Hey, @${user.username} 👋` : "Welcome to PhotoMe";

  const recentEvents = myEvents.slice(0, 5);
  const current = recentEvents[carouselIndex] ?? null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>PhotoMe</Text>
          <Text style={styles.heroGreeting}>{greeting}</Text>
          <Text style={styles.heroSubtitle}>
            Because every moment has your moment
          </Text>
        </View>

        {/* Discover — public events */}
        <Text style={styles.sectionTitle}>Discover Events</Text>
        {loading ? (
          <ActivityIndicator color="#1677ff" style={{ margin: 20 }} />
        ) : publicEvents.length === 0 ? (
          <Text style={styles.emptyText}>
            No public events to discover right now.
          </Text>
        ) : (
          <View style={styles.discoverList}>
            {publicEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.discoverCard}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <Image
                  source={{
                    uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/120/120`,
                  }}
                  style={styles.discoverImage}
                />
                <View style={styles.discoverText}>
                  <Text style={styles.discoverTitle} numberOfLines={1}>
                    {event.title}
                  </Text>

                  <Text style={styles.metaRow}>
                    👥 {event.member_count} · 📷 {event.photo_count}{" "}
                    {event.mutual_friends > 0 && (
                      <Text style={styles.socialBadge}>
                        {" "}• 🔥 {event.mutual_friends} friend
                        {event.mutual_friends > 1 ? "s" : ""}
                      </Text>
                    )}
                  </Text>

                  {event.description ? (
                    <Text style={styles.discoverDesc} numberOfLines={1}>
                      {event.description}
                    </Text>
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
            <Text style={styles.emptyCardText}>
              You haven't joined any events yet.
            </Text>
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
                source={{
                  uri: `https://picsum.photos/seed/${current.id.slice(0, 8)}/700/400`,
                }}
                style={styles.recentImage}
              />
              <Text style={styles.recentTitle} numberOfLines={1}>
                {current.title}
              </Text>

              <Text style={styles.recentMeta}>
                👥 {current.member_count} members · 📷 {current.photo_count}{" "}
                photos
              </Text>
              </Pressable>
            {recentEvents.length > 1 && (
              <View style={styles.carouselControls}>
                <Pressable
                  style={styles.carouselButton}
                  onPress={() =>
                    setCarouselIndex((i) =>
                      i === 0 ? recentEvents.length - 1 : i - 1,
                    )
                  }
                >
                  <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </Pressable>
                <Text style={styles.carouselDots}>
                  {recentEvents
                    .map((_, i) => (i === carouselIndex ? "●" : "○"))
                    .join(" ")}
                </Text>
                <Pressable
                  style={styles.carouselButton}
                  onPress={() =>
                    setCarouselIndex((i) =>
                      i === recentEvents.length - 1 ? 0 : i + 1,
                    )
                  }
                >
                  <Ionicons name="chevron-forward" size={24} color="#1f2937" />
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* FAB — QR scan / join event */}
      <Pressable style={styles.fab} onPress={() => router.push("/qrScan")}>
        <Ionicons name="qr-code-outline" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },

  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heroTitle: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.heroTitle,
    fontWeight: "800",
  },
  heroGreeting: {
    color: COLORS.heroGreeting,
    fontSize: FONT_SIZES.heroGreeting,
    fontWeight: "600",
    marginTop: SPACING.sm,
  },
  heroSubtitle: {
    color: COLORS.heroSubtitle,
    fontSize: FONT_SIZES.heroSubtitle,
    marginTop: SPACING.xs,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.cardMeta,
    paddingHorizontal: SPACING.xl,
  },

  discoverList: { gap: SPACING.md, paddingHorizontal: SPACING.xl },
  discoverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  discoverImage: { width: 52, height: 52, borderRadius: 10 },
  discoverText: { flex: 1 },
  discoverTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  discoverMeta: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  discoverDesc: {
    fontSize: FONT_SIZES.cardMeta,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  recentCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recentImage: { width: "100%", height: 170 },
  recentTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    padding: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  recentMeta: {
    fontSize: FONT_SIZES.cardMeta,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },

  carouselControls: {
    marginTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  carouselButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  carouselDots: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
    letterSpacing: 4,
  },

  emptyCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyCardText: {
    fontSize: FONT_SIZES.cardMeta,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyCardBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm * 2,
    borderRadius: 10,
  },
  emptyCardBtnTxt: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.cardMeta,
  },

  fab: {
    position: "absolute",
    bottom: 26,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  metaRow: {
    fontSize: 13,
    color: "#6B7280",
  },
  socialBadge: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
