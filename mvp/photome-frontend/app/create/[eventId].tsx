import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

type RenderType = "montage" | "reel";
type MusicKey = "chill" | "upbeat" | "cinematic";
type RenderStatus = "idle" | "queued" | "fetching" | "rendering" | "done" | "failed";

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

export default function CreateScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { token } = useContext(AuthContext);

  const [renderType, setRenderType] = useState<RenderType>("montage");
  const [music, setMusic]           = useState<MusicKey>("chill");
  const [status, setStatus]         = useState<RenderStatus>("idle");
  const [resultUrl, setResultUrl]   = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState<number>(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRender() {
    if (!token || !eventId) return;
    setStatus("queued");
    setResultUrl(null);
    setPhotoCount(0);

    const r = await apiFetch("POST", `/events/${eventId}/renders/`, token, {
      type: renderType,
      music,
    });

    if (!r.ok) {
      setStatus("failed");
      return;
    }

    setPhotoCount(r.data.photo_count ?? 0);
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

        {/* Type selector */}
        <Text style={styles.sectionLabel}>What do you want to create?</Text>
        <View style={styles.typeRow}>
          <TypeCard
            selected={renderType === "montage"}
            onPress={() => setRenderType("montage")}
            icon="images-outline"
            title="Montage"
            subtitle={"Animated GIF\nUp to 12 photos"}
          />
          <TypeCard
            selected={renderType === "reel"}
            onPress={() => setRenderType("reel")}
            icon="film-outline"
            title="Reel"
            subtitle={"MP4 with music\nUp to 20 photos"}
          />
        </View>

        {/* Music selector — reel only */}
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

        {/* Status */}
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
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTxt, status === "failed" && { color: COLORS.error }]}>
                {STATUS_LABEL[status]}
              </Text>
              {photoCount > 0 && isRendering && (
                <Text style={styles.statusSub}>{photoCount} photos uploaded to renderer</Text>
              )}
            </View>
          </View>
        )}

        {/* Result */}
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

        {/* Generate button */}
        {status !== "done" && (
          <TouchableOpacity
            style={[styles.generateBtn, isRendering && styles.generateBtnDisabled]}
            onPress={startRender}
            disabled={isRendering}
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
                : `Generate ${renderType === "reel" ? "Reel" : "Montage"}`}
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
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 60 },

  sectionLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },

  typeRow:         { flexDirection: "row", gap: SPACING.md },
  typeCard:        {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: "center", padding: SPACING.lg, gap: SPACING.xs,
  },
  typeCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgAlt },
  typeTitle:        { fontSize: FONT_SIZES.body, fontWeight: "800", color: COLORS.textSecondary },
  typeTitleSelected:{ color: COLORS.primary },
  typeSub:          { fontSize: FONT_SIZES.label, color: COLORS.textSecondary, textAlign: "center", lineHeight: 18 },

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
  statusTxt: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontWeight: "600" },
  statusSub: { fontSize: FONT_SIZES.label, color: COLORS.textMuted, marginTop: 2 },

  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
    padding: SPACING.md, alignItems: "center",
  },
  resultImage:          { width: "100%", height: 300, borderRadius: 12 },
  videoPlaceholder:     {
    width: "100%", height: 160, backgroundColor: COLORS.bgAlt,
    borderRadius: 12, alignItems: "center", justifyContent: "center", gap: SPACING.sm,
  },
  videoPlaceholderTxt:  { fontSize: FONT_SIZES.body, fontWeight: "700", color: COLORS.primary },
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
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnTxt:      { color: "#fff", fontSize: FONT_SIZES.body, fontWeight: "800" },

  resetBtn:    { alignItems: "center", paddingVertical: SPACING.sm },
  resetBtnTxt: { fontSize: FONT_SIZES.body, color: COLORS.primary, fontWeight: "700" },

  footerNote: {
    fontSize: FONT_SIZES.label, color: COLORS.textSecondary,
    textAlign: "center", marginTop: SPACING.sm,
  },
});
