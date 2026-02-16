import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "태그 이름이 필요합니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
