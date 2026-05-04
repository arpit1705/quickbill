import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatINR } from "@/lib/format";
import { useLang } from "@/context/LangContext";

interface QtyEditModalProps {
  open: boolean;
  name: string;
  unit: string;
  unitPrice: number;
  currentQty: number;
  onSave: (qty: number) => void;
  onClose: () => void;
}

export function QtyEditModal({
  open,
  name,
  unit,
  unitPrice,
  currentQty,
  onSave,
  onClose,
}: QtyEditModalProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<"qty" | "price">("qty");
  const [qtyStr, setQtyStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode("qty");
      setQtyStr(currentQty.toString());
      setPriceStr((currentQty * unitPrice).toFixed(2));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentQty, unitPrice]);

  if (!open) return null;

  const parsedQty = parseFloat(qtyStr) || 0;
  const parsedPrice = parseFloat(priceStr) || 0;
  const derivedTotal = parsedQty * unitPrice;
  const derivedQty = unitPrice > 0 ? parsedPrice / unitPrice : 0;

  const displayQty = mode === "qty" ? parsedQty : derivedQty;
  const displayTotal = mode === "qty" ? derivedTotal : parsedPrice;

  const handleQtyChange = (v: string) => {
    if (v === "" || /^\d*\.?\d*$/.test(v)) {
      setQtyStr(v);
      const q = parseFloat(v) || 0;
      setPriceStr((q * unitPrice).toFixed(2));
    }
  };

  const handlePriceChange = (v: string) => {
    if (v === "" || /^\d*\.?\d*$/.test(v)) {
      setPriceStr(v);
      const p = parseFloat(v) || 0;
      const q = unitPrice > 0 ? p / unitPrice : 0;
      setQtyStr(q % 1 === 0 ? q.toString() : q.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));
    }
  };

  const handleSave = () => {
    const finalQty = mode === "qty" ? parsedQty : derivedQty;
    if (finalQty > 0) {
      onSave(parseFloat(finalQty.toFixed(4)));
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-sm bg-card rounded-2xl shadow-elevated p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold truncate pr-2">{name}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground font-mono mb-4">
          {t.unitPrice(unitPrice, unit)}
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setMode("qty");
              setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
            }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition ${
              mode === "qty"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            {t.enterQty}
          </button>
          <button
            onClick={() => {
              setMode("price");
              setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
            }}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition ${
              mode === "price"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            {t.enterPrice}
          </button>
        </div>

        {mode === "qty" ? (
          <div className="space-y-1 mb-4">
            <label className="text-xs font-medium text-muted-foreground">
              {t.quantityLabel(unit)}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={qtyStr}
              onChange={(e) => handleQtyChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 px-4 rounded-xl bg-background border border-border text-lg font-mono font-semibold
                         text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
            <p className="text-xs text-muted-foreground text-right font-mono mt-1">
              {t.totalLabel(formatINR(derivedTotal))}
            </p>
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            <label className="text-xs font-medium text-muted-foreground">
              {t.finalPrice}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) => handlePriceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 px-4 rounded-xl bg-background border border-border text-lg font-mono font-semibold
                         text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
            <p className="text-xs text-muted-foreground text-right font-mono mt-1">
              {t.qtyLabel(
                derivedQty > 0
                  ? String(parseFloat(derivedQty.toFixed(4)))
                  : "0",
                unit
              )}
            </p>
          </div>
        )}

        <div className="bg-accent rounded-xl p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.quantity}</span>
            <span className="font-mono font-semibold">
              {displayQty > 0 ? parseFloat(displayQty.toFixed(4)) : 0} {unit}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">{t.total}</span>
            <span className="font-mono font-semibold">{formatINR(displayTotal)}</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={displayQty <= 0}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                     hover:bg-primary-hover active:scale-[0.97] disabled:opacity-50 transition"
        >
          {t.update}
        </button>
      </div>
    </div>
  );
}
