import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/_AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        {/* Tabs: no header */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* Friends page */}
        <Stack.Screen
          name="friends"
          options={{ title: "Friends List" }}
        />

        {/* Subscription Plans */}
        <Stack.Screen
          name="subPlans"
          options={{
            title: "Subscription plans",
            headerBackTitle: "Account",
          }}
        />
        <Stack.Screen name="event/[eventId]" options={{ title: "Event" }} />
        <Stack.Screen name="share/[eventId]" options={{ title: "Share Event" }} />
      </Stack>
    </AuthProvider>
  );
}
