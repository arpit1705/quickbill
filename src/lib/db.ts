import { supabase } from "./supabase";
import type { DbItem, DbBill, DbBillLine } from "./types";
import type { InventoryImportRow } from "./inventoryImport";

// ── Items ─────────────────────────────────────────────────────────

export async function fetchItems(): Promise<DbItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function upsertItem(
  item: Pick<DbItem, "name" | "price" | "unit"> & {
    id?: string;
    image_url?: string | null;
    category_id?: string | null;
    stock_qty?: number;
    low_stock_threshold?: number | null;
  }
): Promise<DbItem> {
  if (item.id) {
    const { data, error } = await supabase
      .from("items")
      .update(item)
      .eq("id", item.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export type BulkUpsertItemsResult = {
  created: number;
  updated: number;
  total: number;
};

export async function bulkUpsertItemsByName(
  rows: InventoryImportRow[]
): Promise<BulkUpsertItemsResult> {
  if (!rows.length) {
    return { created: 0, updated: 0, total: 0 };
  }

  const { data, error } = await supabase.rpc("bulk_upsert_items_by_name", {
    p_rows: rows,
  });
  if (error) {
    if (error.code === "PGRST202") {
      const { data: existingItems, error: existingError } = await supabase
        .from("items")
        .select("id,name,is_active");
      if (existingError) throw existingError;

      const byNormalizedName = new Map(
        (existingItems ?? []).map((item) => [item.name.trim().toLowerCase(), item])
      );

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const key = row.name.trim().toLowerCase();
        const existing = byNormalizedName.get(key);

        if (existing) {
          const { error: updateError } = await supabase
            .from("items")
            .update({
              name: row.name.trim(),
              price: row.price,
              unit: row.unit.trim(),
              stock_qty: row.stock_qty ?? 0,
              low_stock_threshold: row.low_stock_threshold ?? null,
              is_active: true,
            })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          updated += 1;
        } else {
          const { error: insertError } = await supabase.from("items").insert({
            name: row.name.trim(),
            price: row.price,
            unit: row.unit.trim(),
            stock_qty: row.stock_qty ?? 0,
            low_stock_threshold: row.low_stock_threshold ?? null,
            is_active: true,
          });
          if (insertError) throw insertError;
          created += 1;
        }
      }

      return {
        created,
        updated,
        total: created + updated,
      };
    }
    throw error;
  }

  const typedRows = (data ?? []) as { action: "created" | "updated" }[];
  const created = typedRows.filter((row) => row.action === "created").length;
  const updated = typedRows.filter((row) => row.action === "updated").length;

  return {
    created,
    updated,
    total: typedRows.length,
  };
}

// ── Bills ─────────────────────────────────────────────────────────

export async function fetchBills(): Promise<
  (DbBill & { bill_lines: DbBillLine[]; customers: { name: string } | null })[]
> {
  const { data, error } = await supabase
    .from("bills")
    .select("*, bill_lines(*), customers(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveBill(params: {
  subtotal: number;
  total: number;
  lines: {
    item_id: string;
    name: string;
    qty: number;
    unit: string;
    unit_price: number;
    total: number;
  }[];
  discount?: number;
  payment_mode?: string;
  customer_id?: string | null;
  notes?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_bill", {
    p_subtotal: params.subtotal,
    p_total: params.total,
    p_lines: params.lines,
    p_discount: params.discount ?? 0,
    p_payment_mode: params.payment_mode ?? "cash",
    p_customer_id: params.customer_id ?? null,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}

// ── Customers ─────────────────────────────────────────────────────

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// ── localStorage migration ────────────────────────────────────────

export async function migrateFromLocalStorage(): Promise<{
  items: number;
  bills: number;
}> {
  const rawInv = localStorage.getItem("qb_inventory");
  const rawBills = localStorage.getItem("qb_bills");

  let itemCount = 0;
  let billCount = 0;

  if (rawInv) {
    const items: { id: string; name: string; price: number; unit: string; imageDataUrl?: string }[] =
      JSON.parse(rawInv);

    if (items.length > 0) {
      const rows = items.map((i) => ({
        name: i.name,
        price: i.price,
        unit: i.unit,
        image_url: i.imageDataUrl ?? null,
        is_active: true,
      }));

      const { error } = await supabase.from("items").insert(rows);
      if (error) throw error;
      itemCount = items.length;
    }
  }

  if (rawBills) {
    const bills: {
      id: string;
      ts: number;
      items: { id: string; name: string; qty: number; unit: string; price: number; total: number }[];
      total: number;
    }[] = JSON.parse(rawBills);

    const freshItems = await fetchItems();
    const nameToId = new Map(freshItems.map((i) => [i.name.toLowerCase(), i.id]));

    for (const bill of bills) {
      const lines = bill.items.map((l) => ({
        item_id: nameToId.get(l.name.toLowerCase()) ?? l.id,
        name: l.name,
        qty: l.qty,
        unit: l.unit,
        unit_price: l.price,
        total: l.total,
      }));

      const subtotal = lines.reduce((s, l) => s + l.total, 0);

      const { data: billId, error } = await supabase.rpc("save_bill", {
        p_subtotal: subtotal,
        p_total: bill.total,
        p_lines: JSON.stringify(lines),
      });
      if (error) {
        console.error("Failed to migrate bill:", error);
        continue;
      }
      if (billId) billCount++;
    }
  }

  localStorage.removeItem("qb_inventory");
  localStorage.removeItem("qb_bills");

  return { items: itemCount, bills: billCount };
}
