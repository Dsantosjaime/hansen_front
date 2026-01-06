import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Contact } from "@/services/contactsApi";
import { useThemeColor } from "@/hooks/use-theme-color";

type Mode = "create" | "edit";

type ContactDraft = {
  id?: Contact extends { id: infer T } ? T : string | number;

  firstName: string;
  lastName: string;
  email: string;
  function: string;
  status: string;
  phoneNumber: [string, string];
  group: { id: number; name: string };
  subGroup: { id: number; name: string };
  lastContact: string;
  lastEmail: string;
};

type Props = {
  mode: Mode;
  contactId?: ContactDraft["id"]; // utilisé en mode edit
  initialContact?: Contact | null; // le contact trouvé depuis la grid
  defaultGroup?: { id: number; name: string } | null; // utile en create
  defaultSubGroup?: { id: number; name: string } | null; // utile en create

  onSave: (draft: ContactDraft, mode: Mode) => void | Promise<void>;
  onClose: () => void;
};

function makeDraftFromContact(c: Contact): ContactDraft {
  return {
    // @ts-expect-error [PLACEHOLDER] si Contact n'a pas encore id, ajoute-le au type Contact
    id: c.id,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    function: c.function ?? "",
    status: c.status ?? "",
    phoneNumber: c.phoneNumber ?? ["", ""],
    group: c.group,
    subGroup: c.subGroup,
    lastContact: c.lastContact ?? "",
    lastEmail: c.lastEmail ?? "",
  };
}

function makeEmptyDraft(
  defaultGroup?: { id: number; name: string } | null,
  defaultSubGroup?: { id: number; name: string } | null
): ContactDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    function: "",
    status: "",
    phoneNumber: ["", ""],
    group: defaultGroup ?? { id: -1, name: "" },
    subGroup: defaultSubGroup ?? { id: -1, name: "" },
    lastContact: "",
    lastEmail: "",
  };
}

function isSameDraft(a: ContactDraft, b: ContactDraft) {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.email === b.email &&
    a.function === b.function &&
    a.status === b.status &&
    a.phoneNumber[0] === b.phoneNumber[0] &&
    a.phoneNumber[1] === b.phoneNumber[1] &&
    a.subGroup.name === b.subGroup.name
  );
}

export function ContactInfos({
  mode,
  contactId,
  initialContact,
  defaultGroup,
  defaultSubGroup,
  onSave,
  onClose,
}: Props) {
  const background = useThemeColor(
    { light: "#FFFFFF", dark: "#0B1220" },
    "background"
  );
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const initialDraft = useMemo<ContactDraft>(() => {
    if (mode === "edit" && initialContact)
      return makeDraftFromContact(initialContact);
    return makeEmptyDraft(defaultGroup, defaultSubGroup);
  }, [mode, initialContact, defaultGroup, defaultSubGroup]);

  const initialRef = useRef<ContactDraft>(initialDraft);
  const [draft, setDraft] = useState<ContactDraft>(initialDraft);

  // Resync quand on ouvre un autre contact / change de mode
  useEffect(() => {
    initialRef.current = initialDraft;
    setDraft(initialDraft);
  }, [initialDraft]);

  const dirty = useMemo(() => !isSameDraft(draft, initialRef.current), [draft]);

  const saveColor = dirty ? "#FFFFFF" : "rgba(255,255,255,0.45)"; // icône sur header sombre
  const saveDisabled = !dirty;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      {/* Header actions */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={[styles.subGroup, { color: muted }]} numberOfLines={1}>
            {draft.subGroup.name || "[Sous-Groupe]"}
          </Text>
          <Text style={[styles.title, { color: text }]} numberOfLines={1}>
            {mode === "create"
              ? "Nouveau contact"
              : `${draft.lastName} ${draft.firstName}`.trim() || "Contact"}
          </Text>
        </View>

        <View style={styles.topRight}>
          <Pressable
            disabled={saveDisabled}
            onPress={() => onSave(draft, mode)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: saveDisabled ? 0.5 : pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sauvegarder"
          >
            <Ionicons name="save-outline" size={20} color={saveColor} />
          </Pressable>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statusBox}>
            <Text style={[styles.label, { color: muted }]}>Status</Text>
            <TextInput
              value={draft.status}
              onChangeText={(v) => setDraft((d) => ({ ...d, status: v }))}
              style={[styles.input, { borderColor: border, color: text }]}
              placeholder="[PLACEHOLDER] Actif"
              placeholderTextColor={muted}
            />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.leftCol}>
          <Text style={[styles.label, { color: muted }]}>Sous-Groupe</Text>
          <TextInput
            value={draft.subGroup.name}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, subGroup: { ...d.subGroup, name: v } }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] Sous-Groupe A1"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Nom</Text>
          <TextInput
            value={draft.lastName}
            onChangeText={(v) => setDraft((d) => ({ ...d, lastName: v }))}
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] Dupont"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Prénom</Text>
          <TextInput
            value={draft.firstName}
            onChangeText={(v) => setDraft((d) => ({ ...d, firstName: v }))}
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] Marie"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Email</Text>
          <TextInput
            value={draft.email}
            onChangeText={(v) => setDraft((d) => ({ ...d, email: v }))}
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] marie.dupont@email.com"
            placeholderTextColor={muted}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: muted }]}>Téléphone 1</Text>
          <TextInput
            value={draft.phoneNumber[0]}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, phoneNumber: [v, d.phoneNumber[1]] }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] +33 6 ..."
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Téléphone 2</Text>
          <TextInput
            value={draft.phoneNumber[1]}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, phoneNumber: [d.phoneNumber[0], v] }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="[PLACEHOLDER] +33 1 ..."
            placeholderTextColor={muted}
          />
        </View>
      </View>

      {/* Header overlay background for icons (sobriété) */}
      <View style={styles.headerOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  // overlay “barre header” sombre derrière les actions (pour cohérence intranet)
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "#1F536E", // [PLACEHOLDER] ton header
    zIndex: -1,
  },

  topRow: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLeft: { flexShrink: 1, minWidth: 200 },
  subGroup: { fontSize: 12, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800" },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    width: 180,
    gap: 4,
  },

  content: {
    flex: 1,
    minHeight: 0,
    padding: 16,
  },
  leftCol: {
    flex: 1,
    maxWidth: 520,
    gap: 8,
  },

  label: { fontSize: 12, fontWeight: "800", opacity: 0.9 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "white",
  },
});
