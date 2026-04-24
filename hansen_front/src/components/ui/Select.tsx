import React, { useEffect, useMemo, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { SelectProps } from "./select.types";

function toKey(v: string | number) {
  return String(v);
}

const ITEM_HEIGHT_PX = 38;
const MAX_VISIBLE_ITEMS = 10;
const SELECT_PORTAL_Z_INDEX = 999999;

export function Select<T extends string | number>({
  label,
  showLabel = true,

  value,
  options,
  placeholder = "Sélectionner",

  onChange,
  disabled,

  density = "default",

  searchable = false,
  searchPlaceholder = "Rechercher...",

  styles,
}: SelectProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const selectedKey = value === null ? "" : toKey(value);
  const isCompact = density === "compact";

  const queryNorm = query.trim().toLowerCase();

  const map = useMemo(() => {
    const m = new Map<string, T>();
    for (const opt of options) m.set(toKey(opt.value), opt.value);
    return m;
  }, [options]);

  const visibility = useMemo(() => {
    const visible = new Map<string, boolean>();

    if (!searchable || queryNorm.length === 0) {
      for (const opt of options) visible.set(toKey(opt.value), true);
      return visible;
    }

    for (const opt of options) {
      visible.set(
        toKey(opt.value),
        opt.label.toLowerCase().includes(queryNorm)
      );
    }
    return visible;
  }, [options, queryNorm, searchable]);

  const visibleCount = useMemo(() => {
    let count = 0;
    for (const opt of options) {
      if (visibility.get(toKey(opt.value))) count++;
    }
    return count;
  }, [options, visibility]);

  useEffect(() => {
    if (!open || !searchable) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, searchable]);

  useEffect(() => {
    if (!open || !searchable) return;
    const input = searchRef.current;
    if (!input) return;

    const raf = requestAnimationFrame(() => {
      if (document.activeElement !== input) input.focus();
    });

    return () => cancelAnimationFrame(raf);
  }, [open, searchable, queryNorm, visibleCount]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div
      style={{
        display: "grid",
        gap: showLabel && label ? 6 : 0,
        ...(styles?.container ?? {}),
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <SelectPrimitive.Root
          open={open}
          onOpenChange={setOpen}
          value={selectedKey || undefined}
          onValueChange={(k) => {
            const v = map.get(k);
            if (v !== undefined) onChange(v);
          }}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            aria-label={label ?? "select"}
            style={{
              height: isCompact ? 32 : 36,
              minWidth: isCompact ? 140 : 170,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid #E5E7EB",
              background: "#F3F4F6",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              fontWeight: 700,
              fontSize: 13,
              ...(styles?.trigger ?? {}),
            }}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>▾</SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={6}
              onCloseAutoFocus={(e) => {
                if (!searchable) return;
                e.preventDefault();
              }}
              style={{
                minWidth: "var(--radix-select-trigger-width)",
                maxWidth: 520,
                borderRadius: 5,
                border: "1px solid #E5E7EB",
                background: "white",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                zIndex: SELECT_PORTAL_Z_INDEX,
                position: "relative",
                ...(styles?.menu ?? {}),
              }}
            >
              {searchable ? (
                <div style={{ padding: 10, borderBottom: "1px solid #E5E7EB" }}>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      height: 34,
                      borderRadius: 10,
                      border: "1px solid #E5E7EB",
                      padding: "0 10px",
                      fontWeight: 600,
                      ...(styles?.searchInput ?? {}),
                    }}
                  />
                </div>
              ) : null}

              <SelectPrimitive.Viewport
                style={{
                  padding: 8,
                  maxHeight: ITEM_HEIGHT_PX * MAX_VISIBLE_ITEMS + 16,
                }}
              >
                {options.map((opt) => {
                  const key = toKey(opt.value);
                  const isVisible = visibility.get(key) ?? true;

                  return (
                    <SelectPrimitive.Item
                      key={key}
                      value={key}
                      style={{
                        display: isVisible ? "flex" : "none",
                        height: ITEM_HEIGHT_PX,
                        padding: "0 10px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        userSelect: "none",
                        ...(styles?.item ?? {}),
                      }}
                    >
                      <SelectPrimitive.ItemText>
                        {opt.label}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator>
                        ✓
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  );
                })}

                {searchable && queryNorm.length > 0 && visibleCount === 0 ? (
                  <div style={{ padding: 10, opacity: 0.7, fontWeight: 600 }}>
                    Aucun résultat
                  </div>
                ) : null}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    </div>
  );
}
