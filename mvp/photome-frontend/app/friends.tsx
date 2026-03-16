import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, SafeAreaView, ActivityIndicator,
  Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { AuthContext } from "./context/_AuthContext";
import { apiFetch } from "../api";

type Tab = "friends" | "requests" | "search" | "leaderboard";

interface Friend { id: string; username: string; friendship_id: string; tier: string; total_uploads?: number; }
interface Request { id: string; from_user_id: string; from_username: string; from_email: string; }
interface SearchUser { id: string; username: string; email: string; tier: string; friendship_status: string | null; }

export default function FriendsScreen() {
  const { token } = useContext(AuthContext);
  const [tab, setTab] = useState<Tab>("friends");

  const [friends, setFriends]     = useState<Friend[]>([]);
  const [requests, setRequests]   = useState<Request[]>([]);
  const [searchQ, setSearchQ]     = useState("");
  const [searchRes, setSearchRes] = useState<SearchUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [actionId, setActionId]   = useState<string | null>(null);

  useEffect(() => { if (token) { loadFriends(); loadRequests(); } }, [token]);

  async function loadFriends() {
    const r = await apiFetch("GET", "/friends/", token);
    if (r.ok) setFriends(r.data ?? []);
  }

  async function loadRequests() {
    const r = await apiFetch("GET", "/friends/requests", token);
    if (r.ok) setRequests(r.data ?? []);
  }

  async function doSearch() {
    if (!searchQ.trim() || searchQ.length < 2) return;
    setLoading(true);
    const r = await apiFetch("GET", `/friends/search?q=${encodeURIComponent(searchQ)}`, token);
    setLoading(false);
    if (r.ok) setSearchRes(r.data ?? []);
  }

  async function sendRequest(userId: string, username: string) {
    setActionId(userId);
    const r = await apiFetch("POST", `/friends/request/${userId}`, token);
    setActionId(null);
    if (r.ok) {
      Alert.alert("Request sent", `Friend request sent to @${username}`);
      doSearch();
    } else Alert.alert("Error", r.data?.detail ?? "Failed");
  }

  async function acceptRequest(reqId: string) {
    setActionId(reqId);
    const r = await apiFetch("POST", `/friends/requests/${reqId}/accept`, token);
    setActionId(null);
    if (r.ok) { loadFriends(); loadRequests(); }
    else Alert.alert("Error", r.data?.detail ?? "Failed");
  }

  async function declineRequest(reqId: string) {
    setActionId(reqId);
    const r = await apiFetch("POST", `/friends/requests/${reqId}/decline`, token);
    setActionId(null);
    if (r.ok) loadRequests();
  }

  async function unfriend(friendshipId: string, username: string) {
    Alert.alert("Remove friend", `Remove @${username}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await apiFetch("DELETE", `/friends/${friendshipId}`, token);
          loadFriends();
        },
      },
    ]);
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "friends",     label: "Friends",     icon: "people-outline" },
    { key: "requests",    label: "Requests",    icon: "mail-outline" },
    { key: "search",      label: "Find",        icon: "search-outline" },
    { key: "leaderboard", label: "Leaderboard", icon: "trophy-outline" },
  ];

  return (
    <>
      <Stack.Screen options={{ title: "Friends", headerStyle: { backgroundColor: "#1677ff" }, headerTintColor: "#fff" }} />
      <SafeAreaView style={styles.safe}>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)} activeOpacity={0.8}
            >
              <Ionicons name={t.icon as any} size={18} color={tab === t.key ? "#1677ff" : "#9ca3af"} />
              <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label}</Text>
              {t.key === "requests" && requests.length > 0 && (
                <View style={styles.badge}><Text style={styles.badgeTxt}>{requests.length}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Friends tab ── */}
        {tab === "friends" && (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No friends yet. Use "Find" to add some!</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.avatar}><Ionicons name="person-outline" size={20} color="#5E35B1" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>@{item.username}</Text>
                  <Text style={styles.rowSub}>{item.tier}</Text>
                </View>
                <TouchableOpacity onPress={() => unfriend(item.friendship_id, item.username)} style={styles.removeBtn}>
                  <Text style={styles.removeTxt}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {/* ── Requests tab ── */}
        {tab === "requests" && (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No pending requests.</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.avatar}><Ionicons name="person-outline" size={20} color="#5E35B1" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>@{item.from_username}</Text>
                  <Text style={styles.rowSub}>{item.from_email}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={styles.acceptBtn} activeOpacity={0.8}
                    onPress={() => acceptRequest(item.id)}
                    disabled={actionId === item.id}
                  >
                    {actionId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptTxt}>Accept</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(item.id)}>
                    <Text style={styles.declineTxt}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* ── Search tab ── */}
        {tab === "search" && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#9ca3af" />
                <TextInput
                  value={searchQ} onChangeText={setSearchQ}
                  placeholder="Search by username or email…"
                  style={styles.searchInput} autoCapitalize="none"
                  returnKeyType="search" onSubmitEditing={doSearch}
                />
              </View>
              <TouchableOpacity style={styles.searchBtn} onPress={doSearch} activeOpacity={0.8}>
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnTxt}>Search</Text>}
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchRes}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                searchQ.length > 1
                  ? <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>No results.</Text></View>
                  : <View style={styles.emptyWrap}><Text style={styles.emptyTxt}>Enter at least 2 characters.</Text></View>
              }
              renderItem={({ item }) => {
                const status = item.friendship_status;
                const isFriend = status?.includes("accepted");
                const isPending = status?.includes("pending");
                return (
                  <View style={styles.row}>
                    <View style={styles.avatar}><Ionicons name="person-outline" size={20} color="#5E35B1" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>@{item.username}</Text>
                      <Text style={styles.rowSub}>{item.email}</Text>
                    </View>
                    {isFriend ? (
                      <View style={styles.friendedPill}><Text style={styles.friendedTxt}>Friends ✓</Text></View>
                    ) : isPending ? (
                      <View style={styles.pendingPill}><Text style={styles.pendingTxt}>Pending</Text></View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addBtn} activeOpacity={0.8}
                        onPress={() => sendRequest(item.id, item.username)}
                        disabled={actionId === item.id}
                      >
                        {actionId === item.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.addBtnTxt}>Add</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* ── Leaderboard tab ── */}
        {tab === "leaderboard" && (
          <FlatList
            data={[...friends].sort((a, b) => (b.total_uploads ?? 0) - (a.total_uploads ?? 0))}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={styles.lbHeader}>Friends by Uploads</Text>}
            ListEmptyComponent={<View style={styles.emptyWrap}><Text style={styles.emptyTxt}>Add friends to see the leaderboard!</Text></View>}
            renderItem={({ item, index }) => (
              <View style={[styles.row, index === 0 && styles.rowGold]}>
                <View style={[styles.rankPill, index === 0 && styles.rankPillGold]}>
                  <Text style={[styles.rankTxt, index === 0 && { color: "#fff" }]}>{index + 1}</Text>
                </View>
                <View style={styles.avatar}><Ionicons name="person-outline" size={20} color="#5E35B1" /></View>
                <Text style={[styles.rowName, { flex: 1 }]}>@{item.username}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={styles.rowName}>{item.total_uploads ?? 0}</Text>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 14, gap: 8, paddingBottom: 40 },

  tabBar: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  tabBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 3, position: "relative",
  },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#1677ff" },
  tabTxt: { fontSize: 10, fontWeight: "600", color: "#9ca3af" },
  tabTxtActive: { color: "#1677ff" },
  badge: {
    position: "absolute", top: 6, right: 10,
    backgroundColor: "#f74a6a", borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeTxt: { fontSize: 9, fontWeight: "800", color: "#fff" },

  emptyWrap: { paddingVertical: 40, alignItems: "center" },
  emptyTxt: { fontSize: 14, color: "#9ca3af", textAlign: "center" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  rowGold: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EDE7F6", alignItems: "center", justifyContent: "center",
  },
  rowName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rowSub:  { fontSize: 12, color: "#9ca3af" },

  acceptBtn: {
    backgroundColor: "#1677ff", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  acceptTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  declineBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  declineTxt: { color: "#6b7280", fontWeight: "700", fontSize: 12 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca" },
  removeTxt: { color: "#ef4444", fontSize: 12, fontWeight: "600" },

  addBtn: { backgroundColor: "#5E35B1", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  friendedPill: { backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#BBF7D0" },
  friendedTxt: { color: "#16a34a", fontWeight: "700", fontSize: 12 },
  pendingPill: { backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pendingTxt: { color: "#6b7280", fontWeight: "600", fontSize: 12 },

  searchRow: {
    flexDirection: "row", gap: 10, padding: 14,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 12, height: 42, backgroundColor: "#f9fafb",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  searchBtn: { backgroundColor: "#1677ff", borderRadius: 12, paddingHorizontal: 16, height: 42, alignItems: "center", justifyContent: "center" },
  searchBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  rankPill: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center",
  },
  rankPillGold: { backgroundColor: "#F59E0B" },
  rankTxt: { fontWeight: "900", fontSize: 12, color: "#111827" },
  lbHeader: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },
});
