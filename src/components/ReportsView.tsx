import { useMemo, useState } from "react";
import { Bill } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { ItemThumb } from "./ItemThumb";

type Range = "today" | "week" | "month";

const inRange = (ts: number, r: Range) => {
  const d = new Date();
  if (r === "today") return new Date(ts).toDateString() === d.toDateString();
  if (r === "week") return ts >= d.getTime() - 7 * 86400000;
  return ts >= d.getTime() - 30 * 86400000;
};

export function ReportsView({ bills }: { bills: Bill[] }) {
  const [range, setRange] = useState<Range>("today");

  const filtered = useMemo(() => bills.filter((b) => inRange(b.ts, range)), [bills, range]);
  const totalSales = filtered.reduce((s, b) => s + b.total, 0);
  const numBills = filtered.length;
  const avg = numBills ? totalSales / numBills : 0;
  const highest = filtered.reduce((m, b) => Math.max(m, b.total), 0);

  // Last 7 days bar data
  const last7 = useMemo(() => {
    const days: { label: string; total: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const total = bills
        .filter((b) => b.ts >= d.getTime() && b.ts < next.getTime())
        .reduce((s, b) => s + b.total, 0);
      days.push({
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        total,
        isToday: i === 0,
      });
    }
    return days;
  }, [bills]);

  const maxBar = Math.max(1, ...last7.map((d) => d.total));

  // Top selling items
  const topItems = useMemo(() => {
    const map = new Map<string, { name: string; img?: string; qty: number; revenue: number }>();
    filtered.forEach((b) =>
      b.items.forEach((i) => {
        const key = i.id;
        const ex = map.get(key) || { name: i.name, img: i.imageDataUrl, qty: 0, revenue: 0 };
        ex.qty += i.qty;
        ex.revenue += i.total;
        map.set(key, ex);
      })
    );
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filtered]);

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      <div className="flex gap-2">
        {([["today", "Today"], ["week", "This Week"], ["month", "This Month"]] as [Range, string][]).map(
          ([k, label]) => (
            <button key={k} onClick={() => setRange(k)} className="qb-chip" data-active={range === k}>
              {label}
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Sales" value={formatINR(totalSales)} valueClass="text-success" />
        <StatCard label="Number of Bills" value={String(numBills)} />
        <StatCard label="Average Bill" value={formatINR(avg)} />
        <StatCard label="Highest Bill" value={formatINR(highest)} />
      </div>

      <div className="qb-card p-4">
        <h3 className="text-sm font-bold mb-4">Daily Sales — Last 7 Days</h3>
        <div className="flex items-end gap-2 h-40">
          {last7.map((d, i) => {
            const h = Math.max(4, (d.total / maxBar) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {d.total > 0 ? `₹${Math.round(d.total)}` : ""}
                </span>
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${h}%`,
                    backgroundColor: d.isToday
                      ? "hsl(var(--brand))"
                      : "hsl(var(--primary) / 0.7)",
                  }}
                />
                <span className="text-[11px] font-mono text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="qb-card p-4">
        <h3 className="text-sm font-bold mb-3">Top Selling Items</h3>
        {topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No sales data for this period yet.
          </p>
        ) : (
          <div className="space-y-2">
            {topItems.map((it, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="font-mono text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                <ItemThumb name={it.name} src={it.img} className="h-10 w-10" rounded="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{it.qty} units sold</p>
                </div>
                <span className="font-mono text-sm font-bold text-success">{formatINR(it.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="qb-card p-3.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`mt-1.5 font-mono text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
