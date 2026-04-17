import React from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { ProtectedRoute } from "../context/_AuthContext";

function QrHeaderButton() {
  return (
    <TouchableOpacity onPress={() => router.push("/qrScan")} style={{ marginRight: 12 }}>
      <Ionicons name="qr-code-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#1677ff" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          tabBarActiveTintColor: "#1677ff",
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            headerRight: () => <QrHeaderButton />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            headerRight: () => <QrHeaderButton />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="images-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="events/[id]"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            headerRight: () => <QrHeaderButton />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
