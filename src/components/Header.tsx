import { Menu, ShoppingCart } from "lucide-react";

export function Header({
  cartCount,
  onMenu,
  onLogo,
}: {
  cartCount: number;
  onMenu: () => void;
  onLogo: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-brand text-brand-foreground shadow-card">
      <div className="h-14 px-3 flex items-center justify-between">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="h-10 w-10 grid place-items-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onLogo}
          className="text-lg font-extrabold tracking-tight"
          aria-label="QuickBill home"
        >
          <span className="text-white">Quick</span>
          <span className="text-primary" style={{ color: "hsl(var(--brand-soft))" }}>Bill</span>
        </button>

        <div className="min-w-10 flex justify-end">
          <div
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
            aria-label={`${cartCount} items in current bill`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="font-mono">{cartCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
