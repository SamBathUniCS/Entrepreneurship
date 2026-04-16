import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { AuthContext } from "../../context/_AuthContext";
import { apiFetch } from "../../../api";
import AuthImage from "../../../AuthImage";
import { COLORS, FONT_SIZES, SPACING } from "../../theme";

interface PhotoTag {
  username: string;
  confidence?: number;
}

interface Photo {
  id: string;
  event_id?: string;
  uploader_id?: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  tags?: PhotoTag[];
  locked?: boolean;
}

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  creator_id?: string;
  photo_count: number;
  member_count: number;
  is_member: boolean;
  has_access: boolean;
  upload_threshold: number;
  status: string;
  visibility: string;
}

const UPLOAD_ICON = require("../../../assets/images/upload_icon.png") as ImageSourcePropType;

function triggerWebPicker(onPick: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = (e: any) => {
    Array.from(e.target.files as FileList).forEach((f: File) => onPick(f));
  };
  input.click();
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useContext(AuthContext);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const [eventResponse, photosResponse] = await Promise.all([
      apiFetch("GET", `/events/${id}`, token),
      apiFetch("GET", `/events/${id}/photos/`, token),
    ]);

    if (eventResponse.ok) setEvent(eventResponse.data);
    if (photosResponse.ok) setPhotos(photosResponse.data ?? []);

    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    if (token && id) load();
  }, [token, id, load]);

  async function uploadFiles(files?: File[], uris?: string[]) {
    if (!token || !id) return;

    setUploading(true);
    const total = files?.length ?? uris?.length ?? 0;
    let done = 0;

    const uploadOne = async (form: FormData) => {
      done += 1;
      setUploadProgress(`Uploading ${done}/${total}...`);
      const response = await apiFetch(
        "POST",
        `/events/${id}/photos/`,
        token,
        form,
        true,
      );
      if (!response.ok) {
        Alert.alert("Upload failed", response.data?.detail ?? "Unknown error");
      }
    };

    if (Platform.OS === "web" && files) {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file, file.name);
        await uploadOne(form);
      }
    } else if (uris) {
      for (const uri of uris) {
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
        form.append("file", { uri, name: filename, type: mime[ext] ?? "image/jpeg" });
        await uploadOne(form);
      }
    }

    setUploading(false);
    setUploadProgress("");
    await load();
  }

  async function pickAndUpload() {
    if (Platform.OS === "web") {
      const collected: File[] = [];
      triggerWebPicker((file) => {
        collected.push(file);
        if (collected.length === 1) uploadFiles(collected);
      });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadFiles(
        undefined,
        result.assets.map((asset) => asset.uri),
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Event not found.</Text>
      </View>
    );
  }

  const isBasic = (user?.tier ?? "basic") === "basic";
  const locked = isBasic && !event.has_access;

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.surface,
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          {locked && (
            <Text style={styles.lockText}>
              Upload {event.upload_threshold} Photos To Gain Access
            </Text>
          )}

          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}

          {uploading && (
            <View style={styles.progressPill}>
              <ActivityIndicator size="small" color={COLORS.surface} />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          <View style={styles.grid}>
            {photos.length > 0 ? (
              photos.map((photo) => {
                const isLockedTile = isBasic && (locked || !!photo.locked);
                const imageUri = photo.thumbnail_url ?? photo.url;
                return (
                  <TouchableOpacity
                    key={photo.id}
                    activeOpacity={0.85}
                    disabled={isLockedTile}
                    style={styles.gridTile}
                    onPress={() => setLightbox(photo)}
                  >
                    {imageUri ? (
                      <AuthImage
                        uri={imageUri}
                        token={token ?? ""}
                        style={styles.gridImage}
                        resizeMode="cover"
                        blurRadius={isLockedTile ? 18 : 0}
                      />
                    ) : (
                      <View style={styles.lockedPlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={22}
                          color={COLORS.textMuted}
                        />
                      </View>
                    )}

                    {isLockedTile && <View style={styles.gridBlurOverlay} />}

                    {(photo.tags?.length ?? 0) > 0 && !isLockedTile && (
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>
                          {photo.tags!.length} match
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.center}>
                <Text style={styles.errorText}>No photos uploaded yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.fabGroup}>
          {photos.length >= 2 && (
            <TouchableOpacity
              style={styles.fabCreate}
              onPress={() => router.push(`/create/${id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={24} color={COLORS.surface} />
            </TouchableOpacity>
          )}
          {event.status === "active" && (
            <TouchableOpacity
              style={[styles.fabUpload, uploading && styles.fabDisabled]}
              onPress={pickAndUpload}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Image source={UPLOAD_ICON} style={styles.uploadIcon} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {lightbox && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setLightbox(null)}
        >
          <View style={styles.lightboxBg}>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setLightbox(null)}
            >
              <Ionicons name="close" size={28} color={COLORS.surface} />
            </TouchableOpacity>
            <AuthImage
              uri={lightbox.url}
              token={token ?? ""}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
            <View style={styles.lightboxMeta}>
              <Text style={styles.lightboxFilename}>
                {lightbox.original_filename ?? "Photo"}
              </Text>
              {(lightbox.tags?.length ?? 0) > 0 && (
                <View style={styles.tagRow}>
                  {lightbox.tags!.map((tag, index) => (
                    <View key={`${tag.username}-${index}`} style={styles.tagPill}>
                      <Text style={styles.tagText}>
                        @{tag.username}
                        {tag.confidence
                          ? ` ${Math.round(tag.confidence * 100)}%`
                          : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 144 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  errorText: { fontSize: FONT_SIZES.subtitle, color: COLORS.textSecondary },
  lockText: { textAlign: "center", color: COLORS.error, fontSize: FONT_SIZES.subtitle, fontWeight: "800", marginTop: SPACING.xl, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xl },
  description: { marginHorizontal: SPACING.xl, marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONT_SIZES.body, lineHeight: 20, textAlign: "center" },
  progressPill: { marginTop: SPACING.md, marginHorizontal: SPACING.xl, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.secondary, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  progressText: { color: COLORS.surface, fontSize: FONT_SIZES.body, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, gap: SPACING.md },
  gridTile: { width: "48%", height: 150, borderRadius: 16, overflow: "hidden", backgroundColor: COLORS.border },
  gridImage: { width: "100%", height: "100%" },
  lockedPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.inputBg },
  gridBlurOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.22)" },
  matchBadge: { position: "absolute", right: SPACING.xs, bottom: SPACING.xs, backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  matchText: { color: COLORS.surface, fontSize: FONT_SIZES.tiny, fontWeight: "800" },
  fabGroup: { position: "absolute", right: SPACING.xl, bottom: 96, alignItems: "center", gap: SPACING.md, zIndex: 20 },
  fabCreate: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#5E35B1", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  fabUpload: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.secondary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabDisabled: { opacity: 0.65 },
  uploadIcon: { width: 40, height: 40, resizeMode: "contain" },
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.lg },
  lightboxClose: { position: "absolute", top: 64, right: 20, zIndex: 10 },
  lightboxImage: { width: "100%", height: "62%" },
  lightboxMeta: { width: "100%", marginTop: SPACING.lg },
  lightboxFilename: { color: COLORS.surface, fontSize: FONT_SIZES.subtitle, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md },
  tagPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  tagText: { color: COLORS.surface, fontSize: FONT_SIZES.body, fontWeight: "600" },
});
