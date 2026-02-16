"use client";

import { useState, useCallback, useRef } from "react";
import type { SyncMarker } from "@/types/sheet";

interface UseSyncPlaybackProps {
  markers: SyncMarker[];
  enabled: boolean;
}

export function useSyncPlayback({ markers, enabled }: UseSyncPlaybackProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const sortedMarkers = useRef(
    [...markers].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  );

  const handleTimeUpdate = useCallback(
    (currentMs: number) => {
      if (!enabled || sortedMarkers.current.length === 0) return;

      const sorted = sortedMarkers.current;
      let low = 0;
      let high = sorted.length - 1;
      let best = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (sorted[mid].timestamp_ms <= currentMs) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (best >= 0) {
        const marker = sorted[best];
        setCurrentPage(marker.page_number);
      }
    },
    [enabled]
  );

  return { currentPage, handleTimeUpdate };
}
