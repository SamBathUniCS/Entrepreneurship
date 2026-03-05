import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { PEOPLE, getLeaderboard } from "../components/leaderboardData";

export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const people = PEOPLE;
  const leaderboard = getLeaderboard(people);
  

  const filteredFriends = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );


  return (
    <><Stack.Screen
      options={{
        title: "Friends List",
        headerBackTitle: "Account",
      }} /><SafeAreaView style={styles.safe}>
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LeaderboardRow
              person={item}
              rank={index + 1}
              highlight={index === 0} />
          )}
          ListHeaderComponent={<>
            {/* Page title (same “big title” style) */}
            {/* <Text style={styles.pageTitle}>Friends List</Text> */}

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#6B7280" />
              <TextInput
                placeholder="Search friends"
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput} />
            </View>

            {/* Friends section */}
            <Text style={styles.sectionTitle}>Friends</Text>
            <View style={styles.friendsCard}>
              {filteredFriends.map((f) => (
                <View key={f.id} style={styles.friendRow}>
                  {f.avatarUri ? (
                  <Image source={{ uri: f.avatarUri }} style={styles.friendAvatar} />
                ) : (
                  <View style={styles.iconAvatar}>
                    <Ionicons name="person-outline" size={18} color="#5E35B1" />
                  </View>
                )}
                  <Text style={styles.friendName}>{f.name}</Text>
                </View>
              ))}

              {filteredFriends.length === 0 && (
                <Text style={styles.emptyText}>No friends found</Text>
              )}
            </View>

            {/* Leaderboard section */}
            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </>}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false} />
      </SafeAreaView></>
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
          <Text style={[styles.rankText, highlight && styles.rankTextTop]}>{rank}</Text>
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
  content: { padding: 16, paddingBottom: 28 },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
    marginBottom: 12,
  },

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
  friendAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  friendName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  emptyText: { paddingVertical: 10, color: "#6B7280" },

  // Leaderboard rows as “cards”
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
    backgroundColor: "#FEF3C7", // subtle gold for #1
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
});
