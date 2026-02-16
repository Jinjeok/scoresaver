-- Create sync_markers table
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

-- Enable RLS
ALTER TABLE public.sync_markers ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as audio_tracks)
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
