import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { SheetViewer } from "@/components/sheet-viewer/SheetViewer";
import type { AudioTrackWithUrl } from "@/types/sheet";

interface SheetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SheetDetailPage({
  params,
}: SheetDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: sheet, error } = await supabase
    .from("sheets")
    .select("*, audio_tracks(*), sync_markers(*)")
    .eq("id", id)
    .single();

  if (error || !sheet) notFound();

  const supabaseAdmin = createAdminClient();

  const { data: pdfUrlData } = await supabaseAdmin.storage
    .from("sheet-pdfs")
    .createSignedUrl(sheet.pdf_storage_path, 3600);

  // Generate MusicXML signed URL (pass URL to client, not content)
  let musicXmlUrl: string | undefined;
  if (sheet.musicxml_storage_path) {
    const { data: mxmlUrlData } = await supabaseAdmin.storage
      .from("musicxml-files")
      .createSignedUrl(sheet.musicxml_storage_path, 3600);
    musicXmlUrl = mxmlUrlData?.signedUrl;
  }

  const signedTracks: AudioTrackWithUrl[] = await Promise.all(
    (sheet.audio_tracks || []).map(
      async (track: { storage_path: string; [key: string]: unknown }) => {
        const { data } = await supabaseAdmin.storage
          .from("audio-files")
          .createSignedUrl(track.storage_path, 3600);
        return { ...track, signedUrl: data?.signedUrl } as AudioTrackWithUrl;
      }
    )
  );

  return (
    <SheetViewer
      sheet={sheet}
      pdfUrl={pdfUrlData?.signedUrl}
      musicXmlUrl={musicXmlUrl}
      tracks={signedTracks}
      syncMarkers={sheet.sync_markers || []}
    />
  );
}
