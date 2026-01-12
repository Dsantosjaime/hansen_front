import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;

  confirmText?: string;
  cancelText?: string;

  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Valider",
  cancelText = "Annuler",
  onCancel,
  onConfirm,
  danger = true,
}: ConfirmDialogProps) {
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onConfirm]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: backgroundSecond, borderColor: border },
          ]}
        >
          <Text style={[styles.title, { color: text }]}>{title}</Text>

          <Text style={[styles.message, { color: muted }]}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                {
                  borderColor: border,
                  opacity: isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={[styles.btnText, { color: text }]}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.btn,
                danger ? styles.btnDanger : styles.btnPrimary,
                { opacity: isSubmitting ? 0.5 : pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>
                {isSubmitting ? "..." : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: 520,
    maxWidth: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  message: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  btnGhost: {
    backgroundColor: "transparent",
  },
  btnPrimary: {
    backgroundColor: "#1F536E",
    borderColor: "#1F536E",
  },
  btnDanger: {
    backgroundColor: "#B91C1C",
    borderColor: "#B91C1C",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
