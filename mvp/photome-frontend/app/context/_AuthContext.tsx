import React, { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../../config";
import { router } from "expo-router";

// Cross-platform storage wrapper
const Storage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    } else {
      return SecureStore.getItemAsync(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

interface AuthContextType {
  token: string | null;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  loggedIn: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  // Load token on mount
  useEffect(() => {
    (async () => {
      const savedToken = await Storage.getItem("token");
      if (savedToken) setToken(savedToken);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (Array.isArray(data.detail)) {
        const message = data.detail
          .map((e: any) => {
            const parts = e.msg.split(": ");
            return parts.length > 1 ? parts[1] : e.msg;
          })
          .join("\n");

        throw new Error(message);
      }

      throw new Error(data.detail || "Login failed");
    }

    setToken(data.access_token);
    await Storage.setItem("token", data.access_token);
  };

  const signup = async (email: string, username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (Array.isArray(data.detail)) {
        const message = data.detail
          .map((e: any) => {
            const parts = e.msg.split(": ");
            return parts.length > 1 ? parts[1] : e.msg;
          })
          .join("\n");
        throw new Error(message);
      }

      throw new Error(data.detail || "Signup failed");
    }

    await login(email, password);
  };

  const logout = async () => {
    setToken(null);
    await Storage.removeItem("token");
  };

  const loggedIn = !!token;

  return (
    <AuthContext.Provider value={{ token, loggedIn, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useContext(AuthContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login"); // safe to redirect now
    }
  }, [mounted, token]);

  if (!token) {
    return null; // hide protected content until redirect
  }

  return <>{children}</>;
};
