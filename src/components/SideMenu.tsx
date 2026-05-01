import { useState } from "react";
import { View } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { ShoppingBag, Receipt, BarChart3, Package, Settings, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LangContext";
import { Lang } from "@/lib/i18n";

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
  const { t, lang, setLang } = useLang();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "billing", label: t.newBill, icon: ShoppingBag },
    { id: "previous", label: t.previousBills, icon: Receipt },
    { id: "reports", label: t.reports, icon: BarChart3 },
    { id: "inventory", label: t.manageInventory, icon: Package },
  ];

  const handleLang = (l: Lang) => {
    setLang(l);
  };

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
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">{t.shop}</p>
          <p className="mt-0.5 text-lg font-bold">{shopName}</p>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">{t.todaysSales}</p>
            <p
              className="mt-1 text-2xl font-mono font-semibold"
              style={{ color: "hsl(var(--brand-soft))" }}
            >
              {formatINR(todaysTotal)}
            </p>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => { onNavigate(it.id); onClose(); }}
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

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3 text-left text-sm font-medium",
              "border-l-4 transition-colors border-transparent text-white/85 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="flex-1">{t.settings}</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform text-white/50", settingsOpen && "rotate-90")}
            />
          </button>

          {/* Settings panel — inline */}
          {settingsOpen && (
            <div className="mx-3 mb-2 bg-sidebar-accent/50 rounded-xl p-4 space-y-3 border border-white/10">
              <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">{t.language}</p>
              <div className="flex gap-2">
                {(["en", "hi"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLang(l)}
                    className={cn(
                      "flex-1 h-9 rounded-lg text-sm font-semibold transition",
                      lang === l
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    )}
                  >
                    {l === "en" ? t.langEnglish : t.langHindi}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-white/40 px-3">{t.version}</p>
        </div>
      </aside>
    </>
  );
}
