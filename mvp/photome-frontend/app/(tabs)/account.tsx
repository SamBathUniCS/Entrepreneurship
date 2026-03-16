import React, { useContext, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Switch, SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import AuthImage from "../../AuthImage";

interface Friend { id: string; username: string; friendship_id: string; }
interface Photo  { id: string; url: string; thumbnail_url: string | null; }

export default function Account() {
  const { token, user, refreshUser, logout } = useContext(AuthContext);

  const [friends, setFriends]       = useState<Friend[]>([]);
  const [uploads, setUploads]       = useState<Photo[]>([]);
  const [loadingFriends, setLF]     = useState(true);
  const [loadingPhotos, setLP]      = useState(true);

  // Privacy toggles — initialised from user object
  const [faceEnabled, setFaceEnabled]   = useState(user?.face_recognition_enabled ?? true);
  const [autoTag, setAutoTag]           = useState(user?.allow_auto_tagging ?? true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadFriends();
    loadMyPhotos();
  }, [token]);

  // Keep toggles in sync if user refreshes
  useEffect(() => {
    if (user) {
      setFaceEnabled(user.face_recognition_enabled ?? true);
      setAutoTag(user.allow_auto_tagging ?? true);
    }
  }, [user]);

  async function loadFriends() {
    setLF(true);
    const r = await apiFetch("GET", "/friends/", token);
    if (r.ok) setFriends(r.data ?? []);
    setLF(false);
  }

  async function loadMyPhotos() {
    setLP(true);
    // Get all events user is in, then fetch photos from the first one
    const evR = await apiFetch("GET", "/events/?my_events=true", token);
    if (evR.ok && evR.data?.length > 0) {
      const eventId = evR.data[0].id;
      const phR = await apiFetch("GET", `/events/${eventId}/photos/`, token);
      if (phR.ok) {
        setUploads((phR.data ?? []).filter((p: Photo) => !("locked" in p)).slice(0, 7));
      }
    }
    setLP(false);
  }

  async function savePrivacyToggle(field: "face_recognition_enabled" | "allow_auto_tagging", value: boolean) {
    if (!token) return;
    setSavingPrivacy(true);
    const r = await apiFetch("PATCH", "/users/me", token, { [field]: value });
    if (r.ok) await refreshUser();
    else Alert.alert("Error", "Could not save setting");
    setSavingPrivacy(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const tierColor = user?.tier === "pro" ? "#5E35B1" : user?.tier === "business" ? "#ea580c" : "#6b7280";
  const tierLabel = user?.tier ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1) : "Basic";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + username */}
        <View style={styles.profileWrap}>
          <View style={styles.avatarRing}>
            {user?.selfie_url ? (
              <AuthImage uri={user.selfie_url} token={token ?? ""} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Ionicons name="person-outline" size={48} color="#5E35B1" />
            )}
          </View>
          {user && (
            <>
              <Text style={styles.username}>@{user.username}</Text>
              {user.full_name ? <Text style={styles.fullName}>{user.full_name}</Text> : null}
            </>
          )}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/events")}
          >
            <Text style={styles.primaryBtnText}>Create an Event</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {user && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{user.total_uploads}</Text>
              <Text style={styles.statLabel}>Uploads</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{user.upload_streak}</Text>
              <Text style={styles.statLabel}>Streak 🔥</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: tierColor }]}>{tierLabel}</Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
          </View>
        )}

        {/* Plan row */}
        <TouchableOpacity style={styles.planRow} onPress={() => router.push("/subPlans")} activeOpacity={0.85}>
          <Text style={styles.planTitle}>Subscription Plan</Text>
          <View style={[styles.planPill, { borderColor: tierColor }]}>
            <Text style={[styles.planPillTxt, { color: tierColor }]}>{tierLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Face setup row */}
        <TouchableOpacity style={styles.planRow} onPress={() => router.push("/face-setup")} activeOpacity={0.85}>
          <Ionicons name="scan-outline" size={20} color="#5E35B1" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.planTitle}>Face Setup</Text>
            <Text style={styles.planSub}>
              {user?.has_face_embedding ? "✓ Face registered" : "Not yet registered"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Friends */}
        <Text style={styles.sectionHeader} onPress={() => router.push("/friends")}>
          Friends ›
        </Text>
        {loadingFriends ? (
          <ActivityIndicator color="#5E35B1" style={{ marginVertical: 10 }} />
        ) : (
          <View style={styles.friendsRow}>
            {friends.slice(0, 5).map((f) => (
              <View key={f.id} style={styles.friendBubble}>
                <Ionicons name="person-outline" size={18} color="#5E35B1" />
              </View>
            ))}
            {friends.length === 0 && (
              <Text style={styles.emptyTxt}>No friends yet. Search to add some!</Text>
            )}
            {friends.length > 5 && (
              <View style={[styles.friendBubble, { backgroundColor: "#E5E7EB" }]}>
                <Text style={{ fontWeight: "800", fontSize: 12 }}>+{friends.length - 5}</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent uploads */}
        <Text style={styles.sectionHeader}>Uploaded Pictures</Text>
        {loadingPhotos ? (
          <ActivityIndicator color="#5E35B1" style={{ marginVertical: 10 }} />
        ) : (
          <View style={styles.grid}>
            {uploads.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.tile}>
                <AuthImage uri={p.thumbnail_url ?? p.url} token={token ?? ""} style={styles.tileImg} resizeMode="cover" />
              </View>
            ))}
            {uploads.length === 0 && (
              <Text style={styles.emptyTxt}>Upload photos to events to see them here.</Text>
            )}
          </View>
        )}

        {/* Privacy */}
        <Text style={styles.sectionHeader}>Privacy Controls</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enable Facial Recognition</Text>
          <Switch
            value={faceEnabled}
            onValueChange={async (v) => {
              setFaceEnabled(v);
              await savePrivacyToggle("face_recognition_enabled", v);
            }}
            disabled={savingPrivacy}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Allow Friends to Auto-Tag You</Text>
          <Switch
            value={autoTag}
            onValueChange={async (v) => {
              setAutoTag(v);
              await savePrivacyToggle("allow_auto_tagging", v);
            }}
            disabled={savingPrivacy}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutTxt}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 16, paddingBottom: 60 },

  profileWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 10, gap: 6 },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: "#EDE7F6", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 92, height: 92 },
  username: { fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 4 },
  fullName: { fontSize: 13, color: "#6b7280" },

  primaryBtn: {
    backgroundColor: "#5E35B1", paddingHorizontal: 26, paddingVertical: 10,
    borderRadius: 10, marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  statsRow: {
    flexDirection: "row", backgroundColor: "#fff",
    borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB",
    marginVertical: 14, overflow: "hidden",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statNum: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#E5E7EB" },

  planRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  planTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111827" },
  planSub:   { fontSize: 12, color: "#9ca3af" },
  planPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, marginRight: 8,
  },
  planPillTxt: { fontSize: 12, fontWeight: "800" },

  sectionHeader: { fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 18, marginBottom: 10 },

  friendsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  friendBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EDE7F6", alignItems: "center", justifyContent: "center",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "22%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "#F3F4F6" },
  tileImg: { width: "100%", height: "100%" },

  emptyTxt: { fontSize: 13, color: "#9ca3af" },

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB",
  },
  toggleLabel: { flex: 1, paddingRight: 12, fontSize: 14, color: "#111827", fontWeight: "600" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: "#fecaca",
    backgroundColor: "#fff5f5", justifyContent: "center",
  },
  logoutTxt: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
