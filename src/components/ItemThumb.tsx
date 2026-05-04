import { initialOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ItemThumb({
  name,
  src,
  className,
  rounded = "md",
}: {
  name: string;
  src?: string;
  className?: string;
  rounded?: "sm" | "md" | "lg";
}) {
  const r = rounded === "sm" ? "rounded-md" : rounded === "lg" ? "rounded-xl" : "rounded-lg";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("object-cover bg-muted", r, className)}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground font-bold select-none",
        r,
        className
      )}
      aria-label={name}
    >
      {initialOf(name)}
    </div>
  );
}
