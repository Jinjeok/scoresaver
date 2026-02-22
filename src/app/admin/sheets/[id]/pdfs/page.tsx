"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { Trash2 } from "lucide-react";
import type { SheetPdf } from "@/types/sheet";

export default function AdminPdfsPage() {
  const params = useParams();
  const [pdfs, setPdfs] = useState<SheetPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const fetchPdfs = useCallback(async () => {
    const res = await fetch(`/api/sheets/${params.id}/pdfs`);
    if (res.ok) {
      setPdfs(await res.json());
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleUpload = async (file: File) => {
    if (!newLabel.trim()) {
      alert("PDF 버전 이름을 입력해주세요");
      return;
    }
    setUploading(true);
    try {
      const pdfId = crypto.randomUUID();

      // 1. Get signed upload URL
      const urlRes = await fetch(`/api/sheets/${params.id}/pdfs/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json();
        alert(err.error || "업로드 URL 생성 실패");
        return;
      }
      const { signedUrl, path: storagePath } = await urlRes.json();

      // 2. Upload file directly to storage
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) {
        alert("PDF 업로드 실패");
        return;
      }

      // 3. Create DB record
      const res = await fetch(`/api/sheets/${params.id}/pdfs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          storage_path: storagePath,
          sort_order: pdfs.length,
        }),
      });

      if (res.ok) {
        setNewLabel("");
        fetchPdfs();
      } else {
        const err = await res.json();
        alert(err.error || "PDF 등록 실패");
      }
    } finally {
      setUploading(false);
    }
  };

  const deletePdf = async (pdfId: string) => {
    if (!confirm("이 PDF를 삭제하시겠습니까?")) return;
    await fetch(`/api/sheets/${params.id}/pdfs/${pdfId}`, {
      method: "DELETE",
    });
    fetchPdfs();
  };

  const updateLabel = async (pdfId: string, label: string) => {
    await fetch(`/api/sheets/${params.id}/pdfs/${pdfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    fetchPdfs();
  };

  if (loading) {
    return <div className="text-gray-600">로딩 중...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">PDF 파일 관리</h1>

      {/* Existing PDFs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            등록된 PDF ({pdfs.length})
          </h2>
        </div>

        {pdfs.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <EditableLabel
                    value={pdf.label}
                    onSave={(label) => updateLabel(pdf.id, label)}
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pdf.storage_path}
                  </p>
                </div>
                <button
                  onClick={() => deletePdf(pdf.id)}
                  className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-600">
            등록된 PDF가 없습니다
          </div>
        )}
      </div>

      {/* Upload new PDF */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          새 PDF 추가
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PDF 버전 이름 *
          </label>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="총보, Tab 만, 코드 악보 등"
            className="w-full px-3 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {uploading ? (
          <div className="text-center py-4 text-gray-600">업로드 중...</div>
        ) : (
          <FileDropzone
            accept=".pdf"
            onFileSelect={handleUpload}
            label="PDF 파일을 드래그하거나 클릭하여 업로드"
          />
        )}
      </div>
    </div>
  );
}

function EditableLabel({
  value,
  onSave,
}: {
  value: string;
  onSave: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    if (draft.trim() && draft.trim() !== value) {
      onSave(draft.trim());
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="px-2 py-0.5 border border-indigo-400 rounded text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-medium text-gray-900 hover:text-indigo-600 cursor-pointer text-left"
      title="클릭하여 이름 수정"
    >
      {value}
    </button>
  );
}
