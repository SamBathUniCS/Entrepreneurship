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
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

import { AuthContext } from "../../context/_AuthContext";
import { apiFetch } from "../../../api";
import AuthImage from "../../../AuthImage";
import { COLORS, FONT_SIZES, SPACING } from "../../theme";
import ShareModal from "../../components/ShareModal";
import { API_BASE_URL } from "../../../config";

interface MutualFriend {
  id: string;
  username: string;
  upload_count: number;
}

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

const AVATAR_COLORS = ["#5E35B1","#1E88E5","#43A047","#FB8C00","#E53935","#00897B","#8E24AA"];
function avatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

async function downloadSinglePhoto(photo: Photo, token: string, eventTitle: string) {
  const fullUrl = photo.url.startsWith("http")
    ? photo.url
    : `${API_BASE_URL.replace("/api/v1", "")}${photo.url}`;
  const filename = photo.original_filename ?? `photo_${photo.id}.jpg`;

  if (Platform.OS === "web") {
    const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { Alert.alert("Download failed"); return; }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
    return;
  }

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Allow photo library access to save photos.");
    return;
  }
  const destUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.downloadAsync(fullUrl, destUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await MediaLibrary.saveToLibraryAsync(destUri);
  Alert.alert("Saved", "Photo saved to your library.");
}

async function bulkDownloadPhotos(
  eventId: string,
  selectedIds: string[],
  token: string,
  eventTitle: string,
) {
  const url = `${API_BASE_URL}/events/${eventId}/photos/bulk-download`;

  if (Platform.OS === "web") {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ photo_ids: selectedIds }),
    });
    if (!res.ok) { Alert.alert("Download failed", "Could not create ZIP."); return; }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `${eventTitle.replace(/[^a-zA-Z0-9 _-]/g, "_")}_photos.zip`;
    a.click();
    URL.revokeObjectURL(objUrl);
    return;
  }

  const safe = eventTitle.replace(/[^a-zA-Z0-9 _-]/g, "_");
  const destUri = `${FileSystem.cacheDirectory}${safe}_photos.zip`;
  const dl = await FileSystem.downloadAsync(url, destUri, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (dl.status !== 200) { Alert.alert("Download failed", "Could not create ZIP."); return; }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dl.uri, { mimeType: "application/zip" });
  } else {
    Alert.alert("Saved", `ZIP saved to: ${dl.uri}`);
  }
}

// ── Inline confirm dialog — works on web + native ─────────────────────────────
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={dlg.overlay}>
        <View style={dlg.box}>
          <Text style={dlg.title}>{title}</Text>
          <Text style={dlg.message}>{message}</Text>
          <View style={dlg.row}>
            <TouchableOpacity style={dlg.cancelBtn} onPress={onCancel}>
              <Text style={dlg.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dlg.confirmBtn} onPress={onConfirm}>
              <Text style={dlg.confirmTxt}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dlg = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 360,
    gap: SPACING.sm,
  },
  title: { fontSize: FONT_SIZES.subtitle, fontWeight: "800", color: COLORS.textPrimary },
  message: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, lineHeight: 20 },
  row: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  cancelTxt: { fontSize: FONT_SIZES.body, fontWeight: "600", color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: "center",
  },
  confirmTxt: { fontSize: FONT_SIZES.body, fontWeight: "700", color: COLORS.surface },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useContext(AuthContext);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);

  // Selection / bulk actions
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Per-photo in-flight state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Inline confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", confirmLabel: "Confirm", onConfirm: () => {} });

  function showConfirm(opts: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) {
    setConfirmState({ visible: true, ...opts });
  }

  function hideConfirm() {
    setConfirmState((s) => ({ ...s, visible: false }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [eventRes, photosRes, mutualsRes] = await Promise.all([
      apiFetch("GET", `/events/${id}`, token),
      apiFetch("GET", `/events/${id}/photos/`, token),
      apiFetch("GET", `/friends/mutual/${id}`, token),
    ]);
    if (eventRes.ok) setEvent(eventRes.data);
    if (photosRes.ok) setPhotos(photosRes.data ?? []);
    if (mutualsRes.ok) setMutualFriends(mutualsRes.data ?? []);
    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    if (token && id) load();
  }, [token, id, load]);

  // ── Upload ────────────────────────────────────────────────────────────────
  async function uploadFiles(files?: File[], uris?: string[]) {
    if (!token || !id) return;
    setUploading(true);
    const total = files?.length ?? uris?.length ?? 0;
    let done = 0;

    const uploadOne = async (form: FormData) => {
      done += 1;
      setUploadProgress(`Uploading ${done}/${total}...`);
      const response = await apiFetch("POST", `/events/${id}/photos/`, token, form, true);
      if (!response.ok) Alert.alert("Upload failed", response.data?.detail ?? "Unknown error");
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
          jpg: "image/jpeg", jpeg: "image/jpeg",
          png: "image/png", webp: "image/webp", heic: "image/heic",
        };
        // @ts-ignore
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
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      await uploadFiles(undefined, result.assets.map((a) => a.uri));
    }
  }

  // ── Delete helpers ────────────────────────────────────────────────────────
  function canDelete(photo: Photo): boolean {
    if (!user || !event) return false;
    return photo.uploader_id === user.id || event.creator_id === user.id;
  }

  async function executeSingleDelete(photo: Photo) {
    const eventId = photo.event_id ?? id ?? "";
    setDeletingIds((prev) => new Set(prev).add(photo.id));
    setLightbox(null);
    await apiFetch("DELETE", `/events/${eventId}/photos/${photo.id}`, token);
    setDeletingIds((prev) => { const n = new Set(prev); n.delete(photo.id); return n; });
    await load();
  }

  function promptSingleDelete(photo: Photo) {
    showConfirm({
      title: "Remove Photo",
      message: "Remove this photo? If your upload count drops below the threshold the event will lock again.",
      confirmLabel: "Remove",
      onConfirm: () => { hideConfirm(); executeSingleDelete(photo); },
    });
  }

  async function executeBulkDelete() {
    if (!id || selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    setDeletingIds(new Set(ids));
    setLightbox(null);
    exitSelectionMode();

    await Promise.all(
      ids.map((photoId) => {
        const photo = photos.find((p) => p.id === photoId);
        const eventId = photo?.event_id ?? id;
        return apiFetch("DELETE", `/events/${eventId}/photos/${photoId}`, token);
      }),
    );

    setDeletingIds(new Set());
    setBulkDeleting(false);
    await load();
  }

  function promptBulkDelete() {
    if (selectedIds.size === 0) return;
    showConfirm({
      title: `Remove ${selectedIds.size} Photo${selectedIds.size > 1 ? "s" : ""}`,
      message: "This will permanently remove the selected photos. This cannot be undone.",
      confirmLabel: "Remove All",
      onConfirm: () => { hideConfirm(); executeBulkDelete(); },
    });
  }

  // ── Download helpers ──────────────────────────────────────────────────────
  async function handleSingleDownload(photo: Photo) {
    if (!token) return;
    setDownloadingId(photo.id);
    try { await downloadSinglePhoto(photo, token, event?.title ?? "photos"); }
    catch { Alert.alert("Error", "Could not download photo."); }
    finally { setDownloadingId(null); }
  }

  async function handleBulkDownload() {
    if (!token || !id || selectedIds.size === 0) return;
    setBulkDownloading(true);
    try { await bulkDownloadPhotos(id, Array.from(selectedIds), token, event?.title ?? "photos"); }
    catch { Alert.alert("Error", "Could not create ZIP."); }
    finally { setBulkDownloading(false); exitSelectionMode(); }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  function toggleSelection(photoId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  const canBulkDelete =
    selectedIds.size > 0 &&
    Array.from(selectedIds).every((pid) => {
      const p = photos.find((ph) => ph.id === pid);
      return p ? canDelete(p) : false;
    });

  // ── Render ────────────────────────────────────────────────────────────────
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
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginRight: 8 }}>
              {!selectionMode && (
                <TouchableOpacity onPress={() => setSelectionMode(true)}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.surface} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowShare(true)}>
                <Ionicons name="share-outline" size={24} color={COLORS.surface} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.screen}>
        {/* ── Selection toolbar ─────────────────────────────────────────── */}
        {selectionMode && (
          <View style={styles.selectionBar}>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.selBarBtn}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              <Text style={styles.selBarTxt}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.selBarCount}>{selectedIds.size} selected</Text>

            <View style={styles.selBarActions}>
              {/* Bulk delete — only shown when all selected photos are deletable */}
              {canBulkDelete && (
                <TouchableOpacity
                  onPress={promptBulkDelete}
                  disabled={bulkDeleting}
                  style={[styles.selBarIconBtn, styles.selBarDeleteBtn, bulkDeleting && styles.selBarDisabled]}
                >
                  {bulkDeleting ? (
                    <ActivityIndicator size="small" color={COLORS.surface} />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={COLORS.surface} />
                  )}
                </TouchableOpacity>
              )}

              {/* Bulk download */}
              <TouchableOpacity
                onPress={handleBulkDownload}
                disabled={selectedIds.size === 0 || bulkDownloading}
                style={[
                  styles.selBarIconBtn,
                  styles.selBarDownloadBtn,
                  (selectedIds.size === 0 || bulkDownloading) && styles.selBarDisabled,
                ]}
              >
                {bulkDownloading ? (
                  <ActivityIndicator size="small" color={COLORS.surface} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={COLORS.surface} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content}>
          {locked && (
            <Text style={styles.lockText}>
              Upload {event.upload_threshold} Photos To Gain Access
            </Text>
          )}

          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}

          {mutualFriends.length > 0 && (
            <View style={styles.mutualsRow}>
              {mutualFriends.slice(0, 6).map((f) => (
                <View key={f.id} style={[styles.avatar, { backgroundColor: avatarColor(f.username) }]}>
                  <Text style={styles.avatarText}>{f.username[0].toUpperCase()}</Text>
                </View>
              ))}
              {mutualFriends.length > 6 && (
                <View style={[styles.avatar, { backgroundColor: COLORS.border }]}>
                  <Text style={styles.avatarText}>+{mutualFriends.length - 6}</Text>
                </View>
              )}
              <Text style={styles.mutualsLabel}>
                {mutualFriends.length === 1
                  ? `${mutualFriends[0].username} is here`
                  : `${mutualFriends.length} friends are here`}
              </Text>
            </View>
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
                const isSelected = selectedIds.has(photo.id);
                const isDeleting = deletingIds.has(photo.id);

                return (
                  <TouchableOpacity
                    key={photo.id}
                    activeOpacity={0.85}
                    disabled={isLockedTile || isDeleting}
                    style={[styles.gridTile, isSelected && styles.gridTileSelected]}
                    onPress={() => {
                      if (selectionMode) {
                        toggleSelection(photo.id);
                      } else {
                        setLightbox(photo);
                      }
                    }}
                    onLongPress={() => {
                      if (!isLockedTile) {
                        setSelectionMode(true);
                        setSelectedIds(new Set([photo.id]));
                      }
                    }}
                  >
                    {isDeleting ? (
                      <View style={styles.deletingTile}>
                        <ActivityIndicator color={COLORS.error} />
                      </View>
                    ) : imageUri ? (
                      <AuthImage
                        uri={imageUri}
                        token={token ?? ""}
                        style={styles.gridImage}
                        resizeMode="cover"
                        blurRadius={isLockedTile ? 18 : 0}
                      />
                    ) : (
                      <View style={styles.lockedPlaceholder}>
                        <Ionicons name="image-outline" size={22} color={COLORS.textMuted} />
                      </View>
                    )}

                    {isLockedTile && <View style={styles.gridBlurOverlay} />}

                    {selectionMode && !isLockedTile && (
                      <View style={styles.checkOverlay}>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={26}
                          color={isSelected ? COLORS.secondary : "rgba(255,255,255,0.8)"}
                        />
                      </View>
                    )}

                    {(photo.tags?.length ?? 0) > 0 && !isLockedTile && !selectionMode && (
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>{photo.tags!.length} match</Text>
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

        {!selectionMode && (
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
        )}
      </View>

      <ShareModal
        visible={showShare}
        eventId={id ?? ""}
        eventTitle={event.title}
        onClose={() => setShowShare(false)}
      />

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <Modal
          visible
          animationType="fade"
          transparent
          onRequestClose={() => setLightbox(null)}
        >
          <View style={styles.lightboxBg}>
            {/* Close — top left */}
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
              <Ionicons name="close" size={28} color={COLORS.surface} />
            </TouchableOpacity>

            {/* Actions — top right */}
            <View style={styles.lightboxActions}>
              <TouchableOpacity
                style={styles.lightboxActionBtn}
                onPress={() => handleSingleDownload(lightbox)}
                disabled={downloadingId === lightbox.id}
              >
                {downloadingId === lightbox.id ? (
                  <ActivityIndicator size="small" color={COLORS.surface} />
                ) : (
                  <Ionicons name="download-outline" size={22} color={COLORS.surface} />
                )}
              </TouchableOpacity>

              {canDelete(lightbox) && (
                <TouchableOpacity
                  style={[styles.lightboxActionBtn, styles.lightboxDeleteBtn]}
                  onPress={() => promptSingleDelete(lightbox)}
                >
                  <Ionicons name="trash-outline" size={22} color={COLORS.surface} />
                </TouchableOpacity>
              )}
            </View>

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
                        {tag.confidence ? ` ${Math.round(tag.confidence * 100)}%` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ── Inline confirm dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirm}
      />
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

  // Selection toolbar
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selBarBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  selBarTxt: { fontSize: FONT_SIZES.body, fontWeight: "600", color: COLORS.textPrimary },
  selBarCount: { fontSize: FONT_SIZES.body, fontWeight: "700", color: COLORS.textPrimary },
  selBarActions: { flexDirection: "row", gap: SPACING.sm },
  selBarIconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  selBarDeleteBtn: { backgroundColor: COLORS.error },
  selBarDownloadBtn: { backgroundColor: COLORS.secondary },
  selBarDisabled: { opacity: 0.35 },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, gap: SPACING.md },
  gridTile: { width: "48%", height: 150, borderRadius: 16, overflow: "hidden", backgroundColor: COLORS.border },
  gridTileSelected: { borderWidth: 3, borderColor: COLORS.secondary },
  deletingTile: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.inputBg },
  gridImage: { width: "100%", height: "100%" },
  lockedPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.inputBg },
  gridBlurOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.22)" },
  checkOverlay: { position: "absolute", top: SPACING.xs, right: SPACING.xs },
  matchBadge: { position: "absolute", right: SPACING.xs, bottom: SPACING.xs, backgroundColor: COLORS.secondary, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  matchText: { color: COLORS.surface, fontSize: FONT_SIZES.tiny, fontWeight: "800" },

  // FABs
  fabGroup: { position: "absolute", right: SPACING.xl, bottom: 96, alignItems: "center", gap: SPACING.md, zIndex: 20 },
  fabCreate: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#5E35B1", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  fabUpload: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.secondary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabDisabled: { opacity: 0.65 },
  uploadIcon: { width: 40, height: 40, resizeMode: "contain" },

  // Lightbox
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.lg },
  lightboxClose: { position: "absolute", top: 64, left: 20, zIndex: 10 },
  lightboxActions: { position: "absolute", top: 64, right: 20, zIndex: 10, flexDirection: "row", gap: SPACING.sm },
  lightboxActionBtn: { padding: SPACING.sm, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10 },
  lightboxDeleteBtn: { backgroundColor: "rgba(220,38,38,0.75)" },
  lightboxImage: { width: "100%", height: "62%" },
  lightboxMeta: { width: "100%", marginTop: SPACING.lg },
  lightboxFilename: { color: COLORS.surface, fontSize: FONT_SIZES.subtitle, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md },
  tagPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  tagText: { color: COLORS.surface, fontSize: FONT_SIZES.body, fontWeight: "600" },

  // Mutuals
  mutualsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SPACING.xs, paddingHorizontal: SPACING.xl, marginTop: SPACING.md },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  mutualsLabel: { fontSize: FONT_SIZES.label, color: COLORS.textSecondary, fontWeight: "600", marginLeft: SPACING.xs },
});
