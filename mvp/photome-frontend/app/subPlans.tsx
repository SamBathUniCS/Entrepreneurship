import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthContext } from "./context/_AuthContext";

export default function Plans() {
  const { currentPlan, highlightPlan } = useLocalSearchParams<{
    currentPlan?: string;
    highlightPlan?: string;
  }>();
  const { token } = useContext(AuthContext);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  // const [currentTier, setCurrentTier] = useState<string>(currentPlan ?? "");
  // const nextTier =
  // currentTier === "basic"
  //   ? "pro"
  //   : currentTier === "pro"
  //   ? "business"
  //   : "";


  const handleUpgrade = async (tier: "basic" | "pro" | "business") => {
    if (!token) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }
  
    try {
      setUpgradingPlan(tier);
  
      const API_BASE = "http://192.168.1.173:8000/api/v1";
      // If using a real phone, replace localhost with your laptop IP.
  
      const res = await fetch(
        `${API_BASE}/admin/users/me/tier?tier=${tier}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Upgrade failed: ${res.status}`);
      }
      // setCurrentTier(tier);

      Alert.alert("Success", `Your plan has been updated to ${tier}.`);
  
      router.replace({
        pathname: "/account",
      });
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
          features={[
            "Download Up To 1080p",
            "Upload And View Photos",
          ]}
          highlighted={highlightPlan === "basic"}
          current={currentPlan === "basic"}
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
          highlighted={highlightPlan === "pro"}
          current={currentPlan === "pro"}
          loading={upgradingPlan === "pro"}
          onPress={() => handleUpgrade("pro")}
        />

        <PlanCard
          title="Business"
          price="£14.99 / Month"
          features={[
            "All Pro Features",
            "Create Events With Anyone",
          ]}
          highlighted={highlightPlan === "business"}
          current={currentPlan === "business"}
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
    <View
      style={[
        styles.card,
        highlighted && styles.highlightCard,
      ]}
    >
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
    backgroundColor: "#F9FAFB",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  back: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  highlightCard: {
    borderWidth: 2,
    borderColor: "#5E35B1",
  },

  currentPlanBtn: {
    backgroundColor: "#D1D5DB",
  },
  
  currentPlanBtnText: {
    color: "#6B7280",
  },

  cardTop: {
    marginBottom: 12,
  },

  planTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  price: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    color: "#5E35B1",
  },

  features: {
    marginBottom: 16,
  },

  featureText: {
    fontSize: 14,
    marginBottom: 6,
    color: "#374151",
  },

  selectBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },

  selectBtnHighlight: {
    backgroundColor: "#5E35B1",
  },

  selectBtnText: {
    fontWeight: "700",
  },

  selectBtnTextHighlight: {
    color: "#FFFFFF",
  },
});