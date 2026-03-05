import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import MutualFriendsRow from "../../components/MutualFriendsRow";
import styles from "../../styles/eventStyles";
import { mockEvents } from "../../data/mockEvents";

function buildQrUrl(eventId) {
  const deepLink = `photome://event/${eventId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    deepLink
  )}`;
}

export default function EventDetailsPage() {
  const { id } = useLocalSearchParams();

  const event = useMemo(
    () => mockEvents.find((e) => e.id === id) ?? mockEvents[0],
    [id]
  );

  return (
    <ScrollView style={styles.screen}>
      <Image source={event.image} style={styles.hero} contentFit="cover" />

      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {new Date(event.date).toLocaleString()} · {event.location}
        </Text>

        <MutualFriendsRow
          count={event.mutualFriends}
          profiles={event.mutualProfiles}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={{ marginTop: 8, color: "#6b7280", lineHeight: 22 }}>
            {event.description}
          </Text>
        </View>

        <Pressable style={styles.buttonPrimary}>
          <Text style={styles.buttonTextPrimary}>Join Event</Text>
        </Pressable>

        <Pressable
          style={styles.buttonSecondary}
          onPress={() => router.push(`/event/${event.id}?showQr=1`)}
        >
          <Text style={styles.buttonTextSecondary}>Share Event as QR Code</Text>
        </Pressable>

        <Pressable
          style={styles.buttonSecondary}
          onPress={() => router.push(`/event/${event.id}/photos`)}
        >
          <Text style={styles.buttonTextSecondary}>View Event Photos</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>QR preview</Text>
          <Image
            source={buildQrUrl(event.id)}
            style={{ width: 220, height: 220, alignSelf: "center", marginTop: 14 }}
            contentFit="contain"
          />
        </View>
      </View>
    </ScrollView>
  );
}