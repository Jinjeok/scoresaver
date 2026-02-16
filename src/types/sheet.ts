export interface Sheet {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  description: string | null;
  genre: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tempo_bpm: number | null;
  page_count: number | null;
  is_public: boolean;
  share_token: string;
  pdf_storage_path: string;
  musicxml_storage_path: string | null;
  thumbnail_path: string | null;
  notion_page_id: string | null;
  memos_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SheetWithTags extends Sheet {
  tags: Tag[];
}

export interface SheetWithTracks extends Sheet {
  tracks: AudioTrack[];
}

export interface SheetFull extends Sheet {
  tags: Tag[];
  tracks: AudioTrack[];
  sync_markers: SyncMarker[];
}

export interface AudioTrack {
  id: string;
  sheet_id: string;
  label: string;
  track_type: string;
  key_shift: number;
  storage_path: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  mime_type: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AudioTrackWithUrl extends AudioTrack {
  signedUrl?: string;
}

export interface SyncMarker {
  id: string;
  sheet_id: string;
  audio_track_id: string | null;
  timestamp_ms: number;
  page_number: number;
  section_label: string | null;
  measure_number: number | null;
  y_offset_pct: number | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
}
