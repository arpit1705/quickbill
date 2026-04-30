// ── Database row types (match Supabase table columns) ─────────────

export type DbItem = {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  stock_qty: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbBill = {
  id: string;
  bill_number: number;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_mode: string;
  status: "completed" | "returned" | "voided";
  notes: string | null;
  created_at: string;
};

export type DbBillLine = {
  id: string;
  bill_id: string;
  item_id: string | null;
  name: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
  created_at: string;
};

export type DbCustomer = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  created_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

// ── App-level types (used by components) ──────────────────────────

export type InventoryItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageDataUrl?: string;
};

export type BillLine = {
  id: string;
  name: string;
  imageDataUrl?: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
};

export type Bill = {
  id: string;
  ts: number;
  billNumber?: number;
  items: BillLine[];
  total: number;
  subtotal?: number;
  discount?: number;
  paymentMode?: string;
  status?: "completed" | "returned" | "voided";
  customerName?: string;
};

export type View = "billing" | "previous" | "reports" | "inventory";

// ── Converters between DB rows and app types ──────────────────────

export function dbItemToInventoryItem(row: DbItem): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    unit: row.unit,
    imageDataUrl: row.image_url ?? undefined,
  };
}

export function dbBillToBill(
  row: DbBill & { bill_lines: DbBillLine[]; customers?: { name: string } | null }
): Bill {
  return {
    id: row.id,
    ts: new Date(row.created_at).getTime(),
    billNumber: row.bill_number,
    items: row.bill_lines.map((l) => ({
      id: l.item_id ?? l.id,
      name: l.name,
      qty: Number(l.qty),
      unit: l.unit,
      price: Number(l.unit_price),
      total: Number(l.total),
    })),
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    paymentMode: row.payment_mode,
    status: row.status,
    customerName: row.customers?.name,
  };
}
