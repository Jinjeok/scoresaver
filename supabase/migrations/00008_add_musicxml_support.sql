-- Add MusicXML storage path to sheets table
ALTER TABLE public.sheets ADD COLUMN musicxml_storage_path TEXT;

-- Add musicxml bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('musicxml-files', 'musicxml-files', false);

-- Storage policies for musicxml-files
CREATE POLICY "Admins can upload musicxml"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'musicxml-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update musicxml"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'musicxml-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete musicxml"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'musicxml-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
