-- Create sheets table
CREATE TABLE public.sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  composer        TEXT,
  arranger        TEXT,
  description     TEXT,
  genre           TEXT,
  key_signature   TEXT,
  time_signature  TEXT,
  tempo_bpm       INTEGER,
  page_count      INTEGER,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  share_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  pdf_storage_path TEXT NOT NULL,
  thumbnail_path  TEXT,
  notion_page_id  TEXT,
  memos_name      TEXT,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_sheets_share_token ON public.sheets(share_token);
CREATE INDEX idx_sheets_is_public ON public.sheets(is_public);
CREATE INDEX idx_sheets_created_by ON public.sheets(created_by);

-- Enable RLS
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public sheets are visible to all"
  ON public.sheets FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins can see all sheets"
  ON public.sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert sheets"
  ON public.sheets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sheets"
  ON public.sheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete sheets"
  ON public.sheets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
