import React, { useCallback, useContext, useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { AuthContext } from "./context/_AuthContext";
import { apiFetch } from "../api";
import AuthImage from "../AuthImage";
import { COLORS, FONT_SIZES, SPACING } from "./theme";


interface UploadedPhoto {

  id: string;

  event_id : string;
  event_title : string;

  original_filename: string | null;
  created_at: string;
  url: string;
  thumbnail_url: string | null;
}

export default function MyUploadsScreen() {
  const { token, refreshUser } = useContext(AuthContext);
  const [uploads, setUploads] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // getting the full upload hisotry frmo backend
  const load = useCallback(async () => {
    setLoading(true);

    const r = await apiFetch("GET", "/users/me/uploads", token);

    if (r.ok) setUploads(r.data ?? []);

    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  // converting string to normal date format
  function formatDate(isoString: string) {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // we alerting to delete the photo
  async function handleDelete(photo: UploadedPhoto) {
    Alert.alert(
      "Remove Photo",
      "Remove this photo? If your upload count for this event drops below the threshold then the event will lock again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeletingId(photo.id);

            const r = await apiFetch(
              "DELETE",
              `/events/${photo.event_id}/photos/${photo.id}`,
              token,
            );

            setDeletingId(null);
            if (r.ok) {
              // refresing the upload history
              await load();
              await refreshUser();
            } else {
              Alert.alert("Error", r.data?.detail ?? "Could not remove photo");
            }
          },
        },
      ],
    );
  }

  return (
    <>

      <Stack.Screen
        options={{
          title: "My Uploads",

          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.surface,
          headerTitleStyle: { fontWeight: "700" },
          headerBackTitle: "Account",
        }}
      />
      <SafeAreaView style={styles.safe}>
        {loading ? (
          <ActivityIndicator

            color = {COLORS.primary}
            style = {{ marginTop: 40 }}
          />

        ) : (
          <FlatList
            data ={uploads}
            keyExtractor={(p) => p.id}
            contentContainerStyle= {styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons
                  name = "images-outline"
                  size = {48}
                  color = {COLORS.textMuted}
                />
                <Text style = {styles.emptyTitle}>No uploads yet</Text>
                <Text style= {styles.emptySub}>
                  Upload photos to events to see them here.
                </Text>
              </View>
            }
            renderItem ={({ item }) => (
              <View style={styles.row}>
                <View style={styles.thumb}>
                  <AuthImage
                    uri={item.thumbnail_url ?? item.url}
                    token={token ?? ""}
                    style={styles.thumbImg}
                    resizeMode="cover"
                  />
                </View>

                <View style ={styles.info}>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {item.event_title}
                  </Text>
                  <Text style = {styles.date}>{formatDate(item.created_at)}</Text>
                </View>
                <TouchableOpacity

                  style = {styles.deleteBtn}
                  onPress ={() => handleDelete(item)}
                  disabled ={deletingId === item.id}
                  activeOpacity={0.75}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.error} />
                  ) : (
                    <Ionicons

                      name="trash-outline"
                      size={20}
                      color={COLORS.error}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },


  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,

  },
  emptySub: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.xl,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.bgAlt,
  },
  thumbImg: { width: "100%", height: "100%" },

  info: { flex: 1 },
  eventName: {
    fontSize: FONT_SIZES.label,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  date: {
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  deleteBtn: {
    padding: SPACING.sm,
  },
});
