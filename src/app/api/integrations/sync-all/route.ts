import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { syncSheetToNotion } from "@/lib/integrations/notion";
import { syncSheetToMemos } from "@/lib/integrations/memos";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const supabaseAdmin = createAdminClient();

    const { data: sheets } = await supabaseAdmin
      .from("sheets")
      .select("*, sheet_tags(tag_id, tags(id, name)), audio_tracks(*)");

    if (!sheets) {
      return NextResponse.json({ synced: 0 });
    }

    let synced = 0;

    for (const sheet of sheets) {
      const sheetWithTags = {
        ...sheet,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (sheet.sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
      };

      try {
        if (process.env.NOTION_API_KEY) {
          const notionPageId = await syncSheetToNotion(sheetWithTags);
          await supabaseAdmin
            .from("sheets")
            .update({ notion_page_id: notionPageId })
            .eq("id", sheet.id);
        }

        if (process.env.MEMOS_BASE_URL) {
          const memosName = await syncSheetToMemos({
            ...sheetWithTags,
            tracks: sheet.audio_tracks || [],
          });
          await supabaseAdmin
            .from("sheets")
            .update({ memos_name: memosName })
            .eq("id", sheet.id);
        }

        synced++;
      } catch (err) {
        console.error(`Sync failed for sheet ${sheet.id}:`, err);
      }
    }

    return NextResponse.json({ synced, total: sheets.length });
  } catch (error) {
    return handleApiError(error);
  }
}
