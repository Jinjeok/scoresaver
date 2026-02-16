"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { ZoomIn, ZoomOut, SkipBack, SkipForward } from "lucide-react";

interface MusicXmlViewerProps {
  musicXmlUrl: string;
  onCursorUpdate?: (measureIndex: number) => void;
}

export function MusicXmlViewer({
  musicXmlUrl,
  onCursorUpdate,
}: MusicXmlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [cursorActive, setCursorActive] = useState(false);

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
      });

      osmd.setLogLevel("warn");

      // Fetch as ArrayBuffer first, then detect format by magic number
      const response = await fetch(musicXmlUrl);
      if (!response.ok) throw new Error("파일을 불러올 수 없습니다");

      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // ZIP magic number: 0x50 0x4B ("PK") → MXL (compressed MusicXML)
      if (uint8[0] === 0x50 && uint8[1] === 0x4b) {
        await osmd.load(uint8 as unknown as string);
      } else {
        // Plain XML text
        const text = new TextDecoder().decode(buffer);
        await osmd.load(text);
      }

      osmd.zoom = zoom;
      osmd.render();
      osmdRef.current = osmd;
    } catch (err) {
      console.error("OSMD error:", err);
      setError("MusicXML을 렌더링할 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [musicXmlUrl, zoom]);

  useEffect(() => {
    initOsmd();
  }, [initOsmd]);

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

    if (cursorActive) {
      osmd.cursor.hide();
      setCursorActive(false);
    } else {
      osmd.cursor.show();
      osmd.cursor.reset();
      setCursorActive(true);
    }
  }, [cursorActive]);

  const moveCursor = useCallback(
    (direction: "next" | "prev") => {
      const osmd = osmdRef.current;
      if (!osmd || !cursorActive) return;

      if (direction === "next") {
        osmd.cursor.next();
      } else {
        osmd.cursor.previous();
      }

      const iterator = osmd.cursor.iterator;
      if (iterator && onCursorUpdate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCursorUpdate((iterator as any).currentMeasureIndex);
      }
    },
    [cursorActive, onCursorUpdate]
  );

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 p-2 bg-gray-100 rounded-lg">
        <button
          onClick={() => handleZoom(-0.1)}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer"
          title="축소"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="text-sm text-gray-600 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(0.1)}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer"
          title="확대"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        <div className="border-l border-gray-300 h-6 mx-2" />

        <button
          onClick={toggleCursor}
          className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
            cursorActive
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
        >
          커서 {cursorActive ? "ON" : "OFF"}
        </button>

        {cursorActive && (
          <>
            <button
              onClick={() => moveCursor("prev")}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => moveCursor("next")}
              className="p-1 rounded hover:bg-gray-200 cursor-pointer"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </>
        )}
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

      <div
        ref={containerRef}
        className="bg-white rounded-lg border border-gray-200 overflow-auto max-h-[80vh] p-4"
      />
    </div>
  );
}
