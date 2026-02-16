"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { TRACK_TYPES, type TrackType } from "@/lib/constants/track-types";
import { Trash2, GripVertical } from "lucide-react";
import { formatDuration, formatFileSize } from "@/lib/utils/format";
import type { AudioTrack } from "@/types/sheet";

export default function AdminTracksPage() {
  const params = useParams();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // New track form
  const [newTrackType, setNewTrackType] = useState<TrackType>("full");
  const [newLabel, setNewLabel] = useState("");
  const [newKeyShift, setNewKeyShift] = useState(0);

  const fetchTracks = useCallback(async () => {
    const res = await fetch(`/api/sheets/${params.id}/tracks`);
    if (res.ok) {
      setTracks(await res.json());
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("audio", file);
      body.append(
        "metadata",
        JSON.stringify({
          label: newLabel || TRACK_TYPES[newTrackType],
          track_type: newTrackType,
          key_shift: newKeyShift,
          sort_order: tracks.length,
        })
      );

      const res = await fetch(`/api/sheets/${params.id}/tracks`, {
        method: "POST",
        body,
      });

      if (res.ok) {
        setNewLabel("");
        setNewTrackType("full");
        setNewKeyShift(0);
        fetchTracks();
      } else {
        const err = await res.json();
        alert(err.error || "업로드 실패");
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm("이 트랙을 삭제하시겠습니까?")) return;
    await fetch(`/api/sheets/${params.id}/tracks/${trackId}`, {
      method: "DELETE",
    });
    fetchTracks();
  };

  if (loading) {
    return <div className="text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">음원 트랙 관리</h1>

      {/* Existing tracks */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            등록된 트랙 ({tracks.length})
          </h2>
        </div>

        {tracks.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="px-6 py-4 flex items-center gap-4"
              >
                <GripVertical className="h-4 w-4 text-gray-300" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{track.label}</p>
                  <p className="text-xs text-gray-400">
                    {TRACK_TYPES[track.track_type as TrackType] ||
                      track.track_type}
                    {track.key_shift !== 0 &&
                      ` (${track.key_shift > 0 ? "+" : ""}${track.key_shift})`}
                    {track.duration_seconds &&
                      ` · ${formatDuration(Number(track.duration_seconds))}`}
                    {track.file_size_bytes &&
                      ` · ${formatFileSize(Number(track.file_size_bytes))}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteTrack(track.id)}
                  className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-400">
            등록된 트랙이 없습니다
          </div>
        )}
      </div>

      {/* Upload new track */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          새 트랙 추가
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              트랙 타입
            </label>
            <select
              value={newTrackType}
              onChange={(e) => setNewTrackType(e.target.value as TrackType)}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Object.entries(TRACK_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              라벨 (선택)
            </label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={TRACK_TYPES[newTrackType]}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {newTrackType === "key_shifted" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                키 변경 (반음)
              </label>
              <input
                type="number"
                value={newKeyShift}
                onChange={(e) => setNewKeyShift(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {uploading ? (
          <div className="text-center py-4 text-gray-400">업로드 중...</div>
        ) : (
          <FileDropzone
            accept="audio/*"
            onFileSelect={handleUpload}
            label="음원 파일을 드래그하거나 클릭하여 업로드"
          />
        )}
      </div>
    </div>
  );
}
