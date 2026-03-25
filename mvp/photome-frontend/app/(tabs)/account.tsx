import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "../components/button";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import AuthImage from "../../AuthImage";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

function triggerWebPicker(onPick: (files: File[]) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.files) return;
    onPick(Array.from(target.files));
  };
  input.click();
}

interface EventItem {
  id: string;
  title: string;
  status: string;
}

interface Friend {
  id: string;
  username: string;
  friendship_id: string;
}

interface Photo {
  id: string;
  event_id?: string;
  uploader_id?: string;
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
    user?.face_recognition_enabled ?? true
  );
  const [autoTag, setAutoTag] = useState(user?.allow_auto_tagging ?? true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [pendingUris, setPendingUris] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [showEventPicker, setShowEventPicker] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const loadFriends = useCallback(async () => {
    setLF(true);
    const r = await apiFetch("GET", "/friends/", token);
    if (r.ok) setFriends(r.data ?? []);
    setLF(false);
  }, [token]);

  const loadMyPhotos = useCallback(async () => {
    setLP(true);
    const phR = await apiFetch("GET", "/users/me/uploads", token);
    if (phR.ok) setUploads((phR.data ?? []).slice(0, 7));
    setLP(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadFriends();
    loadMyPhotos();
  }, [token, loadFriends, loadMyPhotos]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadFriends();
      loadMyPhotos();
    }, [token, loadFriends, loadMyPhotos])
  );

  useEffect(() => {
    if (user) {
      setFaceEnabled(user.face_recognition_enabled ?? true);
      setAutoTag(user.allow_auto_tagging ?? true);
    }
  }, [user]);

  const loadJoinedEvents = useCallback(async () => {
    setLoadingEvents(true);
    const r = await apiFetch("GET", "/events/?my_events=true", token);
    if (r.ok) setJoinedEvents(r.data ?? []);
    setLoadingEvents(false);
  }, [token]);

  async function pickImages() {
    if (Platform.OS === "web") {
      triggerWebPicker(async (files) => {
        if (files.length === 0) return;
        setPendingFiles(files);
        await loadJoinedEvents();
        setShowEventPicker(true);
      });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPendingUris(result.assets.map((a) => a.uri));
      await loadJoinedEvents();
      setShowEventPicker(true);
    }
  }

  async function uploadToEvent(eventId: string) {
    setShowEventPicker(false);
    if (!token) return;

    setUploading(true);

    const isWeb = Platform.OS === "web";
    const total = isWeb ? pendingFiles.length : pendingUris.length;
    let done = 0;

    if (isWeb) {
      for (const file of pendingFiles) {
        done++;
        setUploadProgress(`Uploading ${done}/${total}...`);
        const form = new FormData();
        form.append("file", file, file.name);
        await apiFetch("POST", `/events/${eventId}/photos/`, token, form, true);
      }
    } else {
      for (const uri of pendingUris) {
        done++;
        setUploadProgress(`Uploading ${done}/${total}...`);
        const form = new FormData();
        const filename = uri.split("/").pop() ?? "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
        const mime: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          heic: "image/heic",
        };

        // @ts-ignore React Native FormData file object
        form.append("file", {
          uri,
          name: filename,
          type: mime[ext] ?? "image/jpeg",
        });

        await apiFetch("POST", `/events/${eventId}/photos/`, token, form, true);
      }
    }

    setUploading(false);
    setUploadProgress("");
    setPendingUris([]);
    setPendingFiles([]);

    await loadMyPhotos();
    await refreshUser();
  }

  async function savePrivacyToggle(
    field: "face_recognition_enabled" | "allow_auto_tagging",
    value: boolean
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

  const activeEvents = joinedEvents.filter((e) => e.status === "active");
  const pendingCount =
    Platform.OS === "web" ? pendingFiles.length : pendingUris.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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

        <TouchableOpacity
          style={styles.planRow}
          onPress={() => router.push("../subPlans")}
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

        <TouchableOpacity
          style={styles.planRow}
          onPress={() => router.push("../faceSetup")}
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

        <Text
          style={styles.sectionHeader}
          onPress={() => router.push("../myUploads")}
        >
          Uploaded Pictures ›
        </Text>

        {uploading && (
          <Text style={styles.uploadProgressTxt}>{uploadProgress}</Text>
        )}

        {loadingPhotos ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={{ marginVertical: 10 }}
          />
        ) : (
          <View style={styles.grid}>
            {uploads.slice(0, 7).map((p) => (
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

            <TouchableOpacity
              key="add-photo"
              style={[styles.tile, styles.addTile]}
              onPress={pickImages}
              disabled={uploading}
              activeOpacity={0.75}
            >
              {uploading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Image
                  source={require("../../assets/images/Plus.png")}
                  style={styles.addIcon}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        )}

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

        <Modal
          visible={showEventPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowEventPicker(false);
            setPendingUris([]);
            setPendingFiles([]);
          }}
        >
          <SafeAreaView style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Upload to Event</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEventPicker(false);
                  setPendingUris([]);
                  setPendingFiles([]);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pickerSub}>
              Select an event to upload your {pendingCount} photo
              {pendingCount !== 1 ? "s" : ""} to
            </Text>

            {loadingEvents ? (
              <ActivityIndicator
                color={COLORS.primary}
                style={{ marginTop: SPACING.xl }}
              />
            ) : activeEvents.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.emptyTxt,
                    { textAlign: "center", marginTop: SPACING.sm },
                  ]}
                >
                  No active events found. Please join or create an event first.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {activeEvents.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.pickerEventRow}
                    onPress={() => uploadToEvent(e.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pickerEventTitle}>{e.title}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

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
  fullName: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.md,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
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
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },

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
  planSub: {
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
  },
  planPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: SPACING.xs,
  },
  planPillTxt: {
    fontSize: FONT_SIZES.label,
    fontWeight: "800",
  },

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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  tile: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.bgAlt,
  },
  tileImg: {
    width: "100%",
    height: "100%",
  },

  emptyTxt: {
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
  },

  addTile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  addIcon: {
    width: 38,
    height: 38,
  },
  uploadProgressTxt: {
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },

  pickerSheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  pickerSub: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  pickerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  pickerEventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  pickerEventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerEventTitle: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

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