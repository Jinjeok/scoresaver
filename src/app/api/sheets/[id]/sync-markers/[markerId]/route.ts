import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; markerId: string }> }
) {
  try {
    const { markerId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { error } = await supabase
      .from("sync_markers")
      .delete()
      .eq("id", markerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
