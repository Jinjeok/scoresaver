-- Create tags table
CREATE TABLE public.tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE
);

-- Create sheet_tags junction table
CREATE TABLE public.sheet_tags (
  sheet_id UUID NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (sheet_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_tags ENABLE ROW LEVEL SECURITY;

-- Tags are publicly readable
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
