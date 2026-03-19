import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { COLORS, FONT_SIZES, SPACING } from "./theme";

export default function Plans() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Choose Your Plan</Text>

        {/* Basic */}
        <PlanCard
          title="Basic"
          price="Free"
          features={["Download Up To 1080p", "Upload And View Photos"]}
        />

        {/* Pro */}
        <PlanCard
          title="Pro"
          price="£2.99 / Month"
          features={[
            "View Photos Without Uploading",
            "Download Up To 4K",
            "Create Private Events With Friends",
          ]}
          highlighted
        />

        {/* Business */}
        <PlanCard
          title="Business"
          price="£14.99 / Month"
          features={["All Pro Features", "Create Events With Anyone"]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  title,
  price,
  features,
  highlighted = false,
}: {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.card, highlighted && styles.highlightCard]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>

      <View style={styles.features}>
        {features.map((f, i) => (
          <Text key={i} style={styles.featureText}>
            • {f}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectBtn, highlighted && styles.selectBtnHighlight]}
      >
        <Text
          style={[
            styles.selectBtnText,
            highlighted && styles.selectBtnTextHighlight,
          ]}
        >
          Select Plan
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    marginBottom: SPACING.xl,
    color: COLORS.textPrimary,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  highlightCard: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },

  cardTop: {
    marginBottom: SPACING.md,
  },

  planTitle: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  price: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: "700",
    marginTop: SPACING.xs,
    color: COLORS.secondary,
  },

  features: {
    marginBottom: SPACING.lg,
  },

  featureText: {
    fontSize: FONT_SIZES.cardMeta,
    marginBottom: SPACING.sm,
    color: COLORS.textSecondary,
  },

  selectBtn: {
    paddingVertical: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.textMuted,
    alignItems: "center",
  },

  selectBtnHighlight: {
    backgroundColor: COLORS.secondary,
  },

  selectBtnText: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  selectBtnTextHighlight: {
    color: COLORS.surface,
  },
});
