import { Stack } from "expo-router";
import { AuthProvider } from "./context/_AuthContext";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
<<<<<<< Updated upstream
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Slot />
      </Stack>
    </AuthProvider>
=======
    <Stack>
      {/* Tabs: no header */}
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />

      {/* Friends page: header ENABLED by default */}
      <Stack.Screen
        name="friends"
        options={{ title: "Friends List" }}
      />

      {/* Plans page ← ADD THIS */}
      <Stack.Screen
        name="subPlans"
        options={{
          title: "Subscription plans",
          headerBackTitle: "Account", 
        }}
      />

    </Stack>

>>>>>>> Stashed changes
  );
}
