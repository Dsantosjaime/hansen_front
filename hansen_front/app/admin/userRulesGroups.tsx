import { Select } from "@/components/ui/Select";
import { SelectOption } from "@/components/ui/select.types";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useThemeColor } from "@/hooks/use-theme-color";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TextInput, StyleSheet, View, Pressable, Text } from "react-native";
import { useGetUserRulesGroupsQuery } from "@/services/userRulesGroupsApi";
import ModifyUserRulesGroup from "@/components/userRulesGroups/ModifyUserRulesGroup";
import { useGetPermissionsDomainsQuery } from "@/services/permissionDomainsApi";
import { UserRulesGroup } from "@/types/userRulesGroup";

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

export default function UserRulesGroupsScreen() {
  // Theme
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundDark = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  // Mode du screen
  const [createMode, setCreateMode] = useState(false);

  const onBackToGroupsList = useCallback(() => {
    setCreateMode(false);
    setNewGroupNameDraft("");
  }, []);

  const onClickCreateNewGroupRules = useCallback(() => {
    setCreateMode(true);
    setNewGroupNameDraft("");
  }, []);

  // API
  const {
    data: userRulesGroups = [],
    isFetching: userRulesGroupsFetching,
    isSuccess: userRulesGroupsSuccess,
    isError: userRulesGroupsError,
  } = useGetUserRulesGroupsQuery();

  const {
    data: permissionsDomains = [],
    isFetching: permissionsDomainsFetching,
    // isSuccess: permissionsDomainsSuccess,
    // isError: permissionsDomainsError,
  } = useGetPermissionsDomainsQuery();

  const groupsBusy = userRulesGroupsFetching || permissionsDomainsFetching;

  // Mode Select - Modify
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [groupDraft, setGroupDraft] = useState<UserRulesGroup | undefined>(
    undefined
  );

  const userRulesGroupsOptions = useMemo<SelectOption<string>[]>(
    () => userRulesGroups.map((g) => ({ value: g.id, label: g.name })),
    [userRulesGroups]
  );

  // Mode création
  const [newGroupNameDraft, setNewGroupNameDraft] = useState("");

  const addNewUserRulesGroup = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      try {
        // TODO: mutation RTKQ: const created = await createUserRulesGroup({ name: trimmed }).unwrap();
        // return created.id;
        return "test";
        // eslint-disable-next-line no-unreachable
      } catch {
        return null;
      }
    },
    []
  );

  const handleCreateAndSelectGroupCreated = useCallback(
    async (rawName: string) => {
      if (!createMode) return;
      const name = rawName.trim();
      if (!name) return;
      const newId = await addNewUserRulesGroup(name);
      if (!newId) return;
      setGroupId(newId);
      setCreateMode(false);
      setNewGroupNameDraft("");
    },
    [addNewUserRulesGroup, createMode]
  );

  // CONFIRM
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const closeConfirm = useCallback(() => setConfirm({ open: false }), []);

  const onDeleteGroupe = useCallback(() => {
    // TODO: delete group (mutation RTK Query + invalidation tags)
  }, []);

  const confirmDeleteGroup = useCallback(() => {
    setConfirm({
      open: true,
      title: "Confirmer la suppression",
      message: "Un nouveau groupe devra être réassigné aux utilisateurs liés",
      confirmText: "Valider",
      cancelText: "Annuler",
      onConfirm: async () => {
        await onDeleteGroupe();
        closeConfirm();
      },
    });
  }, [closeConfirm, onDeleteGroupe]);

  useEffect(() => {
    if (createMode) return;

    if (!userRulesGroupsFetching && userRulesGroupsSuccess) {
      if (userRulesGroups.length === 0) {
        setGroupId(undefined);
        setGroupDraft(undefined);
        return;
      }

      // si aucun groupId => prend le premier
      if (!groupId) {
        setGroupId(userRulesGroups[0].id);
        setGroupDraft(userRulesGroups[0]);
        return;
      }

      // si groupId existe => aligne groupDraft si possible
      const group = userRulesGroups.find((e) => e.id === groupId);
      if (group) setGroupDraft(group);
      // sinon: on garde le draft actuel (utile juste après création, avant refetch)
    }

    if (!userRulesGroupsFetching && userRulesGroupsError) {
      // TODO: gérer erreur si besoin
    }
  }, [
    createMode,
    userRulesGroups,
    userRulesGroupsFetching,
    userRulesGroupsSuccess,
    userRulesGroupsError,
    groupId,
  ]);

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
              accessibilityLabel="Liste des Roles"
            >
              <Ionicons name="list-outline" size={22} color={text} />
              <Text style={[styles.createGroupBtnText, { color: text }]}>
                Liste des Roles
              </Text>
            </Pressable>
          ) : (
            <Select<string>
              label="Role"
              value={groupId ?? null}
              options={userRulesGroupsOptions}
              onChange={(id) => {
                setCreateMode(false);
                setGroupId(id);

                // update immédiat du header sans attendre un refetch
                const g = userRulesGroups.find((x) => x.id === id);
                if (g) setGroupDraft(g);
              }}
              searchable
              searchPlaceholder="Rechercher un role ..."
            />
          )}
        </View>

        <Pressable
          onPress={onClickCreateNewGroupRules}
          style={({ pressed }) => [
            styles.createGroupBtn,
            {
              backgroundColor: backgroundSecond,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un nouveau Role"
        >
          <Ionicons name="add" size={22} color={text} />
          <Text style={[styles.createGroupBtnText, { color: text }]}>
            Ajouter un nouveau Role
          </Text>
        </Pressable>
      </View>

      <View style={[styles.content, { backgroundColor: backgroundDark }]}>
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
              value={createMode ? newGroupNameDraft : groupDraft?.name ?? ""}
              onChangeText={(t) => {
                if (createMode) setNewGroupNameDraft(t);
                // (Hors createMode: tu brancheras plus tard l’update du groupe)
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
        {!createMode && groupDraft && (
          <ModifyUserRulesGroup
            group={groupDraft}
            permissionsDomains={permissionsDomains}
            modifyUserRulesGroup={(modifiedUserRulesGroup) => {
              console.log(modifiedUserRulesGroup);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
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
