import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";

import { Button } from "../components/button";
import { AuthContext } from "../context/_AuthContext";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { signup } = useContext(AuthContext);

  async function handleSignup() {
    if (!email || !username || !password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      await signup(email, username, password);
      router.replace("/home");
    } catch (err: any) {
      alert(err.message || "Sign Up failed");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to get started with PhotoMe
          </Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          <Button title="Sign Up" onPress={handleSignup} variant="primary" size="md" />

          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.registerText}>
              Already have an account? Login
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: FONT_SIZES.heroTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.heroSubtitle,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm * 2,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.cardMeta,
  },
  registerText: {
    marginTop: SPACING.lg,
    textAlign: "center",
    fontSize: FONT_SIZES.heroSubtitle,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
