import { describe, expect, it } from "vitest";
import { buildInventoryTemplateCsv, parseInventoryImportRows } from "./inventoryImport";

describe("inventory import utils", () => {
  it("builds template with expected headers", () => {
    const template = buildInventoryTemplateCsv();
    expect(template.split("\n")[0]).toBe("name,price,unit,stock_qty,low_stock_threshold");
  });

  it("parses valid rows and reports row errors", () => {
    const parsed = parseInventoryImportRows([
      { name: "Sugar", price: "45", unit: "kg", stock_qty: "20", low_stock_threshold: "5" },
      { name: "", price: "20", unit: "pcs" },
      { name: "Milk", price: "0", unit: "ltr" },
    ]);

    expect(parsed.validRows).toHaveLength(1);
    expect(parsed.rowErrors.length).toBeGreaterThan(0);
    expect(parsed.validRows[0]).toMatchObject({
      name: "Sugar",
      price: 45,
      unit: "kg",
      stock_qty: 20,
      low_stock_threshold: 5,
    });
  });
});
