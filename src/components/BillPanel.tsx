import { useState } from "react";
import { ChevronUp, X, Mic, Check, Trash2 } from "lucide-react";
import { BillLine } from "@/lib/types";
import { ItemThumb } from "./ItemThumb";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BillPanel({
  cart,
  onInc,
  onDec,
  onRemove,
  onClear,
  onSave,
  onDictate,
  onQtyEdit,
}: {
  cart: BillLine[];
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSave: () => void;
  onDictate: () => void;
  onQtyEdit: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = cart.reduce((s, l) => s + l.total, 0);
  const summary =
    cart.length === 0
      ? "No items yet"
      : cart.map((l) => l.name).join(", ");

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-billpanel text-billpanel-foreground rounded-t-2xl shadow-elevated">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">
            Current bill • {cart.length} item{cart.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-white/70 truncate mt-0.5">{summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="font-mono text-base font-semibold"
            style={{ color: "hsl(var(--brand-soft))" }}
          >
            {formatINR(total)}
          </span>
          <ChevronUp
            className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "rotate-180")}
          />
        </div>
      </button>

      {open && cart.length > 0 && (
        <div className="max-h-72 overflow-y-auto scrollbar-thin border-t border-white/10 px-3 py-2 space-y-1.5 animate-fade-in">
          {cart.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 bg-white/5 rounded-lg px-2.5 py-2"
            >
              <ItemThumb name={l.name} src={l.imageDataUrl} className="h-9 w-9" rounded="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.name}</p>
                <p className="text-[11px] text-white/60 font-mono">
                  {l.qty % 1 === 0 ? l.qty : parseFloat(l.qty.toFixed(4))} × ₹{l.price}/{l.unit}
                </p>
              </div>
              <div className="flex items-center bg-white/10 rounded-md overflow-hidden">
                <button
                  onClick={() => onDec(l.id)}
                  className="h-7 w-7 grid place-items-center hover:bg-white/10 active:scale-95 transition"
                  aria-label="Decrease"
                >
                  −
                </button>
                <span
                  onClick={() => onQtyEdit(l.id)}
                  className="w-8 text-center text-sm font-mono cursor-pointer hover:bg-white/10 rounded transition"
                >
                  {l.qty % 1 === 0 ? l.qty : parseFloat(l.qty.toFixed(2))}
                </span>
                <button
                  onClick={() => onInc(l.id)}
                  className="h-7 w-7 grid place-items-center hover:bg-white/10 active:scale-95 transition"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <span
                onClick={() => onQtyEdit(l.id)}
                className="font-mono text-sm w-20 text-right cursor-pointer hover:bg-white/10 rounded px-1 transition"
              >
                {formatINR(l.total)}
              </span>
              <button
                onClick={() => onRemove(l.id)}
                className="h-7 w-7 grid place-items-center text-white/60 hover:text-destructive transition"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 pt-2 pb-3 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={onDictate}
          className="h-11 px-3 rounded-xl border border-white/30 text-white text-sm font-semibold
                     hover:bg-white/10 active:scale-[0.97] transition flex items-center gap-1.5"
        >
          <Mic className="h-4 w-4" /> Dictate
        </button>
        <button
          onClick={onClear}
          disabled={cart.length === 0}
          className="h-11 px-3 rounded-xl text-white/70 text-sm font-medium
                     hover:bg-destructive/20 hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent
                     transition flex items-center gap-1.5"
        >
          <Trash2 className="h-4 w-4" /> Clear
        </button>
        <button
          onClick={onSave}
          disabled={cart.length === 0}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                     hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50
                     transition flex items-center justify-center gap-1.5 shadow-md"
        >
          <Check className="h-4 w-4" /> Bill
        </button>
      </div>
    </div>
  );
}
