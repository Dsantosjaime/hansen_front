import { Platform } from "react-native";
import * as XLSX from "xlsx";

import { Directory } from "expo-file-system";
import { EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type ExtractContactLite = {
  lastName?: string | null;
  function?: string | null;
  email?: string | null;
};

export type ExtractSubGroupOutput = {
  id: string;
  name: string;
  contacts: ExtractContactLite[];
};

export type ExtractGroupOutput = {
  id: string;
  name: string;
  subGroups: ExtractSubGroupOutput[];
};

function sanitizeFileName(name: string) {
  return name.replace(/[:\\\/\?\*\[\]]/g, "-");
}

function sanitizeSheetName(name: string) {
  const cleaned = name.replace(/[:\\\/\?\*\[\]]/g, "-").trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned || "Sheet";
}

function uniqueSheetName(base: string, used: Set<string>) {
  let name = base;
  let i = 1;
  while (used.has(name)) {
    const suffix = ` (${i})`;
    const maxBase = 31 - suffix.length;
    name = `${base.slice(0, Math.max(1, maxBase))}${suffix}`;
    i++;
  }
  used.add(name);
  return name;
}

function buildWorkbook(data: ExtractGroupOutput[]) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const group of data) {
    const rows: (string | null)[][] = [];
    const merges: XLSX.Range[] = [];

    // Ligne d'en-tête des colonnes
    rows.push(["Nom", "Poste", "Email"]);

    for (const subGroup of group.subGroups ?? []) {
      if (rows.length > 1) rows.push(["", "", ""]); // ligne vide entre sous-groupes

      // Entête sous-groupe (fusion A:C)
      const headerRowIndex = rows.length;
      rows.push([subGroup.name, "", ""]);
      merges.push({
        s: { r: headerRowIndex, c: 0 },
        e: { r: headerRowIndex, c: 2 },
      });

      for (const c of subGroup.contacts ?? []) {
        rows.push([c.lastName ?? "", c.function ?? "", c.email ?? ""]);
      }
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    (sheet as any)["!merges"] = merges;
    (sheet as any)["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 36 }];

    const baseName = sanitizeSheetName(group.name);
    const sheetName = uniqueSheetName(baseName, usedNames);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  }

  return wb;
}

async function exportOnWeb(wb: XLSX.WorkBook, fileName: string) {
  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { fileName };
}

async function exportOnNative(
  wb: XLSX.WorkBook,
  fileName: string,
  share: boolean
) {
  if (!Directory) {
    throw new Error("documentDirectory is not available on this platform.");
  }

  const uri = `${Directory}${fileName}`;

  // Base64 pour écriture fichier via expo-file-system/legacy
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  if (share) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        UTI: "com.microsoft.excel.xlsx",
        dialogTitle: "Exporter l'extraction",
      });
    }
  }

  return { uri, fileName };
}

export async function exportExtractToExcel(
  data: ExtractGroupOutput[],
  opts?: { fileName?: string; share?: boolean }
) {
  const defaultName = sanitizeFileName(
    `extract_${new Date().toISOString()}.xlsx`
  );
  const fileName = sanitizeFileName(opts?.fileName ?? defaultName);
  const share = opts?.share ?? true;

  const wb = buildWorkbook(data);

  if (Platform.OS === "web") {
    return exportOnWeb(wb, fileName);
  }

  return exportOnNative(wb, fileName, share);
}
