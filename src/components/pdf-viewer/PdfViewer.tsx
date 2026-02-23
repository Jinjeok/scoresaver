"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  SkipBack,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onNumPagesChange?: (numPages: number) => void;
  fullscreenExtra?: ReactNode;
}

export function PdfViewer({
  url,
  currentPage: controlledPage,
  onPageChange,
  onNumPagesChange,
  fullscreenExtra,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visiblePage, setVisiblePage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const visiblePageRef = useRef(1);
  const isAutoScrollRef = useRef(false);
  const viewportRef = useRef<{ width: number; height: number } | null>(null);
  const normalScaleRef = useRef<number | null>(null);
  // Refs for touch handlers (avoid stale closures in the effect with [] deps)
  const scaleRef = useRef<number>(1);
  const numPagesRef = useRef<number>(0);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const goToPageRef = useRef<(page: number) => void>(() => {});

  const onDocumentLoadSuccess = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdf: any) => {
      const total = pdf.numPages;
      setNumPages(total);
      onNumPagesChange?.(total);
      if (scrollContainerRef.current) {
        pdf.getPage(1).then(
          (page: {
            getViewport: (opts: { scale: number }) => {
              width: number;
              height: number;
            };
          }) => {
            const vp = page.getViewport({ scale: 1 });
            viewportRef.current = { width: vp.width, height: vp.height };
            const targetHeight = window.innerHeight * 0.92;
            setScale(targetHeight / vp.height);
          }
        );
      }
    },
    [onNumPagesChange]
  );

  // Recalculate scale when entering/exiting fullscreen
  useEffect(() => {
    if (!viewportRef.current) return;
    const vp = viewportRef.current;

    if (isFullscreen) {
      normalScaleRef.current = scale;
      const h = window.innerHeight - 44;
      const w = window.innerWidth - 16;
      setScale(Math.min(h / vp.height, w / vp.width));
    } else if (normalScaleRef.current !== null) {
      setScale(normalScaleRef.current);
      normalScaleRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  // Listen for fullscreen exit (Escape key)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Scroll to a specific page element (normal mode only)
  const scrollToPage = useCallback((page: number) => {
    const pageEl = pageRefs.current.get(page);
    const container = scrollContainerRef.current;
    if (pageEl && container) {
      isAutoScrollRef.current = true;
      container.scrollTo({
        top: pageEl.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
      setTimeout(() => {
        isAutoScrollRef.current = false;
      }, 500);
    }
    visiblePageRef.current = page;
    setVisiblePage(page);
  }, []);

  // Navigate to page
  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, numPages));
      if (isFullscreen) {
        visiblePageRef.current = clamped;
        setVisiblePage(clamped);
      } else {
        scrollToPage(clamped);
      }
      onPageChange?.(clamped);
    },
    [numPages, isFullscreen, scrollToPage, onPageChange]
  );

  // Keep refs in sync for touch handlers
  useEffect(() => { scaleRef.current = scale ?? 1; }, [scale]);
  useEffect(() => { numPagesRef.current = numPages; }, [numPages]);
  goToPageRef.current = goToPage;

  // When parent changes controlled page, navigate to it
  useEffect(() => {
    if (
      controlledPage !== undefined &&
      controlledPage !== visiblePageRef.current &&
      numPages > 0
    ) {
      const clamped = Math.max(1, Math.min(controlledPage, numPages));
      if (isFullscreen) {
        visiblePageRef.current = clamped;
        setVisiblePage(clamped);
      } else {
        scrollToPage(clamped);
      }
    }
  }, [controlledPage, scrollToPage, numPages, isFullscreen]);

  // Track visible page on user scroll (normal mode)
  useEffect(() => {
    if (isFullscreen) return;
    const container = scrollContainerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      if (isAutoScrollRef.current) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollMid = scrollTop + containerHeight / 3;

      let current = 1;
      for (let i = 1; i <= numPages; i++) {
        const el = pageRefs.current.get(i);
        if (el && el.offsetTop - container.offsetTop <= scrollMid) {
          current = i;
        }
      }

      if (current !== visiblePageRef.current) {
        visiblePageRef.current = current;
        setVisiblePage(current);
        onPageChange?.(current);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, onPageChange, isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Pinch-to-zoom + swipe page navigation on touch devices
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers: prevent browser from intercepting (zoom/pan)
        e.preventDefault();
        pinchRef.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scaleRef.current,
        };
        swipeStartRef.current = null;
      } else if (e.touches.length === 1) {
        // One finger: let browser handle native scroll, track for swipe
        pinchRef.current = null;
        swipeStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        // Prevent browser from panning with 2 fingers while pinching
        e.preventDefault();
        const newDistance = getDistance(e.touches);
        const ratio = newDistance / pinchRef.current.initialDistance;
        const newScale = Math.max(0.5, Math.min(3.0, pinchRef.current.initialScale * ratio));
        setScale(newScale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }

      // Swipe: single finger lifted, all fingers off screen
      const start = swipeStartRef.current;
      if (e.changedTouches.length === 1 && e.touches.length === 0 && start) {
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        const dt = Date.now() - start.time;
        // Horizontal swipe: fast, clearly horizontal, at least 50px
        if (dt < 400 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) {
            // Swipe left → next page
            const next = Math.min(visiblePageRef.current + 1, numPagesRef.current);
            if (next !== visiblePageRef.current) goToPageRef.current(next);
          } else {
            // Swipe right → previous page
            const prev = Math.max(visiblePageRef.current - 1, 1);
            if (prev !== visiblePageRef.current) goToPageRef.current(prev);
          }
        }
        swipeStartRef.current = null;
      }
    };

    // passive: false for touchstart so we can preventDefault on 2-finger touches
    //   (single-finger: no preventDefault called → native scroll still works)
    // passive: false for touchmove so we can preventDefault on 2-finger moves
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // 'f' key to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  const activeScale = scale ?? 1;

  const btnClass = isFullscreen
    ? "p-1 rounded hover:bg-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default text-gray-500"
    : "p-1 rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer disabled:cursor-default text-gray-700";

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? "bg-gray-900 h-screen" : "items-center"}`}
    >
      {/* Controls */}
      <div
        className={`flex items-center shrink-0 ${
          isFullscreen
            ? "justify-between px-4 py-1.5 bg-gray-800"
            : "gap-4 mb-4 p-2 bg-gray-100 rounded-lg sticky top-0 z-10"
        }`}
      >
        {/* PDF navigation (left) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToPage(1)}
            disabled={visiblePage <= 1}
            className={btnClass}
            title="첫 페이지"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={() => goToPage(visiblePage - 1)}
            disabled={visiblePage <= 1}
            className={btnClass}
            title="이전 페이지 (←)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span
            className={`text-sm font-medium min-w-[80px] text-center ${
              isFullscreen ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {visiblePage} / {numPages}
          </span>

          <button
            onClick={() => goToPage(visiblePage + 1)}
            disabled={visiblePage >= numPages}
            className={btnClass}
            title="다음 페이지 (→)"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            className={`border-l h-5 mx-1 ${
              isFullscreen ? "border-gray-600" : "border-gray-500"
            }`}
          />

          <button
            onClick={() => setScale((s) => Math.max(0.5, (s ?? 1) - 0.2))}
            className={btnClass}
          >
            <ZoomOut className="h-5 w-5" />
          </button>

          <span
            className={`text-sm font-medium min-w-[50px] text-center ${
              isFullscreen ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {Math.round(activeScale * 100)}%
          </span>

          <button
            onClick={() => setScale((s) => Math.min(3.0, (s ?? 1) + 0.2))}
            className={btnClass}
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>

        {/* Right side: fullscreenExtra + fullscreen toggle */}
        <div className="flex items-center gap-3">
          {isFullscreen && fullscreenExtra}

          {!isFullscreen && (
            <div className="border-l border-gray-500 h-5 mx-1" />
          )}

          <button
            onClick={toggleFullscreen}
            className={btnClass}
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div
        ref={scrollContainerRef}
        // touch-action: pan-y → browser handles vertical scroll,
        //   JS handles pinch zoom and horizontal swipe.
        // touch-action: none in fullscreen → JS handles everything.
        style={{ touchAction: isFullscreen ? "none" : "pan-y" }}
        className={
          isFullscreen
            ? "flex-1 flex items-center justify-center overflow-hidden"
            : "border border-gray-200 rounded-lg overflow-auto bg-gray-50 w-full max-h-[85vh]"
        }
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-20 text-gray-600">
              PDF 로딩 중...
            </div>
          }
          error={
            <div className="flex items-center justify-center p-20 text-red-400">
              PDF를 불러올 수 없습니다
            </div>
          }
        >
          {isFullscreen
            ? numPages > 0 &&
              scale !== null && (
                <Page
                  pageNumber={visiblePage}
                  scale={activeScale}
                  className="flex justify-center"
                />
              )
            : numPages > 0 &&
              scale !== null &&
              Array.from({ length: numPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNum, el);
                      else pageRefs.current.delete(pageNum);
                    }}
                    className={
                      pageNum < numPages ? "border-b border-gray-500" : ""
                    }
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={activeScale}
                      className="flex justify-center"
                    />
                  </div>
                )
              )}
        </Document>
      </div>

      {/* Keyboard hint (normal mode) */}
      {!isFullscreen && (
        <p className="text-xs text-gray-600 mt-2">
          ← → 페이지 이동 · Space 재생/정지 · F 전체화면 · 핀치 줌 · 좌우 스와이프
        </p>
      )}
    </div>
  );
}
