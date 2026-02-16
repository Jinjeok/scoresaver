import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const { order } = body as { order: { id: string; sort_order: number }[] };

    for (const item of order) {
      await supabase
        .from("audio_tracks")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("sheet_id", id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
