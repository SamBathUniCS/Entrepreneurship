import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  SafeAreaView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getRankForUser, type Person } from "../../components/leaderboardData";
import { AuthContext } from "../context/_AuthContext";

type UploadPhoto = {
  id: string;
  uri: string;
  thumbnailUrl?: string | null;
  eventId: string;
};

type EventItem = {
  id: string;
};

type PhotoPublic = {
  id: string;
  event_id: string;
  url?: string | null;
  thumbnail_url?: string | null;
};

export default function Account() {
  const [faceNotif, setFaceNotif] = useState(false);
  const [autoTag, setAutoTag] = useState(false);
  const [uploads, setUploads] = useState<UploadPhoto[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const { token } = useContext(AuthContext);
  const [userTier, setUserTier] = useState<"basic" | "pro" | "business" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leaderboardPeople, setLeaderboardPeople] = useState<Person[]>([]);
  const myRank = currentUserId
  ? getRankForUser(currentUserId, leaderboardPeople)
  : null; // "me" matches the id in PEOPLE
  const [loadingTier, setLoadingTier] = useState(true);
  
  const displayPlan = userTier
  ? userTier.charAt(0).toUpperCase() + userTier.slice(1)
  : "Loading...";

const nextPlan =
  userTier === "basic"
    ? "pro"
    : userTier === "pro"
    ? "business"
    : "";

  // Replace these with real data later
  const friendsPreview = useMemo(
    () => leaderboardPeople.slice(0, 3),
    [leaderboardPeople]
  );

  useEffect(() => {
    const loadUploads = async () => {
      if (!token) {
        setLoadingUploads(false);
        return;
      }

      try {
        const API_BASE = "http://192.168.1.173:8000/api/v1";
        // If using a real phone, replace localhost with your laptop IP.

        const eventsRes = await fetch(`${API_BASE}/events/?my_events=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!eventsRes.ok) {
          throw new Error(`Failed to fetch events: ${eventsRes.status}`);
        }

        const eventsData = await eventsRes.json();

        // Some APIs return a raw array, others wrap it.
        const events: EventItem[] = Array.isArray(eventsData)
          ? eventsData
          : eventsData.items || eventsData.results || [];

        const photoResponses = await Promise.all(
          events.map(async (event) => {
            const res = await fetch(
              `${API_BASE}/events/${event.id}/photos/my`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );

            if (!res.ok) {
              return [];
            }

            const data = await res.json();
            return Array.isArray(data) ? data : data.items || data.results || [];
          })
        );

        const mergedUploads: UploadPhoto[] = photoResponses
          .flat()
          .map((photo: PhotoPublic) => ({
            id: photo.id,
            uri: photo.thumbnail_url || photo.url || "",
            thumbnailUrl: photo.thumbnail_url,
            eventId: photo.event_id,
          }))
          .filter((photo) => !!photo.uri);

        setUploads(mergedUploads);
      } catch (error) {
        console.error("Failed to load uploaded pictures:", error);
      } finally {
        setLoadingUploads(false);
      }
    };

    loadUploads();
  }, [token]);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!token) {
        setLoadingTier(false);
        return;
      }
  
      try {
        const API_BASE = "http://192.168.1.173:8000/api/v1";
  
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
  
        const data = await res.json();
  
        console.log("users/me returned:", data);
  
        setUserTier(data.tier);
        setCurrentUserId(data.id);
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      } finally {
        setLoadingTier(false);
      }
    };
  
    loadUserInfo();
  }, [token]);

  useEffect(() => {
    const loadFriendsLeaderboard = async () => {
      if (!token) return;
  
      try {
        const API_BASE = "http://192.168.1.173:8000/api/v1";
  
        const res = await fetch(`${API_BASE}/friends/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
  
        if (!res.ok) {
          throw new Error(`Failed to fetch friends: ${res.status}`);
        }
  
        const data = await res.json();
        const rawFriends = Array.isArray(data)
          ? data
          : data.items || data.results || [];
  
        const mappedFriends: Person[] = rawFriends.map((friend: any) => ({
          id: friend.id,
          name: friend.full_name?.trim() || friend.username,
          avatarUri: friend.profile_picture_url || undefined,
          photos:
            typeof friend.total_uploads === "number"
              ? friend.total_uploads
              : typeof friend.upload_count === "number"
              ? friend.upload_count
              : 0,
        }));
  
        setLeaderboardPeople(mappedFriends);
      } catch (error) {
        console.error("Failed to load leaderboard friends:", error);
        setLeaderboardPeople([]);
      }
    };
  
    loadFriendsLeaderboard();
  }, [token]);

  const unreadCount = 5;
  console.log("Account page token:", token);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile + badge */}
          <View style={styles.profileWrap}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                <Ionicons name="person-outline" size={48} color="#5E35B1" />
              </View>

              {unreadCount > 0 && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/friends",
                      params: { section: "leaderboard" },
                    })
                  }
                  hitSlop={8}
                  style={styles.badge}
                >
                  <Ionicons name="trophy" size={13} color="#FFFFFF" />
                  {myRank !== null && (
                    <Text style={styles.badgeRank}>#{myRank}</Text>
                  )}
                </Pressable>
              )}
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Create an Event</Text>
            </TouchableOpacity>
          </View>

          {/* Plan row (NEW) */}
          <PlanRow
            planLabel={displayPlan}
            onPress={() =>
              router.push({
                pathname: "/subPlans",
                params: {
                  currentPlan: userTier ?? "",
                  highlightPlan: nextPlan,
                },
              })
            }
          />          
          {/* Friends List */}
          <SectionHeader
            title="Friends List"
            onPress={() => router.push("/friends")}
          />
          <View style={[styles.row, { marginBottom: 24 }]}>
          {friendsPreview.map((f) =>
            f.avatarUri ? (
              <Image
                key={f.id}
                source={{ uri: f.avatarUri }}
                style={styles.friendAvatar}
              />
            ) : (
              <View key={f.id} style={styles.friendAvatarFallback}>
                <Ionicons name="person-outline" size={16} color="#5E35B1" />
              </View>
            )
          )}

          {leaderboardPeople.length > 3 && (
            <View style={styles.morePill}>
              <Text style={styles.morePillText}>+{leaderboardPeople.length - 3}</Text>
            </View>
          )}
          </View>

          {/* Uploaded Pictures */}
          <SectionHeader title="Uploaded Pictures" />
          <View style={[styles.grid, { marginBottom: 12 }]}>
            {uploads.slice(0, 6).map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                style={styles.tile}
              >
                <Image source={{ uri: p.uri }} style={styles.tileImg} />
              </TouchableOpacity>
            ))}

            {/* Add tile */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.tile, styles.addTile]}
            >
              <Text style={styles.addPlus}>+</Text>
            </TouchableOpacity>
          </View>

          

          {/* Privacy Controls */}
          <Text style={styles.sectionTitlePlain}>Privacy Controls</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
            Enable Facial Recognition Automatically
            </Text>
            <Switch value={autoTag} onValueChange={setAutoTag} />
          </View>
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Enable Facial Recognition Notifications
            </Text>
            <Switch value={faceNotif} onValueChange={setFaceNotif} />
          </View>

          

          <View style={{ height: 28 }} />
        </ScrollView>

        {/* Optional: floating action button like your screenshot */}
        <TouchableOpacity activeOpacity={0.9} style={styles.fab}>
          <Text style={styles.fabIcon}>≡</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <Text onPress={onPress} style={styles.sectionHeaderText}>
      {title} ›
    </Text>
  );
}

/** NEW */
function PlanRow({
  planLabel,
  onPress,
}: {
  planLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.planRow}>
      <Text style={styles.planTitle}>Plan</Text>

      <View style={styles.planPill}>
        <Text style={styles.planPillText}>{planLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  scroll: { padding: 16, paddingBottom: 120 },

  profileWrap: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 6,
  },

  avatarWrap: { position: "relative", marginBottom: 12 },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#EDE7F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 70, height: 70, borderRadius: 35 },

  badge: {
    position: "absolute",
    right: -2,
    top: -4,
    paddingHorizontal: 6,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF9800",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  primaryBtn: {
    backgroundColor: "#5E35B1",
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800" },

  sectionHeaderText: { fontSize: 16, fontWeight: "800", color: "#111827" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  friendAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  morePill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  morePillText: { fontWeight: "800", color: "#111827", fontSize: 12 },

  grid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  tileImg: { width: "100%", height: "100%" },

  addTile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  addPlus: { fontSize: 28, fontWeight: "700", color: "#111827", opacity: 0.7 },

  /** NEW */
  planRow: {
    marginTop: 6,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  planTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  planPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  planPillText: { fontSize: 13, fontWeight: "800", color: "#111827" },

  sectionTitlePlain: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  badgeRank: {
    marginLeft: 4,
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  toggleRow: {
    marginTop: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  toggleLabel: { flex: 1, paddingRight: 12, color: "#111827", fontWeight: "600" },

  friendAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    backgroundColor: "#EDE7F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  fab: {
    position: "absolute",
    bottom: 22,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5E35B1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabIcon: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
});
