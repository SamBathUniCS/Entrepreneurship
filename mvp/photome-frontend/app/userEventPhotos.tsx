import React, { useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "./theme";

export default function EventPhotos() {
  const photos = useMemo(
    () => [
      { id: "1", uri: "https://picsum.photos/seed/xmas1/600/800" },
      { id: "2", uri: "https://picsum.photos/seed/xmas2/600/800" },
      { id: "3", uri: "https://picsum.photos/seed/xmas3/600/800" },
      { id: "4", uri: "https://picsum.photos/seed/xmas4/600/800" },
      { id: "5", uri: "https://picsum.photos/seed/xmas5/600/800" },
      { id: "6", uri: "https://picsum.photos/seed/xmas6/600/800" },
      { id: "7", uri: "https://picsum.photos/seed/xmas7/600/800" },
      { id: "8", uri: "https://picsum.photos/seed/xmas8/600/800" },
    ],
    [],
  );

  const left = photos.filter((_, i) => i % 2 === 0);
  const right = photos.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Christmas Party</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Photos</Text>

        <View style={styles.columns}>
          <View style={styles.col}>
            {left.map((p, idx) => (
              <PhotoTile key={p.id} uri={p.uri} tall={idx % 3 === 1} />
            ))}
          </View>
          <View style={styles.col}>
            {right.map((p, idx) => (
              <PhotoTile key={p.id} uri={p.uri} tall={idx % 3 === 0} />
            ))}
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <TouchableOpacity activeOpacity={0.9} style={styles.fab}>
        <Ionicons name="checkmark" size={22} color={COLORS.surface} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function PhotoTile({ uri, tall }: { uri: string; tall?: boolean }) {
  return (
    <View style={[styles.tile, tall ? styles.tileTall : styles.tileShort]}>
      <Image source={{ uri }} style={styles.img} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.heroGreeting },

  topBar: {
    height: 54,
    backgroundColor: COLORS.primary,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  topBarTitle: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  sectionTitle: {
    textAlign: "center",
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  columns: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  col: {
    flex: 1,
    gap: SPACING.md,
  },

  tile: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  tileShort: { height: 130 },
  tileTall: { height: 190 },

  img: { width: "100%", height: "100%" },

  fab: {
    position: "absolute",
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
