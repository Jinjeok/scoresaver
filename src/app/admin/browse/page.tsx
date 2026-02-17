import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Search } from "lucide-react";
import { BrowseContent } from "./BrowseContent";

interface BrowsePageProps {
  searchParams: Promise<{ search?: string; tag?: string; page?: string }>;
}

export default async function AdminBrowsePage({
  searchParams,
}: BrowsePageProps) {
  const { search, tag, page: pageStr } = await searchParams;
  const supabase = createAdminClient();
  const page = parseInt(pageStr || "1");
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("sheets")
    .select("*, sheet_tags(tag_id, tags(id, name))", { count: "exact" })
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

  // Generate signed PDF URLs for gallery thumbnails
  const sheetsWithPdfUrls = await Promise.all(
    sheets.map(async (sheet) => {
      const { data: pdfUrlData } = await supabase.storage
        .from("sheet-pdfs")
        .createSignedUrl(sheet.pdf_storage_path, 3600);
      return { ...sheet, pdfSignedUrl: pdfUrlData?.signedUrl ?? null };
    })
  );

  const totalPages = Math.ceil((count || 0) / limit);

  // Fetch all tags for filter
  const { data: allTags } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">악보 둘러보기</h1>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <form className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            name="search"
            defaultValue={search}
            placeholder="제목, 작곡자 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </form>

        {allTags && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/browse"
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !tag
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </Link>
            {allTags.map((t) => (
              <Link
                key={t.id}
                href={`/admin/browse?tag=${encodeURIComponent(t.name)}`}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  tag === t.name
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <BrowseContent
        sheets={sheetsWithPdfUrls}
        page={page}
        totalPages={totalPages}
        search={search}
        tag={tag}
      />
    </div>
  );
}
