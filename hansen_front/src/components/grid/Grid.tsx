import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  sortingFns,
  useReactTable,
} from "@tanstack/react-table";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { Select } from "../ui/Select";
import type { SelectOption } from "@/components/ui/select.types";

export type CellUpdatePayload<TData> = {
  row: TData;
  rowIndex: number;
  columnId: string;
  value: unknown;
};

type GridColumnMeta<TData extends object> = {
  editable?: boolean;
  inputType?: "text" | "email" | "tel";

  editor?: "text" | "select";
  selectOptions?: { value: string; label: string }[];

  updateValue?: (row: TData, value: unknown, columnId: string) => TData;
  width?: number;

  /**
   * ✅ NEW: style du container d'éditeur (utile pour colorer le Select "Statut")
   */
  editorContainerStyle?: (args: {
    value: unknown;
    row: TData;
    columnId: string;
  }) => any;
};

export type GridColumnDef<TData extends object> = ColumnDef<TData, unknown> & {
  meta?: GridColumnMeta<TData>;
};

type DataGridProps<TData extends object> = {
  data: TData[];
  columns: GridColumnDef<TData>[];
  pageSize?: number;
  initialPageIndex?: number;
  getRowId?: (row: TData, index: number) => string;
  onCellUpdate?: (payload: CellUpdatePayload<TData>) => void;

  clipboardEnabled?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getPageItems(pageIndex: number, pageCount: number, maxButtons = 7) {
  const pages: (number | "…")[] = [];
  if (pageCount <= maxButtons) {
    for (let i = 0; i < pageCount; i++) pages.push(i);
    return pages;
  }

  const last = pageCount - 1;
  const windowSize = maxButtons - 2;
  const half = Math.floor(windowSize / 2);

  const start = clamp(pageIndex - half, 1, last - windowSize);
  const end = start + windowSize - 1;

  pages.push(0);
  if (start > 1) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < last - 1) pages.push("…");
  pages.push(last);

  return pages;
}

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  if (dir === "asc") return <Text style={styles.sortIcon}>↑</Text>;
  if (dir === "desc") return <Text style={styles.sortIcon}>↓</Text>;
  return <Text style={[styles.sortIcon, styles.sortIconIdle]}>↕</Text>;
}

function EditableCell<TData extends object>(props: {
  getValue: () => unknown;
  rowIndex: number;
  rowOriginal: TData;
  columnId: string;
  table: any;
  inputType?: "text" | "email" | "tel";
  meta?: GridColumnMeta<TData>;
  clipboardEnabled: boolean;
}) {
  const initial = String(props.getValue() ?? "");
  const [val, setVal] = useState(initial);

  const skipNextBlurCommitRef = useRef(false);
  const lastCommittedRef = useRef<unknown>(initial);

  useEffect(() => {
    const next = String(props.getValue() ?? "");
    setVal(next);
    lastCommittedRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const commit = (nextValue?: unknown) => {
    const valueToSave = nextValue ?? val;

    if (valueToSave === lastCommittedRef.current) return;
    lastCommittedRef.current = valueToSave;

    props.table.options.meta?.updateData?.(
      props.rowIndex,
      props.rowOriginal,
      props.columnId,
      valueToSave
    );
  };

  const preventIfNoClipboard = (e: any) => {
    if (props.clipboardEnabled) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
  };

  const preventClipboardShortcuts = (e: any) => {
    if (props.clipboardEnabled) return;
    const key = String(e?.key ?? "").toLowerCase();
    const ctrl = Boolean(e?.ctrlKey);
    const meta = Boolean(e?.metaKey);
    if ((ctrl || meta) && (key === "c" || key === "v" || key === "x")) {
      preventIfNoClipboard(e);
    }
  };

  // ----- Editor "select" -----
  if (props.meta?.editor === "select" && props.meta.selectOptions) {
    const options = props.meta.selectOptions as SelectOption<string>[];

    const extraStyle = props.meta.editorContainerStyle?.({
      value: val,
      row: props.rowOriginal,
      columnId: props.columnId,
    });

    return (
      <View
        style={[
          !props.clipboardEnabled ? styles.noSelect : null,
          extraStyle ?? null,
        ]}
      >
        <Select
          value={val}
          options={options}
          onChange={(v) => {
            const next = String(v ?? "");
            setVal(next);
            commit(v);
          }}
          searchable={false}
          showLabel={false}
          density="compact"
        />
      </View>
    );
  }

  const webBlockInputProps: any = props.clipboardEnabled
    ? {}
    : {
        onCopy: preventIfNoClipboard,
        onCut: preventIfNoClipboard,
        onPaste: preventIfNoClipboard,
        onContextMenu: preventIfNoClipboard,
        onKeyDown: preventClipboardShortcuts,
      };

  return (
    <TextInput
      value={val}
      onChangeText={setVal}
      onSubmitEditing={() => {
        skipNextBlurCommitRef.current = true;
        commit();
      }}
      onBlur={() => {
        if (skipNextBlurCommitRef.current) {
          skipNextBlurCommitRef.current = false;
          return;
        }
        commit();
      }}
      keyboardType={
        props.inputType === "email"
          ? "email-address"
          : props.inputType === "tel"
          ? "phone-pad"
          : "default"
      }
      style={[styles.input, !props.clipboardEnabled ? styles.noSelect : null]}
      selectTextOnFocus={false}
      {...webBlockInputProps}
    />
  );
}

export function Grid<TData extends object>({
  data,
  columns,
  pageSize = 10,
  initialPageIndex = 0,
  getRowId,
  onCellUpdate,
  clipboardEnabled = true,
}: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize,
  });

  const [localData, setLocalData] = useState<TData[]>(data);
  useEffect(() => setLocalData(data), [data]);

  useEffect(() => {
    const nextPageCount = Math.max(1, Math.ceil(localData.length / pageSize));
    const maxPageIndex = nextPageCount - 1;

    setPagination((prev) => {
      const nextIndex = Math.min(prev.pageIndex, maxPageIndex);
      if (nextIndex === prev.pageIndex) return prev;
      return { ...prev, pageIndex: nextIndex };
    });
  }, [localData.length, pageSize]);

  const resolvedColumns = useMemo<GridColumnDef<TData>[]>(() => {
    return columns.map((c) => ({
      sortingFn: "alphanumeric",
      ...c,
    }));
  }, [columns]);

  const table = useReactTable({
    data: localData,
    columns: resolvedColumns,
    sortingFns: { alphanumeric: sortingFns.alphanumeric },

    state: { sorting, pagination },

    onSortingChange: (updater) => {
      setSorting(updater as any);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },

    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId as any,

    autoResetPageIndex: false,
    autoResetAll: false,

    meta: {
      updateData: (
        rowIndex: number,
        rowOriginal: TData,
        columnId: string,
        value: unknown
      ) => {
        const col = table.getColumn(columnId);
        const meta = col?.columnDef?.meta as GridColumnMeta<TData> | undefined;

        const updatedRow: TData = meta?.updateValue
          ? meta.updateValue(rowOriginal, value, columnId)
          : ({ ...(rowOriginal as any), [columnId]: value } as TData);

        setLocalData((old) => {
          const row = old[rowIndex];
          if (!row) return old;
          const next = [...old];
          next[rowIndex] = updatedRow;
          return next;
        });

        onCellUpdate?.({ row: updatedRow, rowIndex, columnId, value });
      },
    },
  });

  const realPageCount = table.getPageCount();
  const uiPageCount = Math.max(1, realPageCount);
  const currentPageIndex = table.getState().pagination.pageIndex;

  const pageItems = useMemo(
    () => getPageItems(currentPageIndex, uiPageCount, 7),
    [currentPageIndex, uiPageCount]
  );

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  function formatCellValue(value: unknown): string {
    if (value == null) return "";

    if (value instanceof Date) {
      return new Intl.DateTimeFormat("fr-FR").format(value);
    }

    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime()) && value.includes("T")) {
        return new Intl.DateTimeFormat("fr-FR").format(d);
      }
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return "";
  }

  const preventIfNoClipboard = (e: any) => {
    if (clipboardEnabled) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
  };

  const preventClipboardShortcuts = (e: any) => {
    if (clipboardEnabled) return;
    const key = String(e?.key ?? "").toLowerCase();
    const ctrl = Boolean(e?.ctrlKey);
    const meta = Boolean(e?.metaKey);
    if ((ctrl || meta) && (key === "c" || key === "v" || key === "x")) {
      preventIfNoClipboard(e);
    }
  };

  const webBlockContainerProps: any = clipboardEnabled
    ? {}
    : {
        onContextMenu: preventIfNoClipboard,
        onCopy: preventIfNoClipboard,
        onCut: preventIfNoClipboard,
        onPaste: preventIfNoClipboard,
        onKeyDown: preventClipboardShortcuts,
      };

  return (
    <View
      style={[styles.root, !clipboardEnabled ? styles.noSelect : null]}
      {...webBlockContainerProps}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          {headerGroups[0]?.headers.map((header: any) => {
            const canSort = header.column.getCanSort();
            const dir = header.column.getIsSorted();
            const meta = header.column.columnDef.meta as
              | GridColumnMeta<TData>
              | undefined;

            const headerRendered = flexRender(
              header.column.columnDef.header,
              header.getContext()
            );

            const cellStyle = [
              styles.headerCell,
              meta?.width ? { width: meta.width, flexGrow: 0 } : null,
            ];

            // ✅ IMPORTANT: si la colonne n’est pas sortable, on utilise View (sinon Pressable)
            if (!canSort) {
              return (
                <View key={header.id} style={cellStyle}>
                  {React.isValidElement(headerRendered) ? (
                    <View style={styles.headerCustom}>{headerRendered}</View>
                  ) : (
                    <Text style={styles.headerText} numberOfLines={1}>
                      {String(headerRendered ?? "")}
                    </Text>
                  )}
                  <View style={styles.sortSpacer} />
                </View>
              );
            }

            return (
              <Pressable
                key={header.id}
                onPress={header.column.getToggleSortingHandler()}
                style={cellStyle}
              >
                {React.isValidElement(headerRendered) ? (
                  <View style={styles.headerCustom}>{headerRendered}</View>
                ) : (
                  <Text style={styles.headerText} numberOfLines={1}>
                    {String(headerRendered ?? "")}
                  </Text>
                )}

                <SortIcon dir={dir} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {rows.map((row: any) => (
              <View key={row.id} style={styles.row}>
                {row.getVisibleCells().map((cell: any) => {
                  const meta = cell.column.columnDef.meta as
                    | GridColumnMeta<TData>
                    | undefined;
                  const editable = !!meta?.editable;

                  const rendered = flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  );

                  return (
                    <View
                      key={cell.id}
                      style={[
                        styles.cell,
                        meta?.width ? { width: meta.width, flexGrow: 0 } : null,
                      ]}
                    >
                      {editable ? (
                        <EditableCell
                          getValue={cell.getValue}
                          rowIndex={row.index}
                          rowOriginal={row.original}
                          columnId={cell.column.id}
                          table={table}
                          inputType={meta?.inputType}
                          meta={meta}
                          clipboardEnabled={clipboardEnabled}
                        />
                      ) : React.isValidElement(rendered) ? (
                        rendered
                      ) : (
                        <Text
                          style={styles.cellText}
                          numberOfLines={1}
                          selectable={false}
                        >
                          {formatCellValue(cell.getValue())}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.filler} />
          </ScrollView>
        </View>
      </View>

      <View style={styles.pagination}>
        <Pressable
          onPress={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          style={({ pressed }) => [
            styles.pagerBtn,
            (!table.getCanPreviousPage() || pressed) && styles.btnDim,
          ]}
        >
          <Text style={styles.pagerBtnText}>Précédent</Text>
        </Pressable>

        <View style={styles.pageNumbers}>
          {pageItems.map((p, idx) =>
            p === "…" ? (
              <Text key={`dots-${idx}`} style={styles.dots}>
                …
              </Text>
            ) : (
              <Pressable
                key={p}
                onPress={() => {
                  if (realPageCount <= 1) return;
                  table.setPageIndex(p);
                }}
                disabled={realPageCount <= 1}
                style={({ pressed }) => [
                  styles.pageBtn,
                  p === currentPageIndex && styles.pageBtnActive,
                  pressed && styles.btnDim,
                ]}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    p === currentPageIndex && styles.pageBtnTextActive,
                  ]}
                >
                  {p + 1}
                </Text>
              </Pressable>
            )
          )}
        </View>

        <Pressable
          onPress={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          style={({ pressed }) => [
            styles.pagerBtn,
            (!table.getCanNextPage() || pressed) && styles.btnDim,
          ]}
        >
          <Text style={styles.pagerBtnText}>Suivant</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },

  card: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerCell: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: { flex: 1, fontSize: 12, fontWeight: "800" },
  headerCustom: { flex: 1, minWidth: 0 },

  sortIcon: { fontSize: 12, fontWeight: "900", opacity: 0.9 },
  sortIconIdle: { opacity: 0.55 },
  sortSpacer: { width: 14 },

  body: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cell: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  cellText: { fontSize: 13, fontWeight: "600" },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: "600",
    fontSize: 13,
    backgroundColor: "white",
  },

  noSelect: {
    userSelect: "none",
    WebkitUserSelect: "none",
  } as any,

  filler: { flex: 1 },

  pagination: {
    height: 48,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pagerBtn: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    justifyContent: "center",
  },
  pagerBtnText: { fontWeight: "700", fontSize: 13 },

  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
    justifyContent: "center",
  },
  dots: { paddingHorizontal: 6, opacity: 0.7, fontWeight: "700" },
  pageBtn: {
    height: 32,
    minWidth: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  pageBtnText: { fontWeight: "800", fontSize: 13, color: "#0F172A" },
  pageBtnTextActive: { color: "white" },

  btnDim: { opacity: 0.6 },
});
