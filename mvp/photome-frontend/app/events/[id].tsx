import React, { useContext, useEffect, useState } from "react";
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
  FlatList,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import AuthImage from "../../AuthImage";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  faces_detected?: number;
  tags?: Array<{ username: string; confidence?: number }>;
  width?: number;
  height?: number;
  locked?: boolean;
}

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  member_count: number;
  is_member: boolean;
  has_access: boolean;
  upload_threshold: number;
  status: string;
  visibility: string;
}

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

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useContext(AuthContext);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    if (token && id) load();
  }, [token, id]);

  async function load() {
    setLoading(true);
    const [evR, phR] = await Promise.all([
      apiFetch("GET", `/events/${id}`, token),
      apiFetch("GET", `/events/${id}/photos/`, token),
    ]);
    if (evR.ok) setEvent(evR.data);
    if (phR.ok) setPhotos(phR.data ?? []);
    setLoading(false);
  }

  async function uploadFiles(files?: File[], uris?: string[]) {
    if (!token || !id) return;
    setUploading(true);
    const total = files?.length ?? uris?.length ?? 0;
    let done = 0;

    const uploadOne = async (form: FormData) => {
      done++;
      setUploadProgress(`Uploading ${done}/${total}…`);
      const r = await apiFetch(
        "POST",
        `/events/${id}/photos/`,
        token,
        form,
        true,
      );
      if (!r.ok)
        Alert.alert("Upload failed", r.data?.detail ?? "Unknown error");
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
        // @ts-ignore
        form.append("file", {
          uri,
          name: filename,
          type: mime[ext] ?? "image/jpeg",
        });
        await uploadOne(form);
      }
    }
    setUploading(false);
    setUploadProgress("");
    load();
  }

  async function pickAndUpload() {
    if (Platform.OS === "web") {
      const collected: File[] = [];
      triggerWebPicker((f) => {
        collected.push(f);
        // upload immediately when first file lands
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
      uploadFiles(
        undefined,
        result.assets.map((a) => a.uri),
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1677ff" size="large" />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTxt}>Event not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
          headerStyle: { backgroundColor: "#1677ff" },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Cover */}
        <View style={styles.cover}>
          <AuthImage
            uri={photos[0]?.thumbnail_url ?? photos[0]?.url ?? null}
            token={token ?? ""}
            style={{ width: "100%", height: 200 } as any}
            resizeMode="cover"
          />
          {!photos[0] && (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="images-outline" size={40} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.description ? (
            <Text style={styles.eventDesc}>{event.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={14} color="#6b7280" />
              <Text style={styles.metaTxt}>{event.member_count} members</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="images-outline" size={14} color="#6b7280" />
              <Text style={styles.metaTxt}>{event.photo_count} photos</Text>
            </View>
            <View
              style={[
                styles.metaPill,
                { backgroundColor: event.has_access ? "#F0FDF4" : "#FFF7ED" },
              ]}
            >
              <Ionicons
                name={
                  event.has_access ? "lock-open-outline" : "lock-closed-outline"
                }
                size={14}
                color={event.has_access ? "#16a34a" : "#ea580c"}
              />
              <Text
                style={[
                  styles.metaTxt,
                  { color: event.has_access ? "#16a34a" : "#ea580c" },
                ]}
              >
                {event.has_access
                  ? "Unlocked"
                  : `Upload ${event.upload_threshold} to unlock`}
              </Text>
            </View>
          </View>
        </View>

        {/* Upload button */}
        {event.is_member && event.status === "active" && (
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
            onPress={pickAndUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadBtnTxt}>{uploadProgress}</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadBtnTxt}>Upload Photos</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Gallery header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeTxt}>{event.photo_count}</Text>
          </View>
          {photos.length >= 2 && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push(`/create/${id}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles-outline" size={14} color="#fff" />
              <Text style={styles.createBtnTxt}>Create</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grid */}
        {photos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTxt}>
              {event.is_member
                ? "No photos yet — be the first to upload!"
                : "Join this event to see photos."}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((p) =>
              p.locked ? (
                <View key={p.id} style={[styles.thumb, styles.thumbLocked]}>
                  <Ionicons name="lock-closed" size={22} color="#9ca3af" />
                </View>
              ) : (
                <TouchableOpacity
                  key={p.id}
                  style={styles.thumb}
                  onPress={() => setLightbox(p)}
                  activeOpacity={0.85}
                >
                  <AuthImage
                    uri={p.thumbnail_url ?? p.url}
                    token={token ?? ""}
                    style={{ width: "100%", height: "100%" } as any}
                    resizeMode="cover"
                  />
                  {(p.tags?.length ?? 0) > 0 && (
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchTxt}>
                        {p.tags!.length} match
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ),
            )}
          </View>
        )}
      </ScrollView>

      {/* Lightbox */}
      {lightbox && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setLightbox(null)}
        >
          <View style={styles.lbBg}>
            <TouchableOpacity
              style={styles.lbClose}
              onPress={() => setLightbox(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <AuthImage
              uri={lightbox.url}
              token={token ?? ""}
              style={{ width: "92%", height: "75%" } as any}
              resizeMode="contain"
            />
            <View style={styles.lbMeta}>
              <Text style={styles.lbFilename}>
                {lightbox.original_filename ?? "Photo"}
              </Text>
              {(lightbox.tags?.length ?? 0) > 0 && (
                <View style={styles.lbTags}>
                  {lightbox.tags!.map((t, i) => (
                    <View key={i} style={styles.lbTag}>
                      <Text style={styles.lbTagTxt}>
                        @{t.username}
                        {t.confidence
                          ? ` ${Math.round(t.confidence * 100)}%`
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
  screen: { flex: 1, backgroundColor: "#f6f6f6" },
  content: { paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errTxt: { fontSize: 16, color: "#6b7280" },

  cover: { width: "100%", height: 200, backgroundColor: "#E5E7EB" },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  eventDesc: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaTxt: { fontSize: 12, fontWeight: "600", color: "#6b7280" },

  uploadBtn: {
    marginHorizontal: 14,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5E35B1",
    borderRadius: 12,
    paddingVertical: 13,
  },
  uploadBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  createBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#5E35B1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  createBtnTxt: { fontSize: 12, fontWeight: "800", color: "#fff" },
  sectionBadge: {
    backgroundColor: "#EDE7F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeTxt: { fontSize: 12, fontWeight: "800", color: "#5E35B1" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    gap: 6,
  },
  thumb: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  thumbLocked: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  matchBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#5E35B1",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  matchTxt: { fontSize: 9, color: "#fff", fontWeight: "800" },

  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyTxt: { fontSize: 14, color: "#9ca3af", textAlign: "center" },

  lbBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  lbClose: { position: "absolute", top: 52, right: 20, padding: 8, zIndex: 10 },
  lbMeta: {
    marginTop: 14,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  lbFilename: { fontSize: 12, color: "#9ca3af" },
  lbTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  lbTag: {
    backgroundColor: "#EDE7F6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lbTagTxt: { fontSize: 11, fontWeight: "700", color: "#5E35B1" },
});
