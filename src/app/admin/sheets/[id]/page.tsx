"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShareLinkCopier } from "@/components/shared/ShareLinkCopier";
import {
  Eye,
  EyeOff,
  Trash2,
  Music2,
  Settings,
  RefreshCw,
} from "lucide-react";
import type { Sheet, AudioTrack } from "@/types/sheet";

export default function AdminSheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sheet, setSheet] = useState<
    (Sheet & { tags: { id: string; name: string }[]; audio_tracks: AudioTrack[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const fetchSheet = useCallback(async () => {
    const res = await fetch(`/api/sheets/${params.id}`);
    if (res.ok) {
      setSheet(await res.json());
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchSheet(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchSheet]);

  const toggleVisibility = async () => {
    await fetch(`/api/sheets/${params.id}/toggle-visibility`, {
      method: "POST",
    });
    fetchSheet();
  };

  const regenerateToken = async () => {
    if (!confirm("공유 토큰을 재생성하면 기존 공유 링크가 무효화됩니다. 계속하시겠습니까?"))
      return;
    await fetch(`/api/sheets/${params.id}/regenerate-share-token`, {
      method: "POST",
    });
    fetchSheet();
  };

  const deleteSheet = async () => {
    if (!confirm("이 악보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."))
      return;
    const res = await fetch(`/api/sheets/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/sheets");
    }
  };

  const syncNotion = async () => {
    await fetch(`/api/integrations/notion/sync/${params.id}`, {
      method: "POST",
    });
    alert("Notion 동기화 완료");
    fetchSheet();
  };

  const syncMemos = async () => {
    await fetch(`/api/integrations/memos/sync/${params.id}`, {
      method: "POST",
    });
    alert("Memos 동기화 완료");
    fetchSheet();
  };

  if (loading) {
    return <div className="text-gray-600">로딩 중...</div>;
  }

  if (!sheet) {
    return <div className="text-red-500">악보를 찾을 수 없습니다</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVisibility}
            className="flex items-center gap-1 px-3 py-2 border border-gray-500 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {sheet.is_public ? (
              <>
                <EyeOff className="h-4 w-4" /> 비공개로 전환
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> 공개로 전환
              </>
            )}
          </button>
          <button
            onClick={deleteSheet}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">악보 정보</h2>
          <dl className="space-y-2 text-sm">
            {sheet.composer && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">작곡</dt>
                <dd className="text-gray-900">{sheet.composer}</dd>
              </div>
            )}
            {sheet.arranger && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">편곡</dt>
                <dd className="text-gray-900">{sheet.arranger}</dd>
              </div>
            )}
            {sheet.genre && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">장르</dt>
                <dd className="text-gray-900">{sheet.genre}</dd>
              </div>
            )}
            {sheet.key_signature && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">Key</dt>
                <dd className="text-gray-900">{sheet.key_signature}</dd>
              </div>
            )}
            {sheet.time_signature && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">박자</dt>
                <dd className="text-gray-900">{sheet.time_signature}</dd>
              </div>
            )}
            {sheet.tempo_bpm && (
              <div className="flex">
                <dt className="w-20 text-gray-700 font-medium">BPM</dt>
                <dd className="text-gray-900">{sheet.tempo_bpm}</dd>
              </div>
            )}
          </dl>
          {sheet.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {sheet.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Share link */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">공유 링크</h2>
              <button
                onClick={regenerateToken}
                className="text-xs text-gray-700 hover:text-gray-900 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3 inline mr-1" />
                재생성
              </button>
            </div>
            <ShareLinkCopier shareToken={sheet.share_token} />
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">관리</h2>
            <div className="space-y-2">
              <Link
                href={`/admin/sheets/${sheet.id}/tracks`}
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-500 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Music2 className="h-4 w-4" />
                음원 트랙 관리 ({sheet.audio_tracks?.length || 0})
              </Link>
              <Link
                href={`/admin/sheets/${sheet.id}/sync`}
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-500 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                싱크 마커 관리
              </Link>
              <div
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                title="업데이트 예정"
              >
                <RefreshCw className="h-4 w-4" />
                Notion 동기화
              </div>
              <div
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed"
                title="업데이트 예정"
              >
                <RefreshCw className="h-4 w-4" />
                Memos 동기화
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
