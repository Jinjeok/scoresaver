"use client";

import { useState, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
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
}

export function PdfViewer({
  url,
  currentPage: controlledPage,
  onPageChange,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [internalPage, setInternalPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPage = controlledPage ?? internalPage;

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      // Clamp internal page if it exceeds total
      setInternalPage((prev) => Math.max(1, Math.min(prev, total)));
    },
    []
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, numPages));
      setInternalPage(clamped);
      onPageChange?.(clamped);
    },
    [numPages, onPageChange]
  );

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

  return (
    <div ref={containerRef} className={`flex flex-col items-center ${isFullscreen ? "bg-gray-900 p-4" : ""}`}>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 p-2 bg-gray-100 rounded-lg sticky top-0 z-10">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="이전 페이지 (←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-sm text-gray-600 min-w-[80px] text-center">
          {currentPage} / {numPages}
        </span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="다음 페이지 (→)"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="border-l border-gray-300 h-6 mx-1" />

        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer"
        >
          <ZoomOut className="h-5 w-5" />
        </button>

        <span className="text-sm text-gray-600 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        <div className="border-l border-gray-300 h-6 mx-1" />

        <button
          onClick={toggleFullscreen}
          className="p-1 rounded hover:bg-gray-200 cursor-pointer"
          title="전체화면"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5" />
          ) : (
            <Maximize2 className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* PDF Document */}
      <div className={`border border-gray-200 rounded-lg overflow-auto bg-gray-50 w-full ${isFullscreen ? "flex-1" : "max-h-[85vh]"}`}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-20 text-gray-400">
              PDF 로딩 중...
            </div>
          }
          error={
            <div className="flex items-center justify-center p-20 text-red-400">
              PDF를 불러올 수 없습니다
            </div>
          }
        >
          {numPages > 0 && currentPage >= 1 && currentPage <= numPages && (
            <Page
              pageNumber={currentPage}
              scale={scale}
              className="flex justify-center"
            />
          )}
        </Document>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-gray-400 mt-2">← → 키로 페이지 이동</p>
    </div>
  );
}
