import { useMemo, useState } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { InventoryItem, BillLine } from "@/lib/types";
import { ItemThumb } from "./ItemThumb";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BillingView({
  inventory,
  cart,
  onAdd,
  onInc,
  onDec,
  onQtyEdit,
}: {
  inventory: InventoryItem[];
  cart: BillLine[];
  onAdd: (item: InventoryItem) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onQtyEdit: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const cartMap = useMemo(() => {
    const m = new Map<string, BillLine>();
    cart.forEach((l) => m.set(l.id, l));
    return m;
  }, [cart]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return inventory;
    return inventory.filter((i) => i.name.toLowerCase().includes(s));
  }, [inventory, q]);

  return (
    <div className="px-4 pt-4 pb-44">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items…"
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                     transition-shadow"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="qb-card p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No items found{q ? ` for "${q}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const inCart = cartMap.get(item.id);
            return (
              <div
                key={item.id}
                onClick={() => (inCart ? onInc(item.id) : onAdd(item))}
                className={cn(
                  "qb-card p-2.5 flex flex-col gap-2 transition-all duration-200 cursor-pointer",
                  inCart && "border-primary bg-accent ring-1 ring-primary/30"
                )}
              >
                <div className="relative">
                  <ItemThumb
                    name={item.name}
                    src={item.imageDataUrl}
                    className="aspect-square w-full"
                  />
                  {inCart && (
                    <div className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-brand text-brand-foreground text-xs font-bold font-mono grid place-items-center shadow-md">
                      {inCart.qty % 1 === 0 ? inCart.qty : parseFloat(inCart.qty.toFixed(2))}
                    </div>
                  )}
                </div>
                <div className="min-h-[2.8em] mt-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2">
                    {item.name}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  ₹{item.price}/{item.unit}
                </p>

                {inCart ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between bg-card border border-primary rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => onDec(item.id)}
                      className="h-8 w-8 grid place-items-center text-primary hover:bg-accent active:scale-95 transition"
                      aria-label="Decrease"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onQtyEdit(item.id)}
                      className="text-sm font-mono font-semibold px-1 min-w-[2rem] text-center hover:bg-accent rounded transition cursor-pointer"
                    >
                      {inCart.qty % 1 === 0 ? inCart.qty : parseFloat(inCart.qty.toFixed(4))}
                    </button>
                    <button
                      onClick={() => onInc(item.id)}
                      className="h-8 w-8 grid place-items-center text-primary hover:bg-accent active:scale-95 transition"
                      aria-label="Increase"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                    className="h-8 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold
                               hover:bg-primary-hover active:scale-[0.97] transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
