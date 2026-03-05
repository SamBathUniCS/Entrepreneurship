import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function Plans() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.header}>Choose Your Plan</Text>

        {/* Basic */}
        <PlanCard
          title="Basic"
          price="Free"
          features={[
            "Download Up To 1080p",
            "Upload And View Photos",
          ]}
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
          features={[
            "All Pro Features",
            "Create Events With Anyone",
          ]}
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
        style={[
          styles.selectBtn,
          highlighted && styles.selectBtnHighlight,
        ]}
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
