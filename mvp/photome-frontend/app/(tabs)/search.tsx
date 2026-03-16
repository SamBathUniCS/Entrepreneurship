import React, { useContext, useState, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, Image,
  Pressable, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
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
    const path = q.trim() ? `/events/?q=${encodeURIComponent(q.trim())}` : "/events/";
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
      Alert.alert("Joined!", `You've joined "${event.title}". Upload ${5} photos to unlock the gallery.`);
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
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
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
            <Pressable onPress={() => { setQ(""); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch} activeOpacity={0.8}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnTxt}>Search</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTxt}>No events found. Try a different search.</Text>
            </View>
          ) : !searched ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>Search for events by name or tap Search to browse all.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/events/${item.id}`)}
          >
            <Image
              source={{ uri: `https://picsum.photos/seed/${item.id.slice(0, 8)}/120/120` }}
              style={styles.cardImg}
            />
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                {item.visibility === "private" && (
                  <View style={styles.privatePill}>
                    <Ionicons name="lock-closed" size={10} color="#6b7280" />
                    <Text style={styles.privateTxt}>Private</Text>
                  </View>
                )}
              </View>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardMeta}>👥 {item.member_count} · 📷 {item.photo_count}</Text>
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
                  {joiningId === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.joinBtnTxt}>Join</Text>}
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
  screen: { flex: 1, backgroundColor: "#f6f6f6" },

  searchRow: {
    flexDirection: "row", gap: 10, padding: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 12, height: 44, backgroundColor: "#f9fafb", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  searchBtn: {
    backgroundColor: "#1677ff", borderRadius: 12,
    paddingHorizontal: 16, height: 44,
    alignItems: "center", justifyContent: "center",
  },
  searchBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  list: { padding: 14, gap: 10 },
  empty: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 14, color: "#9ca3af", textAlign: "center" },

  card: {
    backgroundColor: "#fff", borderRadius: 14,
    flexDirection: "row", gap: 12, padding: 12,
    borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center",
  },
  cardImg: { width: 60, height: 60, borderRadius: 10 },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  cardDesc:  { fontSize: 12, color: "#6b7280", marginTop: 3 },
  cardMeta:  { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  cardAction: { alignItems: "flex-end" },

  privatePill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#F3F4F6", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  privateTxt: { fontSize: 10, color: "#6b7280" },

  joinBtn: {
    backgroundColor: "#1677ff", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  joinBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  joinedPill: {
    backgroundColor: "#F0FDF4", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#BBF7D0",
  },
  joinedTxt: { color: "#16a34a", fontWeight: "700", fontSize: 12 },
});
