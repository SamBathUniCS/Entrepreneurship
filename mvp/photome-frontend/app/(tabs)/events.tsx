import React, { useContext, useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, Image, StyleSheet,
  Dimensions, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/_AuthContext";
import { apiFetch } from "../../api";

const { width } = Dimensions.get("window");
const H_PAD = 14, GAP = 10;
const COL_W = (width - H_PAD * 2 - GAP) / 2;
const ROW_H = 130;

interface Event {
  id: string; title: string; description: string | null;
  photo_count: number; member_count: number;
  is_member: boolean; has_access: boolean; status: string;
}

export default function EventsTab() {
  const { token } = useContext(AuthContext);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { if (token) load(); }, [token]);

  async function load() {
    setLoading(true);
    const r = await apiFetch("GET", "/events/?my_events=true", token);
    if (r.ok) setEvents(r.data ?? []);
    setLoading(false);
  }

  if (loading) {
    return <View style={styles.screen}><ActivityIndicator color="#1677ff" style={{ marginTop: 40 }} /></View>;
  }

  const renderGrid = () => {
    const items: React.ReactNode[] = [];
    let i = 0;
    while (i < events.length) {
      const isFirstOrLast = i === 0 || events.length - i === 1;
      if (isFirstOrLast) {
        const ev = events[i];
        items.push(<EventCard key={ev.id} event={ev} style={styles.cardWide} />);
        i++;
      } else {
        const tall = events[i];
        const rights = events.slice(i + 1, i + 3);
        items.push(
          <View key={`g-${i}`} style={styles.gridRow}>
            <EventCard event={tall} style={styles.cardTall} />
            <View style={styles.rightCol}>
              {rights.map((e) => <EventCard key={e.id} event={e} style={styles.cardNormal} />)}
              {rights.length === 1 && <View style={styles.cardNormal} />}
            </View>
          </View>
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
              <Text style={styles.emptyDesc}>Join an event from Search, or create one below.</Text>
            </View>
          ) : renderGrid()}
        </View>
      </ScrollView>

      {/* Create event FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CreateEventModal
        visible={showCreate}
        token={token!}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </View>
  );
}

function EventCard({ event, style }: { event: Event; style: any }) {
  return (
    <Pressable style={[styles.card, style]} onPress={() => router.push(`/events/${event.id}`)}>
      <Image
        source={{ uri: `https://picsum.photos/seed/${event.id.slice(0, 8)}/400/400` }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statTxt}>👥 {event.member_count}</Text>
          <View style={styles.statDivider} />
          <Text style={styles.statTxt}>📷 {event.photo_count}</Text>
        </View>
        {event.has_access && (
          <View style={styles.unlockedPill}><Text style={styles.unlockedTxt}>Unlocked ✓</Text></View>
        )}
      </View>
    </Pressable>
  );
}

function CreateEventModal({
  visible, token, onClose, onCreated,
}: { visible: boolean; token: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) { Alert.alert("Title required"); return; }
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
      setTitle(""); setDesc(""); setVisibility("public");
      onCreated();
    } else {
      const detail = Array.isArray(r.data?.detail)
        ? r.data.detail.map((e: any) => e.msg).join("\n")
        : r.data?.detail ?? "Failed to create event";
      Alert.alert("Error", detail);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>Create Event</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
        </View>

        <ScrollView style={modal.body} keyboardShouldPersistTaps="handled">
          <Text style={modal.label}>Event Title *</Text>
          <TextInput
            value={title} onChangeText={setTitle}
            placeholder="e.g. Summer Party 2026"
            style={modal.input} maxLength={200}
          />

          <Text style={modal.label}>Description</Text>
          <TextInput
            value={desc} onChangeText={setDesc}
            placeholder="Optional short description"
            style={[modal.input, { height: 80, textAlignVertical: "top" }]}
            multiline maxLength={500}
          />

          <Text style={modal.label}>Visibility</Text>
          <View style={modal.toggleRow}>
            {(["public", "private"] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[modal.toggleBtn, visibility === v && modal.toggleBtnActive]}
                onPress={() => setVisibility(v)}
              >
                <Ionicons
                  name={v === "public" ? "globe-outline" : "lock-closed-outline"}
                  size={16}
                  color={visibility === v ? "#fff" : "#6b7280"}
                />
                <Text style={[modal.toggleTxt, visibility === v && modal.toggleTxtActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[modal.createBtn, saving && { opacity: 0.6 }]}
            onPress={create} disabled={saving} activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={modal.createBtnTxt}>Create Event →</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f2f5fa" },
  scrollContent: { paddingBottom: 100 },
  grid: { padding: H_PAD, gap: GAP },
  gridRow: { flexDirection: "row", gap: GAP, height: ROW_H * 2 + GAP },
  rightCol: { flex: 1, gap: GAP },

  card: { borderRadius: 18, overflow: "hidden", backgroundColor: "#dde4ee" },
  cardWide: { width: "100%", height: ROW_H * 1.4 },
  cardTall: { width: COL_W, flex: 1 },
  cardNormal: { flex: 1 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  cardContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: "#fff", marginBottom: 5 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statTxt: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,.9)" },
  statDivider: { width: 1, height: 10, backgroundColor: "rgba(255,255,255,.35)" },
  unlockedPill: {
    marginTop: 5, alignSelf: "flex-start",
    backgroundColor: "rgba(74,247,176,.3)", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  unlockedTxt: { fontSize: 9, fontWeight: "800", color: "#4af7b0" },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6b7280", textAlign: "center" },

  fab: {
    position: "absolute", bottom: 26, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#5E35B1", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  body:  { padding: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  toggleRow:     { flexDirection: "row", gap: 10 },
  toggleBtn:     {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB",
  },
  toggleBtnActive: { backgroundColor: "#1677ff", borderColor: "#1677ff" },
  toggleTxt:       { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  toggleTxtActive: { color: "#fff" },
  createBtn: {
    marginTop: 28, backgroundColor: "#5E35B1", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  createBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
