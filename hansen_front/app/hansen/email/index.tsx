import { EmailInfos } from "@/components/emails/EmailInfos";
import { NewEmail } from "@/components/emails/NewEmail";
import { Grid, type GridColumnDef } from "@/components/grid/Grid";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useGetEmailMarketingCampaignsQuery } from "@/services/emailApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PanelState =
  | { type: "grid" }
  | { type: "emailInfos"; emailId: string }
  | { type: "newEmail" };

type CampaignRow = {
  id: string;
  brevoCampaignId: string;
  subject: string;
  status: string;
  createdAt?: string | null;
  scheduledAt?: string | null;
};

function formatDateFR(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default function EmailsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");

  const [panel, setPanel] = useState<PanelState>({ type: "grid" });

  const { data, isFetching } = useGetEmailMarketingCampaignsQuery({
    limit: 50,
    offset: 0,
  });

  const campaigns = useMemo(() => data?.items ?? [], [data?.items]);

  const emails: CampaignRow[] = useMemo(
    () =>
      campaigns.map((c) => ({
        id: c.id,
        brevoCampaignId: c.brevoCampaignId,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt ?? null,
        scheduledAt: c.scheduledAt ?? null,
      })),
    [campaigns]
  );

  const handleOpenEmail = useCallback((emailId: string) => {
    setPanel({ type: "emailInfos", emailId });
  }, []);

  const handleOpenNewEmail = useCallback(() => {
    setPanel({ type: "newEmail" });
  }, []);

  const columns = useMemo<GridColumnDef<CampaignRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Créée le",
        cell: (info) => formatDateFR(info.getValue() as string | null),
      },
      {
        accessorKey: "scheduledAt",
        header: "Programmée le",
        cell: (info) => formatDateFR(info.getValue() as string | null),
      },
      { accessorKey: "brevoCampaignId", header: "ID Campagne" },
      { accessorKey: "subject", header: "Objet" },
      { accessorKey: "status", header: "Statut" },
      {
        id: "actions",
        header: "Consulter",
        enableSorting: false,
        meta: { width: 90 },
        cell: ({ row }) => (
          <Pressable
            onPress={() => handleOpenEmail(row.original.id)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Consulter la campagne"
          >
            <Ionicons name="open-outline" size={18} color="#1F536E" />
          </Pressable>
        ),
      },
    ],
    [handleOpenEmail]
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundLight }]}>
      <View style={styles.pageHeader}>
        <Pressable
          onPress={handleOpenNewEmail}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            { backgroundColor: backgroundSecond },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Nouveau Mail"
          disabled={isFetching}
        >
          <Ionicons name="send-outline" size={20} color={text} />
          <Text style={[styles.btnText, { color: text }]}>Nouveau Mail</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {panel.type === "grid" ? (
          <View style={{ flex: 1 }}>
            <Grid data={emails} columns={columns} pageSize={10} />
          </View>
        ) : null}

        {panel.type === "emailInfos" ? (
          <View style={{ flex: 1 }}>
            <EmailInfos
              emailId={panel.emailId}
              onClose={() => setPanel({ type: "grid" })}
            />
          </View>
        ) : null}

        {panel.type === "newEmail" ? (
          <View style={{ flex: 1 }}>
            <NewEmail onClose={() => setPanel({ type: "grid" })} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    height: 40,
    marginBottom: 15,
  },
  button: {
    height: 35,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
});
