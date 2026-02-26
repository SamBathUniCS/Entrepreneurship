import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/_AuthContext";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Slot />
      </Stack>
    </AuthProvider>
  );
}
