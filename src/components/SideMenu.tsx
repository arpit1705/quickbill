import { View } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { ShoppingBag, Receipt, BarChart3, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "billing", label: "New Bill", icon: ShoppingBag },
  { id: "previous", label: "Previous Bills", icon: Receipt },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "inventory", label: "Manage Inventory", icon: Package },
];

export function SideMenu({
  open,
  onClose,
  active,
  onNavigate,
  todaysTotal,
  shopName = "My Shop",
}: {
  open: boolean;
  onClose: () => void;
  active: View;
  onNavigate: (v: View) => void;
  todaysTotal: number;
  shopName?: string;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-[280px] bg-sidebar text-sidebar-foreground flex flex-col",
          "shadow-elevated transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Main menu"
      >
        <div className="p-5 border-b border-sidebar-border">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">Shop</p>
          <p className="mt-0.5 text-lg font-bold">{shopName}</p>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">Today's Sales</p>
            <p
              className="mt-1 text-2xl font-mono font-semibold"
              style={{ color: "hsl(var(--brand-soft))" }}
            >
              {formatINR(todaysTotal)}
            </p>
          </div>
        </div>

        <nav className="flex-1 py-3">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  onNavigate(it.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3 text-left text-sm font-medium",
                  "border-l-4 transition-colors",
                  isActive
                    ? "border-primary bg-sidebar-accent text-white"
                    : "border-transparent text-white/85 hover:bg-sidebar-accent/60 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-white/40 px-3">QuickBill v1.0</p>
        </div>
      </aside>
    </>
  );
}
