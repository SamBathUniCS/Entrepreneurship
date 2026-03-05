import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const DISCOVER_EVENTS = [
  {
    id : "d1",
    title : "Salsa Social",

    date : "05/01/2025",
    image: "https://picsum.photos/seed/salsa/200/200",
  },
  {
    id: "d2",

    title: "Christmas Dinner",
    date: "21/01/2026",
    image: "https://picsum.photos/seed/dinner/200/200",
  },
];

const RECENT_EVENTS = [
  {
    id: "r1",

    title: "Christmas Party",

    date: "05/12/2025",
    image: "https://picsum.photos/seed/christmas/700/500",
  },
  {
    id: "r2",
    title: "City Lights Night",
    
    date: "11/01/2026",
    image: "https://picsum.photos/seed/city/700/500",
  },
  {
    id: "r3",
    title: "Winter Formal",
    date: "22/01/2026",
    image: "https://picsum.photos/seed/winter/700/500",
  },
];

export default function Home() {
  const [recentIndex, setRecentIndex] = useState(0);

  const recentEvent = useMemo(
    () => RECENT_EVENTS[recentIndex],
    [recentIndex]
  );

  function goPrev () {
    setRecentIndex( (prev) =>
      prev === 0 ?RECENT_EVENTS.length - 1 : prev - 1
    );
  }

  function goNext() {
    setRecentIndex ((prev) =>
      prev ===RECENT_EVENTS.length - 1 ? 0 : prev + 1
    );
  }

  return (
    <View style={styles.screen}>


      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>

          <Text style={styles.heroTitle}>PhotoMe</Text>
          <Text style={styles.heroSubtitle}>

            Because Every Moment{"\n"}Has Your Moment
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Discover</Text>

        <View style={styles.discoverList}>
          {DISCOVER_EVENTS.map((event) => (
            <Pressable
              key={event.id}
              style={styles.discoverCard}

              onPress={() => router.push("/(tabs)/search")}
            >
              <View style={styles.discoverText}>

                <Text style={styles.discoverTitle}>{event.title}</Text>
                <Text style={styles.discoverDate}>{event.date}</Text>
              </View>
              <Image source={{ uri: event.image }} style={styles.discoverImage} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Events</Text>

        <View style={styles.recentCard}>
          <Image
            source={{ uri: recentEvent.image }}

            style={styles.recentImage}
          />
          <Text style={styles.recentTitle}>{recentEvent.title}</Text>
          
          <Text style={styles.recentDate}>{recentEvent.date}</Text>
        </View>

        <View style={styles.carouselControls}>
          <Pressable style={styles.carouselButton} onPress={goPrev}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          
          </Pressable>
          <Pressable style={styles.carouselButton} onPress={goNext}>
            <Ionicons name="chevron-forward" size={24} color="#1f2937" />
          </Pressable>
        </View>
      </ScrollView>

      
      <Pressable style={styles.fab} onPress={() => router.push("/qr-scan")}>
        <Image
          source={require("../../assets/images/qr_scan.png")}
          style={styles.fabIcon}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    
    backgroundColor: "#1e88e5",
    paddingTop:32,
    paddingHorizontal:24,
    paddingBottom:28,
  },
  heroTitle: {
    color: "#fff",
    fontSize:28,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#e9f2ff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop:  18,
    marginBottom: 12,
    color: "#111827",
  },
  discoverList: {
    gap: 12,
    paddingHorizontal: 20,
  },
  discoverCard: {
    backgroundColor: "#fff",
    borderRadius:  14,

    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  discoverText: {
    flex: 1,
    paddingRight:12,
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  discoverDate: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
  },
  discoverImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  recentCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  recentImage: {
    width: "100%",
    height: 160,
    borderRadius: 14,
  },
  recentTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  recentDate: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  carouselControls: {
    marginTop: 12,
    marginHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  carouselButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fab: {
    position: "absolute",
    bottom: 26,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5b3df5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    padding: 12,
  },
  fabIcon: {
    width: 86,
    height: 86,
    resizeMode: "contain",
  },
});
