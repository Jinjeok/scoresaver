-- Function to get sheet by share token (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_sheet_by_share_token(token UUID)
RETURNS SETOF public.sheets
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sheets WHERE share_token = token;
$$;

-- Function to get audio tracks by share token (bypasses RLS)
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

-- Function to get sync markers by share token (bypasses RLS)
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

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audio_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
