import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FileMusic, Music2, Eye, EyeOff, ExternalLink } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { count: totalSheets } = await supabase
    .from("sheets")
    .select("*", { count: "exact", head: true });

  const { count: publicSheets } = await supabase
    .from("sheets")
    .select("*", { count: "exact", head: true })
    .eq("is_public", true);

  const { count: totalTracks } = await supabase
    .from("audio_tracks")
    .select("*", { count: "exact", head: true });

  const { data: recentSheets } = await supabase
    .from("sheets")
    .select("id, title, composer, is_public, share_token, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "전체 악보",
      value: totalSheets ?? 0,
      icon: FileMusic,
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      label: "공개 악보",
      value: publicSheets ?? 0,
      icon: Eye,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "비공개 악보",
      value: (totalSheets ?? 0) - (publicSheets ?? 0),
      icon: EyeOff,
      color: "text-gray-600 bg-gray-100",
    },
    {
      label: "음원 트랙",
      value: totalTracks ?? 0,
      icon: Music2,
      color: "text-purple-600 bg-purple-100",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-700">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent sheets */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            최근 등록된 악보
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentSheets?.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/share/${sheet.share_token}`}
              target="_blank"
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{sheet.title}</p>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </div>
                {sheet.composer && (
                  <p className="text-sm text-gray-700">{sheet.composer}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {sheet.is_public ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    공개
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    비공개
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {new Date(sheet.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </Link>
          ))}
          {(!recentSheets || recentSheets.length === 0) && (
            <div className="px-6 py-8 text-center text-gray-600">
              등록된 악보가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
