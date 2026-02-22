-- Create sheet_pdfs table for multiple PDF versions per sheet
CREATE TABLE public.sheet_pdfs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id     UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT '악보',
  storage_path TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  page_count   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sheet_pdfs_sheet_id ON public.sheet_pdfs(sheet_id);

-- Enable RLS
ALTER TABLE public.sheet_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDF visible if sheet is visible"
  ON public.sheet_pdfs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sheets s
      WHERE s.id = sheet_pdfs.sheet_id
        AND (s.is_public = true OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        ))
    )
  );

CREATE POLICY "Admins can insert sheet_pdfs"
  ON public.sheet_pdfs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sheet_pdfs"
  ON public.sheet_pdfs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete sheet_pdfs"
  ON public.sheet_pdfs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
