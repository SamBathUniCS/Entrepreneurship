import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { AuthContext } from "./context/_AuthContext";
import { COLORS, FONT_SIZES, SPACING } from "./theme";
import { apiFetch } from "../api";

export default function Plans() {
  const { token, user, refreshUser } = useContext(AuthContext);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const currentTier = user?.tier ?? "basic";

  const nextTier = useMemo(() => {
    if (currentTier === "basic") return "pro";
    if (currentTier === "pro") return "business";
    return null;
  }, [currentTier]);

  const handleUpgrade = async (tier: "basic" | "pro" | "business") => {
    if (!token) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    if (tier === currentTier) return;

    try {
      setUpgradingPlan(tier);

      const res = await apiFetch(
        "POST",
        `/admin/users/me/tier?tier=${tier}`,
        token
      );

      if (!res.ok) {
        throw new Error(res.data?.detail || "Upgrade failed.");
      }

      await refreshUser();

      Alert.alert("Success", `Your plan has been updated to ${tier}.`);

      router.replace("/account");
    } catch (error: any) {
      Alert.alert("Upgrade failed", error.message || "Something went wrong.");
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Choose Your Plan</Text>

        <PlanCard
          title="Basic"
          price="Free"
          features={["Download Up To 1080p", "Upload And View Photos"]}
          highlighted={false}
          current={currentTier === "basic"}
          loading={upgradingPlan === "basic"}
          onPress={() => handleUpgrade("basic")}
        />

        <PlanCard
          title="Pro"
          price="£2.99 / Month"
          features={[
            "View Photos Without Uploading",
            "Download Up To 4K",
            "Create Private Events With Friends",
          ]}
          highlighted={nextTier === "pro"}
          current={currentTier === "pro"}
          loading={upgradingPlan === "pro"}
          onPress={() => handleUpgrade("pro")}
        />

        <PlanCard
          title="Business"
          price="£14.99 / Month"
          features={["All Pro Features", "Create Events With Anyone"]}
          highlighted={nextTier === "business"}
          current={currentTier === "business"}
          loading={upgradingPlan === "business"}
          onPress={() => handleUpgrade("business")}
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
  current = false,
  loading = false,
  onPress,
}: {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  current?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.card, highlighted && styles.highlightCard]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.price}>{price}</Text>
        </View>

        {highlighted && !current && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>Recommended</Text>
          </View>
        )}

        {current && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>

      <View style={styles.features}>
        {features.map((f, i) => (
          <Text key={i} style={styles.featureText}>
            • {f}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        disabled={current || loading}
        onPress={onPress}
        style={[
          styles.selectBtn,
          highlighted && styles.selectBtnHighlight,
          current && styles.currentPlanBtn,
          loading && styles.currentPlanBtn,
        ]}
      >
        <Text
          style={[
            styles.selectBtnText,
            highlighted && styles.selectBtnTextHighlight,
            current && styles.currentPlanBtnText,
            loading && styles.currentPlanBtnText,
          ]}
        >
          {current
            ? "Current Plan"
            : loading
            ? "Updating..."
            : highlighted
            ? "Upgrade"
            : "Select Plan"}
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
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

  recommendedBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  recommendedBadgeText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.label,
    fontWeight: "800",
  },

  currentBadge: {
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  currentBadgeText: {
    color: "#4B5563",
    fontSize: FONT_SIZES.label,
    fontWeight: "800",
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

  currentPlanBtn: {
    backgroundColor: "#D1D5DB",
  },

  currentPlanBtnText: {
    color: "#6B7280",
  },
});