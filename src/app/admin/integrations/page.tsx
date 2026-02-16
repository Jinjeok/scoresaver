"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export default function AdminIntegrationsPage() {
  const [syncingAll, setSyncingAll] = useState(false);

  const notionConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL // placeholder check
  );
  const memosConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL // placeholder check
  );

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      await fetch("/api/integrations/sync-all", { method: "POST" });
      alert("전체 동기화 요청 완료");
    } catch {
      alert("동기화 실패");
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">연동 관리</h1>

      <div className="space-y-4">
        {/* Notion */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
                N
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Notion</h2>
                <p className="text-sm text-gray-500">
                  악보 정보를 Notion 데이터베이스에 자동 동기화
                </p>
              </div>
            </div>
            {notionConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-300" />
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            환경변수 NOTION_API_KEY와 NOTION_DATABASE_ID가 설정되어야 합니다.
          </p>
        </div>

        {/* Memos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Memos</h2>
                <p className="text-sm text-gray-500">
                  Memos 서버에 악보 메모 자동 생성
                </p>
              </div>
            </div>
            {memosConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-300" />
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            환경변수 MEMOS_BASE_URL과 MEMOS_ACCESS_TOKEN이 설정되어야 합니다.
          </p>
        </div>

        {/* Sync all */}
        <button
          onClick={syncAll}
          disabled={syncingAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`}
          />
          {syncingAll ? "동기화 중..." : "전체 악보 재동기화"}
        </button>
      </div>
    </div>
  );
}
