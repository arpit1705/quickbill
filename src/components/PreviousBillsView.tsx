import { useMemo, useState } from "react";
import { Bill } from "@/lib/types";
import { formatINR, formatDateIN } from "@/lib/format";
import { ItemThumb } from "./ItemThumb";
import { Receipt, X } from "lucide-react";
import { useLang } from "@/context/LangContext";

type Range = "today" | "week" | "month" | "all";

const inRange = (ts: number, r: Range) => {
  const d = new Date();
  if (r === "all") return true;
  if (r === "today") {
    return new Date(ts).toDateString() === d.toDateString();
  }
  if (r === "week") return ts >= d.getTime() - 7 * 86400000;
  if (r === "month") return ts >= d.getTime() - 30 * 86400000;
  return true;
};

export function PreviousBillsView({ bills }: { bills: Bill[] }) {
  const { t } = useLang();
  const [range, setRange] = useState<Range>("today");
  const [selected, setSelected] = useState<Bill | null>(null);

  const filtered = useMemo(
    () => bills.filter((b) => inRange(b.ts, range)).sort((a, b) => b.ts - a.ts),
    [bills, range]
  );

  const chips: [Range, string][] = [
    ["today", t.today],
    ["week", t.thisWeek],
    ["month", t.thisMonth],
    ["all", t.allTime],
  ];

  return (
    <div className="px-4 pt-4 pb-10">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {chips.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className="qb-chip shrink-0"
            data-active={range === k}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="qb-card p-10 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">{t.noBillsYet}</p>
          </div>
        ) : (
          filtered.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="qb-card w-full p-3.5 flex items-center gap-3 text-left
                         hover:border-primary hover:shadow-elevated transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">
                  {t.billHash}{filtered.length - idx}
                  <span className="ml-2 text-xs text-muted-foreground font-medium font-mono">
                    {formatDateIN(b.ts)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {b.items.map((i) => i.name).join(", ")}
                </p>
              </div>
              <span className="font-mono font-bold text-success shrink-0">
                {formatINR(b.total)}
              </span>
            </button>
          ))
        )}
      </div>

      <BillDetailSheet bill={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function BillDetailSheet({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { t } = useLang();
  if (!bill) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-h-[85vh] bg-card rounded-t-3xl flex flex-col animate-slide-up">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{formatDateIN(bill.ts)}</p>
            <h3 className="font-bold text-lg">{t.billDetails}</h3>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bill.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <ItemThumb name={it.name} src={it.imageDataUrl} className="h-11 w-11" rounded="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {it.qty} × ₹{it.price}/{it.unit}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold">{formatINR(it.total)}</span>
            </div>
          ))}
        </div>
        <div className="bg-muted px-4 py-4 flex items-center justify-between rounded-b-3xl">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t.grandTotal}
          </span>
          <span className="font-mono text-xl font-bold">{formatINR(bill.total)}</span>
        </div>
      </div>
    </div>
  );
}
