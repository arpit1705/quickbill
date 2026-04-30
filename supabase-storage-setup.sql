-- ============================================================
-- QuickBill POS — Supabase Storage bucket for item images
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create the storage bucket (public so images can be served directly)
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to read images (public bucket)
CREATE POLICY "Public read access for item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

-- 3. Allow anyone to upload images (no auth, single-user app)
CREATE POLICY "Allow upload item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images');

-- 4. Allow anyone to update/overwrite images
CREATE POLICY "Allow update item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-images');

-- 5. Allow anyone to delete images
CREATE POLICY "Allow delete item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-images');
