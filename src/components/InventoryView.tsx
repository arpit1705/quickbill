import { useRef, useState } from "react";
import { InventoryItem } from "@/lib/types";
import { uid } from "@/lib/format";
import { ItemThumb } from "./ItemThumb";
import { Plus, Pencil, Trash2, Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadItemImage, deleteItemImage } from "@/lib/storage";

export function InventoryView({
  inventory,
  setInventory,
}: {
  inventory: InventoryItem[];
  setInventory: (next: InventoryItem[]) => void;
}) {
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<InventoryItem | null>(null);

  const onSave = (item: InventoryItem) => {
    if (inventory.some((i) => i.id === item.id)) {
      setInventory(inventory.map((i) => (i.id === item.id ? item : i)));
      toast.success("Item updated");
    } else {
      setInventory([item, ...inventory]);
      toast.success("Item added");
    }
    setEditing(null);
    setAdding(false);
  };

  const onDelete = (item: InventoryItem) => {
    setInventory(inventory.filter((i) => i.id !== item.id));
    toast.success(`Deleted "${item.name}"`);
    setConfirmDel(null);
  };

  return (
    <div className="px-4 pt-4 pb-10">
      <button
        onClick={() => setAdding(true)}
        className="w-full h-12 rounded-xl bg-brand text-brand-foreground font-bold text-sm
                   hover:bg-brand/90 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-card"
      >
        <Plus className="h-4 w-4" /> Add New Item
      </button>

      <div className="mt-4 qb-card divide-y divide-border">
        {inventory.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No items yet. Add your first product above.
          </div>
        ) : (
          inventory.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <ItemThumb name={it.name} src={it.imageDataUrl} className="h-10 w-10" rounded="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  ₹{it.price}/{it.unit}
                </p>
              </div>
              <button
                onClick={() => setEditing(it)}
                className="h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirmDel(it)}
                className="h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {(adding || editing) && (
        <ItemSheet
          initial={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={onSave}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete item?"
          message={`"${confirmDel.name}" will be permanently removed from your inventory.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => onDelete(confirmDel)}
        />
      )}
    </div>
  );
}

function ItemSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: InventoryItem | null;
  onClose: () => void;
  onSave: (i: InventoryItem) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState<string>(initial?.price?.toString() ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [img, setImg] = useState<string | undefined>(initial?.imageDataUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadItemImage(file, initial?.id);
      setImg(url);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (img) {
      await deleteItemImage(img);
    }
    setImg(undefined);
  };

  const submit = () => {
    if (!name.trim()) return toast.error("Name is required");
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return toast.error("Enter a valid price");
    if (!unit.trim()) return toast.error("Unit is required");
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      price: p,
      unit: unit.trim(),
      imageDataUrl: img,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl p-5 pb-7 animate-slide-up">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{initial ? "Edit Item" : "Add New Item"}</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image upload */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
          {uploading ? (
            <div className="h-32 w-32 rounded-xl border-2 border-dashed border-primary bg-accent flex flex-col items-center justify-center gap-1.5">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-medium text-primary">Uploading…</span>
            </div>
          ) : img ? (
            <>
              <img
                src={img}
                alt="preview"
                className="h-32 w-32 object-cover rounded-xl border border-border shadow-card"
              />
              <div className="flex gap-3 text-xs">
                <button onClick={() => fileRef.current?.click()} className="text-primary font-semibold hover:underline">
                  Change
                </button>
                <button onClick={removeImage} className="text-destructive font-semibold hover:underline">
                  Remove
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="h-32 w-32 rounded-xl border-2 border-dashed border-border hover:border-primary
                         hover:bg-accent text-muted-foreground hover:text-primary transition
                         flex flex-col items-center justify-center gap-1.5"
            >
              <Camera className="h-7 w-7" />
              <span className="text-xs font-medium">Tap to upload</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          <Field label="Item Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sugar"
              className="qb-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)">
              <input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="qb-input font-mono"
              />
            </Field>
            <Field label="Unit">
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, pcs, L…"
                className="qb-input"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover active:scale-[0.98] transition shadow-md"
          >
            Save
          </button>
        </div>

        <style>{`.qb-input{height:2.75rem;width:100%;padding:0 0.875rem;border:1px solid hsl(var(--border));background:hsl(var(--card));border-radius:0.75rem;font-size:0.875rem;outline:none;transition:all 200ms}.qb-input:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.2)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative qb-card max-w-sm w-full p-5">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 rounded-lg text-sm font-bold transition active:scale-[0.98] ${
              danger
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:bg-primary-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
