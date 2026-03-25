import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { AuthContext } from "./context/_AuthContext";
import { getLeaderboard, type Person } from "../components/leaderboardData";

type FriendUser = {
  id: string;
  username: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  total_uploads?: number;
  upload_count?: number;
};

type SearchUser = {
  id: string;
  username: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  is_friend?: boolean;
  request_pending?: boolean;
};

type FriendRequest = {
  id: string;
  from_user_id: string;
  from_username: string;
  from_email: string;
  created_at: string;
};

export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Person[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  const { token } = useContext(AuthContext);
  const [me, setMe] = useState<Person | null>(null);

  const leaderboard = useMemo(() => {
    const combined = me ? [me, ...friends] : friends;
    return getLeaderboard(combined);
  }, [me, friends]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const pendingRequestUserIds = useMemo(
    () =>
      new Set(
        searchResults.filter((u) => u.request_pending).map((u) => u.id)
      ),
    [searchResults]
  );

  useEffect(() => {
    const loadMe = async () => {
      if (!token) return;

      try {
        const API_BASE = "http://192.168.1.173:8000/api/v1";

        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load current user: ${res.status}`);
        }

        const data = await res.json();

        const mappedMe: Person = {
          id: data.id,
          name: "You",
          avatarUri: data.profile_picture_url || undefined,
          photos:
            typeof data.total_uploads === "number"
              ? data.total_uploads
              : typeof data.upload_count === "number"
              ? data.upload_count
              : 0,
        };

        setMe(mappedMe);
      } catch (error) {
        console.error("Failed to load current user:", error);
        setMe(null);
      }
    };

    loadMe();
  }, [token]);

  useEffect(() => {
    const loadFriends = async () => {
      if (!token) {
        setLoadingFriends(false);
        return;
      }

      try {
        setLoadingFriends(true);

        const API_BASE = "http://192.168.1.173:8000/api/v1";

        const res = await fetch(`${API_BASE}/friends/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load friends: ${res.status}`);
        }

        const data = await res.json();
        const rawFriends: FriendUser[] = Array.isArray(data)
          ? data
          : data.items || data.results || [];

        const mappedFriends: Person[] = rawFriends.map((friend) => ({
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

        setFriends(mappedFriends);
      } catch (error) {
        console.error("Failed to load friends:", error);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [token]);

  useEffect(() => {
    const loadFriendRequests = async () => {
      if (!token) {
        setLoadingRequests(false);
        return;
      }

      try {
        setLoadingRequests(true);

        const API_BASE = "http://192.168.1.173:8000/api/v1";

        const res = await fetch(`${API_BASE}/friends/requests`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load friend requests: ${res.status}`);
        }

        const data = await res.json();
        const rawRequests: FriendRequest[] = Array.isArray(data)
          ? data
          : data.items || data.results || [];

        setFriendRequests(rawRequests);
      } catch (error) {
        console.error("Failed to load friend requests:", error);
        setFriendRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadFriendRequests();
  }, [token]);

  useEffect(() => {
    const runSearch = async () => {
      const trimmed = query.trim();

      if (!trimmed) {
        setSearchResults([]);
        return;
      }

      if (!token) return;

      try {
        setSearchLoading(true);

        const API_BASE = "http://192.168.1.173:8000/api/v1";

        const res = await fetch(
          `${API_BASE}/friends/search?q=${encodeURIComponent(trimmed)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Search failed: ${res.status}`);
        }

        const data = await res.json();
        const results = Array.isArray(data)
          ? data
          : data.items || data.results || [];

        setSearchResults(results);
      } catch (error) {
        console.error("Friend search failed:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeout = setTimeout(runSearch, 300);
    return () => clearTimeout(timeout);
  }, [query, token]);

  const sendFriendRequest = async (userId: string) => {
    if (!token) return;

    try {
      setSendingRequestId(userId);

      const API_BASE = "http://192.168.1.173:8000/api/v1";

      const res = await fetch(`${API_BASE}/friends/request/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, request_pending: true } : user
        )
      );
    } catch (error) {
      console.error("Failed to send friend request:", error);
    } finally {
      setSendingRequestId(null);
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    if (!token) return;
  
    try {
      setProcessingRequestId(friendshipId);
  
      const API_BASE = "http://192.168.1.173:8000/api/v1";
  
      const res = await fetch(
        `${API_BASE}/friends/requests/${friendshipId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Accept failed: ${res.status}`);
      }
  
      const acceptedRequest = friendRequests.find((req) => req.id === friendshipId);
  
      if (acceptedRequest) {
        const newFriend: Person = {
          id: acceptedRequest.from_user_id,
          name: acceptedRequest.from_username,
          avatarUri: undefined,
          photos: 0,
        };
  
        setFriends((prev) => {
          if (prev.some((f) => f.id === newFriend.id)) return prev;
          return [...prev, newFriend];
        });
      }
  
      setFriendRequests((prev) =>
        prev.filter((req) => req.id !== friendshipId)
      );
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const declineFriendRequest = async (friendshipId: string) => {
    if (!token) return;
  
    try {
      setProcessingRequestId(friendshipId);
  
      const API_BASE = "http://192.168.1.173:8000/api/v1";
  
      const res = await fetch(
        `${API_BASE}/friends/requests/${friendshipId}/decline`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Decline failed: ${res.status}`);
      }
  
      setFriendRequests((prev) =>
        prev.filter((req) => req.id !== friendshipId)
      );
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const showOverlay = query.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Friends List",
          headerBackTitle: "Account",
        }}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LeaderboardRow
                person={item}
                rank={index + 1}
                highlight={index === 0}
              />
            )}
            ListHeaderComponent={
              <>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={18} color="#6B7280" />
                  <TextInput
                    placeholder="Search users"
                    placeholderTextColor="#9CA3AF"
                    value={query}
                    onChangeText={setQuery}
                    style={styles.searchInput}
                  />
                  {query.length > 0 && (
                    <Pressable onPress={() => setQuery("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>

                <Text style={styles.sectionTitle}>Friend Requests</Text>
                <View style={styles.friendsCard}>
                  {loadingRequests ? (
                    <View style={styles.stateWrap}>
                      <ActivityIndicator size="small" color="#5E35B1" />
                      <Text style={styles.stateText}>Loading requests...</Text>
                    </View>
                  ) : friendRequests.length === 0 ? (
                    <Text style={styles.emptyText}>No pending friend requests</Text>
                  ) : (
                    friendRequests.map((request) => {
                      const isProcessing = processingRequestId === request.id;
                    
                      return (
                        <View key={request.id} style={styles.requestRow}>
                          <View style={styles.requestLeft}>
                            <View style={styles.iconAvatar}>
                              <Ionicons
                                name="person-outline"
                                size={18}
                                color="#5E35B1"
                              />
                            </View>
                    
                            <View style={styles.requestTextWrap}>
                              <Text style={styles.friendName}>{request.from_username}</Text>
                              <Text style={styles.searchUsername}>{request.from_email}</Text>
                            </View>
                          </View>
                    
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={[
                                styles.acceptBtn,
                                isProcessing && styles.actionBtnDisabled,
                              ]}
                              disabled={isProcessing}
                              onPress={() => acceptFriendRequest(request.id)}
                            >
                              <Text style={styles.acceptBtnText}>
                                {isProcessing ? "..." : "Accept"}
                              </Text>
                            </TouchableOpacity>
                    
                            <TouchableOpacity
                              style={[
                                styles.declineBtn,
                                isProcessing && styles.actionBtnDisabled,
                              ]}
                              disabled={isProcessing}
                              onPress={() => declineFriendRequest(request.id)}
                            >
                              <Text style={styles.declineBtnText}>
                                {isProcessing ? "..." : "Decline"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <Text style={styles.sectionTitle}>Friends</Text>
                <View style={styles.friendsCard}>
                  {loadingFriends ? (
                    <View style={styles.stateWrap}>
                      <ActivityIndicator size="small" color="#5E35B1" />
                      <Text style={styles.stateText}>Loading friends...</Text>
                    </View>
                  ) : friends.length === 0 ? (
                    <Text style={styles.emptyText}>No friends yet</Text>
                  ) : (
                    friends.map((f) => (
                      <View key={f.id} style={styles.friendRow}>
                        {f.avatarUri ? (
                          <Image
                            source={{ uri: f.avatarUri }}
                            style={styles.friendAvatar}
                          />
                        ) : (
                          <View style={styles.iconAvatar}>
                            <Ionicons
                              name="person-outline"
                              size={18}
                              color="#5E35B1"
                            />
                          </View>
                        )}
                        <Text style={styles.friendName}>{f.name}</Text>
                      </View>
                    ))
                  )}
                </View>

                <Text style={styles.sectionTitle}>Leaderboard</Text>
              </>
            }
            ListEmptyComponent={
              !loadingFriends ? (
                <Text style={styles.emptyLeaderboardText}>
                  No leaderboard data yet
                </Text>
              ) : null
            }
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          />

          {showOverlay && (
            <Pressable
              style={styles.overlayBackdrop}
              onPress={() => setQuery("")}
            >
              <Pressable style={styles.overlayCard} onPress={() => {}}>
                <Text style={styles.overlayTitle}>Search Results</Text>

                {searchLoading ? (
                  <View style={styles.overlayState}>
                    <ActivityIndicator size="small" color="#5E35B1" />
                    <Text style={styles.overlayStateText}>Searching...</Text>
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.overlayState}>
                    <Text style={styles.overlayStateText}>No users found</Text>
                  </View>
                ) : (
                  searchResults.map((user) => {
                    const displayName = user.full_name?.trim() || user.username;

                    return (
                      <View key={user.id} style={styles.searchResultRow}>
                        <View style={styles.searchResultLeft}>
                          {user.profile_picture_url ? (
                            <Image
                              source={{ uri: user.profile_picture_url }}
                              style={styles.friendAvatar}
                            />
                          ) : (
                            <View style={styles.iconAvatar}>
                              <Ionicons
                                name="person-outline"
                                size={18}
                                color="#5E35B1"
                              />
                            </View>
                          )}

                          <View>
                            <Text style={styles.searchName}>{displayName}</Text>
                            <Text style={styles.searchUsername}>
                              @{user.username}
                            </Text>
                          </View>
                        </View>

                        {friendIds.has(user.id) || user.is_friend ? (
                          <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>Friend</Text>
                          </View>
                        ) : pendingRequestUserIds.has(user.id) ||
                          user.request_pending ? (
                          <View style={styles.pendingPill}>
                            <Text style={styles.pendingPillText}>Pending</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.requestBtn,
                              sendingRequestId === user.id &&
                                styles.requestBtnDisabled,
                            ]}
                            disabled={sendingRequestId === user.id}
                            onPress={() => sendFriendRequest(user.id)}
                          >
                            <Text style={styles.requestBtnText}>
                              {sendingRequestId === user.id
                                ? "Sending..."
                                : "Request"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </Pressable>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

function LeaderboardRow({
  person,
  rank,
  highlight,
}: {
  person: { name: string; avatarUri?: string; photos: number };
  rank: number;
  highlight: boolean;
}) {
  return (
    <View style={[styles.leaderRow, highlight && styles.leaderRowTop]}>
      <View style={styles.leaderLeft}>
        <View style={[styles.rankPill, highlight && styles.rankPillTop]}>
          <Text style={[styles.rankText, highlight && styles.rankTextTop]}>
            {rank}
          </Text>
        </View>

        {person.avatarUri ? (
          <Image source={{ uri: person.avatarUri }} style={styles.leaderAvatar} />
        ) : (
          <View style={styles.iconAvatar}>
            <Ionicons name="person-outline" size={18} color="#5E35B1" />
          </View>
        )}

        <Text style={styles.leaderName}>{person.name}</Text>
      </View>

      <View style={styles.leaderRight}>
        <Ionicons name="trophy" size={16} color="#F59E0B" />
        <Text style={styles.leaderPhotos}>{person.photos}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  searchInput: { marginLeft: 8, flex: 1, color: "#111827" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
    marginBottom: 8,
  },

  friendsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },

  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },

  requestTextWrap: {
    flex: 1,
  },

  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  friendAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  friendName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  emptyText: { paddingVertical: 10, color: "#6B7280" },

  stateWrap: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
  },

  acceptBtn: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 13,
  },

  declineBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  declineBtnText: {
    color: "#991B1B",
    fontWeight: "700",
    fontSize: 13,
  },

  actionBtnDisabled: {
    opacity: 0.6,
  },

  leaderRow: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  leaderRowTop: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },

  iconAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDE7F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  leaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankPillTop: { backgroundColor: "#F59E0B" },
  rankText: { fontWeight: "900", color: "#111827" },
  rankTextTop: { color: "#FFFFFF" },

  leaderAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  leaderName: { fontSize: 14, fontWeight: "800", color: "#111827" },

  leaderRight: { flexDirection: "row", alignItems: "center" },
  leaderPhotos: { marginLeft: 6, fontWeight: "900", color: "#111827" },

  emptyLeaderboardText: {
    marginTop: 12,
    color: "#6B7280",
    textAlign: "center",
  },

  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.12)",
    paddingHorizontal: 16,
    paddingTop: 76,
  },
  overlayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    maxHeight: 420,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  overlayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  overlayState: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayStateText: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
  },

  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  searchResultLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  searchName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  searchUsername: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  requestBtn: {
    backgroundColor: "#5E35B1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  requestBtnDisabled: {
    backgroundColor: "#C4B5FD",
  },
  requestBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  statusPill: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  statusPillText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },

  pendingPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pendingPillText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 12,
  },
});