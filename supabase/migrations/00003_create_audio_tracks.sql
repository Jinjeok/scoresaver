-- Create audio_tracks table
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

-- Enable RLS
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies
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
