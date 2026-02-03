import { ContactList, ContactListHandle } from "@/components/grid/ContactList";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Contact,
  Status,
  useCreateContactMutation,
  useGetContactEmailsQuery,
  useUpdateContactMutation,
} from "@/services/contactsApi";
import { Ionicons } from "@expo/vector-icons";
import { skipToken } from "@reduxjs/toolkit/query";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Select } from "../ui/Select";
import { SelectOption } from "../ui/select.types";

type Mode = "create" | "edit";

type ContactDraft = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  function: string;
  status: Status;
  phoneNumber: string[];
  groupId: string;
  subGroupId: string;
  lastContact: string;
  lastEmail: string;
};

type Props = {
  mode: Mode;
  initialContact?: Contact | null;
  groupIdSelected?: string | null;
  subGroupIdSelected?: string | null;
  onClose: () => void;
  onSaved?: (contact: Contact) => void;
};

function makeDraftFromContact(c: Contact): ContactDraft {
  return {
    id: c.id,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    email: c.email ?? "",
    function: c.function ?? "",
    status: c.status ?? Status.ACTIF,
    phoneNumber: c.phoneNumber ?? [],
    groupId: c.groupId,
    subGroupId: c.subGroupId,
    lastContact: c.lastContact ?? "",
    lastEmail: c.lastEmail ?? "",
  };
}

function makeEmptyDraft(
  seletedGroupId?: string | null,
  selectedSubGroupId?: string | null
): ContactDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    function: "",
    status: Status.ACTIF,
    phoneNumber: ["", ""],
    groupId: seletedGroupId ?? "-1",
    subGroupId: selectedSubGroupId ?? "-1",
    lastContact: "",
    lastEmail: "",
  };
}

export function ContactInfos({
  mode,
  initialContact,
  groupIdSelected,
  subGroupIdSelected,
  onClose,
  onSaved,
}: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const listRef = useRef<ContactListHandle>(null);

  const [createContact, { isLoading: isCreating }] = useCreateContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const saving = isCreating || isUpdating;

  // Mode/Contact "effectifs" internes (create -> edit après save)
  const [effectiveMode, setEffectiveMode] = useState<Mode>(mode);
  const [effectiveContact, setEffectiveContact] = useState<Contact | null>(
    initialContact ?? null
  );

  // Draft affiché
  const [draft, setDraft] = useState<ContactDraft>(() => {
    if (mode === "edit" && initialContact)
      return makeDraftFromContact(initialContact);
    return makeEmptyDraft(groupIdSelected, subGroupIdSelected);
  });

  // resync si le parent change de mode/contact
  useEffect(() => {
    setEffectiveMode(mode);
    setEffectiveContact(initialContact ?? null);

    if (mode === "edit" && initialContact) {
      setDraft(makeDraftFromContact(initialContact));
    } else {
      setDraft(makeEmptyDraft(groupIdSelected, subGroupIdSelected));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialContact?.id, groupIdSelected, subGroupIdSelected]);

  const shouldFetch = effectiveMode === "edit" && !!effectiveContact?.id;

  const queryArg = useMemo(() => {
    return shouldFetch ? { contactId: effectiveContact!.id } : skipToken;
  }, [shouldFetch, effectiveContact]);

  const { data: emails = [], isLoading: listEmailIsLoading } =
    useGetContactEmailsQuery(queryArg);

  const statusOptions: SelectOption<Status>[] = useMemo(
    () => [
      { value: Status.ACTIF, label: Status.ACTIF },
      { value: Status.INACTIF, label: Status.INACTIF },
    ],
    []
  );

  const toDto = useCallback(() => {
    const phoneNumber = (draft.phoneNumber ?? [])
      .map((p) => p.trim())
      .filter(Boolean);

    return {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      function: draft.function.trim(),
      status: draft.status,
      email: draft.email.trim(),
      phoneNumber,
      lastContact: draft.lastContact.trim(),
      lastEmail: draft.lastEmail.trim(),
      groupId: draft.groupId,
      subGroupId: draft.subGroupId,
    };
  }, [draft]);

  // ✅ Create: bouton save activé seulement si prénom/nom/email remplis
  const canSaveCreate = useMemo(() => {
    if (effectiveMode !== "create") return false;
    return (
      !!draft.firstName.trim() &&
      !!draft.lastName.trim() &&
      !!draft.email.trim()
    );
  }, [draft.email, draft.firstName, draft.lastName, effectiveMode]);

  // Anti-spam: mémorise la dernière payload sauvegardée en EDIT
  const lastSavedKeyRef = useRef<string>("");

  // ✅ Auto-save en EDIT (debounced)
  useEffect(() => {
    if (effectiveMode !== "edit") return;
    const id = effectiveContact?.id;
    if (!id) return;

    const payload = toDto();
    const key = JSON.stringify(payload);

    if (key === lastSavedKeyRef.current) return;

    const t = setTimeout(async () => {
      try {
        const updated = await updateContact({ id, data: payload }).unwrap();
        setEffectiveContact(updated);
        lastSavedKeyRef.current = key;
        onSaved?.(updated);
      } catch {
        // Optionnel: toast/rollback
      }
    }, 700);

    return () => clearTimeout(t);
  }, [
    draft,
    effectiveContact?.id,
    effectiveMode,
    onSaved,
    toDto,
    updateContact,
  ]);

  // Save manuel uniquement en CREATE
  const onSave = useCallback(async () => {
    if (effectiveMode !== "create") return;

    if (!canSaveCreate) return;
    if (!draft.groupId || draft.groupId === "-1") return;
    if (!draft.subGroupId || draft.subGroupId === "-1") return;

    try {
      const payload = toDto();
      const created = await createContact(payload).unwrap();

      // passe en edit
      setEffectiveMode("edit");
      setEffectiveContact(created);
      setDraft(makeDraftFromContact(created));

      // évite un auto-save immédiat juste après create
      lastSavedKeyRef.current = JSON.stringify(payload);

      onSaved?.(created);
    } catch {
      // Optionnel: toast
    }
  }, [
    canSaveCreate,
    createContact,
    draft.groupId,
    draft.subGroupId,
    effectiveMode,
    onSaved,
    toDto,
  ]);

  const saveDisabled = effectiveMode === "create" && (saving || !canSaveCreate);

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
          {/* ✅ Bouton Save uniquement en CREATE (désactivé + grisé si champs requis manquants) */}
          {effectiveMode === "create" ? (
            <Pressable
              onPress={onSave}
              disabled={saveDisabled}
              hitSlop={10}
              style={({ pressed }) => {
                const disabled = saveDisabled;

                return [
                  styles.iconBtn,
                  {
                    // rendu "grisé"
                    backgroundColor: disabled
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.16)",
                    opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
                  },
                ];
              }}
              accessibilityRole="button"
              accessibilityLabel="Sauvegarder"
            >
              <Ionicons
                name="save-outline"
                size={26}
                color={saveDisabled ? "#94A3B8" : "#FFFFFF"}
              />
            </Pressable>
          ) : null}

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
            value={draft.phoneNumber[0] ?? ""}
            onChangeText={(v) =>
              setDraft((d) => ({
                ...d,
                phoneNumber: [v, d.phoneNumber[1] ?? ""],
              }))
            }
            style={[styles.input, { borderColor: border, color: text }]}
            placeholder="+33 6 00 00 00 00"
            placeholderTextColor={muted}
          />

          <Text style={[styles.label, { color: muted }]}>Téléphone 2</Text>
          <TextInput
            value={draft.phoneNumber[1] ?? ""}
            onChangeText={(v) =>
              setDraft((d) => ({
                ...d,
                phoneNumber: [d.phoneNumber[0] ?? "", v],
              }))
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
            title={"Historique des Emails"}
            emptyListPlaceHolder={"Aucun Email envoyés"}
            shouldFetch={shouldFetch}
            isLoading={listEmailIsLoading}
            data={emails}
          />
        </View>

        <View style={styles.inputsCol}>
          <ContactList
            title={"Services"}
            emptyListPlaceHolder={"Pas de Services notés"}
            shouldFetch={shouldFetch}
            isLoading={listEmailIsLoading}
            data={emails}
            onAddLine={() => {}}
            onCheckRow={(_id: string, draftSubject: string) => {
              listRef.current?.setDraftFromOutside(draftSubject);
            }}
          />
        </View>

        <View style={styles.inputsCol}>
          <ContactList
            ref={listRef}
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
  topLeft: {
    flexShrink: 1,
    minWidth: 200,
    flexDirection: "column",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
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
    flexDirection: "row",
    gap: 16,
  },
  inputsCol: {
    flex: 1,
    gap: 8,
    flexDirection: "column",
  },
  rightInputsCol: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.9,
  },
  input: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    flexWrap: "wrap",
  },
});
