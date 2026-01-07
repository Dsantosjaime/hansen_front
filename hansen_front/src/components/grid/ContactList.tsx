import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spinner } from "@/components/ui/Spinner";
import { DateInput } from "../ui/DateInput";

type ListRow = {
  id: string;
  sentAt: string; // ISO string
  subject: string;
};

type Props = {
  contactId?: string;

  title: string;
  emptyListPlaceHolder: string;

  data: ListRow[];
  isLoading: boolean;
  shouldFetch: boolean;

  onCheckRow?: (id: string) => void;

  onAddLine?: (sentAtISO: string, subject: string) => void | Promise<void>;
};

function formatDateFR(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Convertit "YYYY-MM-DD" -> ISO (ou null si invalide) */
function dateInputToISO(dateStr: string): string | null {
  const v = dateStr.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function CheckCell({
  checked,
  onPress,
}: {
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.checkCell,
        checked && styles.checkBoxChecked,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
    </Pressable>
  );
}

export function ContactList({
  contactId,
  data,
  isLoading,
  shouldFetch,
  title,
  emptyListPlaceHolder,
  onCheckRow,
  onAddLine,
}: Props) {
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");
  const muted = useThemeColor({ light: "#64748B", dark: "#9CA3AF" }, "text");

  const showCheck = !!onCheckRow;
  const canAdd = !!onAddLine;

  // Selection locale (juste pour visuel). La source de vérité peut être dans le parent plus tard.
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Ajout ligne
  const [isAdding, setIsAdding] = useState(false);
  const [draftDate, setDraftDate] = useState(""); // YYYY-MM-DD
  const [draftSubject, setDraftSubject] = useState("");

  const draftISO = useMemo(() => dateInputToISO(draftDate), [draftDate]);
  const canSubmitAdd = !!onAddLine && !!draftISO && !!draftSubject.trim();

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    onCheckRow?.(id);
  };

  const submitAdd = async () => {
    if (!onAddLine) return;
    if (!canSubmitAdd) return;

    await onAddLine(draftISO!, draftSubject.trim());

    // reset UI (POC)
    setDraftDate("");
    setDraftSubject("");
    setIsAdding(false);
  };

  return (
    <View style={[styles.card, { borderColor: border }]}>
      {/* Title bar */}
      <View style={styles.titleBar}>
        <Text style={[styles.sectionTitle, { color: "#FFFFFF" }]}>{title}</Text>

        {canAdd ? (
          <Pressable
            onPress={() => setIsAdding((v) => !v)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.addIconBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une ligne"
          >
            <Ionicons
              name={isAdding ? "close" : "add"}
              size={30}
              color="#FFFFFF"
            />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.headerRow, { borderBottomColor: border }]}>
        {showCheck ? <View style={styles.checkHeaderSpacer} /> : null}

        <Text style={[styles.headerText, { color: "#FFFFFF", flex: 0.35 }]}>
          {"Date d'envoi"}
        </Text>
        <Text style={[styles.headerText, { color: "#FFFFFF", flex: 0.65 }]}>
          Objet
        </Text>
      </View>

      {/* Content */}
      {!shouldFetch ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: muted }]}>
            {emptyListPlaceHolder}
          </Text>
        </View>
      ) : isLoading ? (
        <Spinner fullHeight />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {canAdd && isAdding ? (
            <View style={[styles.row, { borderBottomColor: border }]}>
              <DateInput
                value={draftDate}
                onChange={setDraftDate}
                style={styles.addDateInput}
              />

              <TextInput
                value={draftSubject}
                onChangeText={setDraftSubject}
                placeholder="Objet"
                placeholderTextColor={muted}
                style={styles.addObjectInput}
              />

              <Pressable
                onPress={submitAdd}
                disabled={!canSubmitAdd}
                style={({ pressed }) => [
                  { opacity: !canSubmitAdd ? 0.45 : pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name={"add"} size={30} color="black" />
              </Pressable>
            </View>
          ) : null}

          {data.map((e) => (
            <View
              key={e.id}
              style={[styles.row, { borderBottomColor: border }]}
            >
              {showCheck ? (
                <CheckCell
                  checked={!!checkedIds[e.id]}
                  onPress={() => toggleCheck(e.id)}
                />
              ) : null}

              <Text style={[styles.cellText, { flex: 0.35 }]} numberOfLines={1}>
                {formatDateFR(e.sentAt)}
              </Text>
              <Text style={[styles.cellText, { flex: 0.65 }]} numberOfLines={1}>
                {e.subject}
              </Text>
            </View>
          ))}

          {data.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: muted }]}>
                {emptyListPlaceHolder}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "white",
  },

  titleBar: {
    backgroundColor: "#1F536E",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
    height: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  addIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    backgroundColor: "#1F536E",
    alignItems: "center",
    height: 30,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "900",
  },

  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: 8,
  },

  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  checkCell: {
    height: 25,
    width: 25,
    borderColor: "#1F536E",
    borderWidth: 2,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 13,
    fontWeight: "700",
  },
  checkHeaderSpacer: {
    width: 34,
    marginRight: 10,
  },
  checkBoxChecked: {
    backgroundColor: "#1F536E",
    borderColor: "#1F536E",
  },
  addDateInput: {
    width: 100,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    fontWeight: 700,
    fontSize: 13,
    outline: "none",
    padding: 5,
  },
  addObjectInput: {
    flex: 1,
    height: 35,
    borderRadius: 5,
    borderWidth: 1,
    fontWeight: 700,
    fontSize: 13,
    outline: "none",
    padding: 5,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  emptyText: {
    fontWeight: "700",
  },
});
