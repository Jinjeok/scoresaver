-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('sheet-pdfs', 'sheet-pdfs', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', false);

-- Storage policies for sheet-pdfs
CREATE POLICY "Admins can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sheet-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'sheet-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sheet-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Storage policies for audio-files
CREATE POLICY "Admins can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update audio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'audio-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
