import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { createTrackSchema } from "@/lib/utils/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("audio_tracks")
      .select("*")
      .eq("sheet_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const metadata = createTrackSchema.parse(body);

    const { storage_path, mime_type, file_size_bytes } = body;

    if (!storage_path) {
      return NextResponse.json(
        { error: "storage_path가 필요합니다" },
        { status: 400 }
      );
    }

    const { data: track, error: insertError } = await supabase
      .from("audio_tracks")
      .insert({
        sheet_id: id,
        label: metadata.label,
        track_type: metadata.track_type,
        key_shift: metadata.key_shift,
        sort_order: metadata.sort_order,
        storage_path,
        mime_type: mime_type || "audio/mpeg",
        file_size_bytes: file_size_bytes || 0,
      })
      .select()
      .single();

    if (insertError || !track) {
      return NextResponse.json(
        { error: insertError?.message || "트랙 생성 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
