import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "./context/_AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
          name="myUploads"
          options={{
            title: "My Uploads",
            headerStyle:  { backgroundColor: "#1677ff" },
            headerTintColor: "#fff",
            headerBackTitle: "Account",
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
