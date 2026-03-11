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
  useGetEmailMarketingTemplatesQuery,
  useSendEmailMarketingCampaignMutation,
} from "@/services/emailApi";
import { useGetGroupsQuery } from "@/services/groupsApi";

import * as DocumentPicker from "expo-document-picker";

type Props = {
  onClose: () => void;
  handleSend?: (payload: {
    templateId: number;
    groups: GroupsAndSubGroupSelected;
    campaignId: number;
  }) => void | Promise<void>;
};

type UploadedAttachment = {
  attachmentUrl: string;
  filename: string;
  size: number;
  mimeType: string;
};

export function NewEmail({ onClose, handleSend }: Props) {
  const background = useThemeColor({}, "backgroundDark");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");
  const textDark = useThemeColor({}, "textDark");
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024;

  const [attachmentAsset, setAttachmentAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const onPickAttachment = useCallback(async () => {
    const asset = await pickAttachmentWeb();
    if (!asset) return;

    // Vérif taille (quand dispo)
    if (typeof asset.size === "number" && asset.size > MAX_ATTACHMENT_SIZE) {
      console.warn("Fichier trop volumineux (max 4 Mo)");
      return;
    }

    // DEBUG utile une fois:
    // console.log("Picked asset:", asset);

    setAttachmentAsset(asset);
  }, [MAX_ATTACHMENT_SIZE]);

  const onRemoveAttachment = useCallback(() => {
    setAttachmentAsset(null);
  }, []);

  const { data: groups = [], isFetching } = useGetGroupsQuery();

  const {
    data: templates = [],
    isFetching: templatesFetching,
    isLoading: templatesLoading,
  } = useGetEmailMarketingTemplatesQuery();

  const [sendCampaign, { isLoading: sending }] =
    useSendEmailMarketingCampaignMutation();

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
    () =>
      !!templateId && selected.length > 0 && !sending && !uploadingAttachment,
    [templateId, selected.length, sending, uploadingAttachment]
  );

  const toIdsPayload = useCallback((sel: GroupsAndSubGroupSelected) => {
    const groupIds: string[] = [];
    const subGroupIds: string[] = [];

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

    let attachmentUrl: string | undefined = undefined;

    try {
      if (attachmentAsset) {
        setUploadingAttachment(true);
        const uploaded = await uploadAttachmentWeb(attachmentAsset);
        attachmentUrl = uploaded.attachmentUrl;
      }

      const result = await sendCampaign({
        templateId,
        subGroupIds: subGroupIds.length ? subGroupIds : undefined,
        ...(attachmentUrl ? { attachmentUrl } : {}),
      }).unwrap();

      await handleSend?.({
        templateId,
        groups: selected,
        campaignId: result.campaignId,
      });

      setSelected([]);
      setTemplateId(null);
      setAttachmentAsset(null);
    } finally {
      setUploadingAttachment(false);
    }
  }, [
    templateId,
    selected,
    toIdsPayload,
    attachmentAsset,
    sendCampaign,
    handleSend,
  ]);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: background, borderColor: border },
      ]}
    >
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

          <Pressable
            onPress={onPickAttachment}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une pièce jointe"
          >
            <Ionicons name="attach-outline" size={22} color={text} />
          </Pressable>
        </View>

        {attachmentAsset ? (
          <View style={styles.attachmentRow}>
            <Text
              numberOfLines={1}
              style={[styles.attachmentText, { color: textDark }]}
            >
              {attachmentAsset.name ?? "Pièce jointe"}
            </Text>

            <Pressable
              onPress={onRemoveAttachment}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Retirer la pièce jointe"
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={textDark}
              />
            </Pressable>
          </View>
        ) : null}

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

async function pickAttachmentWeb(): Promise<DocumentPicker.DocumentPickerAsset | null> {
  // Sur WEB, on évite le cache et on veut un vrai File dans asset.file
  const res = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: false,
  });

  if (res.canceled) return null;
  const asset = res.assets[0];

  // On force le contrat: en web on doit avoir asset.file (un vrai File)
  const file = (asset as any).file as File | undefined;
  if (!file) {
    throw new Error(
      "DocumentPicker web: asset.file is missing. Cannot upload as multipart."
    );
  }

  return asset;
}

async function uploadAttachmentWeb(
  asset: DocumentPicker.DocumentPickerAsset
): Promise<UploadedAttachment> {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBase) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");

  const file = (asset as any).file as File | undefined;
  if (!file) throw new Error("Missing asset.file (web) — cannot upload.");

  const form = new FormData();
  form.append("file", file, file.name);

  const r = await fetch(`${apiBase}/campaign-attachments/upload`, {
    method: "POST",
    body: form,
    // IMPORTANT: ne pas définir Content-Type, le navigateur ajoute le boundary
  });

  if (!r.ok) throw new Error(await r.text());
  return await r.json();
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
    flexDirection: "row",
    minWidth: 0,
    justifyContent: "flex-start",
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
  attachmentRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  attachmentText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
});
