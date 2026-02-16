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

    const { data, error } = await supabase.rpc("gen_random_uuid");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: sheet, error: updateError } = await supabase
      .from("sheets")
      .update({ share_token: data })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(sheet);
  } catch (error) {
    return handleApiError(error);
  }
}
