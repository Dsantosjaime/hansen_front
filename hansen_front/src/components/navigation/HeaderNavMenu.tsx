import React, { memo, useMemo, useState, useCallback } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/use-theme-color";

type NavItem = { label: string; href: string };
type NavCategory =
  | { key: string; label: string; type: "dropdown"; items: NavItem[] }
  | { key: string; label: string; type: "link"; href: string };

export const HeaderNavMenu = memo(function HeaderNavMenu() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  const chipBg = useThemeColor(
    { light: "#F3F4F6", dark: "#111827" },
    "background"
  );
  const border = useThemeColor({ light: "#E5E7EB", dark: "#1F2937" }, "text");

  const [openKey, setOpenKey] = useState<string | null>(null);

  // Définition data-driven (facile à maintenir)
  const nav = useMemo<NavCategory[]>(
    () => [
      {
        key: "admin",
        label: "Administration",
        type: "dropdown",
        items: [
          { label: "Roles", href: "/admin/roles" }, // [PLACEHOLDER] routes à créer
          { label: "Utilisateurs", href: "/admin/users" }, // [PLACEHOLDER]
        ],
      },
      {
        key: "suivi",
        label: "Suivi",
        type: "dropdown",
        items: [
          { label: "Groupes / Sous-Groupes", href: "/suivi/groups" }, // [PLACEHOLDER]
          { label: "Contacts", href: "/suivi/contacts" }, // [PLACEHOLDER]
        ],
      },
      {
        key: "email",
        label: "Email",
        type: "dropdown",
        items: [
          { label: "Templates d'emails", href: "/email/templates" }, // [PLACEHOLDER]
          { label: "Emails", href: "/email/emails" }, // [PLACEHOLDER]
        ],
      },
      {
        key: "plugin",
        label: "Plugin",
        type: "link",
        href: "/plugin/configuration", // [PLACEHOLDER]
      },
      {
        key: "export",
        label: "Export",
        type: "link",
        href: "/export/contacts", // [PLACEHOLDER]
      },
    ],
    []
  );

  const closeMenu = useCallback(() => setOpenKey(null), []);

  const onNavigate = useCallback((href: Href) => {
    setOpenKey(null);
    router.push(href);
  }, []);

  const openCategory = useCallback((key: string) => setOpenKey(key), []);

  const openedCategory = useMemo(() => {
    if (!openKey) return null;
    return nav.find(
      (c) => c.key === openKey && c.type === "dropdown"
    ) as Extract<NavCategory, { type: "dropdown" }> | null;
  }, [nav, openKey]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {nav.map((cat) => {
          const isOpen = openKey === cat.key;

          if (cat.type === "link") {
            return (
              <Pressable
                key={cat.key}
                onPress={() => onNavigate(cat.href as Href)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: chipBg,
                    borderColor: border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: text }]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={cat.key}
              onPress={() => openCategory(cat.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: chipBg,
                  borderColor: border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: text }]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={text}
                style={{ marginLeft: 6 }}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Dropdown (liste déroulante scrollable) */}
      <Modal
        visible={!!openedCategory}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu} />
        <View
          style={[styles.menu, { backgroundColor: bg, borderColor: border }]}
        >
          <Text style={[styles.menuTitle, { color: text }]} numberOfLines={1}>
            {openedCategory?.label}
          </Text>

          <ScrollView
            style={styles.menuList}
            contentContainerStyle={styles.menuListContent}
          >
            {openedCategory?.items.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => onNavigate(item.href as Href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.menuItemText, { color: text }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  chip: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  menu: {
    position: "absolute",
    top: 80, // [PLACEHOLDER] simple pour POC. Ajustable selon hauteur header/safe area.
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  menuTitle: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: "700",
  },
  menuList: {
    maxHeight: 240, // => "liste déroulante au scroll"
  },
  menuListContent: {
    paddingBottom: 10,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
