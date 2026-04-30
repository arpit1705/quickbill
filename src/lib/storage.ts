import { supabase } from "./supabase";

const BUCKET = "item-images";

export async function uploadItemImage(
  file: File,
  itemId?: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${itemId ?? crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function deleteItemImage(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("Failed to delete image:", error);
}
