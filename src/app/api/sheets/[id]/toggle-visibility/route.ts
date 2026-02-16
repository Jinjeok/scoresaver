import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { data: sheet } = await supabase
      .from("sheets")
      .select("is_public")
      .eq("id", id)
      .single();

    if (!sheet) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("sheets")
      .update({ is_public: !sheet.is_public })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
