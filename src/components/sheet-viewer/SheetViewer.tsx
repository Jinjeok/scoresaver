"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Play, Pause } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player/AudioPlayer";
import type { AudioPlayerHandle } from "@/components/audio-player/AudioPlayer";
import { useSyncPlayback } from "@/lib/hooks/useSyncPlayback";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/format";
import type { Sheet, AudioTrackWithUrl, SyncMarker } from "@/types/sheet";

// Dynamic imports to avoid SSR issues (react-pdf needs DOM, OSMD is large)
const PdfViewer = dynamic(
  () =>
    import("@/components/pdf-viewer/PdfViewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-20 text-gray-600">
        PDF 뷰어 로딩 중...
      </div>
    ),
  }
);

const MusicXmlViewer = dynamic(
  () =>
    import("@/components/musicxml-viewer/MusicXmlViewer").then(
      (mod) => mod.MusicXmlViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-20 text-gray-600">
        MusicXML 뷰어 로딩 중...
      </div>
    ),
  }
);

type ViewMode = "pdf" | "musicxml";

interface SheetViewerProps {
  sheet: Sheet;
  pdfUrl?: string;
  musicXmlUrl?: string;
  tracks: AudioTrackWithUrl[];
  syncMarkers?: SyncMarker[];
}

export function SheetViewer({
  sheet,
  pdfUrl,
  musicXmlUrl,
  tracks,
  syncMarkers = [],
}: SheetViewerProps) {
  const hasPdf = Boolean(pdfUrl);
  const hasMusicXml = Boolean(musicXmlUrl);
  const defaultMode: ViewMode = hasPdf ? "pdf" : "musicxml";

  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const hasSyncMarkers = syncMarkers.length > 0;
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const { currentPage: syncPage, handleTimeUpdate } = useSyncPlayback({
    markers: syncMarkers,
    enabled: hasSyncMarkers,
  });

  const onTimeUpdate = useCallback(
    (timeMs: number) => {
      setAudioCurrentTime(timeMs / 1000);
      if (hasSyncMarkers) {
        handleTimeUpdate(timeMs);
      }
    },
    [hasSyncMarkers, handleTimeUpdate]
  );

  const displayPage = hasSyncMarkers ? syncPage : currentPage;

  // Keyboard navigation for PDF + Space for audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space: toggle audio play/stop
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        audioPlayerRef.current?.togglePlay();
        return;
      }

      // Arrow keys: PDF page navigation
      if (viewMode !== "pdf" || !hasPdf) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPage((p) => (numPages > 0 ? Math.min(numPages, p + 1) : p + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, hasPdf, numPages]);

  return (
    <div className="space-y-6">
      {/* Sheet info */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
          {sheet.composer && <span>작곡: {sheet.composer}</span>}
          {sheet.arranger && <span>편곡: {sheet.arranger}</span>}
          {sheet.key_signature && <span>Key: {sheet.key_signature}</span>}
          {sheet.time_signature && <span>박자: {sheet.time_signature}</span>}
          {sheet.tempo_bpm && <span>BPM: {sheet.tempo_bpm}</span>}
        </div>
        {sheet.description && (
          <p className="mt-2 text-sm text-gray-700">{sheet.description}</p>
        )}
      </div>

      {/* View mode toggle */}
      {hasPdf && hasMusicXml && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setViewMode("musicxml")}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-colors cursor-pointer",
              viewMode === "musicxml"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            인터랙티브 악보
          </button>
          <button
            onClick={() => setViewMode("pdf")}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-colors cursor-pointer",
              viewMode === "pdf"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            PDF 보기
          </button>
        </div>
      )}

      {/* Score viewer */}
      {viewMode === "musicxml" && musicXmlUrl && (
        <MusicXmlViewer musicXmlUrl={musicXmlUrl} />
      )}

      {viewMode === "pdf" && pdfUrl && (
        <PdfViewer
          url={pdfUrl}
          currentPage={displayPage}
          onPageChange={setCurrentPage}
          onNumPagesChange={setNumPages}
          fullscreenExtra={
            tracks.length > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => audioPlayerRef.current?.togglePlay()}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-300 cursor-pointer"
                  title={isAudioPlaying ? "정지 (Space)" : "재생 (Space)"}
                >
                  {isAudioPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <span className="text-xs text-gray-400 min-w-[36px] text-right">
                  {formatDuration(audioCurrentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={audioDuration || 0}
                  step={0.1}
                  value={audioCurrentTime}
                  onChange={(e) => audioPlayerRef.current?.seek(parseFloat(e.target.value))}
                  className="w-32 h-1 accent-indigo-500"
                />
                <span className="text-xs text-gray-400 min-w-[36px]">
                  {formatDuration(audioDuration)}
                </span>
              </div>
            ) : undefined
          }
        />
      )}

      {!hasPdf && !hasMusicXml && (
        <div className="flex items-center justify-center p-20 text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
          악보 파일이 없습니다
        </div>
      )}

      {/* Audio Player */}
      {tracks.length > 0 && (
        <AudioPlayer ref={audioPlayerRef} tracks={tracks} onTimeUpdate={onTimeUpdate} onPlayStateChange={setIsAudioPlaying} onDurationChange={setAudioDuration} />
      )}
    </div>
  );
}
