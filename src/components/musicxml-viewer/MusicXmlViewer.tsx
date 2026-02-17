"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import JSZip from "jszip";
import {
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface MusicXmlViewerProps {
  musicXmlUrl: string;
  onCursorUpdate?: (measureIndex: number) => void;
}

export function MusicXmlViewer({
  musicXmlUrl,
  onCursorUpdate,
}: MusicXmlViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [cursorActive, setCursorActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cursorActiveRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    cursorActiveRef.current = cursorActive;
  }, [cursorActive]);

  // Helper: fix cursor z-index (OSMD sets -1 which hides behind bg-white)
  const fixCursorZIndex = useCallback((osmd: OpenSheetMusicDisplay) => {
    try {
      if (osmd.cursor?.cursorElement) {
        osmd.cursor.cursorElement.style.zIndex = "5";
      }
    } catch {
      // cursor not available
    }
  }, []);

  const initOsmd = useCallback(async () => {
    if (!containerRef.current || !musicXmlUrl) return;

    setLoading(true);
    setError(null);

    try {
      if (osmdRef.current) {
        containerRef.current.innerHTML = "";
      }

      const osmd = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        drawComposer: true,
        drawCredits: true,
        drawPartNames: true,
        drawMeasureNumbers: true,
        followCursor: true,
        cursorsOptions: [
          {
            type: 0,
            color: "#3b82f6",
            alpha: 0.5,
            follow: true,
          },
        ],
      });

      osmd.setLogLevel("warn");

      // Fetch file and detect format by magic bytes
      const response = await fetch(musicXmlUrl);
      if (!response.ok) throw new Error("파일을 불러올 수 없습니다");

      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      let xmlContent: string;

      // ZIP magic number: 0x50 0x4B ("PK") → MXL (compressed MusicXML)
      if (uint8[0] === 0x50 && uint8[1] === 0x4b) {
        const zip = await JSZip.loadAsync(buffer);
        const xmlFile = Object.keys(zip.files).find(
          (name) =>
            (name.endsWith(".xml") || name.endsWith(".musicxml")) &&
            !name.startsWith("META-INF")
        );
        if (!xmlFile)
          throw new Error("MXL 내부에 MusicXML 파일을 찾을 수 없습니다");
        xmlContent = await zip.files[xmlFile].async("string");
      } else {
        xmlContent = new TextDecoder().decode(buffer);
      }

      await osmd.load(xmlContent);

      osmd.zoom = zoom;
      osmd.render();
      osmdRef.current = osmd;
    } catch (err) {
      console.error("OSMD error:", err);
      setError("MusicXML을 렌더링할 수 없습니다");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicXmlUrl]);

  useEffect(() => {
    initOsmd();
  }, [initOsmd]);

  // Handle zoom changes without re-fetching
  useEffect(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;

    osmd.zoom = zoom;
    osmd.render();

    // Re-show cursor if it was active (render() recreates cursor elements)
    if (cursorActiveRef.current) {
      try {
        osmd.cursor.show();
        fixCursorZIndex(osmd);
      } catch {
        // cursor unavailable
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleZoom = useCallback(
    (delta: number) => {
      const newZoom = Math.max(0.3, Math.min(2.0, zoom + delta));
      setZoom(newZoom);
    },
    [zoom]
  );

  const toggleCursor = useCallback(() => {
    const osmd = osmdRef.current;
    if (!osmd) return;

    try {
      if (cursorActive) {
        osmd.cursor.hide();
        setCursorActive(false);
      } else {
        osmd.cursor.show();
        osmd.cursor.reset();
        fixCursorZIndex(osmd);
        setCursorActive(true);
      }
    } catch (err) {
      console.error("Cursor error:", err);
    }
  }, [cursorActive, fixCursorZIndex]);

  const moveCursor = useCallback(
    (direction: "next" | "prev") => {
      const osmd = osmdRef.current;
      if (!osmd || !cursorActive) return;

      try {
        if (direction === "next") {
          osmd.cursor.next();
        } else {
          osmd.cursor.previous();
        }

        fixCursorZIndex(osmd);

        const iterator = osmd.cursor.iterator;
        if (iterator && onCursorUpdate) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onCursorUpdate((iterator as any).currentMeasureIndex);
        }
      } catch (err) {
        console.error("Cursor move error:", err);
      }
    },
    [cursorActive, onCursorUpdate, fixCursorZIndex]
  );

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col ${isFullscreen ? "bg-white p-4 h-screen" : "space-y-3"}`}
    >
      {/* Controls */}
      <div className="flex items-center gap-3 p-2 bg-gray-100 rounded-lg shrink-0">
        <button
          onClick={() => handleZoom(-0.1)}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer text-gray-700"
          title="축소"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-gray-800 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(0.1)}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer text-gray-700"
          title="확대"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        <div className="border-l border-gray-500 h-6 mx-2" />

        <button
          onClick={toggleCursor}
          className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
            cursorActive
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-500"
          }`}
        >
          커서 {cursorActive ? "ON" : "OFF"}
        </button>

        {cursorActive && (
          <>
            <button
              onClick={() => moveCursor("prev")}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer text-gray-700"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => moveCursor("next")}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer text-gray-700"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="border-l border-gray-500 h-6 mx-2" />

        <button
          onClick={toggleFullscreen}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer text-gray-700"
          title="전체화면"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Render area */}
      {loading && (
        <div className="flex items-center justify-center p-20 text-gray-400">
          악보 렌더링 중...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center p-20 text-red-400">
          {error}
        </div>
      )}

      {/* OSMD cursor fix: cursor <img> has no class, so target direct child img elements.
          OSMD sets z-index:-1 which hides behind bg-white; override to z-index:5 */}
      <style>{`
        .osmd-cursor-container { position: relative; }
        .osmd-cursor-container > img {
          z-index: 5 !important;
          pointer-events: none;
        }
      `}</style>

      <div
        ref={containerRef}
        className={`bg-white rounded-lg border border-gray-200 overflow-auto p-4 osmd-cursor-container ${
          isFullscreen ? "flex-1" : "max-h-[85vh]"
        }`}
      />
    </div>
  );
}
