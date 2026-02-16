import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { updateTrackSchema } from "@/lib/utils/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const metadata = updateTrackSchema.parse(body);

    const updateData = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from("audio_tracks")
      .update(updateData)
      .eq("id", trackId)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    // Get track for cleanup
    const { data: track } = await supabase
      .from("audio_tracks")
      .select("storage_path")
      .eq("id", trackId)
      .single();

    if (!track) {
      return NextResponse.json(
        { error: "트랙을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Delete storage file
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.storage
      .from("audio-files")
      .remove([track.storage_path]);

    // Delete record
    const { error } = await supabase
      .from("audio_tracks")
      .delete()
      .eq("id", trackId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
