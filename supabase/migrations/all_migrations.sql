-- ============================================================
-- ScoreSaver 전체 마이그레이션 (Supabase SQL Editor에서 실행)
-- 아래 내용을 Supabase Dashboard > SQL Editor에 붙여넣고 Run 하세요.
-- ============================================================

-- ============ 00001: profiles ============
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ 00002: sheets ============
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

ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

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

-- ============ 00003: audio_tracks ============
CREATE TABLE public.audio_tracks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id          UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  track_type        TEXT NOT NULL,
  key_shift         INTEGER DEFAULT 0,
  storage_path      TEXT NOT NULL,
  duration_seconds  NUMERIC(10, 2),
  file_size_bytes   BIGINT,
  mime_type         TEXT NOT NULL DEFAULT 'audio/mpeg',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audio_tracks_sheet_id ON public.audio_tracks(sheet_id);

ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audio visible if sheet is visible"
  ON public.audio_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sheets s
      WHERE s.id = audio_tracks.sheet_id
        AND (s.is_public = true OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        ))
    )
  );

CREATE POLICY "Admins can insert audio tracks"
  ON public.audio_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update audio tracks"
  ON public.audio_tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete audio tracks"
  ON public.audio_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============ 00004: sync_markers ============
CREATE TABLE public.sync_markers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id        UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  audio_track_id  UUID REFERENCES public.audio_tracks(id) ON DELETE SET NULL,
  timestamp_ms    INTEGER NOT NULL,
  page_number     INTEGER NOT NULL,
  section_label   TEXT,
  measure_number  INTEGER,
  y_offset_pct    NUMERIC(5, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_markers_sheet_id ON public.sync_markers(sheet_id);
CREATE INDEX idx_sync_markers_audio_track_id ON public.sync_markers(audio_track_id);
CREATE INDEX idx_sync_markers_timestamp ON public.sync_markers(sheet_id, timestamp_ms);

ALTER TABLE public.sync_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sync markers visible if sheet is visible"
  ON public.sync_markers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sheets s
      WHERE s.id = sync_markers.sheet_id
        AND (s.is_public = true OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        ))
    )
  );

CREATE POLICY "Admins can insert sync markers"
  ON public.sync_markers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update sync markers"
  ON public.sync_markers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete sync markers"
  ON public.sync_markers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============ 00005: tags ============
CREATE TABLE public.tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE public.sheet_tags (
  sheet_id UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (sheet_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can view sheet_tags"
  ON public.sheet_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sheet_tags"
  ON public.sheet_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ============ 00006: functions ============
CREATE OR REPLACE FUNCTION public.get_sheet_by_share_token(token UUID)
RETURNS SETOF public.sheets
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sheets WHERE share_token = token;
$$;

CREATE OR REPLACE FUNCTION public.get_tracks_by_share_token(token UUID)
RETURNS SETOF public.audio_tracks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT at.* FROM public.audio_tracks at
  INNER JOIN public.sheets s ON s.id = at.sheet_id
  WHERE s.share_token = token
  ORDER BY at.sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_sync_markers_by_share_token(token UUID)
RETURNS SETOF public.sync_markers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.* FROM public.sync_markers sm
  INNER JOIN public.sheets s ON s.id = sm.sheet_id
  WHERE s.share_token = token
  ORDER BY sm.timestamp_ms ASC;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audio_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 00007: storage_buckets ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('sheet-pdfs', 'sheet-pdfs', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', false);

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

-- ============ 00008: musicxml_support ============
ALTER TABLE public.sheets ADD COLUMN musicxml_storage_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('musicxml-files', 'musicxml-files', false);

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

-- ============ 00009: sheet_pdfs ============
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
