import { Stack } from "expo-router";
import { AuthProvider } from "./context/_AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="friends"
          options={{ title: "Friends List", headerBackTitle: "Account" }}
        />
        <Stack.Screen
          name="subPlans"
          options={{ title: "Subscription plans", headerBackTitle: "Account" }}
        />
        <Stack.Screen name="event/[eventId]" options={{ title: "Event" }} />
        <Stack.Screen name="share/[eventId]" options={{ title: "Share Event" }} />
      </Stack>
    </AuthProvider>
  );
}
