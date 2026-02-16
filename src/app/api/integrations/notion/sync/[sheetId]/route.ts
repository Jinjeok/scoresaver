import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { syncSheetToNotion } from "@/lib/integrations/notion";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  try {
    const { sheetId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { data: sheet } = await supabase
      .from("sheets")
      .select("*, sheet_tags(tag_id, tags(id, name))")
      .eq("id", sheetId)
      .single();

    if (!sheet) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const sheetWithTags = {
      ...sheet,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: (sheet.sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
    };

    const notionPageId = await syncSheetToNotion(sheetWithTags);

    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("sheets")
      .update({ notion_page_id: notionPageId })
      .eq("id", sheetId);

    return NextResponse.json({ success: true, notion_page_id: notionPageId });
  } catch (error) {
    return handleApiError(error);
  }
}
