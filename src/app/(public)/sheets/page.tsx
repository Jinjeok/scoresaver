import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SheetCard } from "@/components/sheet-viewer/SheetCard";
import { Search } from "lucide-react";

interface SheetsPageProps {
  searchParams: Promise<{ search?: string; tag?: string; page?: string }>;
}

export default async function SheetsPage({ searchParams }: SheetsPageProps) {
  const { search, tag, page: pageStr } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const page = parseInt(pageStr || "1");
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("sheets")
    .select("*, sheet_tags(tag_id, tags(id, name))", { count: "exact" })
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,composer.ilike.%${search}%,arranger.ilike.%${search}%`
    );
  }

  if (tag) {
    query = query.eq("sheet_tags.tags.name", tag);
  }

  const { data, count } = await query;

  const sheets = (data || []).map((sheet) => {
    const { sheet_tags, ...rest } = sheet;
    return {
      ...rest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: (sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
    };
  });

  const totalPages = Math.ceil((count || 0) / limit);

  // Fetch all tags for filter
  const { data: allTags } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">악보 목록</h1>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <form className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            name="search"
            defaultValue={search}
            placeholder="제목, 작곡자 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </form>

        {allTags && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sheets"
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !tag
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              전체
            </Link>
            {allTags.map((t) => (
              <Link
                key={t.id}
                href={`/sheets?tag=${encodeURIComponent(t.name)}`}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  tag === t.name
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sheet Grid */}
      {sheets.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                href={`/sheets/${sheet.id}`}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/sheets?page=${p}${search ? `&search=${search}` : ""}${tag ? `&tag=${tag}` : ""}`}
                  className={`px-3 py-1 rounded text-sm ${
                    p === page
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-600">
          {search || tag
            ? "검색 결과가 없습니다"
            : "공개된 악보가 없습니다"}
        </div>
      )}
    </div>
  );
}
