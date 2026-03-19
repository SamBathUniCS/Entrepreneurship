import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AuthContext } from "./context/_AuthContext";
import { API_BASE_URL } from "../config";
import AuthImage from "../AuthImage";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PhotoItem {
  id: string;
  url: string;
  thumbnail_url?: string;
  original_filename?: string;
  filename?: string;
  faces_detected?: number;
  tags?: Array<{ username: string; confidence?: number }>;
  tagged_users?: Array<{ username: string; confidence?: number }>;
  width?: number;
  height?: number;
}

interface Notif {
  id: number;
  emoji: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "error" | "info";
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function apiFetch(
  method: string,
  path: string,
  token: string,
  body?: object | FormData,
  isForm?: boolean,
): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (!isForm && body) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body
        ? isForm
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* empty */
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: { detail: e.message } };
  }
}

// ─── Web file picker ──────────────────────────────────────────────────────────
// expo-image-picker doesn't work on web in Docker/browser — use a hidden <input>
function triggerWebFilePicker(onPick: (uri: string, file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e: any) => {
    const file: File = e.target.files[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    onPick(uri, file);
  };
  input.click();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ notif, onDone }: { notif: Notif; onDone: () => void }) {
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(y, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.delay(3600),
      Animated.timing(y, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(onDone);
  }, []);
  const accent =
    notif.type === "success"
      ? "#4af7b0"
      : notif.type === "error"
        ? "#f74a6a"
        : "#1677ff";
  return (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY: y }], borderLeftColor: accent },
      ]}
    >
      <Text style={styles.toastEmoji}>{notif.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle}>{notif.title}</Text>
        <Text style={styles.toastMsg}>{notif.message}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Bell ─────────────────────────────────────────────────────────────────────
function BellMenu({ items, onClear }: { items: Notif[]; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.bellBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={22} color="#fff" />
        {items.length > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeTxt}>
              {items.length > 9 ? "9+" : items.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={[styles.bellPanel, { top: insets.top + 60 }]}>
            <View style={styles.bellPanelHeader}>
              <Text style={styles.bellPanelTitle}>NOTIFICATIONS</Text>
              {items.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    onClear();
                    setOpen(false);
                  }}
                >
                  <Text style={styles.clearAllBtn}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            {items.length === 0 ? (
              <View style={styles.bellEmpty}>
                <Text style={styles.bellEmptyTxt}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(n) => String(n.id)}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => (
                  <View style={styles.bellItem}>
                    <Text style={styles.bellItemEmoji}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bellItemTitle}>{item.title}</Text>
                      <Text style={styles.bellItemMsg}>{item.message}</Text>
                      <Text style={styles.bellItemTime}>{item.time}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Photo thumbnail ──────────────────────────────────────────────────────────
function PhotoThumb({
  photo,
  token,
  onPress,
}: {
  photo: PhotoItem;
  token: string;
  onPress: () => void;
}) {
  const src = photo.thumbnail_url || photo.url;
  const tagCount = photo.tags?.length ?? photo.tagged_users?.length ?? 0;
  const faceCount = photo.faces_detected ?? 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.thumb}
      activeOpacity={0.8}
    >
      <AuthImage
        uri={src}
        token={token}
        style={styles.thumbImg}
        resizeMode="cover"
      />
      {faceCount > 0 && (
        <View style={styles.thumbFaceBadge}>
          <Text style={styles.thumbFaceTxt}>👤{faceCount}</Text>
        </View>
      )}
      {tagCount > 0 && (
        <View style={styles.thumbMatchBadge}>
          <Text style={styles.thumbMatchTxt}>
            {tagCount} match{tagCount > 1 ? "es" : ""}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  photo,
  token,
  onClose,
}: {
  photo: PhotoItem | null;
  token: string;
  onClose: () => void;
}) {
  if (!photo) return null;
  const tags = photo.tags ?? photo.tagged_users ?? [];
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.lightboxBg}>
        <TouchableOpacity style={styles.lightboxClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <AuthImage
          uri={photo.url}
          token={token}
          style={styles.lightboxImg}
          resizeMode="contain"
        />
        <View style={styles.lightboxMeta}>
          <Text style={styles.lightboxFilename}>
            {photo.original_filename ?? photo.filename ?? "Photo"}
            {photo.width && photo.height
              ? `  ·  ${photo.width}×${photo.height}`
              : ""}
          </Text>
          {tags.length > 0 && (
            <View style={styles.lightboxTags}>
              {tags.map((t, i) => (
                <View key={i} style={styles.lightboxTag}>
                  <Text style={styles.lightboxTagTxt}>
                    @{typeof t === "string" ? t : t.username}
                    {typeof t !== "string" && t.confidence
                      ? `  ${Math.round(t.confidence * 100)}%`
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ message }: { message: string }) {
  return (
    <View style={styles.overlayBg}>
      <View style={styles.overlayCard}>
        <ActivityIndicator size="large" color="#5E35B1" />
        <Text style={styles.overlayMsg}>{message}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FaceSetupScreen() {
  const { token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const notifId = useRef(0);

  const [hasEmbedding, setHasEmbedding] = useState(false);
  const [currentSelfieUri, setCurrentSelfieUri] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  // Web only — keep the raw File so we can send it as FormData
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("");

  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  const [toasts, setToasts] = useState<Notif[]>([]);
  const [bellItems, setBellItems] = useState<Notif[]>([]);

  const pushNotif = useCallback(
    (type: Notif["type"], title: string, message: string, emoji = "ℹ️") => {
      if (!token) return;
      const id = ++notifId.current;
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const n: Notif = { id, type, title, message, emoji, time };
      setToasts((p) => [...p, n]);
      setBellItems((p) => [n, ...p]);
    },
    [token],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((p) => p.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchProfile();
    fetchFirstEvent();
  }, [token]);

  async function fetchProfile() {
    if (!token) return;
    const r = await apiFetch("GET", "/users/me", token);
    if (r.ok && r.data) {
      setHasEmbedding(!!r.data.has_face_embedding);
      if (r.data.selfie_url) {
        setCurrentSelfieUri(
          `${API_BASE_URL.replace("/api/v1", "")}${r.data.selfie_url}`,
        );
      }
    }
  }

  async function fetchFirstEvent() {
    if (!token) return;
    const r = await apiFetch("GET", "/events/?my_events=true", token);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const ev = r.data[0];
      setEventId(ev.id);
      setEventTitle(ev.title);
      fetchMyPhotos(ev.id);
    }
  }

  async function fetchMyPhotos(eid?: string) {
    const id = eid ?? eventId;
    if (!id || !token) return;
    setPhotosLoading(true);
    const r = await apiFetch("GET", `/events/${id}/photos/my`, token);
    setPhotosLoading(false);
    if (r.ok && Array.isArray(r.data)) setPhotos(r.data);
  }

  // ── Pick image — web uses hidden <input>, native uses ImagePicker ──────────
  async function pickFromLibrary() {
    if (Platform.OS === "web") {
      triggerWebFilePicker((uri, file) => {
        setPickedUri(uri);
        setPickedFile(file);
      });
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo library access in Settings.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setPickedFile(null);
    }
  }

  // ── Register face ──────────────────────────────────────────────────────────
  async function registerFace() {
    if (!pickedUri || !token) return;
    setIsRegistering(true);

    const form = new FormData();

    if (Platform.OS === "web" && pickedFile) {
      // Web: append the raw File directly — works with fetch natively
      form.append("file", pickedFile, pickedFile.name);
    } else {
      // Native: React Native FormData accepts { uri, name, type }
      const filename = pickedUri.split("/").pop() ?? "selfie.jpg";
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
        uri: pickedUri,
        name: filename,
        type: mime[ext] ?? "image/jpeg",
      });
    }

    const r = await apiFetch("POST", "/users/me/selfie", token, form, true);
    setIsRegistering(false);

    if (r.ok) {
      if (r.data?.face_detected === false) {
        pushNotif(
          "error",
          "No face detected",
          "Try a clearer, front-facing photo.",
          "⚠️",
        );
      } else {
        setHasEmbedding(true);
        setCurrentSelfieUri(pickedUri);
        setPickedUri(null);
        setPickedFile(null);
        pushNotif(
          "success",
          "Face registered!",
          "You'll now be matched in event photos.",
          "🎉",
        );
        if (eventId) fetchMyPhotos();
      }
    } else {
      pushNotif(
        "error",
        "Registration failed",
        r.data?.detail ?? "Please try again.",
        "❌",
      );
    }
  }

  // ── Re-scan ────────────────────────────────────────────────────────────────
  async function rescanPhotos() {
    if (!eventId || !token) return;
    setIsRescanning(true);
    const r = await apiFetch("POST", `/events/${eventId}/photos/rescan`, token);
    setIsRescanning(false);
    if (r.ok) {
      pushNotif(
        "success",
        "Re-scan complete",
        `Processed ${r.data.processed} photos — found ${r.data.new_tags} new matches.`,
        "🔍",
      );
      fetchMyPhotos();
    } else {
      pushNotif(
        "error",
        "Re-scan failed",
        r.data?.detail ?? "Endpoint not available yet.",
        "❌",
      );
    }
  }

  const photoCount = photos.length;
  const previewUri = pickedUri ?? currentSelfieUri;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Loading overlay */}
      {isRegistering && <LoadingOverlay message="Registering your face…" />}

      {/* Toast layer */}
      <View
        style={[styles.toastLayer, { top: insets.top + 8 }]}
        pointerEvents="none"
      >
        {toasts.map((n) => (
          <Toast key={n.id} notif={n} onDone={() => dismissToast(n.id)} />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Face Setup</Text>
            <Text style={styles.headerSub}>
              {hasEmbedding ? "✓ Face registered" : "Not yet registered"}
            </Text>
          </View>
        </View>
        <BellMenu items={bellItems} onClear={() => setBellItems([])} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Selfie card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register Your Face</Text>
          <Text style={styles.cardSub}>
            Upload a clear, front-facing photo to create your face embedding.
            You'll automatically be matched in event photos.
          </Text>

          {previewUri && (
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{
                    uri: previewUri,
                    ...(currentSelfieUri && !pickedUri && token
                      ? { headers: { Authorization: `Bearer ${token}` } }
                      : {}),
                  }}
                  style={styles.avatar}
                />
                {hasEmbedding && !pickedUri && (
                  <View style={styles.avatarCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarStatus}>
                  {pickedUri ? "Ready to register" : "Face registered ✓"}
                </Text>
                <Text style={styles.avatarHint}>
                  {pickedUri
                    ? "Tap 'Register Face' to save."
                    : "Upload a new photo to update."}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={pickFromLibrary}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={18} color="#5E35B1" />
            <Text style={styles.uploadBtnTxt}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!pickedUri || isRegistering) && styles.primaryBtnDisabled,
            ]}
            onPress={registerFace}
            disabled={!pickedUri || isRegistering}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={17} color="#fff" />
            <Text style={styles.primaryBtnTxt}>
              {hasEmbedding ? "Update Face" : "Register Face"}
            </Text>
          </TouchableOpacity>

          {pickedUri && (
            <TouchableOpacity
              onPress={() => {
                setPickedUri(null);
                setPickedFile(null);
              }}
              style={styles.clearLink}
            >
              <Text style={styles.clearLinkTxt}>Clear selection</Text>
            </TouchableOpacity>
          )}

          <View style={styles.tip}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#6b7280"
            />
            <Text style={styles.tipTxt}>
              Best results: well-lit, front-facing, face fills most of the
              frame.
            </Text>
          </View>
        </View>

        {/* ── How it works ── */}
        {!hasEmbedding && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              {
                icon: "scan-outline",
                txt: "Register a selfie — your face embedding is created.",
              },
              {
                icon: "cloud-upload-outline",
                txt: "Event photos are automatically scanned for faces.",
              },
              {
                icon: "notifications-outline",
                txt: "You're notified whenever you appear in a new photo.",
              },
              {
                icon: "refresh-circle-outline",
                txt: "Re-scan matches your face to photos already uploaded.",
              },
            ].map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumTxt}>{i + 1}</Text>
                </View>
                <Ionicons name={s.icon as any} size={17} color="#9ca3af" />
                <Text style={styles.stepTxt}>{s.txt}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Photo count card ── */}
        {eventId && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Your Photos</Text>
              {eventTitle ? (
                <View style={styles.eventPill}>
                  <Text style={styles.eventPillTxt} numberOfLines={1}>
                    {eventTitle}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.countRow}>
              <Text
                style={[
                  styles.countNum,
                  { color: photoCount > 0 ? "#5E35B1" : "#9ca3af" },
                ]}
              >
                {photosLoading ? "–" : photoCount}
              </Text>
              <Text style={styles.countLabel}>
                photo{photoCount !== 1 ? "s" : ""} with your face
              </Text>
            </View>

            <Text style={styles.countSub}>
              {photoCount === 0
                ? hasEmbedding
                  ? "No matches yet. Wait for photos to be uploaded, or run a re-scan."
                  : "Register your face above to start matching."
                : `You appear in ${photoCount} photo${photoCount !== 1 ? "s" : ""} in this event.`}
            </Text>

            <View style={styles.pickRow}>
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={() => fetchMyPhotos()}
                disabled={photosLoading}
                activeOpacity={0.8}
              >
                {photosLoading ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color="#5E35B1" />
                )}
                <Text style={styles.pickBtnTxt}>Refresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pickBtn,
                  styles.pickBtnAccent,
                  (!hasEmbedding || isRescanning) && styles.pickBtnDisabled,
                ]}
                onPress={rescanPhotos}
                disabled={!hasEmbedding || isRescanning}
                activeOpacity={0.8}
              >
                {isRescanning ? (
                  <ActivityIndicator size="small" color="#5E35B1" />
                ) : (
                  <Ionicons name="scan-outline" size={17} color="#5E35B1" />
                )}
                <Text style={[styles.pickBtnTxt, { color: "#5E35B1" }]}>
                  {isRescanning ? "Scanning…" : "Re-scan All"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Photo grid ── */}
        {eventId && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Photos with your face</Text>
              {photoCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeTxt}>{photoCount}</Text>
                </View>
              )}
            </View>

            {photosLoading && photos.length === 0 ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color="#5E35B1" />
                <Text style={styles.emptyTxt}>Finding your photos…</Text>
              </View>
            ) : photos.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>
                  {hasEmbedding ? "🔍" : "👤"}
                </Text>
                <Text style={styles.emptyTxt}>
                  {hasEmbedding
                    ? "No matches found yet.\nUpload photos or run a re-scan."
                    : "Register your face to start finding your photos."}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {photos.map((p, i) => (
                  <PhotoThumb
                    key={p.id ?? i}
                    photo={p}
                    token={token ?? ""}
                    onPress={() => setLightboxPhoto(p)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {hasEmbedding && photoCount > 0 && (
          <View style={styles.celebCard}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.celebTitle}>You're being matched!</Text>
              <Text style={styles.celebSub}>
                New photos are scanned automatically when uploaded to the event.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Lightbox
        photo={lightboxPhoto}
        token={token ?? ""}
        onClose={() => setLightboxPhoto(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f6f6" },

  // Loading overlay
  overlayBg: {
    position: "absolute",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  overlayMsg: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },

  // Toast
  toastLayer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  toastEmoji: { fontSize: 20 },
  toastTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  toastMsg: { fontSize: 12, color: "#6b7280", lineHeight: 18 },

  // Header — single bar, self-contained
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: "#1677ff",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtn: { padding: 6, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 1 },

  bellBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.2)",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    backgroundColor: "#f74a6a",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1677ff",
    paddingHorizontal: 3,
  },
  bellBadgeTxt: { fontSize: 9, fontWeight: "800", color: "#fff" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.4)" },
  bellPanel: {
    position: "absolute",
    right: 14,
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  bellPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  bellPanelTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 1.2,
  },
  clearAllBtn: { fontSize: 12, color: "#9ca3af" },
  bellEmpty: { padding: 28, alignItems: "center" },
  bellEmptyTxt: { fontSize: 13, color: "#9ca3af" },
  bellItem: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  bellItemEmoji: { fontSize: 18 },
  bellItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  bellItemMsg: { fontSize: 12, color: "#6b7280", lineHeight: 17 },
  bellItemTime: { fontSize: 10, color: "#9ca3af", marginTop: 3 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardSub: { fontSize: 13, color: "#6b7280", lineHeight: 20 },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#5E35B1",
    backgroundColor: "#EDE7F6",
  },
  avatarCheck: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#5E35B1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5E35B1",
    marginBottom: 3,
  },
  avatarHint: { fontSize: 12, color: "#6b7280", lineHeight: 18 },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  uploadBtnTxt: { fontSize: 14, fontWeight: "700", color: "#111827" },

  pickRow: { flexDirection: "row", gap: 10 },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  pickBtnAccent: { borderColor: "#EDE7F6", backgroundColor: "#F5F3FF" },
  pickBtnDisabled: { opacity: 0.4 },
  pickBtnTxt: { fontSize: 13, fontWeight: "700", color: "#111827" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#5E35B1",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  primaryBtnDisabled: { backgroundColor: "#c4b5fd" },
  primaryBtnTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },

  clearLink: { alignItems: "center" },
  clearLinkTxt: { fontSize: 12, color: "#9ca3af" },

  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tipTxt: { flex: 1, fontSize: 12, color: "#6b7280", lineHeight: 18 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EDE7F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumTxt: { fontSize: 11, fontWeight: "800", color: "#5E35B1" },
  stepTxt: { flex: 1, fontSize: 13, color: "#6b7280", lineHeight: 19 },

  eventPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxWidth: 140,
  },
  eventPillTxt: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  countRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  countNum: {
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 56,
    letterSpacing: -3,
  },
  countLabel: { fontSize: 14, color: "#6b7280", paddingBottom: 8 },
  countSub: { fontSize: 13, color: "#6b7280", lineHeight: 20, marginTop: -4 },

  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    backgroundColor: "#EDE7F6",
    borderRadius: 6,
  },
  countBadgeTxt: { fontSize: 12, fontWeight: "800", color: "#5E35B1" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbFaceBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,.55)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thumbFaceTxt: { fontSize: 9, color: "#fff" },
  thumbMatchBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#5E35B1",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thumbMatchTxt: { fontSize: 9, fontWeight: "800", color: "#fff" },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyIcon: { fontSize: 36 },
  emptyTxt: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },

  celebCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  celebEmoji: { fontSize: 32 },
  celebTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16a34a",
    marginBottom: 4,
  },
  celebSub: { fontSize: 13, color: "#6b7280", lineHeight: 18 },

  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 52,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  lightboxImg: { width: "92%", height: "72%" },
  lightboxMeta: {
    marginTop: 16,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  lightboxFilename: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  lightboxTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  lightboxTag: {
    backgroundColor: "#EDE7F6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lightboxTagTxt: { fontSize: 11, fontWeight: "700", color: "#5E35B1" },
});
