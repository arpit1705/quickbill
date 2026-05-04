import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { SideMenu } from "@/components/SideMenu";
import { BillingView } from "@/components/BillingView";
import { BillPanel } from "@/components/BillPanel";
import { DictateModal } from "@/components/DictateModal";
import { QtyEditModal } from "@/components/QtyEditModal";
import { PreviousBillsView } from "@/components/PreviousBillsView";
import { ReportsView } from "@/components/ReportsView";
import { InventoryView, ConfirmDialog } from "@/components/InventoryView";
import { Bill, BillLine, InventoryItem, View, dbItemToInventoryItem, dbBillToBill } from "@/lib/types";
import {
  fetchItems,
  fetchBills,
  upsertItem,
  bulkUpsertItemsByName,
  deleteItem as dbDeleteItem,
  saveBill as dbSaveBill,
  migrateFromLocalStorage,
} from "@/lib/db";
import { useLang } from "@/context/LangContext";

const Index = () => {
  const { t } = useLang();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [cart, setCart] = useState<BillLine[]>([]);
  const [view, setView] = useState<View>("billing");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictateOpen, setDictateOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [qtyEditTarget, setQtyEditTarget] = useState<BillLine | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const hasLocalData =
        localStorage.getItem("qb_inventory") || localStorage.getItem("qb_bills");
      if (hasLocalData) {
        const result = await migrateFromLocalStorage();
        if (result.items > 0 || result.bills > 0) {
          toast.success(t.migratedData(result.items, result.bills));
        }
      }

      const [dbItems, dbBills] = await Promise.all([fetchItems(), fetchBills()]);
      setInventory(dbItems.map(dbItemToInventoryItem));
      setBills(dbBills.map(dbBillToBill));
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error(t.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todaysTotal = useMemo(() => {
    const today = new Date().toDateString();
    return bills
      .filter((b) => new Date(b.ts).toDateString() === today)
      .reduce((s, b) => s + b.total, 0);
  }, [bills]);

  const cartCount = parseFloat(cart.reduce((s, l) => s + l.qty, 0).toFixed(2));

  const addToCart = (item: InventoryItem, qty = 1) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.id === item.id);
      if (ex) {
        return prev.map((l) =>
          l.id === item.id
            ? { ...l, qty: l.qty + qty, total: (l.qty + qty) * l.price }
            : l
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          imageDataUrl: item.imageDataUrl,
          qty,
          unit: item.unit,
          price: item.price,
          total: qty * item.price,
        },
      ];
    });
  };

  const incQty = (id: string) =>
    setCart((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, qty: l.qty + 1, total: (l.qty + 1) * l.price } : l
      )
    );

  const decQty = (id: string) =>
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.id !== id) return [l];
        if (l.qty <= 1) return [];
        return [{ ...l, qty: l.qty - 1, total: (l.qty - 1) * l.price }];
      })
    );

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.id !== id));

  const setQty = (id: string, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty, total: qty * l.price } : l))
    );

  const openQtyEdit = (id: string) => {
    const line = cart.find((l) => l.id === id);
    if (line) setQtyEditTarget(line);
  };

  const saveBill = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((s, l) => s + l.total, 0);

    try {
      await dbSaveBill({
        subtotal: total,
        total,
        lines: cart.map((l) => ({
          item_id: l.id,
          name: l.name,
          qty: l.qty,
          unit: l.unit,
          unit_price: l.price,
          total: l.total,
        })),
      });

      setCart([]);
      toast.success(t.billSaved(total.toFixed(2)));

      const [dbItems, dbBills] = await Promise.all([fetchItems(), fetchBills()]);
      setInventory(dbItems.map(dbItemToInventoryItem));
      setBills(dbBills.map(dbBillToBill));
    } catch (err) {
      console.error("Failed to save bill:", err);
      toast.error(t.failedToSaveBill);
    }
  };

  const clearCart = () => {
    setCart([]);
    setConfirmClear(false);
    toast.success(t.billCleared);
  };

  const onParsedDictate = (matches: { item: InventoryItem; qty: number }[]) => {
    matches.forEach(({ item, qty }) => {
      if (qty < 0) {
        const existing = cart.find((l) => l.id === item.id);
        if (existing) {
          const newQty = existing.qty + qty;
          if (newQty <= 0) {
            removeLine(item.id);
          } else {
            setQty(item.id, parseFloat(newQty.toFixed(2)));
          }
        }
      } else {
        addToCart(item, qty);
      }
    });
  };

  const handleSetInventory = async (next: InventoryItem[]) => {
    const prev = inventory;

    const added = next.find((n) => !prev.some((p) => p.id === n.id));
    if (added) {
      try {
        const row = await upsertItem({
          name: added.name,
          price: added.price,
          unit: added.unit,
          image_url: added.imageDataUrl ?? null,
        });
        setInventory((cur) => [dbItemToInventoryItem(row), ...cur]);
      } catch (err) {
        console.error("Failed to add item:", err);
        toast.error(t.failedToAddItem);
      }
      return;
    }

    const edited = next.find((n) => {
      const old = prev.find((p) => p.id === n.id);
      if (!old) return false;
      return (
        old.name !== n.name ||
        old.price !== n.price ||
        old.unit !== n.unit ||
        old.imageDataUrl !== n.imageDataUrl
      );
    });
    if (edited) {
      try {
        const row = await upsertItem({
          id: edited.id,
          name: edited.name,
          price: edited.price,
          unit: edited.unit,
          image_url: edited.imageDataUrl ?? null,
        });
        setInventory((cur) =>
          cur.map((i) => (i.id === row.id ? dbItemToInventoryItem(row) : i))
        );
      } catch (err) {
        console.error("Failed to update item:", err);
        toast.error(t.failedToUpdateItem);
      }
      return;
    }

    const deleted = prev.find((p) => !next.some((n) => n.id === p.id));
    if (deleted) {
      try {
        await dbDeleteItem(deleted.id);
        setInventory((cur) => cur.filter((i) => i.id !== deleted.id));
      } catch (err) {
        console.error("Failed to delete item:", err);
        toast.error(t.failedToDeleteItem);
      }
      return;
    }

    setInventory(next);
  };

  const handleBulkImport = async (
    rows: { name: string; price: number; unit: string; stock_qty?: number; low_stock_threshold?: number | null }[]
  ) => {
    const result = await bulkUpsertItemsByName(rows);
    const dbItems = await fetchItems();
    setInventory(dbItems.map(dbItemToInventoryItem));
    return result;
  };

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="grid place-items-center pt-40">
          <p className="text-muted-foreground text-sm animate-pulse">
            {t.loadingData}
          </p>
        </div>
      ) : (
        <>
          <Header
            cartCount={cartCount}
            onMenu={() => setMenuOpen(true)}
            onLogo={() => setView("billing")}
          />

          <SideMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            active={view}
            onNavigate={setView}
            todaysTotal={todaysTotal}
          />

          <main className="max-w-6xl mx-auto">
            {view === "billing" && (
              <BillingView
                inventory={inventory}
                cart={cart}
                onAdd={addToCart}
                onInc={incQty}
                onDec={decQty}
                onQtyEdit={openQtyEdit}
              />
            )}
            {view === "previous" && <PreviousBillsView bills={bills} />}
            {view === "reports" && <ReportsView bills={bills} />}
            {view === "inventory" && (
              <InventoryView
                inventory={inventory}
                setInventory={handleSetInventory}
                onBulkImport={handleBulkImport}
              />
            )}
          </main>

          {view === "billing" && (
            <BillPanel
              cart={cart}
              onInc={incQty}
              onDec={decQty}
              onRemove={removeLine}
              onClear={() => (cart.length ? setConfirmClear(true) : null)}
              onSave={saveBill}
              onDictate={() => setDictateOpen(true)}
              onQtyEdit={openQtyEdit}
            />
          )}

          <DictateModal
            open={dictateOpen}
            onClose={() => setDictateOpen(false)}
            inventory={inventory}
            onParsed={onParsedDictate}
          />

          {qtyEditTarget && (
            <QtyEditModal
              open={!!qtyEditTarget}
              name={qtyEditTarget.name}
              unit={qtyEditTarget.unit}
              unitPrice={qtyEditTarget.price}
              currentQty={qtyEditTarget.qty}
              onSave={(qty) => setQty(qtyEditTarget.id, qty)}
              onClose={() => setQtyEditTarget(null)}
            />
          )}

          {confirmClear && (
            <ConfirmDialog
              title={t.clearBillTitle}
              message={t.clearBillMessage}
              confirmLabel={t.clear}
              danger
              onCancel={() => setConfirmClear(false)}
              onConfirm={clearCart}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;
