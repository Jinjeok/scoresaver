"use client";

import { useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import {
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  FileMusic,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tag } from "@/types/sheet";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SheetWithPdfUrl {
  id: string;
  title: string;
  composer: string | null;
  is_public: boolean;
  created_at: string;
  tags: Tag[];
  pdfSignedUrl: string | null;
}

interface BrowseContentProps {
  sheets: SheetWithPdfUrl[];
  page: number;
  totalPages: number;
  search?: string;
  tag?: string;
}

function PdfThumbnail({ url }: { url: string }) {
  return (
    <Document
      file={url}
      loading={
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <FileMusic className="h-12 w-12" />
        </div>
      }
      error={
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <FileMusic className="h-12 w-12" />
        </div>
      }
    >
      <Page
        pageNumber={1}
        width={220}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}

export function BrowseContent({
  sheets,
  page,
  totalPages,
  search,
  tag,
}: BrowseContentProps) {
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");

  if (sheets.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        {search || tag ? "검색 결과가 없습니다" : "등록된 악보가 없습니다"}
      </div>
    );
  }

  const paginationUrl = (p: number) =>
    `/admin/browse?page=${p}${search ? `&search=${search}` : ""}${tag ? `&tag=${tag}` : ""}`;

  return (
    <>
      {/* View mode toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setViewMode("gallery")}
            className={cn(
              "p-1.5 rounded transition-colors cursor-pointer",
              viewMode === "gallery"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            title="갤러리 보기"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded transition-colors cursor-pointer",
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            title="리스트 보기"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gallery View */}
      {viewMode === "gallery" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/admin/browse/${sheet.id}`}
              className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center overflow-hidden">
                {sheet.pdfSignedUrl ? (
                  <PdfThumbnail url={sheet.pdfSignedUrl} />
                ) : (
                  <FileMusic className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    {sheet.title}
                  </h3>
                  {sheet.is_public ? (
                    <Eye className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5" />
                  )}
                </div>
                {sheet.composer && (
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {sheet.composer}
                  </p>
                )}
                {sheet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sheet.tags.map((t) => (
                      <span
                        key={t.id}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/admin/browse/${sheet.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-16 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                {sheet.pdfSignedUrl ? (
                  <Document
                    file={sheet.pdfSignedUrl}
                    loading={<FileMusic className="h-5 w-5 text-gray-400" />}
                    error={<FileMusic className="h-5 w-5 text-gray-400" />}
                  >
                    <Page
                      pageNumber={1}
                      width={44}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                ) : (
                  <FileMusic className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {sheet.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {sheet.composer && (
                    <span className="text-sm text-gray-600 truncate">
                      {sheet.composer}
                    </span>
                  )}
                  {sheet.tags.length > 0 && (
                    <div className="flex gap-1">
                      {sheet.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {sheet.is_public ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    공개
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    비공개
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {new Date(sheet.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={paginationUrl(p)}
              className={`px-3 py-1 rounded text-sm ${
                p === page
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
