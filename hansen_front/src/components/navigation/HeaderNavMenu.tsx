import { useThemeColor } from "@/hooks/use-theme-color";
import * as Menubar from "@radix-ui/react-menubar";
import { Href, router } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";

type NavItem = { label: string; href: string };
type NavCategory =
  | { key: string; label: string; type: "dropdown"; items: NavItem[] }
  | { key: string; label: string; type: "link"; href: string };

export const HeaderNavMenu = memo(function HeaderNavMenu() {
  const headerBg = useThemeColor(
    { light: "#1F536E", dark: "#1F536E" }, // [PLACEHOLDER]
    "background"
  );
  const headerText = useThemeColor(
    { light: "#FFFFFF", dark: "#FFFFFF" },
    "text"
  );

  const nav = useMemo<NavCategory[]>(
    () => [
      {
        key: "admin",
        label: "Administration",
        type: "dropdown",
        items: [
          { label: "Roles", href: "/hansen/admin/userRulesGroups" },
          { label: "Utilisateurs", href: "/hansen/admin/users" },
        ],
      },
      {
        key: "suivi",
        label: "Suivi",
        type: "dropdown",
        items: [
          { label: "Groupes / Sous-Groupes", href: "/hansen/contacts/group" },
          { label: "Contacts", href: "/hansen/contacts" },
        ],
      },
      {
        key: "email",
        label: "Email",
        type: "dropdown",
        items: [
          { label: "Templates d'emails", href: "/hansen/email/templates" },
          { label: "Emails", href: "/hansen/email" },
        ],
      },
      {
        key: "plugin",
        label: "Plugin",
        type: "link",
        href: "/hansen/pluginParams",
      },
      {
        key: "export",
        label: "Export",
        type: "link",
        href: "/hansen/extract",
      },
    ],
    []
  );

  const [openKey, setOpenKey] = useState<string>("");

  const onNavigate = useCallback((href: string) => {
    setOpenKey("");
    router.push(href as Href);
  }, []);

  return (
    <>
      <style>
        {`
          .hm-root { 
            display: flex;
            gap: 14px;
            align-items: center;
            overflow-x: auto;
            padding: 0 8px;
            -webkit-overflow-scrolling: touch;
            background: ${headerBg};
          }

          /**
           * Trigger: underline sous le texte (sans déplacer)
           * On utilise ::after en absolute => pas de layout shift.
           */
          .hm-trigger {
            height: 48px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0;
            margin: 0;

            background: transparent;
            border: none;
            color: ${headerText};

            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            user-select: none;

            position: relative; /* pour ::after */
          }

          .hm-trigger::after {
            content: "";
            position: absolute;
            left: 0;
            width: 100%;
            height: 2px;
            background: #FFFFFF;

            /* Positionne la ligne sous le texte (et pas en bas du header) */
            bottom: 14px; /* [PLACEHOLDER] ajuste (12-16) selon ton header */
            
            opacity: 0;
            transform: scaleX(0.6);
            transform-origin: left;
            transition: opacity 120ms ease, transform 120ms ease;
            pointer-events: none;
          }

          .hm-trigger:hover::after,
          .hm-trigger[data-state="open"]::after {
            opacity: 1;
            transform: scaleX(1);
          }

          .hm-content {
            background: ${headerBg};
            border: none;
            border-radius: 0;      /* coins non arrondis */
            padding: 6px 0;
            min-width: 220px;
            box-shadow: none;      /* sobre, pas d'encadré */
          }

          /**
           * Items dropdown: underline sous le texte (sans déplacer)
           */
          .hm-item {
            padding: 10px 14px;
            color: ${headerText};
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            outline: none;

            background: transparent;
            position: relative; /* pour ::after */
          }

          .hm-item::after {
            content: "";
            position: absolute;
            left: 14px;           /* aligné avec le padding gauche */
            right: 14px;          /* aligné avec le padding droite */
            height: 2px;
            background: #FFFFFF;

            /* Sous le texte à l'intérieur de l'item */
            bottom: 6px;          /* [PLACEHOLDER] ajuste (4-8) selon ton padding */

            opacity: 0;
            transform: scaleX(0.6);
            transform-origin: left;
            transition: opacity 120ms ease, transform 120ms ease;
            pointer-events: none;
          }

          .hm-item:hover::after,
          .hm-item[data-highlighted]::after {
            opacity: 1;
            transform: scaleX(1);
          }
        `}
      </style>

      <div onMouseLeave={() => setOpenKey("")}>
        <Menubar.Root
          className="hm-root"
          value={openKey}
          onValueChange={setOpenKey}
        >
          {nav.map((cat) => {
            if (cat.type === "link") {
              return (
                <Menubar.Menu key={cat.key} value={cat.key}>
                  <Menubar.Trigger
                    className="hm-trigger"
                    onClick={() => onNavigate(cat.href)}
                    onMouseEnter={() => setOpenKey("")}
                  >
                    {cat.label}
                  </Menubar.Trigger>
                </Menubar.Menu>
              );
            }

            return (
              <Menubar.Menu key={cat.key} value={cat.key}>
                <Menubar.Trigger
                  className="hm-trigger"
                  onMouseEnter={() => setOpenKey(cat.key)}
                >
                  {cat.label}
                  <span style={{ opacity: 0.9 }}>▾</span>
                </Menubar.Trigger>

                <Menubar.Portal>
                  <Menubar.Content
                    className="hm-content"
                    align="start"
                    side="bottom"
                    sideOffset={0} // collé au bas de l’item
                  >
                    {cat.items.map((item) => (
                      <Menubar.Item
                        key={item.href}
                        className="hm-item"
                        onSelect={() => onNavigate(item.href)}
                      >
                        {item.label}
                      </Menubar.Item>
                    ))}
                  </Menubar.Content>
                </Menubar.Portal>
              </Menubar.Menu>
            );
          })}
        </Menubar.Root>
      </div>
    </>
  );
});
