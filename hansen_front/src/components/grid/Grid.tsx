import React, { useEffect, useMemo, useState } from "react";
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

type CellUpdatePayload<TData> = {
  row: TData;
  rowIndex: number;
  columnId: string;
  value: unknown;
};

type GridColumnMeta<TData extends object> = {
  editable?: boolean;
  inputType?: "text" | "email" | "tel";
  /**
   * Optionnel: pour les champs dérivés (ex: phoneNumber[0]),
   * permet de patcher correctement la ligne.
   */
  updateValue?: (row: TData, value: unknown, columnId: string) => TData;
  /** Optionnel: largeur fixe en px pour une colonne */
  width?: number;
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
  onLineClick: (rowIndex: number) => void;
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
}) {
  const initial = String(props.getValue() ?? "");
  const [val, setVal] = useState(initial);

  useEffect(() => {
    setVal(String(props.getValue() ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const commit = () => {
    props.table.options.meta?.updateData?.(
      props.rowIndex,
      props.rowOriginal,
      props.columnId,
      val
    );
  };

  return (
    <TextInput
      value={val}
      onChangeText={setVal}
      onBlur={commit}
      onSubmitEditing={commit}
      // RN Web mappe keyboardType => inputmode/type parfois, sinon on reste neutre
      keyboardType={
        props.inputType === "email"
          ? "email-address"
          : props.inputType === "tel"
          ? "phone-pad"
          : "default"
      }
      style={styles.input}
    />
  );
}

/**
 * DataGrid (TanStack Table) rendu en composants RN
 * => permet StyleSheet.create + layout flex (grid qui prend toute la hauteur).
 */
export function DataGrid<TData extends object>({
  data,
  columns,
  pageSize = 10,
  initialPageIndex = 0,
  getRowId,
  onCellUpdate,
  onLineClick,
}: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize,
  });

  // POC: copie locale pour édition optimiste
  const [localData, setLocalData] = useState<TData[]>(data);
  useEffect(() => setLocalData(data), [data]);

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
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId as any,
    meta: {
      updateData: (
        rowIndex: number,
        rowOriginal: TData,
        columnId: string,
        value: unknown
      ) => {
        setLocalData((old) => {
          const row = old[rowIndex];
          if (!row) return old;

          const next = [...old];

          // Support champs dérivés via meta.updateValue (si présent)
          const col = table.getColumn(columnId);
          const meta = col?.columnDef?.meta as
            | GridColumnMeta<TData>
            | undefined;

          next[rowIndex] = meta?.updateValue
            ? meta.updateValue(row, value, columnId)
            : ({ ...(row as any), [columnId]: value } as TData);

          return next;
        });

        if (onCellUpdate) {
          onCellUpdate({ row: rowOriginal, rowIndex, columnId, value });
        }
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

    // Si tu as des Date réelles dans tes data
    if (value instanceof Date) {
      return new Intl.DateTimeFormat("fr-FR").format(value);
    }

    // Si tu as des ISO strings
    if (typeof value === "string") {
      // tentative date ISO
      const d = new Date(value);
      if (!Number.isNaN(d.getTime()) && value.includes("T")) {
        return new Intl.DateTimeFormat("fr-FR").format(d); // DD/MM/YYYY
      }
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    // fallback
    return "";
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          {headerGroups[0]?.headers.map((header: any) => {
            const canSort = header.column.getCanSort();
            const dir = header.column.getIsSorted();
            const meta = header.column.columnDef.meta as
              | GridColumnMeta<TData>
              | undefined;

            return (
              <Pressable
                key={header.id}
                onPress={
                  canSort ? header.column.getToggleSortingHandler() : undefined
                }
                style={[
                  styles.headerCell,
                  meta?.width ? { width: meta.width, flexGrow: 0 } : null,
                ]}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </Text>

                {canSort ? (
                  <SortIcon dir={dir} />
                ) : (
                  <View style={styles.sortSpacer} />
                )}
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
              <Pressable key={row.id} onPress={() => onLineClick(row.id)}>
                <View style={styles.row}>
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
                          meta?.width
                            ? { width: meta.width, flexGrow: 0 }
                            : null,
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
                          />
                        ) : React.isValidElement(rendered) ? (
                          // Si c'est un élément React, on l'affiche tel quel
                          rendered
                        ) : (
                          // Sinon on formate une valeur primitive
                          <Text style={styles.cellText} numberOfLines={1}>
                            {formatCellValue(cell.getValue())}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Pressable>
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
  root: {
    flex: 1,
    minHeight: 0, // important pour que le ScrollView puisse prendre la place restante
  },

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
  headerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  sortIcon: {
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.9,
  },
  sortIconIdle: {
    opacity: 0.55,
  },
  sortSpacer: {
    width: 14,
  },

  body: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // permet de remplir l’espace même avec peu de lignes
  },

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
  cellText: {
    fontSize: 13,
    fontWeight: "600",
  },

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

  filler: {
    flex: 1, // “tire” le body vers le bas si peu de rows
  },

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
  pagerBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },

  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
    justifyContent: "center",
  },
  dots: {
    paddingHorizontal: 6,
    opacity: 0.7,
    fontWeight: "700",
  },
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
  pageBtnActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  pageBtnText: {
    fontWeight: "800",
    fontSize: 13,
    color: "#0F172A",
  },
  pageBtnTextActive: {
    color: "white",
  },

  btnDim: {
    opacity: 0.6,
  },
});
