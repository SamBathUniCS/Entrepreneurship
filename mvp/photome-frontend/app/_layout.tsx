import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/_AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/logout" options={{ headerShown: false }} />
        <Stack.Screen
          name="friends"
          options={{
            title: "Friends",
            headerStyle: { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="subPlans"
          options={{
            title: "Subscription Plans",
            headerStyle: { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
            headerBackTitle: "Account",
          }}
        />
        {/* face-setup manages its own header */}
        <Stack.Screen name="faceSetup" options={{ headerShown: false }} />
        <Stack.Screen
          name="events/[id]"
          options={{
            title: "Event",
            headerStyle: { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen name="qrScan" options={{ headerShown: false }} />
        <Stack.Screen
          name="share/[eventId]"
          options={{
            title: "Share Event",
            headerStyle: { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="create/[eventId]"
          options={{
            title: "Create",
            headerStyle: { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
