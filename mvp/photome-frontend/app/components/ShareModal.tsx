import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Share,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../theme";

interface Props {
  visible: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export default function ShareModal({ visible, eventId, eventTitle, onClose }: Props) {
  const shareText = `Join me at "${eventTitle}" on PhotoMe! 📸`;
  const qrData = `photome://event/${eventId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=1a1a2e&margin=10`;

  async function openWhatsApp() {
    const url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const web = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    Linking.openURL(ok ? url : web);
  }

  async function openInstagram() {
    const ok = await Linking.canOpenURL("instagram://").catch(() => false);
    if (ok) {
      Linking.openURL("instagram://");
    } else {
      Share.share({ message: shareText });
    }
  }

  async function openSnapchat() {
    const ok = await Linking.canOpenURL("snapchat://").catch(() => false);
    if (ok) {
      Linking.openURL("snapchat://");
    } else {
      Share.share({ message: shareText });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <Text style={s.title}>Share Event</Text>
        <Text style={s.subtitle} numberOfLines={1}>{eventTitle}</Text>

        <View style={s.qrWrap}>
          <Image source={{ uri: qrUrl }} style={s.qr} resizeMode="contain" />
          <Text style={s.qrHint}>Scan to join</Text>
        </View>

        <View style={s.socialRow}>
          <TouchableOpacity style={[s.socialBtn, { backgroundColor: "#25D366" }]} onPress={openWhatsApp}>
            <FontAwesome5 name="whatsapp" size={26} color="#fff" />
            <Text style={s.socialLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.socialBtn, { backgroundColor: "#E1306C" }]} onPress={openInstagram}>
            <FontAwesome5 name="instagram" size={26} color="#fff" />
            <Text style={s.socialLabel}>Instagram</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.socialBtn, { backgroundColor: "#FFFC00" }]} onPress={openSnapchat}>
            <FontAwesome5 name="snapchat-ghost" size={26} color="#000" />
            <Text style={[s.socialLabel, { color: "#000" }]}>Snapchat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.socialBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => Share.share({ message: shareText })}
          >
            <Ionicons name="share-outline" size={26} color="#fff" />
            <Text style={s.socialLabel}>More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={onClose}>
          <Text style={s.doneTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  qrWrap: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  qr: { width: 180, height: 180 },
  qrHint: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.label,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  socialBtn: {
    width: 68,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  socialLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  doneBtn: {
    width: "100%",
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  doneTxt: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});
