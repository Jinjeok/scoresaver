import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { SheetViewer } from "@/components/sheet-viewer/SheetViewer";
import type { AudioTrackWithUrl } from "@/types/sheet";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BrowseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBrowseDetailPage({
  params,
}: BrowseDetailPageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: sheet, error } = await supabase
    .from("sheets")
    .select("*, audio_tracks(*), sync_markers(*)")
    .eq("id", id)
    .single();

  if (error || !sheet) notFound();

  const { data: pdfUrlData } = await supabase.storage
    .from("sheet-pdfs")
    .createSignedUrl(sheet.pdf_storage_path, 3600);

  let musicXmlUrl: string | undefined;
  if (sheet.musicxml_storage_path) {
    const { data: mxmlUrlData } = await supabase.storage
      .from("musicxml-files")
      .createSignedUrl(sheet.musicxml_storage_path, 3600);
    musicXmlUrl = mxmlUrlData?.signedUrl;
  }

  const signedTracks: AudioTrackWithUrl[] = await Promise.all(
    (sheet.audio_tracks || []).map(
      async (track: { storage_path: string; [key: string]: unknown }) => {
        const { data } = await supabase.storage
          .from("audio-files")
          .createSignedUrl(track.storage_path, 3600);
        return { ...track, signedUrl: data?.signedUrl } as AudioTrackWithUrl;
      }
    )
  );

  return (
    <div>
      <Link
        href="/admin/browse"
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      <SheetViewer
        sheet={sheet}
        pdfUrl={pdfUrlData?.signedUrl}
        musicXmlUrl={musicXmlUrl}
        tracks={signedTracks}
        syncMarkers={sheet.sync_markers || []}
      />
    </div>
  );
}
