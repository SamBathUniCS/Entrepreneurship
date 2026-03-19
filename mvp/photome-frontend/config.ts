import { Platform } from "react-native";
import Constants from "expo-constants";

// Priority order:
//  1. EXPO_PUBLIC_API_URL env var (set in docker-compose or .env)
//  2. Extra.apiUrl from app.json (for EAS builds)
//  3. Sensible localhost default per platform
function resolveApiBase(): string {
  // Env var set at build/runtime time (works in Docker with EXPO_PUBLIC_*)
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  // From app.json extra block (EAS / managed workflow)
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra) return fromExtra;

  // Local dev fallback
  if (Platform.OS === "android") {
    // Android emulator loopback
    return "http://10.0.2.2:8000/api/v1";
  }
  return "http://localhost:8000/api/v1";
}

export const API_BASE_URL = resolveApiBase();
