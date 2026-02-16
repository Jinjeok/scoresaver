import { z } from "zod/v4";

export const createSheetSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  composer: z.string().optional(),
  arranger: z.string().optional(),
  description: z.string().optional(),
  genre: z.string().optional(),
  key_signature: z.string().optional(),
  time_signature: z.string().optional(),
  tempo_bpm: z.coerce.number().int().positive().optional(),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

export const updateSheetSchema = createSheetSchema.partial();

export const createTrackSchema = z.object({
  label: z.string().min(1, "라벨을 입력해주세요"),
  track_type: z.enum([
    "full",
    "bass_included",
    "bass_excluded",
    "bass_only",
    "vocals_only",
    "key_shifted",
    "custom",
  ]),
  key_shift: z.coerce.number().int().default(0),
  sort_order: z.coerce.number().int().default(0),
});

export const updateTrackSchema = createTrackSchema.partial();

export const createSyncMarkerSchema = z.object({
  audio_track_id: z.string().uuid().nullable().optional(),
  timestamp_ms: z.coerce.number().int().nonnegative(),
  page_number: z.coerce.number().int().positive(),
  section_label: z.string().optional(),
  measure_number: z.coerce.number().int().positive().optional(),
  y_offset_pct: z.coerce.number().min(0).max(100).optional(),
});

export const bulkSyncMarkersSchema = z.array(createSyncMarkerSchema);

export type CreateSheetInput = z.infer<typeof createSheetSchema>;
export type UpdateSheetInput = z.infer<typeof updateSheetSchema>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type CreateSyncMarkerInput = z.infer<typeof createSyncMarkerSchema>;
