import React, { useState, useContext, useEffect } from "react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { token, login } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      router.replace("/(tabs)/home");
    }
  }, [token]);

  async function handleLogin() {
    try {
      await login(email, password);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      alert(err.message || "Login failed");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue to PhotoMe</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          <Button
            title="Login"
            onPress={handleLogin}
            variant="primary"
            size="md"
          />

          <Pressable onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.registerText}>
              Don’t have an account? Sign up
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
