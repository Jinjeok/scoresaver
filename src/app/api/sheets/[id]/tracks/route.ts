import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { createTrackSchema } from "@/lib/utils/validation";
import { getAudioTrackPath } from "@/lib/utils/storage";

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

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const metadataStr = formData.get("metadata") as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: "음원 파일이 필요합니다" },
        { status: 400 }
      );
    }

    const metadata = createTrackSchema.parse(JSON.parse(metadataStr));

    // Determine mime type from file
    const mimeType = audioFile.type || "audio/mpeg";
    const ext = mimeType.split("/")[1] || "mp3";

    // Create track record
    const { data: track, error: insertError } = await supabase
      .from("audio_tracks")
      .insert({
        sheet_id: id,
        label: metadata.label,
        track_type: metadata.track_type,
        key_shift: metadata.key_shift,
        sort_order: metadata.sort_order,
        storage_path: "placeholder",
        mime_type: mimeType,
        file_size_bytes: audioFile.size,
      })
      .select()
      .single();

    if (insertError || !track) {
      return NextResponse.json(
        { error: insertError?.message || "트랙 생성 실패" },
        { status: 400 }
      );
    }

    // Upload audio file
    const audioPath = getAudioTrackPath(id, track.id, ext);
    const supabaseAdmin = createAdminClient();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("audio-files")
      .upload(audioPath, audioBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      await supabase.from("audio_tracks").delete().eq("id", track.id);
      return NextResponse.json(
        { error: `음원 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Update track with storage path
    const { data: updatedTrack } = await supabase
      .from("audio_tracks")
      .update({ storage_path: audioPath })
      .eq("id", track.id)
      .select()
      .single();

    return NextResponse.json(updatedTrack, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
