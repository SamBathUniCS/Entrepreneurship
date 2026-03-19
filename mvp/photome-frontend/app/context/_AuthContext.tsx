import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { API_BASE_URL } from "../../config";
import { apiFetch } from "../../api";

// ── Storage (web + native) ────────────────────────────────────────────────────
const Storage = {
  getItem: (key: string) =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === "web"
      ? Promise.resolve(localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  email?: string;
  tier: string;
  upload_streak: number;
  total_uploads: number;
  has_face_embedding: boolean;
  selfie_url: string | null;
  face_recognition_enabled?: boolean;
  allow_auto_tagging?: boolean;
  bio?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loggedIn: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

// Dev-only: paste a JWT here to bypass the login screen.
// Leave empty in production.
const DEV_BYPASS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzQwMTIxNTUsInN1YiI6IjI0YjEyMDkwLTJmMTAtNGMxZi04ZTgzLTUwMzBiNjNiMjI0MiJ9.iGbcXKFULlVCTVMDSMWJcvVsXXqKQ0UeXu-3LY3GXdk";
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const savedToken = await Storage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
        await loadUser(savedToken);
        return;
      }

      if (DEV_BYPASS_TOKEN) {
        setToken(DEV_BYPASS_TOKEN);
        await Storage.setItem("token", DEV_BYPASS_TOKEN);
        await loadUser(DEV_BYPASS_TOKEN);
      }
    })();
  }, []);

  async function loadUser(t: string) {
    const r = await apiFetch("GET", "/users/me", t);
    if (r.ok && r.data) setUser(r.data);
  }

  const refreshUser = async () => {
    if (token) await loadUser(token);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data.detail)
        ? data.detail
            .map((e: any) => e.msg.split(": ").slice(1).join(": ") || e.msg)
            .join("\n")
        : data.detail || "Login failed";
      throw new Error(msg);
    }
    setToken(data.access_token);
    await Storage.setItem("token", data.access_token);
    await loadUser(data.access_token);
  };

  const signup = async (email: string, username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data.detail)
        ? data.detail
            .map((e: any) => e.msg.split(": ").slice(1).join(": ") || e.msg)
            .join("\n")
        : data.detail || "Signup failed";
      throw new Error(msg);
    }
    await login(email, password);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Storage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loggedIn: !!token,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── ProtectedRoute ────────────────────────────────────────────────────────────
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token, loggedIn } = useContext(AuthContext);

  // useEffect(() => {
  //   if (!token) router.replace("/login");
  // }, [token]);
  //
  // if (!loggedIn) return null;
  return <>{children}</>;
};
