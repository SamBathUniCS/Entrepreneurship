import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function EventDetail() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Event Detail</Text>
      <Text style={styles.subtitle}>Event ID: {id}</Text>
      <Text style={{ marginTop: 12, color: "#6b7280" }}>
        Content coming soon...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f6f6f6" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 16, marginTop: 8, color: "#6b7280" },
});
