import React, { useEffect, useState } from "react";
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  View,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { API_BASE_URL } from "./config";

interface Props {
  /** Relative path (e.g. /api/v1/photos/abc/file) or full URL */
  uri: string | null | undefined;
  token: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
}

/** Convert a relative backend path to a full URL */
function toFullUrl(uri: string): string {
  if (uri.startsWith("http")) return uri;
  // uri is like /api/v1/photos/... — prepend the host only
  return `${API_BASE_URL.replace("/api/v1", "")}${uri}`;
}

// ── Native ────────────────────────────────────────────────────────────────────
// React Native Image supports headers natively
function AuthImageNative({ uri, token, style, resizeMode = "cover" }: Props) {
  if (!uri) return <View style={style as StyleProp<ViewStyle>} />;
  return (
    <Image
      source={{ uri: toFullUrl(uri), headers: { Authorization: `Bearer ${token}` } }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

// ── Web ───────────────────────────────────────────────────────────────────────
// On web, <Image headers> is silently ignored — must fetch + blob URL manually
function AuthImageWeb({ uri, token, style, resizeMode = "cover" }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uri) { setLoading(false); return; }
    let revoked = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const fullUrl = toFullUrl(uri);
        const res = await fetch(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const blob = await res.blob();
        if (!revoked) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch {
        // silently fail — broken image state
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, token]);

  // Flatten the RN style object to a plain CSS object for the web img tag
  const flatStyle = (style as any) ?? {};

  if (loading) {
    return (
      <View style={[flatStyle, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="small" color="#c4b5fd" />
      </View>
    );
  }

  if (!blobUrl) {
    return <View style={flatStyle} />;
  }

  const objectFit =
    resizeMode === "cover"   ? "cover"   :
    resizeMode === "contain" ? "contain" :
    resizeMode === "stretch" ? "fill"    : "none";

  return (
    // @ts-ignore — we're deliberately rendering a web <img> here
    <img
      src={blobUrl}
      style={{
        ...flatStyle,
        objectFit,
        display: "block",
        // RN style uses numeric dimensions — pass them straight through
        width:  flatStyle.width  ?? "100%",
        height: flatStyle.height ?? "100%",
      }}
      alt=""
    />
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
const AuthImage = Platform.OS === "web" ? AuthImageWeb : AuthImageNative;
export default AuthImage;
