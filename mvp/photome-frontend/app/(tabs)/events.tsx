import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";
import { COLORS, FONT_SIZES, SPACING } from "../theme";
import ShareModal from "../components/ShareModal";

const { width } = Dimensions.get("window");
const H_PAD = SPACING.md,
  GAP = SPACING.sm;
const COL_W = (width - H_PAD * 2 - GAP) / 2;
const ROW_H = 130;

interface Event {
  id: string;
  title: string;
  description: string | null;
  photo_count: number;
  member_count: number;
  is_member: boolean;
  has_access: boolean;
  status: string;
}

export default function EventsTab() {
  const { token , user} = useContext(AuthContext);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [shareEvent, setShareEvent] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (token) load();
  }, [token]);

  async function load() {
    setLoading(true);
    const r = await apiFetch("GET", "/events/?my_events=true", token);
    if (r.ok) setEvents(r.data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const renderGrid = () => {
    const items: React.ReactNode[] = [];
    let i = 0;
    while (i < events.length) {
      const isFirstOrLast = i === 0 || events.length - i === 1;
      if (isFirstOrLast) {
        const ev = events[i];
        items.push(
          <EventCard key={ev.id} event={ev} style={styles.cardWide} />,
        );
        i++;
      } else {
        const tall = events[i];
        const rights = events.slice(i + 1, i + 3);
        items.push(
          <View key={`g-${i}`} style={styles.gridRow}>
            <EventCard event={tall} style={styles.cardTall} />
            <View style={styles.rightCol}>
              {rights.map((e) => (
                <EventCard key={e.id} event={e} style={styles.cardNormal} />
              ))}
              {rights.length === 1 && <View style={styles.cardNormal} />}
            </View>
          </View>,
        );
        i += 1 + rights.length;
      }
    }
    return items;
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {events.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📸</Text>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyDesc}>
                Join an event from Search, or create one below.
              </Text>
            </View>
          ) : (
            renderGrid()
          )}
        </View>
      </ScrollView>

      {/* Create event FAB */}
      {user?.tier !== "basic" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={COLORS.surface} />
        </TouchableOpacity>
      )}

      <CreateEventModal
        visible={showCreate}
        token={token!}
        tier={user?.tier ?? "basic"}
        onClose={() => setShowCreate(false)}
        onCreated={(eventId, eventTitle) => {
          setShowCreate(false);
          load();
          setShareEvent({ id: eventId, title: eventTitle });
        }}
      />

      {shareEvent && (
        <ShareModal
          visible
          eventId={shareEvent.id}
          eventTitle={shareEvent.title}
          onClose={() => setShareEvent(null)}
        />
      )}
    </View>
  );
}

function EventCard({ event, style }: { event: Event; style: any }) {
  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => router.push(`/events/${event.id}`)}
    >
      <Image
        source={{
          uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/400/400`,
        }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statTxt}>👥 {event.member_count}</Text>
          <View style={styles.statDivider} />
          <Text style={styles.statTxt}>📷 {event.photo_count}</Text>
        </View>
        {event.has_access && (
          <View style={styles.unlockedPill}>
            <Text style={styles.unlockedTxt}>Unlocked ✓</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function CreateEventModal({
  visible,
  token,
  tier,
  onClose,
  onCreated,
}: {
  visible: boolean;
  token: string;
  tier: string;
  onClose: () => void;
  onCreated: (eventId: string, eventTitle: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">(
    tier === "business" ? "public" : "private"
  );
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) {
      Alert.alert("Title required");
      return;
    }
    setSaving(true);
    const r = await apiFetch("POST", "/events/", token, {
      title: title.trim(),
      description: desc.trim() || null,
      visibility,
      upload_threshold: 5,
      photo_expiry_days: 0,
      event_date: null,
    });
    setSaving(false);
    if (r.ok) {
      const eventId = r.data?.id ?? "";
      const eventTitle = title.trim();
      setTitle("");
      setDesc("");
      setVisibility("public");
      onCreated(eventId, eventTitle);
    } else {
      const detail = Array.isArray(r.data?.detail)
        ? r.data.detail.map((e: any) => e.msg).join("\n")
        : (r.data?.detail ?? "Failed to create event");
      Alert.alert("Error", detail);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>Create Event</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={modal.body} keyboardShouldPersistTaps="handled">
          <Text style={modal.label}>Event Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Summer Party 2026"
            style={modal.input}
            maxLength={200}
          />

          <Text style={modal.label}>Description</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="Optional short description"
            style={[modal.input, { height: 80, textAlignVertical: "top" }]}
            multiline
            maxLength={500}
          />

          <Text style={modal.label}>Visibility</Text>
          <View style={modal.toggleRow}>
            {(tier === "business" ? (["public", "private"] as const) : (["private"] as const)).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  modal.toggleBtn,
                  visibility === v && modal.toggleBtnActive,
                ]}
                onPress={() => setVisibility(v)}
              >
                <Ionicons
                  name={
                    v === "public" ? "globe-outline" : "lock-closed-outline"
                  }
                  size={FONT_SIZES.label}
                  color={
                    visibility === v ? COLORS.surface : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    modal.toggleTxt,
                    visibility === v && modal.toggleTxtActive,
                  ]}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[modal.createBtn, saving && { opacity: 0.6 }]}
            onPress={create}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={modal.createBtnTxt}>Create Event →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  grid: { padding: H_PAD, gap: GAP },
  gridRow: { flexDirection: "row", gap: GAP, height: ROW_H * 2 + GAP },
  rightCol: { flex: 1, gap: GAP },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  cardWide: { width: "100%", height: ROW_H * 1.4 },
  cardTall: { width: COL_W, flex: 1 },
  cardNormal: { flex: 1 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cardContent: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "800",
    color: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  statsRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  statTxt: {
    fontSize: FONT_SIZES.label,
    fontWeight: "700",
    color: "rgba(255,255,255,.9)",
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255,255,255,.35)",
  },
  unlockedPill: {
    marginTop: SPACING.xs,
    alignSelf: "flex-start",
    backgroundColor: COLORS.successBg,
    borderRadius: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
  },
  unlockedTxt: {
    fontSize: FONT_SIZES.label,
    fontWeight: "800",
    color: COLORS.successText,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: SPACING.lg * 2,
    gap: SPACING.sm,
  },
  emptyIcon: { fontSize: FONT_SIZES.heroTitle },
  emptyTitle: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    bottom: SPACING.lg,
    right: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  body: { padding: SPACING.md },
  label: {
    fontSize: FONT_SIZES.label,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.body,
  },
  toggleRow: { flexDirection: "row", gap: SPACING.sm },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleTxt: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toggleTxtActive: { color: COLORS.surface },
  createBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  createBtnTxt: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.body,
    fontWeight: "800",
  },
});
