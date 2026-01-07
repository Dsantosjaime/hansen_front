import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Contact,
  Status,
  useGetContactEmailsQuery,
} from "@/services/contactsApi";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Select } from "../ui/Select";
import { SelectOption } from "../ui/select.types";
import { ContactList } from "@/components/grid/ContactList";
import { skipToken } from "@reduxjs/toolkit/query";

type Mode = "create" | "edit";

type ContactDraft = {
  id?: string | number;

  firstName: string;
  lastName: string;
  email: string;
  function: string;
  status: Status;
  phoneNumber: [string, string];
  group: { id: number; name: string };
  subGroup: { id: number; name: string };
  lastContact: string;
  lastEmail: string;
};

type Props = {
  mode: Mode;
  initialContact?: Contact | null; // le contact trouvé depuis la grid
  defaultGroup?: { id: number; name: string } | null; // utile en create
  defaultSubGroup?: { id: number; name: string } | null; // utile en create
  onClose: () => void;
};

function makeDraftFromContact(c: Contact): ContactDraft {
  return {
    // [PLACEHOLDER] idéalement: Contact doit avoir un id: string
    // si c.id existe déjà chez toi, remplace par `id: c.id`
    id: (c as any).id,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    function: c.function ?? "",
    status: c.status ?? Status.ACTIF,
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
    status: Status.ACTIF,
    phoneNumber: ["", ""],
    group: defaultGroup ?? { id: -1, name: "" },
    subGroup: defaultSubGroup ?? { id: -1, name: "" },
    lastContact: "",
    lastEmail: "",
  };
}

export function ContactInfos({
  mode,
  initialContact,
  defaultGroup,
  defaultSubGroup,
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

  const shouldFetch = mode === "edit" && !!initialContact?.id;

  const queryArg = useMemo(() => {
    return shouldFetch ? { contactId: initialContact?.id! } : skipToken;
  }, [shouldFetch, initialContact?.id]);

  const { data: emails = [], isLoading: listEmailIsLoading } =
    useGetContactEmailsQuery(queryArg);

  const initialRef = useRef<ContactDraft>(initialDraft);
  const [draft, setDraft] = useState<ContactDraft>(initialDraft);

  useEffect(() => {
    initialRef.current = initialDraft;
    setDraft(initialDraft);
  }, [initialDraft]);

  const statusOptions: SelectOption<Status>[] = useMemo(
    () => [
      { value: Status.ACTIF, label: Status.ACTIF },
      { value: Status.INACTIF, label: Status.INACTIF },
    ],
    []
  );

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <TextInput
            value={draft.lastName}
            onChangeText={(v) => setDraft((d) => ({ ...d, lastName: v }))}
            style={[styles.title, { color: text }]}
            placeholder="Nom"
            placeholderTextColor={muted}
          />
          <TextInput
            value={draft.firstName}
            onChangeText={(v) => setDraft((d) => ({ ...d, firstName: v }))}
            style={[styles.title, { color: text }]}
            placeholder="Prénom"
            placeholderTextColor={muted}
          />
        </View>

        <View style={styles.topRight}>
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
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Bloc inputs haut */}
      <View style={styles.content}>
        <View style={styles.inputsCol}>
          <Text style={[styles.label, { color: muted }]}>Poste</Text>
          <TextInput
            value={draft.function}
            onChangeText={(v) => setDraft((d) => ({ ...d, function: v }))}
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="Chargé de recrutement"
            placeholderTextColor={muted}
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: muted }]}>Email</Text>
          <TextInput
            value={draft.email}
            onChangeText={(v) => setDraft((d) => ({ ...d, email: v }))}
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="marie.dupont@email.com"
            placeholderTextColor={muted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputsCol}>
          <Text style={[styles.label, { color: muted }]}>Téléphone 1</Text>
          <TextInput
            value={draft.phoneNumber[0]}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, phoneNumber: [v, d.phoneNumber[1]] }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="+33 6 00 00 00 00"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Téléphone 2</Text>
          <TextInput
            value={draft.phoneNumber[1]}
            onChangeText={(v) =>
              setDraft((d) => ({ ...d, phoneNumber: [d.phoneNumber[0], v] }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="+33 1 00 00 00 00"
            placeholderTextColor={muted}
          />
        </View>

        <View style={[styles.inputsCol, styles.rightInputsCol]}>
          <View style={styles.statusBox}>
            <Select<Status>
              label="Status"
              value={draft.status ?? null}
              options={statusOptions}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              searchable={false}
              showLabel={true}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.inputsCol}>
          <ContactList
            contactId={initialContact?.id}
            title={"Historique des Emails"}
            emptyListPlaceHolder={"Aucun Email envoyés"}
            shouldFetch={shouldFetch}
            isLoading={listEmailIsLoading}
            data={emails}
          />
        </View>
        <View style={styles.inputsCol}>
          <ContactList
            contactId={initialContact?.id}
            title={"Services"}
            emptyListPlaceHolder={"Pas de Services notés"}
            shouldFetch={shouldFetch}
            isLoading={listEmailIsLoading}
            data={emails}
            onAddLine={() => {}}
            onCheckRow={() => {}}
          />
        </View>
        <View style={styles.inputsCol}>
          <ContactList
            contactId={initialContact?.id}
            title={"Rappels"}
            emptyListPlaceHolder={"Pas de Rappels notés"}
            shouldFetch={shouldFetch}
            isLoading={listEmailIsLoading}
            data={emails}
            onAddLine={() => {}}
            onCheckRow={() => {}}
          />
        </View>
      </View>
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

  topRow: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1F536E",
  },
  topLeft: { flexShrink: 1, minWidth: 200, flexDirection: "column" },
  title: { fontSize: 18, fontWeight: "800" },

  topRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  statusBox: { width: 180, gap: 4 },

  content: {
    flex: 1,
    minHeight: 0,
    padding: 16,
    flexDirection: "row",
    gap: 16,
  },
  inputsCol: { flex: 1, gap: 8, flexDirection: "column" },
  rightInputsCol: { alignItems: "flex-end" },

  label: { fontSize: 12, fontWeight: "800", opacity: 0.9 },
  input: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    flexWrap: "wrap",
  },
});
