import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Plus, Eye, EyeOff, Music2 } from "lucide-react";

export default async function AdminSheetsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: sheets } = await supabase
    .from("sheets")
    .select("*, audio_tracks(id), sheet_tags(tags(id, name))")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">악보 관리</h1>
        <Link
          href="/admin/sheets/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          새 악보 등록
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                제목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                작곡자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                태그
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                트랙
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                상태
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                등록일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sheets?.map((sheet) => (
              <tr key={sheet.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/sheets/${sheet.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {sheet.title}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {sheet.composer || "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {sheet.sheet_tags?.map((st: any) => (
                      <span
                        key={st.tags?.id}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {st.tags?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="flex items-center justify-center gap-1 text-sm text-gray-600">
                    <Music2 className="h-4 w-4" />
                    {sheet.audio_tracks?.length || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {sheet.is_public ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      <Eye className="h-3 w-3" />
                      공개
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      <EyeOff className="h-3 w-3" />
                      비공개
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {new Date(sheet.created_at).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!sheets || sheets.length === 0) && (
          <div className="px-6 py-12 text-center text-gray-600">
            등록된 악보가 없습니다. 새 악보를 등록해보세요.
          </div>
        )}
      </div>
    </div>
  );
}
