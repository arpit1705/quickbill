import { InventoryItem } from "./types";
import { uid } from "./format";

export const SAMPLE_INVENTORY: Omit<InventoryItem, "id">[] = [
  { name: "Sugar", price: 45, unit: "kg" },
  { name: "Basmati Rice", price: 120, unit: "kg" },
  { name: "Pepsi 500ml", price: 40, unit: "bottle" },
  { name: "Refined Oil", price: 180, unit: "L" },
  { name: "Parle-G", price: 10, unit: "pack" },
  { name: "Toor Dal", price: 160, unit: "kg" },
  { name: "Wheat Flour 5kg", price: 280, unit: "bag" },
  { name: "Milk 1L", price: 65, unit: "L" },
  { name: "Tea Leaves 250g", price: 85, unit: "pack" },
  { name: "Maggi 12pk", price: 145, unit: "pack" },
];

export const buildSampleInventory = (): InventoryItem[] =>
  SAMPLE_INVENTORY.map((i) => ({ ...i, id: uid() }));
