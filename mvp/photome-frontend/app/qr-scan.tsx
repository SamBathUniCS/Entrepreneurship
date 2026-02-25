import React from "react";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function QrScan() {
  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.content}>

        <Text style={styles.title}>QR Scan</Text>
        <Text style={styles.subtitle}>
          Event Search page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,

    backgroundColor: "#f6f6f6",
  },
  header: {
    height: 56,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 999,
    shadowColor: "#000",
    
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
