import React, { useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "../components/button";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

interface Event {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  member_count: number;
  mutual_friends: number;
  is_member: boolean;
  has_access: boolean;
  status: string;
  visibility: string;
}

export default function Search() {
  const { token } = useContext(AuthContext);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setSearched(true);
    const path = q.trim()
      ? `/events/?q=${encodeURIComponent(q.trim())}`
      : "/events/";
    const r = await apiFetch("GET", path, token);
    setLoading(false);
    if (r.ok) setResults(r.data ?? []);
  }, [token, q]);

  async function joinEvent(event: Event) {
    if (!token) return;
    setJoiningId(event.id);
    const r = await apiFetch("POST", `/events/${event.id}/join`, token);
    setJoiningId(null);
    if (r.ok) {
      Alert.alert(
        "Joined!",
        `You've joined "${event.title}". Upload 5 photos to unlock the gallery.`,
      );
      doSearch();
    } else {
      Alert.alert("Error", r.data?.detail ?? "Could not join event");
    }
  }

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={FONT_SIZES.icon}
            color={COLORS.placeholder}
          />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search events…"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={doSearch}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable
              onPress={() => {
                setQ("");
                setResults([]);
                setSearched(false);
              }}
            >
              <Ionicons
                name="close-circle"
                size={FONT_SIZES.icon}
                color={COLORS.placeholder}
              />
            </Pressable>
          )}
        </View>
        <Button
          title={loading ? "Searching..." : "Search"}
          onPress={doSearch}
          variant="primary"
          size="sm"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTxt}>
                No events found. Try a different search.
              </Text>
            </View>
          ) : !searched ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>
                Search for events by name or tap Search to browse all.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/events/${item.id}`)}
          >
            <Image
              source={{
                uri: `https://picsum.photos/seed/${item.id.slice(0, 8)}/120/120`,
              }}
              style={styles.cardImg}
            />
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.visibility === "private" && (
                  <View style={styles.privatePill}>
                    <Ionicons
                      name="lock-closed"
                      size={FONT_SIZES.label}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.privateTxt}>Private</Text>
                  </View>
                )}
              </View>
              {item.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={{ marginTop: SPACING.xs }}>
                <Text style={styles.metaRow}>
                  👥 5 · 📷 5{" "}
                  {item.mutual_friends > 0 && (
                    <Text style={styles.socialBadge}>
                      {" "}• 🔥 {item.mutual_friends} friend
                      {item.mutual_friends > 1 ? "s" : ""}
                    </Text>
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              {item.is_member ? (
                <View style={styles.joinedPill}>
                  <Text style={styles.joinedTxt}>Joined ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => joinEvent(item)}
                  disabled={joiningId === item.id}
                  activeOpacity={0.8}
                >
                  {joiningId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.surface} />
                  ) : (
                    <Text style={styles.joinBtnTxt}>Join</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  searchRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 44,
    backgroundColor: COLORS.inputBg,
    gap: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },

  list: { padding: SPACING.md, gap: SPACING.sm },
  empty: { alignItems: "center", paddingTop: 48, gap: SPACING.sm },
  emptyIcon: { fontSize: FONT_SIZES.heroTitle },
  emptyTxt: {
    fontSize: FONT_SIZES.body,
    color: COLORS.placeholder,
    textAlign: "center",
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    flexDirection: "row",
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  cardImg: { width: 60, height: 60, borderRadius: 10 },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  cardTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  cardDesc: {
    fontSize: FONT_SIZES.cardMeta,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  cardMeta: {
    fontSize: FONT_SIZES.label,
    color: COLORS.placeholder,
    marginTop: SPACING.xs,
  },
  cardAction: { alignItems: "flex-end" },

  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
  },
  privateTxt: { fontSize: FONT_SIZES.label, color: COLORS.textSecondary },

  joinBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs * 2,
  },
  joinBtnTxt: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: FONT_SIZES.body,
  },
  joinedPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 2,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  joinedTxt: {
    color: COLORS.successText,
    fontWeight: "700",
    fontSize: FONT_SIZES.label,
  },
  metaRow: {
    fontSize: 13,
    color: "#6B7280",
    paddingBottom: SPACING.xs,
  },

  socialBadge: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
