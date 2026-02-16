import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { SheetViewer } from "@/components/sheet-viewer/SheetViewer";
import { Music } from "lucide-react";
import type { AudioTrackWithUrl } from "@/types/sheet";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: sheets } = await supabase.rpc("get_sheet_by_share_token", {
    token,
  });

  if (!sheets || sheets.length === 0) notFound();

  const sheet = sheets[0];

  // Get tracks and sync markers via RPC
  const { data: tracks } = await supabase.rpc("get_tracks_by_share_token", {
    token,
  });

  const { data: syncMarkers } = await supabase.rpc(
    "get_sync_markers_by_share_token",
    { token }
  );

  // Generate signed URLs
  const supabaseAdmin = createAdminClient();

  const { data: pdfUrl } = await supabaseAdmin.storage
    .from("sheet-pdfs")
    .createSignedUrl(sheet.pdf_storage_path, 3600);

  // Generate MusicXML signed URL
  let musicXmlUrl: string | undefined;
  if (sheet.musicxml_storage_path) {
    const { data: mxmlUrlData } = await supabaseAdmin.storage
      .from("musicxml-files")
      .createSignedUrl(sheet.musicxml_storage_path, 3600);
    musicXmlUrl = mxmlUrlData?.signedUrl;
  }

  const signedTracks: AudioTrackWithUrl[] = await Promise.all(
    (tracks ?? []).map(
      async (track: { storage_path: string; [key: string]: unknown }) => {
        const { data } = await supabaseAdmin.storage
          .from("audio-files")
          .createSignedUrl(track.storage_path, 3600);
        return { ...track, signedUrl: data?.signedUrl } as AudioTrackWithUrl;
      }
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-2">
            <Music className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-900">
              ScoreSaver
            </span>
            <span className="text-xs text-gray-400 ml-1">공유 악보</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SheetViewer
          sheet={sheet}
          pdfUrl={pdfUrl?.signedUrl}
          musicXmlUrl={musicXmlUrl}
          tracks={signedTracks}
          syncMarkers={syncMarkers ?? []}
        />
      </main>
    </div>
  );
}
