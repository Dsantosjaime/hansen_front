import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  useGetOmitedFunctionsQuery,
  useAddOmitedFunctionMutation,
  useModifyOmitedFunctionMutation,
  useDeleteOmitedFunctionMutation,
  useGetNameDiscriminatorQuery,
  useAddNameDiscriminatorMutation,
  useModifyNameDiscriminatorMutation,
  useDeleteNameDiscriminatorMutation,
} from "@/services/pluginParamsApi";

type DraftMap = Record<string, string>;

const normalize = (s: string) => s.trim().toLowerCase();

export default function PluginParamsScreen() {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({ light: "#0F172A", dark: "#F9FAFB" }, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  // Queries
  const { data: omitedFunctionsRes, isLoading: omitedLoading } =
    useGetOmitedFunctionsQuery();
  const { data: restrictedNamesRes, isLoading: namesLoading } =
    useGetNameDiscriminatorQuery();

  const omitedFunctions = useMemo(
    () => omitedFunctionsRes?.omitedFunctions ?? [],
    [omitedFunctionsRes?.omitedFunctions]
  );
  const nameDiscriminators = useMemo(
    () => restrictedNamesRes?.nameDiscriminators ?? [],
    [restrictedNamesRes?.nameDiscriminators]
  );

  // Mutations
  const [addOmitedFunction] = useAddOmitedFunctionMutation();
  const [modifyOmitedFunction] = useModifyOmitedFunctionMutation();
  const [deleteOmitedFunction] = useDeleteOmitedFunctionMutation();

  const [addNameDiscriminator] = useAddNameDiscriminatorMutation();
  const [modifyNameDiscriminator] = useModifyNameDiscriminatorMutation();
  const [deleteNameDiscriminator] = useDeleteNameDiscriminatorMutation();

  // Add drafts
  const [newOmited, setNewOmited] = useState("");
  const [newName, setNewName] = useState("");

  const canAddOmited = useMemo(
    () => normalize(newOmited).length > 0,
    [newOmited]
  );
  const canAddName = useMemo(() => normalize(newName).length > 0, [newName]);

  // Row drafts (editable inputs)
  const [omitedDrafts, setOmitedDrafts] = useState<DraftMap>({});
  const [nameDrafts, setNameDrafts] = useState<DraftMap>({});

  // keep drafts in sync when list changes (non-destructive)
  React.useEffect(() => {
    setOmitedDrafts((prev) => {
      const next = { ...prev };
      for (const row of omitedFunctions)
        if (next[row.id] === undefined) next[row.id] = row.function ?? "";
      return next;
    });
  }, [omitedFunctions]);

  React.useEffect(() => {
    setNameDrafts((prev) => {
      const next = { ...prev };
      for (const row of nameDiscriminators)
        if (next[row.id] === undefined) next[row.id] = row.name ?? "";
      return next;
    });
  }, [nameDiscriminators]);

  const onAddOmited = useCallback(async () => {
    const v = normalize(newOmited);
    if (!v) return;
    await addOmitedFunction({ function: v }).unwrap?.();
    setNewOmited("");
  }, [addOmitedFunction, newOmited]);

  const onAddName = useCallback(async () => {
    const v = normalize(newName);
    if (!v) return;
    await addNameDiscriminator({ name: v }).unwrap?.();
    setNewName("");
  }, [addNameDiscriminator, newName]);

  const onCommitOmited = useCallback(
    async (id: string) => {
      const v = normalize(omitedDrafts[id] ?? "");
      // si vide => ne pas envoyer (tu peux aussi décider de supprimer)
      if (!v) return;
      await modifyOmitedFunction({ id, function: v }).unwrap?.();
      // remet draft normalisé (évite réédition qui remet des espaces/majuscules)
      setOmitedDrafts((prev) => ({ ...prev, [id]: v }));
    },
    [modifyOmitedFunction, omitedDrafts]
  );

  const onCommitName = useCallback(
    async (id: string) => {
      const v = normalize(nameDrafts[id] ?? "");
      if (!v) return;
      await modifyNameDiscriminator({ id, name: v }).unwrap?.();
      setNameDrafts((prev) => ({ ...prev, [id]: v }));
    },
    [modifyNameDiscriminator, nameDrafts]
  );

  const onDeleteOmited = useCallback(
    async (id: string) => {
      await deleteOmitedFunction({ id }).unwrap?.();
      setOmitedDrafts((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    [deleteOmitedFunction]
  );

  const onDeleteName = useCallback(
    async (id: string) => {
      await deleteNameDiscriminator({ id }).unwrap?.();
      setNameDrafts((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    [deleteNameDiscriminator]
  );

  const isBusy = omitedLoading || namesLoading;

  return (
    <View style={[styles.container, { backgroundColor: backgroundLight }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: background, borderColor: border },
        ]}
      >
        {/* HEADER 2 colonnes */}
        <View
          style={[
            styles.headerRow,
            { backgroundColor: backgroundSecond, borderBottomColor: border },
          ]}
        >
          <View style={styles.headerCell}>
            <Text style={[styles.headerText, { color: text }]}>
              Postes à ne pas prendre en compte
            </Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerCell}>
            <Text style={[styles.headerText, { color: text }]}>
              Noms discriminants
            </Text>
          </View>
        </View>
        <View style={styles.contentRow}>
          <View style={[styles.column, { borderRightColor: border }]}>
            <View style={[styles.addRow, { borderBottomColor: border }]}>
              <TextInput
                value={newOmited}
                onChangeText={setNewOmited}
                placeholder="Ajouter un poste"
                placeholderTextColor={muted}
                style={[
                  styles.addInput,
                  {
                    borderColor: border,
                    color: textDark,
                    backgroundColor: backgroundLight,
                  },
                ]}
              />
              <Pressable
                onPress={onAddOmited}
                disabled={!canAddOmited}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    opacity: !canAddOmited ? 0.35 : pressed ? 0.7 : 1,
                    borderColor: border,
                    backgroundColor: backgroundSecond,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un poste"
              >
                <Ionicons name="add" size={20} color={text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              {isBusy ? (
                <View style={styles.centerPad}>
                  <Text style={{ color: muted, fontWeight: "700" }}>
                    Chargement…
                  </Text>
                </View>
              ) : (
                <View style={styles.scrollViewChild}>
                  {omitedFunctions.map((row) => (
                    <View style={styles.inputRow} key={row.id}>
                      <TextInput
                        value={omitedDrafts[row.id] ?? row.function ?? ""}
                        onChangeText={(t) =>
                          setOmitedDrafts((prev) => ({ ...prev, [row.id]: t }))
                        }
                        onBlur={() => onCommitOmited(row.id)}
                        placeholder="Poste"
                        placeholderTextColor={muted}
                        style={[
                          styles.itemInput,
                          {
                            borderColor: border,
                            color: textDark,
                            backgroundColor: backgroundLight,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => onDeleteOmited(row.id)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.iconBtn,
                          {
                            opacity: pressed ? 0.7 : 1,
                            borderColor: border,
                            backgroundColor: backgroundSecond,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer"
                      >
                        <Ionicons name="trash-outline" size={18} color={text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>

          {/* RIGHT: Name Discriminators */}
          <View style={styles.column}>
            <View style={[styles.addRow, { borderBottomColor: border }]}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Ajouter un nom"
                placeholderTextColor={muted}
                style={[
                  styles.addInput,
                  {
                    borderColor: border,
                    color: textDark,
                    backgroundColor: backgroundLight,
                  },
                ]}
              />
              <Pressable
                onPress={onAddName}
                disabled={!canAddName}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    opacity: !canAddName ? 0.35 : pressed ? 0.7 : 1,
                    borderColor: border,
                    backgroundColor: backgroundSecond,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un nom discriminant"
              >
                <Ionicons name="add" size={20} color={text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              {isBusy ? (
                <View style={styles.centerPad}>
                  <Text style={{ color: muted, fontWeight: "700" }}>
                    Chargement …
                  </Text>
                </View>
              ) : (
                <View style={styles.scrollViewChild}>
                  {nameDiscriminators.map((row) => (
                    <View style={styles.inputRow} key={row.id}>
                      <TextInput
                        value={nameDrafts[row.id] ?? row.name ?? ""}
                        onChangeText={(t) =>
                          setNameDrafts((prev) => ({ ...prev, [row.id]: t }))
                        }
                        onBlur={() => onCommitName(row.id)}
                        placeholder="Nom"
                        placeholderTextColor={muted}
                        style={[
                          styles.itemInput,
                          {
                            borderColor: border,
                            color: textDark,
                            backgroundColor: backgroundLight,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => onDeleteName(row.id)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.iconBtn,
                          {
                            opacity: pressed ? 0.7 : 1,
                            borderColor: border,
                            backgroundColor: backgroundSecond,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Supprimer"
                      >
                        <Ionicons name="trash-outline" size={18} color={text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  headerCell: {
    flex: 1,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "900",
  },
  headerDivider: {
    width: 12,
  },
  contentRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
  },
  column: {
    flex: 1,
    minHeight: 0,
    borderRightWidth: 1,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  addInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 18,
  },
  scrollViewChild: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  inputRow: {
    flexDirection: "row",
    margin: 5,
    gap: 5,
  },
  itemInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPad: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
