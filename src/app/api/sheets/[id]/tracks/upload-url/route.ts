import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { getAudioTrackPath } from "@/lib/utils/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { trackId, ext, mimeType } = await request.json();
    const storagePath = getAudioTrackPath(id, trackId, ext);

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("audio-files")
      .createSignedUploadUrl(storagePath);

    if (error) {
      return NextResponse.json(
        { error: `업로드 URL 생성 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
