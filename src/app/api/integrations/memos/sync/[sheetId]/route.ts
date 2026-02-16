import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { syncSheetToMemos } from "@/lib/integrations/memos";

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
      .select("*, audio_tracks(*)")
      .eq("id", sheetId)
      .single();

    if (!sheet) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const memosName = await syncSheetToMemos({
      ...sheet,
      tracks: sheet.audio_tracks || [],
    });

    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("sheets")
      .update({ memos_name: memosName })
      .eq("id", sheetId);

    return NextResponse.json({ success: true, memos_name: memosName });
  } catch (error) {
    return handleApiError(error);
  }
}
