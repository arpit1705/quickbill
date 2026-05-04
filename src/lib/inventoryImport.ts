import { z } from "zod";
import * as XLSX from "xlsx";

export const INVENTORY_IMPORT_HEADERS = [
  "name",
  "price",
  "unit",
  "stock_qty",
  "low_stock_threshold",
] as const;

export type InventoryImportRow = {
  name: string;
  price: number;
  unit: string;
  stock_qty?: number;
  low_stock_threshold?: number | null;
};

export type InventoryImportError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ParsedInventoryImport = {
  validRows: InventoryImportRow[];
  rowErrors: InventoryImportError[];
  totalRows: number;
};

const importRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  price: z.coerce.number().gt(0, "Price must be greater than 0"),
  unit: z.string().trim().min(1, "Unit is required"),
  stock_qty: z.coerce.number().min(0, "Stock qty must be 0 or more").optional(),
  low_stock_threshold: z.coerce
    .number()
    .min(0, "Low stock threshold must be 0 or more")
    .nullable()
    .optional(),
});

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function parseNumericOptional(raw: string): number | undefined {
  if (!raw) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) return Number.NaN;
  return num;
}

function rowIsCompletelyEmpty(row: Record<string, string>): boolean {
  return INVENTORY_IMPORT_HEADERS.every((key) => !sanitizeCell(row[key]));
}

export function parseInventoryImportRows(rows: Record<string, unknown>[]): ParsedInventoryImport {
  const validRows: InventoryImportRow[] = [];
  const rowErrors: InventoryImportError[] = [];

  rows.forEach((sourceRow, idx) => {
    const rowNumber = idx + 2; // account for header row in file
    const row = Object.fromEntries(
      Object.entries(sourceRow).map(([key, value]) => [normalizeHeader(key), sanitizeCell(value)])
    ) as Record<string, string>;

    if (rowIsCompletelyEmpty(row)) return;

    const parsed = importRowSchema.safeParse({
      name: row.name,
      price: row.price,
      unit: row.unit,
      stock_qty: parseNumericOptional(row.stock_qty),
      low_stock_threshold: parseNumericOptional(row.low_stock_threshold) ?? null,
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        rowErrors.push({
          rowNumber,
          field: issue.path.join(".") || "row",
          message: issue.message,
        });
      });
      return;
    }

    validRows.push(parsed.data);
  });

  return {
    validRows,
    rowErrors,
    totalRows: rows.length,
  };
}

function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(",").map((header) => normalizeHeader(header));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return headers.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = values[index] ?? "";
      return acc;
    }, {});
  });
}

function validateHeaders(headers: string[]): void {
  const normalized = headers.map(normalizeHeader);
  const missing = INVENTORY_IMPORT_HEADERS.filter((header) => !normalized.includes(header));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }
}

export async function parseInventoryImportFile(file: File): Promise<ParsedInventoryImport> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  const isXlsx = file.name.toLowerCase().endsWith(".xlsx");

  if (!isCsv && !isXlsx) {
    throw new Error("Only .csv and .xlsx files are supported");
  }

  if (isCsv) {
    const content = await file.text();
    const rows = parseCsvContent(content);
    if (!rows.length) return { validRows: [], rowErrors: [], totalRows: 0 };
    const csvHeaders = Object.keys(rows[0] ?? {});
    validateHeaders(csvHeaders);
    return parseInventoryImportRows(rows);
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    return { validRows: [], rowErrors: [], totalRows: 0 };
  }

  const headerRow = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  })[0] as unknown[] | undefined;
  const xlsxHeaders = (headerRow ?? []).map((header) => String(header));
  validateHeaders(xlsxHeaders);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
    blankrows: false,
  });
  return parseInventoryImportRows(rows);
}

export function buildInventoryTemplateCsv(): string {
  const sampleRows = [
    INVENTORY_IMPORT_HEADERS.join(","),
    "Sugar,45,kg,20,5",
    "Milk,28,ltr,40,10",
  ];
  return sampleRows.join("\n");
}

export function downloadInventoryTemplate(): void {
  const csv = buildInventoryTemplateCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", "inventory-import-template.csv");
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
