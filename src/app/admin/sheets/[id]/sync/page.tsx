"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import type { SyncMarker } from "@/types/sheet";

export default function AdminSyncPage() {
  const params = useParams();
  const [markers, setMarkers] = useState<SyncMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New marker form
  const [newTimestamp, setNewTimestamp] = useState("");
  const [newPage, setNewPage] = useState("");
  const [newSection, setNewSection] = useState("");

  const fetchMarkers = useCallback(async () => {
    const res = await fetch(`/api/sheets/${params.id}/sync-markers`);
    if (res.ok) {
      setMarkers(await res.json());
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  const addMarker = () => {
    const timestampMs = Math.round(parseFloat(newTimestamp) * 1000);
    const pageNum = parseInt(newPage);

    if (isNaN(timestampMs) || isNaN(pageNum) || pageNum < 1) {
      alert("올바른 값을 입력해주세요");
      return;
    }

    const newMarker: SyncMarker = {
      id: crypto.randomUUID(),
      sheet_id: params.id as string,
      audio_track_id: null,
      timestamp_ms: timestampMs,
      page_number: pageNum,
      section_label: newSection || null,
      measure_number: null,
      y_offset_pct: null,
      created_at: new Date().toISOString(),
    };

    setMarkers((prev) =>
      [...prev, newMarker].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    );

    setNewTimestamp("");
    setNewPage("");
    setNewSection("");
  };

  const removeMarker = (index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMarkers = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sheets/${params.id}/sync-markers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          markers.map((m) => ({
            timestamp_ms: m.timestamp_ms,
            page_number: m.page_number,
            section_label: m.section_label,
            measure_number: m.measure_number,
            y_offset_pct: m.y_offset_pct,
            audio_track_id: m.audio_track_id,
          }))
        ),
      });

      if (res.ok) {
        alert("저장 완료");
        fetchMarkers();
      } else {
        const err = await res.json();
        alert(err.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">싱크 마커 관리</h1>
        <button
          onClick={saveMarkers}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Add marker form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          마커 추가
        </h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시간 (초)
            </label>
            <input
              type="number"
              step="0.1"
              value={newTimestamp}
              onChange={(e) => setNewTimestamp(e.target.value)}
              placeholder="0.0"
              className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              페이지
            </label>
            <input
              type="number"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              placeholder="1"
              className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              섹션 (선택)
            </label>
            <input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              placeholder="Intro, Verse 1..."
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={addMarker}
            className="flex items-center gap-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>

      {/* Markers list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            마커 목록 ({markers.length})
          </h2>
        </div>

        {markers.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  페이지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  섹션
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {markers.map((marker, index) => (
                <tr key={marker.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {(marker.timestamp_ms / 1000).toFixed(1)}s
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {marker.page_number}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {marker.section_label || "-"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => removeMarker(index)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-400">
            등록된 마커가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
