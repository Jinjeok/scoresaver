export const TRACK_TYPES = {
  full: "Full Mix",
  bass_included: "Bass Included",
  bass_excluded: "Bass Excluded",
  bass_only: "Bass Only",
  vocals_only: "Vocals Only",
  key_shifted: "Key Shifted",
  custom: "Custom",
} as const;

export type TrackType = keyof typeof TRACK_TYPES;

export function getDefaultLabel(type: TrackType, keyShift?: number): string {
  if (type === "key_shifted" && keyShift !== undefined && keyShift !== 0) {
    const sign = keyShift > 0 ? "+" : "";
    return `${sign}${keyShift} Key${Math.abs(keyShift) !== 1 ? "s" : ""}`;
  }
  return TRACK_TYPES[type] ?? "Custom";
}
