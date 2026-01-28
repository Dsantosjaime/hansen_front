import { Select } from "@/components/ui/Select";
import { SelectOption } from "@/components/ui/select.types";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useGetGroupsQuery } from "@/services/contactsApi";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TextInput,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
} from "react-native";

const INPUT_WIDTH = 500;

type ConfirmState =
  | { open: false }
  | {
      open: true;
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm: () => void | Promise<void>;
    };

export default function GroupScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundDark = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  // ✅ ids numériques (comme contactsApi)
  const [groupId, setGroupId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  // Header draft
  const [groupDraftName, setGroupDraftName] = useState("");
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");

  // Drafts des sous-groupes
  const [subGroupDraftNames, setSubGroupDraftNames] = useState<
    Record<string, string>
  >({});

  const {
    data: groups = [],
    isLoading: groupsLoading,
    isFetching: groupsFetching,
  } = useGetGroupsQuery();

  const groupsBusy = groupsLoading || groupsFetching;

  const selectedGroup = useMemo(
    () =>
      groupId == null ? null : groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId]
  );

  // ✅ sous-groupes directement depuis le groupe sélectionné
  const subGroups = useMemo(
    () => selectedGroup?.subGroup ?? [],
    [selectedGroup]
  );

  const groupOptions = useMemo<SelectOption<string>[]>(
    () => groups.map((g) => ({ value: g.id, label: g.name })),
    [groups]
  );

  // ✅ confirmation modal
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const closeConfirm = useCallback(() => setConfirm({ open: false }), []);

  const onBackToGroupsList = useCallback(() => {
    setCreateMode(false);
    setNewGroupNameDraft("");
  }, []);

  // ✅ Auto-select premier groupe (hors create)
  useEffect(() => {
    if (createMode) return;

    if (!groups.length) {
      setGroupId(null);
      return;
    }

    // protection post-création: si le groupe créé n'est pas encore revenu dans la liste
    if (createdGroupId != null && groupId === createdGroupId) {
      const nowExists = groups.some((g) => g.id === createdGroupId);
      if (nowExists) setCreatedGroupId(null);
      return;
    }

    const currentIsValid =
      groupId !== null && groups.some((g) => g.id === groupId);
    if (!currentIsValid) setGroupId(groups[0].id);
  }, [createMode, createdGroupId, groupId, groups]);

  // Sync header name (hors create)
  useEffect(() => {
    if (createMode) return;
    setGroupDraftName(selectedGroup?.name ?? "");
  }, [createMode, selectedGroup?.id, selectedGroup?.name]);

  // Reset drafts sous-groupes quand on change de groupe
  useEffect(() => {
    setSubGroupDraftNames({});
  }, [groupId]);

  // ✅ initialise/complète les drafts depuis subGroups (qui vient de selectedGroup)
  useEffect(() => {
    setSubGroupDraftNames((prev) => {
      const next = { ...prev };
      for (const sg of subGroups) {
        if (next[sg.id] === undefined) next[sg.id] = sg.name ?? "";
      }
      return next;
    });
  }, [subGroups]);

  // ---- Delete confirmations (group / subgroup) ----
  const onDeleteGroup = useCallback(() => {
    // TODO: delete group (mutation RTK Query + invalidation tags)
  }, []);

  const onDeleteSubGroup = useCallback(async (_subGroupId: string) => {
    // TODO: delete sub-group (mutation + invalidation tags)
  }, []);

  const confirmDeleteGroup = useCallback(() => {
    setConfirm({
      open: true,
      title: "Confirmer la suppression",
      message: "Tous les contacts liés seront supprimées",
      confirmText: "Valider",
      cancelText: "Annuler",
      onConfirm: async () => {
        await onDeleteGroup();
        closeConfirm();
      },
    });
  }, [closeConfirm, onDeleteGroup]);

  const confirmDeleteSubGroup = useCallback(
    (subGroupId: string) => {
      setConfirm({
        open: true,
        title: "Confirmer la suppression",
        message: "Tous les contacts liés seront supprimées",
        confirmText: "Valider",
        cancelText: "Annuler",
        onConfirm: async () => {
          await onDeleteSubGroup(subGroupId);
          closeConfirm();
        },
      });
    },
    [closeConfirm, onDeleteSubGroup]
  );

  const onUpdateSubGroupName = useCallback(
    async (_subGroupId: string, nextName: string) => {
      const name = nextName.trim();
      if (!name) return;
      // TODO: update sub-group (mutation + invalidation tags)
    },
    []
  );

  // ---- Add subgroup ----
  const [newSubGroupName, setNewSubGroupName] = useState("");

  const canAddSubGroup = useMemo(() => {
    return groupId != null && newSubGroupName.trim().length > 0;
  }, [groupId, newSubGroupName]);

  const addSubGroup = useCallback(
    async (name: string) => {
      if (groupId == null) return;

      const trimmed = name.trim();
      if (!trimmed) return;

      // TODO: create sub-group (mutation + invalidation tags)
      setNewSubGroupName("");
    },
    [groupId]
  );

  // ---- Create group ----
  const addNewGroup = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      try {
        // TODO: create group (mutation RTK Query) -> return created.id
        return "2"; // POC
        // eslint-disable-next-line no-unreachable
      } catch {
        return null;
      }
    },
    []
  );

  const onClickCreateNewGroup = useCallback(() => {
    setCreateMode(true);
    setCreatedGroupId(null);

    // reset UI creation
    setNewGroupNameDraft("");
    setGroupDraftName("");
    setNewSubGroupName("");
    setSubGroupDraftNames({});
    setGroupId(null); // pas de groupe sélectionné pendant la création
  }, []);

  const handleCreateAndSelectGroupCreated = useCallback(
    async (rawName: string) => {
      if (!createMode) return;

      const newId = await addNewGroup(rawName);
      if (!newId) return;

      setCreatedGroupId(newId);
      setGroupId(newId);
      setCreateMode(false);
      setNewGroupNameDraft("");
    },
    [addNewGroup, createMode]
  );

  return (
    <View style={[styles.screen, { backgroundColor: backgroundLight }]}>
      <ConfirmDialog
        open={confirm.open}
        title={confirm.open ? confirm.title : ""}
        message={confirm.open ? confirm.message : ""}
        confirmText={confirm.open ? confirm.confirmText : undefined}
        cancelText={confirm.open ? confirm.cancelText : undefined}
        onCancel={closeConfirm}
        onConfirm={confirm.open ? confirm.onConfirm : () => {}}
        danger
      />

      <View style={styles.topRow}>
        <View>
          {createMode ? (
            <Pressable
              onPress={onBackToGroupsList}
              style={({ pressed }) => [
                styles.createGroupBtn,
                {
                  backgroundColor: backgroundSecond,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Liste des groupes"
            >
              <Ionicons name="list-outline" size={22} color={text} />
              <Text style={[styles.createGroupBtnText, { color: text }]}>
                Liste des groupes
              </Text>
            </Pressable>
          ) : (
            <Select<string>
              label="Groupe"
              value={groupId}
              options={groupOptions}
              onChange={(id) => {
                setCreateMode(false);
                setCreatedGroupId(null);
                setGroupId(id);
              }}
              searchable
              searchPlaceholder="Rechercher un groupe..."
              disabled={groupsBusy || groupOptions.length === 0}
            />
          )}
        </View>

        <Pressable
          onPress={onClickCreateNewGroup}
          disabled={groupsBusy}
          style={({ pressed }) => [
            styles.createGroupBtn,
            {
              backgroundColor: backgroundSecond,
              opacity: groupsBusy ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un nouveau Groupe"
        >
          <Ionicons name="add" size={22} color={text} />
          <Text style={[styles.createGroupBtnText, { color: text }]}>
            Ajouter un nouveau Groupe
          </Text>
        </Pressable>
      </View>

      <View style={[styles.content, { backgroundColor: backgroundDark }]}>
        {/* HEADER */}
        {groupsBusy ? (
          <View
            style={[
              styles.headerContent,
              styles.center,
              { backgroundColor: backgroundSecond },
            ]}
          >
            <Spinner />
          </View>
        ) : (
          <View
            style={[
              styles.headerContent,
              { backgroundColor: backgroundSecond },
            ]}
          >
            <TextInput
              value={createMode ? newGroupNameDraft : groupDraftName}
              onChangeText={(t) => {
                if (createMode) setNewGroupNameDraft(t);
                else setGroupDraftName(t); // TODO: update group name (mutation)
              }}
              onBlur={() => {
                if (createMode)
                  handleCreateAndSelectGroupCreated(newGroupNameDraft);
              }}
              style={[
                styles.textInput,
                styles.title,
                { borderColor: border, color: text },
              ]}
              placeholder={
                createMode ? "Nom du nouveau groupe" : "Nom du groupe"
              }
              placeholderTextColor={muted}
            />

            <View style={styles.headerRight}>
              {!createMode && (
                <Pressable
                  onPress={confirmDeleteGroup}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer le groupe"
                >
                  <Ionicons name="trash-outline" size={22} color={text} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* CONTENT */}
        {groupsBusy ? (
          <View style={[styles.body, styles.center]}>
            <Spinner />
          </View>
        ) : !groupId ? (
          <View style={[styles.body, styles.center]}>
            <Text style={[styles.helperText, { color: muted }]}>
              {createMode
                ? "Saisis un nom de groupe pour le créer, ensuite tu pourras ajouter des sous-groupes."
                : "Sélectionne un groupe pour voir ses sous-groupes."}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.subGroupsScroll}
            contentContainerStyle={styles.subGroupsContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ligne ajout sous-groupe */}
            <View style={[styles.subGroupItem, styles.createSubGroupBtn]}>
              <TextInput
                value={newSubGroupName}
                onChangeText={setNewSubGroupName}
                style={[
                  styles.subGroupInput,
                  { borderColor: border, color: text },
                ]}
                placeholder="Nouveau sous-groupe"
                placeholderTextColor={muted}
                editable={!!groupId}
              />
              <Pressable
                onPress={() => addSubGroup(newSubGroupName)}
                disabled={!canAddSubGroup}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { opacity: !canAddSubGroup ? 0.35 : pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un sous-groupe"
              >
                <Ionicons name="add" size={22} color={text} />
              </Pressable>
            </View>

            <View style={styles.subGroupsGrid}>
              {subGroups.length === 0 ? (
                <View style={[styles.body, styles.center]}>
                  <Text style={[styles.helperText, { color: muted }]}>
                    Aucun sous-groupe pour ce groupe.
                  </Text>
                </View>
              ) : (
                subGroups.map((sg) => {
                  const value = subGroupDraftNames[sg.id] ?? sg.name ?? "";

                  return (
                    <View key={sg.id} style={styles.subGroupItem}>
                      <TextInput
                        value={value}
                        onChangeText={(t) =>
                          setSubGroupDraftNames((prev) => ({
                            ...prev,
                            [sg.id]: t,
                          }))
                        }
                        onEndEditing={(e) =>
                          onUpdateSubGroupName(sg.id, e.nativeEvent.text)
                        }
                        onBlur={() => onUpdateSubGroupName(sg.id, value)}
                        style={[
                          styles.subGroupInput,
                          { borderColor: border, color: text },
                        ]}
                        placeholder="Nom du sous-groupe"
                        placeholderTextColor={muted}
                      />

                      <Pressable
                        onPress={() => confirmDeleteSubGroup(sg.id)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.iconBtn,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer le sous-groupe"
                      >
                        <Ionicons name="trash-outline" size={22} color={text} />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },

  createGroupBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createGroupBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },

  content: {
    flex: 1,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#0B1220",
    overflow: "hidden",
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopRightRadius: 12,
    borderTopLeftRadius: 12,
    height: 64,
    width: "100%",
    padding: 16,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  body: { flex: 1, padding: 16 },
  center: { alignItems: "center", justifyContent: "center" },

  title: { fontSize: 18, fontWeight: "800" },
  textInput: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    flexWrap: "wrap",
    width: INPUT_WIDTH,
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  helperText: { fontSize: 13, fontWeight: "700" },

  subGroupsScroll: { flex: 1 },
  subGroupsContent: { padding: 16 },
  createSubGroupBtn: { marginBottom: 20 },

  subGroupsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  subGroupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subGroupInput: {
    width: INPUT_WIDTH,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 10,
  },
});
