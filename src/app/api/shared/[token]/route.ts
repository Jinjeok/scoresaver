import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: sheets, error } = await supabase.rpc(
      "get_sheet_by_share_token",
      { token }
    );

    if (error || !sheets || sheets.length === 0) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const sheet = sheets[0];

    // If sheet is not public, require admin login
    if (!sheet.is_public) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "login_required" },
          { status: 401 }
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: "악보를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
    }

    // Get tracks via RPC
    const { data: tracks } = await supabase.rpc(
      "get_tracks_by_share_token",
      { token }
    );

    // Get sync markers via RPC
    const { data: syncMarkers } = await supabase.rpc(
      "get_sync_markers_by_share_token",
      { token }
    );

    // Generate signed URLs
    const supabaseAdmin = createAdminClient();

    const { data: pdfUrl } = await supabaseAdmin.storage
      .from("sheet-pdfs")
      .createSignedUrl(sheet.pdf_storage_path, 3600);

    const signedTracks = await Promise.all(
      (tracks ?? []).map(async (track: { storage_path: string }) => {
        const { data } = await supabaseAdmin.storage
          .from("audio-files")
          .createSignedUrl(track.storage_path, 3600);
        return { ...track, signedUrl: data?.signedUrl };
      })
    );

    return NextResponse.json({
      ...sheet,
      pdfUrl: pdfUrl?.signedUrl,
      tracks: signedTracks,
      sync_markers: syncMarkers ?? [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
