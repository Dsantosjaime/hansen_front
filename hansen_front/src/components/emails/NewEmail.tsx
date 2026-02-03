import Ionicons from "@expo/vector-icons/build/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";
import { Spinner } from "@/components/ui/Spinner";
import { useThemeColor } from "@/hooks/use-theme-color";

import {
  SelectGroupsSubGroups,
  type GroupsAndSubGroupSelected,
} from "@/components/extract/SelectGroupsSubGroups";
import {
  useGetBrevoMarketingTemplatesQuery,
  useSendBrevoMarketingCampaignMutation,
} from "@/services/brevoMarketingApi";
import { useGetGroupsQuery } from "@/services/groupsApi";

type Props = {
  onClose: () => void;

  // Optionnel: si tu veux que le parent soit notifié après un envoi
  handleSend?: (payload: {
    templateId: number;
    groups: GroupsAndSubGroupSelected;
    campaignId: number;
  }) => void | Promise<void>;
};

export function NewEmail({ onClose, handleSend }: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  // Groups
  const { data: groups = [], isFetching } = useGetGroupsQuery();

  // Brevo templates
  const {
    data: templates = [],
    isFetching: templatesFetching,
    isLoading: templatesLoading,
  } = useGetBrevoMarketingTemplatesQuery();

  const [sendCampaign, { isLoading: sending }] =
    useSendBrevoMarketingCampaignMutation();

  const templatesBusy = templatesFetching || templatesLoading;

  const templateOptions = useMemo<SelectOption<number>[]>(
    () =>
      templates.map((t) => ({
        value: t.id,
        label: `${t.subject} (${t.name})`,
      })),
    [templates]
  );

  const [templateId, setTemplateId] = useState<number | null>(null);

  // Group selection
  const ALL = "__ALL__";
  const [filterGroupId, setFilterGroupId] = useState<string>(ALL);

  const filterOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: ALL, label: "Tous" },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups]
  );

  const [selected, setSelected] = useState<GroupsAndSubGroupSelected>([]);

  const canSend = useMemo(
    () => !!templateId && selected.length > 0 && !sending,
    [templateId, selected.length, sending]
  );

  const toIdsPayload = useCallback((sel: GroupsAndSubGroupSelected) => {
    const groupIds: string[] = [];
    const subGroupIds: string[] = [];

    // Mapping tolérant tant que GroupsAndSubGroupSelected n'est pas strictement connu ici
    for (const g of sel as any[]) {
      const gid = String(g?.id ?? "");
      if (gid) groupIds.push(gid);

      const sgs = (g?.subGroups ?? []) as any[];
      for (const sg of sgs) {
        const sid = String(sg?.id ?? sg?.value ?? "");
        if (sid) subGroupIds.push(sid);
      }
    }

    return { groupIds, subGroupIds };
  }, []);

  const onSend = useCallback(async () => {
    if (!templateId) return;
    if (selected.length === 0) return;

    const { subGroupIds } = toIdsPayload(selected);

    const result = await sendCampaign({
      templateId,
      subGroupIds: subGroupIds.length ? subGroupIds : undefined,
    }).unwrap();

    await handleSend?.({
      templateId,
      groups: selected,
      campaignId: result.campaignId,
    });

    // reset après envoi (optionnel)
    setSelected([]);
    setTemplateId(null);
  }, [handleSend, selected, sendCampaign, templateId, toIdsPayload]);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      {/* Header */}
      <View style={[styles.topRow, { backgroundColor: backgroundSecond }]}>
        <View style={styles.headerLeft}>
          <View style={styles.templateSelectWrap}>
            <Select<number>
              label="Template"
              value={templateId}
              options={templateOptions}
              onChange={setTemplateId}
              searchable
              searchPlaceholder={
                templatesBusy
                  ? "Chargement des templates..."
                  : "Choisir un template..."
              }
              disabled={templatesBusy || templateOptions.length === 0}
            />
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: !canSend ? 0.35 : pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="send-outline" size={22} color={text} />
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
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Select<string>
              label="Filtrer"
              value={filterGroupId}
              options={filterOptions}
              onChange={setFilterGroupId}
              searchable
              searchPlaceholder="Rechercher un groupe..."
              disabled={isFetching || filterOptions.length === 0}
            />
          </View>

          <View style={styles.counters}>
            <Text style={[styles.counterText, { color: textDark }]}>
              {`Groupe(s): ${selected.length}`}
            </Text>
            <Text style={[styles.counterText, { color: textDark }]}>
              {`Sous-Groupe(s): ${selected.reduce(
                (sum: number, e: any) => sum + (e.subGroups?.length ?? 0),
                0
              )}`}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { borderColor: border }]}>
          {isFetching ? (
            <View style={styles.center}>
              <Spinner />
              <Text style={[styles.loadingText, { color: muted }]}>
                Chargement…
              </Text>
            </View>
          ) : (
            <SelectGroupsSubGroups
              groups={groups}
              filterGroupId={filterGroupId === ALL ? null : filterGroupId}
              value={selected}
              onChange={setSelected}
            />
          )}
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
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  templateSelectWrap: {
    maxWidth: 520,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    minHeight: 0,
    padding: 16,
    gap: 12,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  counters: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 160,
  },
  counterText: {
    fontSize: 13,
    fontWeight: "800",
  },

  card: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontWeight: "700" },
});
