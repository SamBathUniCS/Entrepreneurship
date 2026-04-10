import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import { COLORS, FONT_SIZES, SPACING } from "../theme";
import AuthImage from "../../AuthImage";

const SCREEN_W = Dimensions.get("window").width;
const TILE = (SCREEN_W - SPACING.xl * 2 - SPACING.sm * 2) / 3;

type RenderType = "montage" | "reel";
type MusicKey = "chill" | "upbeat" | "cinematic";
type RenderStatus = "idle" | "queued" | "fetching" | "rendering" | "done" | "failed";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
}

const MUSIC_OPTIONS: { key: MusicKey; label: string; emoji: string }[] = [
  { key: "chill",     label: "Chill",     emoji: "🌊" },
  { key: "upbeat",    label: "Upbeat",    emoji: "🎉" },
  { key: "cinematic", label: "Cinematic", emoji: "🎬" },
];

const STATUS_LABEL: Record<RenderStatus, string> = {
  idle:      "",
  queued:    "Queued — waiting to start…",
  fetching:  "Fetching photos…",
  rendering: "Rendering your creation…",
  done:      "Done!",
  failed:    "Render failed. Please try again.",
};

const MAX: Record<RenderType, number> = { montage: 12, reel: 20 };

export default function CreateScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { token } = useContext(AuthContext);

  const [photos, setPhotos]           = useState<Photo[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const [renderType, setRenderType]   = useState<RenderType>("montage");
  const [music, setMusic]             = useState<MusicKey>("chill");
  const [status, setStatus]           = useState<RenderStatus>("idle");
  const [resultUrl, setResultUrl]     = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (token && eventId) fetchPhotos();
  }, [token, eventId]);

  async function fetchPhotos() {
    setLoadingPhotos(true);
    const r = await apiFetch("GET", `/events/${eventId}/photos/`, token);
    if (r.ok) setPhotos((r.data ?? []).filter((p: any) => !p.locked));
    setLoadingPhotos(false);
  }

  function togglePhoto(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX[renderType]) return prev; // cap at max
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.slice(0, MAX[renderType]).map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function startRender() {
    if (!token || !eventId || selected.size === 0) return;
    setStatus("queued");
    setResultUrl(null);

    const r = await apiFetch("POST", `/events/${eventId}/renders/`, token, {
      type: renderType,
      music,
      photo_ids: Array.from(selected),
    });

    if (!r.ok) {
      setStatus("failed");
      return;
    }

    const renderId: string = r.data.render_id;
    pollRef.current = setInterval(() => poll(renderId), 4000);
  }

  async function poll(renderId: string) {
    if (!token || !eventId) return;
    const r = await apiFetch("GET", `/events/${eventId}/renders/${renderId}`, token);
    if (!r.ok) return;
    const s: RenderStatus = r.data.status;
    setStatus(s);
    if (s === "done" || s === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      if (s === "done") setResultUrl(r.data.url ?? null);
    }
  }

  const isRendering = status === "queued" || status === "fetching" || status === "rendering";
  const canGenerate = selected.size >= 1 && !isRendering && status !== "done";
  const maxForType  = MAX[renderType];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create",
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

        {/* ── Type selector ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>What do you want to create?</Text>
        <View style={styles.typeRow}>
          <TypeCard
            selected={renderType === "montage"}
            onPress={() => { setRenderType("montage"); setSelected(new Set()); }}
            icon="images-outline"
            title="Montage"
            subtitle={"Animated GIF\nUp to 12 photos"}
          />
          <TypeCard
            selected={renderType === "reel"}
            onPress={() => { setRenderType("reel"); setSelected(new Set()); }}
            icon="film-outline"
            title="Reel"
            subtitle={"MP4 with music\nUp to 20 photos"}
          />
        </View>

        {/* ── Photo picker ────────────────────────────────────── */}
        <View style={styles.pickerHeader}>
          <Text style={styles.sectionLabel}>
            Select photos{" "}
            <Text style={styles.countHint}>
              ({selected.size}/{maxForType})
            </Text>
          </Text>
          <View style={styles.pickerActions}>
            <TouchableOpacity onPress={selectAll} activeOpacity={0.7}>
              <Text style={styles.pickerAction}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelection} activeOpacity={0.7}>
              <Text style={styles.pickerAction}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadingPhotos ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : photos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>No photos in this event yet. Upload some first!</Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => {
              const isSelected = selected.has(photo.id);
              const isDisabled = !isSelected && selected.size >= maxForType;
              return (
                <TouchableOpacity
                  key={photo.id}
                  style={[
                    styles.photoTile,
                    isSelected && styles.photoTileSelected,
                    isDisabled && styles.photoTileDisabled,
                  ]}
                  onPress={() => togglePhoto(photo.id)}
                  activeOpacity={0.75}
                  disabled={isDisabled}
                >
                  <AuthImage
                    uri={photo.thumbnail_url ?? photo.url}
                    token={token ?? ""}
                    style={styles.photoImg}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={styles.checkOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    </View>
                  )}
                  {isDisabled && <View style={styles.dimOverlay} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Music selector ──────────────────────────────────── */}
        {renderType === "reel" && (
          <>
            <Text style={styles.sectionLabel}>Choose a soundtrack</Text>
            <View style={styles.musicRow}>
              {MUSIC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.musicChip, music === opt.key && styles.musicChipActive]}
                  onPress={() => setMusic(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.musicEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.musicLabel, music === opt.key && styles.musicLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Status ─────────────────────────────────────────── */}
        {status !== "idle" && status !== "done" && (
          <View style={styles.statusBox}>
            {isRendering ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Ionicons
                name={status === "failed" ? "close-circle-outline" : "checkmark-circle-outline"}
                size={22}
                color={status === "failed" ? COLORS.error : "#16a34a"}
              />
            )}
            <Text style={[styles.statusTxt, status === "failed" && { color: COLORS.error }]}>
              {STATUS_LABEL[status]}
            </Text>
          </View>
        )}

        {/* ── Result ─────────────────────────────────────────── */}
        {status === "done" && resultUrl && (
          <View style={styles.resultCard}>
            {renderType === "montage" ? (
              <Image source={{ uri: resultUrl }} style={styles.resultImage} resizeMode="contain" />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="film-outline" size={48} color={COLORS.primary} />
                <Text style={styles.videoPlaceholderTxt}>Reel ready</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => Linking.openURL(resultUrl)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={styles.openBtnTxt}>
                {renderType === "reel" ? "Open Video" : "View Full Size"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Generate button ─────────────────────────────────── */}
        {status !== "done" && (
          <TouchableOpacity
            style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
            onPress={startRender}
            disabled={!canGenerate}
            activeOpacity={0.85}
          >
            {isRendering ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
            )}
            <Text style={styles.generateBtnTxt}>
              {isRendering
                ? "Generating…"
                : selected.size === 0
                ? "Select photos above"
                : `Generate ${renderType === "reel" ? "Reel" : "Montage"} (${selected.size} photos)`}
            </Text>
          </TouchableOpacity>
        )}

        {status === "done" && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setStatus("idle"); setResultUrl(null); }}
            activeOpacity={0.8}
          >
            <Text style={styles.resetBtnTxt}>Create another</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>
          Powered by Shotstack. Renders may take up to 60 seconds.
        </Text>
      </ScrollView>
    </>
  );
}

function TypeCard({
  selected, onPress, icon, title, subtitle,
}: {
  selected: boolean; onPress: () => void; icon: any; title: string; subtitle: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.typeCard, selected && styles.typeCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={32} color={selected ? COLORS.primary : COLORS.textSecondary} />
      <Text style={[styles.typeTitle, selected && styles.typeTitleSelected]}>{title}</Text>
      <Text style={styles.typeSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: 60 },

  sectionLabel: {
    fontSize: FONT_SIZES.body, fontWeight: "700", color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  countHint: { fontWeight: "400", color: COLORS.textSecondary },

  typeRow:          { flexDirection: "row", gap: SPACING.md },
  typeCard:         {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: "center", padding: SPACING.lg, gap: SPACING.xs,
  },
  typeCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgAlt },
  typeTitle:        { fontSize: FONT_SIZES.body, fontWeight: "800", color: COLORS.textSecondary },
  typeTitleSelected:{ color: COLORS.primary },
  typeSub:          { fontSize: FONT_SIZES.label, color: COLORS.textSecondary, textAlign: "center", lineHeight: 18 },

  pickerHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerActions: { flexDirection: "row", gap: SPACING.md },
  pickerAction:  { fontSize: FONT_SIZES.label, color: COLORS.primary, fontWeight: "700" },

  emptyBox: { alignItems: "center", paddingVertical: SPACING.xl },
  emptyTxt: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, textAlign: "center" },

  photoGrid:        { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  photoTile:        {
    width: TILE, height: TILE, borderRadius: 10, overflow: "hidden",
    borderWidth: 2, borderColor: "transparent",
  },
  photoTileSelected:{ borderColor: COLORS.primary },
  photoTileDisabled:{ opacity: 0.4 },
  photoImg:         { width: "100%", height: "100%" },
  checkOverlay:     {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22,119,255,0.35)",
    alignItems: "flex-end", justifyContent: "flex-start",
    padding: 4,
  },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.5)" },

  musicRow:        { flexDirection: "row", gap: SPACING.sm },
  musicChip:       {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: "center", paddingVertical: SPACING.sm, gap: 4,
  },
  musicChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.bgAlt },
  musicEmoji:      { fontSize: 22 },
  musicLabel:      { fontSize: FONT_SIZES.label, fontWeight: "700", color: COLORS.textSecondary },
  musicLabelActive:{ color: COLORS.primary },

  statusBox: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  statusTxt: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontWeight: "600", flex: 1 },

  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
    padding: SPACING.md, alignItems: "center",
  },
  resultImage:         { width: "100%", height: 300, borderRadius: 12 },
  videoPlaceholder:    {
    width: "100%", height: 160, backgroundColor: COLORS.bgAlt,
    borderRadius: 12, alignItems: "center", justifyContent: "center", gap: SPACING.sm,
  },
  videoPlaceholderTxt: { fontSize: FONT_SIZES.body, fontWeight: "700", color: COLORS.primary },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: SPACING.xl,
  },
  openBtnTxt: { color: "#fff", fontWeight: "800", fontSize: FONT_SIZES.body },

  generateBtn:         {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, backgroundColor: "#5E35B1",
    borderRadius: 14, paddingVertical: 15, marginTop: SPACING.sm,
  },
  generateBtnDisabled: { opacity: 0.45 },
  generateBtnTxt:      { color: "#fff", fontSize: FONT_SIZES.body, fontWeight: "800" },

  resetBtn:    { alignItems: "center", paddingVertical: SPACING.sm },
  resetBtnTxt: { fontSize: FONT_SIZES.body, color: COLORS.primary, fontWeight: "700" },

  footerNote: {
    fontSize: FONT_SIZES.label, color: COLORS.textSecondary,
    textAlign: "center", marginTop: SPACING.sm,
  },
});
