import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Button } from "../components/button";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import AuthImage from "../../AuthImage";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

interface Friend {
  id: string;
  username: string;
  friendship_id: string;
}
interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
}

export default function Account() {
  const { token, user, refreshUser, logout } = useContext(AuthContext);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [uploads, setUploads] = useState<Photo[]>([]);
  const [loadingFriends, setLF] = useState(true);
  const [loadingPhotos, setLP] = useState(true);

  const [faceEnabled, setFaceEnabled] = useState(
    user?.face_recognition_enabled ?? true,
  );
  const [autoTag, setAutoTag] = useState(user?.allow_auto_tagging ?? true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadFriends();
    loadMyPhotos();
  }, [token]);

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
    const evR = await apiFetch("GET", "/events/?my_events=true", token);
    if (evR.ok && evR.data?.length > 0) {
      const eventId = evR.data[0].id;
      const phR = await apiFetch("GET", `/events/${eventId}/photos/`, token);
      if (phR.ok)
        setUploads(
          (phR.data ?? []).filter((p: Photo) => !("locked" in p)).slice(0, 7),
        );
    }
    setLP(false);
  }

  async function savePrivacyToggle(
    field: "face_recognition_enabled" | "allow_auto_tagging",
    value: boolean,
  ) {
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

  const tierColor =
    user?.tier === "pro"
      ? COLORS.primary
      : user?.tier === "business"
        ? COLORS.accent
        : COLORS.textSecondary;
  const tierLabel = user?.tier
    ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1)
    : "Basic";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + username */}
        <View style={styles.profileWrap}>
          <View style={styles.avatarRing}>
            {user?.selfie_url ? (
              <AuthImage
                uri={user.selfie_url}
                token={token ?? ""}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="person-outline"
                size={48}
                color={COLORS.primary}
              />
            )}
          </View>
          {user && (
            <>
              <Text style={styles.username}>@{user.username}</Text>
              {user.full_name ? (
                <Text style={styles.fullName}>{user.full_name}</Text>
              ) : null}
            </>
          )}

          <Button
            title="Create an Event"
            onPress={() => router.push("/(tabs)/events")}
            variant="primary"
            size="md"
          />
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
              <Text style={[styles.statNum, { color: tierColor }]}>
                {tierLabel}
              </Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
          </View>
        )}

        {/* Plan row */}
        <TouchableOpacity
          style={styles.planRow}
          onPress={() => router.push("/subPlans")}
          activeOpacity={0.85}
        >
          <Text style={styles.planTitle}>Subscription Plan</Text>
          <View style={[styles.planPill, { borderColor: tierColor }]}>
            <Text style={[styles.planPillTxt, { color: tierColor }]}>
              {tierLabel}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {/* Face setup row */}
        <TouchableOpacity
          style={styles.planRow}
          onPress={() => router.push("/face-setup")}
          activeOpacity={0.85}
        >
          <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.planTitle}>Face Setup</Text>
            <Text style={styles.planSub}>
              {user?.has_face_embedding
                ? "✓ Face registered"
                : "Not yet registered"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {/* Friends */}
        <Text
          style={styles.sectionHeader}
          onPress={() => router.push("/friends")}
        >
          Friends ›
        </Text>
        {loadingFriends ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={{ marginVertical: 10 }}
          />
        ) : (
          <View style={styles.friendsRow}>
            {friends.slice(0, 5).map((f) => (
              <View key={f.id} style={styles.friendBubble}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </View>
            ))}
            {friends.length === 0 && (
              <Text style={styles.emptyTxt}>
                No friends yet. Search to add some!
              </Text>
            )}
            {friends.length > 5 && (
              <View
                style={[
                  styles.friendBubble,
                  { backgroundColor: COLORS.border },
                ]}
              >
                <Text style={{ fontWeight: "800", fontSize: FONT_SIZES.label }}>
                  +{friends.length - 5}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent uploads */}
        <Text style={styles.sectionHeader}>Uploaded Pictures</Text>
        {loadingPhotos ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={{ marginVertical: 10 }}
          />
        ) : (
          <View style={styles.grid}>
            {uploads.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.tile}>
                <AuthImage
                  uri={p.thumbnail_url ?? p.url}
                  token={token ?? ""}
                  style={styles.tileImg}
                  resizeMode="cover"
                />
              </View>
            ))}
            {uploads.length === 0 && (
              <Text style={styles.emptyTxt}>
                Upload photos to events to see them here.
              </Text>
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

        <Button
          title="Log Out"
          icon={
            <Ionicons
              name="log-out-outline"
              size={FONT_SIZES.icon}
              color="#fff"
            />
          }
          variant="danger"
          onPress={handleLogout}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: SPACING.md, paddingBottom: 60 },

  profileWrap: {
    alignItems: "center",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.bgAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 92, height: 92 },
  username: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  fullName: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary },

  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.md,
    overflow: "hidden",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: SPACING.sm },
  statNum: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  planTitle: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  planSub: { fontSize: FONT_SIZES.label, color: COLORS.textSecondary },
  planPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  planPillTxt: { fontSize: FONT_SIZES.label, fontWeight: "800" },

  sectionHeader: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },

  friendsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  friendBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  tile: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.bgAlt,
  },
  tileImg: { width: "100%", height: "100%" },

  emptyTxt: { fontSize: FONT_SIZES.label, color: COLORS.textSecondary },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  toggleLabel: {
    flex: 1,
    paddingRight: SPACING.sm,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
});
