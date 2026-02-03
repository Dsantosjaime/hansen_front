import { EmailInfos } from "@/components/emails/EmailInfos";
import { NewEmail } from "@/components/emails/NewEmail";
import { Grid, type GridColumnDef } from "@/components/grid/Grid";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Email } from "@/types/email";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PanelState =
  | { type: "grid" }
  | { type: "emailInfos"; emailId: string }
  | { type: "newEmail" };

export default function EmailsScreen() {
  const backgroundLight = useThemeColor({}, "backgroundLight");
  const backgroundSecond = useThemeColor({}, "backgroundSecond");
  const text = useThemeColor({}, "text");

  const [panel, setPanel] = useState<PanelState>({ type: "grid" });

  const emails: Email[] = [];

  const handleOpenEmail = useCallback((emailId: string) => {
    setPanel({ type: "emailInfos", emailId });
  }, []);

  const handleOpenNewEmail = useCallback(() => {
    setPanel({ type: "newEmail" });
  }, []);

  const columns = useMemo<GridColumnDef<Email>[]>(
    () => [
      {
        accessorKey: "sendingDate",
        header: "Date d'envoi",
        cell: (info) => {
          const v = info.getValue();
          if (!v) return "";
          const d = v instanceof Date ? v : new Date(String(v));
          if (Number.isNaN(d.getTime())) return "";
          return new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(d);
        },
      },
      { accessorKey: "subject", header: "Objet" },
      {
        id: "sender",
        header: "Envoyé par",
        accessorFn: (row) => row.sender?.name ?? "",
        cell: (info) => String(info.getValue() ?? ""),
      },
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
            accessibilityLabel="Consulter l'email"
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
        >
          <Ionicons name="send-outline" size={20} color={text} />
          <Text style={[styles.btnText, { color: text }]}>Nouveau Mail</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {
          <>
            <View
              style={{
                flex: 1,
                display: panel.type === "grid" ? "flex" : "none",
              }}
            >
              <Grid data={emails} columns={columns} pageSize={10} />
            </View>

            <View
              style={{
                flex: 1,
                display: panel.type === "emailInfos" ? "flex" : "none",
              }}
            >
              {panel.type === "emailInfos" ? (
                <EmailInfos
                  emailId={panel.emailId}
                  onClose={() => setPanel({ type: "grid" })}
                />
              ) : null}
            </View>

            <View
              style={{
                flex: 1,
                display: panel.type === "newEmail" ? "flex" : "none",
              }}
            >
              <NewEmail onClose={() => setPanel({ type: "grid" })} />
            </View>
          </>
        }
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
