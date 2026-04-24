import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/select.types";

export type MultiSelectionEmailTemplatePayload = {
  pattern: string;
  domain: string;
  extension: string;
};

export type EmailTemplateOption = SelectOption<string> & {
  pattern: string;
};

type ActionValue = "DELETE" | "EMAIL_TEMPLATE";
type WizardStep = "template" | "domain";

type Props = {
  selectedCount: number;
  disabled?: boolean;
  onDelete: () => void | Promise<void>;
  onApplyEmailTemplate: (
    payload: MultiSelectionEmailTemplatePayload
  ) => void | Promise<void>;
  templateOptions: EmailTemplateOption[];
  templatesLoading?: boolean;
};

const actionOptions: SelectOption<ActionValue>[] = [
  { value: "DELETE", label: "Supprimer" },
  { value: "EMAIL_TEMPLATE", label: "Définir le template d'email" },
];

export function MultiSelectionOptions({
  selectedCount,
  disabled = false,
  onDelete,
  onApplyEmailTemplate,
  templateOptions,
  templatesLoading = false,
}: Props) {
  const [action, setAction] = useState<ActionValue>("DELETE");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("template");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [domain, setDomain] = useState("");
  const [extension, setExtension] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const locked = disabled || submitting;
  const hasSelection = selectedCount > 0;
  const canInteract = hasSelection && !locked;

  useEffect(() => {
    if (selectedCount > 0) return;

    setWizardOpen(false);
    setWizardStep("template");
    setSelectedTemplateId(null);
    setDomain("");
    setExtension("");
    setSubmitting(false);
  }, [selectedCount]);

  const selectedTemplate = useMemo(
    () =>
      templateOptions.find((tpl) => tpl.value === selectedTemplateId) ?? null,
    [templateOptions, selectedTemplateId]
  );

  const templatePattern = selectedTemplate?.pattern?.trim() ?? "";
  const templateValid = templatePattern.length > 0;
  const domainValid = domain.trim().length > 0 && extension.trim().length > 0;

  const countLabel = useMemo(() => {
    return `${selectedCount} contact${
      selectedCount > 1 ? "s" : ""
    } sélectionné${selectedCount > 1 ? "s" : ""}`;
  }, [selectedCount]);

  const resetWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardStep("template");
    setSelectedTemplateId(null);
    setDomain("");
    setExtension("");
    setSubmitting(false);
  }, []);

  const onPrimaryAction = useCallback(async () => {
    if (!canInteract) return;

    if (action === "DELETE") {
      await onDelete();
      return;
    }

    setWizardStep("template");
    setWizardOpen(true);
  }, [action, canInteract, onDelete]);

  const onSubmitWizard = useCallback(async () => {
    if (!templateValid || !domainValid || locked) return;

    try {
      setSubmitting(true);

      await onApplyEmailTemplate({
        pattern: templatePattern,
        domain: domain.trim(),
        extension: extension.trim(),
      });

      resetWizard();
    } finally {
      setSubmitting(false);
    }
  }, [
    templateValid,
    domainValid,
    locked,
    onApplyEmailTemplate,
    templatePattern,
    domain,
    extension,
    resetWizard,
  ]);

  return (
    <>
      <View
        style={[styles.root, (!hasSelection || locked) && styles.rootDisabled]}
      >
        <View style={styles.countBox}>
          <Ionicons name="checkmark-done-outline" size={16} color="#1F536E" />
          <Text style={styles.countText}>{countLabel}</Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.selectWrap}>
            <Select<ActionValue>
              label="Action"
              value={action}
              options={actionOptions}
              onChange={(v) => setAction(v as ActionValue)}
              searchable={false}
              disabled={!hasSelection || locked}
            />
          </View>

          <Pressable
            onPress={onPrimaryAction}
            disabled={!canInteract}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canInteract && styles.primaryBtnDisabled,
              pressed && canInteract && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {action === "DELETE" ? "Supprimer" : "Configurer"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={wizardOpen}
        transparent
        animationType="fade"
        onRequestClose={resetWizard}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={resetWizard} />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {"Définir le template d'email"}
            </Text>
            <Text style={styles.modalSubtitle}>{countLabel}</Text>

            {wizardStep === "template" ? (
              <View style={styles.stepContent}>
                {templatesLoading ? (
                  <Text style={styles.helpText}>
                    Chargement des templates...
                  </Text>
                ) : templateOptions.length === 0 ? (
                  <Text style={styles.helpText}>
                    {"Aucun template d'adresse email actif n'est disponible."}
                  </Text>
                ) : (
                  <Select<string>
                    label="Template"
                    value={selectedTemplateId}
                    options={templateOptions}
                    onChange={(v) => setSelectedTemplateId(v as string)}
                    searchable={false}
                    disabled={locked}
                  />
                )}
              </View>
            ) : null}

            {wizardStep === "domain" ? (
              <View style={styles.stepContent}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Template sélectionné</Text>
                  <View style={styles.readonlyBox}>
                    <Text style={styles.readonlyText}>
                      {selectedTemplate?.label ?? ""}
                    </Text>
                    <Text style={styles.readonlySubText}>
                      {selectedTemplate?.pattern ?? ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Domaine</Text>
                  <TextInput
                    value={domain}
                    onChangeText={setDomain}
                    editable={!locked}
                    placeholder="hansen-marine"
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Extension</Text>
                  <TextInput
                    value={extension}
                    onChangeText={setExtension}
                    editable={!locked}
                    placeholder="com"
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              {wizardStep === "domain" ? (
                <Pressable
                  onPress={() => setWizardStep("template")}
                  disabled={locked}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && !locked && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.secondaryBtnText}>Retour</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={resetWizard}
                disabled={locked}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && !locked && styles.btnPressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>Annuler</Text>
              </Pressable>

              {wizardStep === "template" ? (
                <Pressable
                  onPress={() => {
                    if (!templateValid || locked || templatesLoading) return;
                    setWizardStep("domain");
                  }}
                  disabled={
                    !templateValid ||
                    locked ||
                    templatesLoading ||
                    templateOptions.length === 0
                  }
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!templateValid ||
                      locked ||
                      templatesLoading ||
                      templateOptions.length === 0) &&
                      styles.primaryBtnDisabled,
                    pressed &&
                      templateValid &&
                      !locked &&
                      !templatesLoading &&
                      styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Continuer</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onSubmitWizard}
                  disabled={!domainValid || locked}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!domainValid || locked) && styles.primaryBtnDisabled,
                    pressed &&
                      domainValid &&
                      !locked &&
                      styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {submitting ? "Application..." : "Appliquer"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 420,
  },
  rootDisabled: {
    opacity: 0.75,
  },

  countBox: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 2,
    flexShrink: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  controls: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    flexShrink: 0,
  },
  selectWrap: {
    minWidth: 220,
  },

  primaryBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1F536E",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  secondaryBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.8,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  modalCard: {
    width: 520,
    maxWidth: "92%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  stepContent: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  helpText: {
    fontSize: 12,
    color: "#64748B",
  },

  readonlyBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  readonlySubText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
});
