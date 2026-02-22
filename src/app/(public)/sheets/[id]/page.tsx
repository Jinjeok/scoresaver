import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { SheetViewer } from "@/components/sheet-viewer/SheetViewer";
import type { AudioTrackWithUrl, SheetPdfWithUrl } from "@/types/sheet";

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
    .select("*, audio_tracks(*), sync_markers(*), sheet_pdfs(*)")
    .eq("id", id)
    .single();

  if (error || !sheet) notFound();

  const supabaseAdmin = createAdminClient();

  // Generate signed URLs for all PDF versions
  const sheetPdfs: SheetPdfWithUrl[] = await Promise.all(
    (sheet.sheet_pdfs || [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map(async (pdf: { storage_path: string; [key: string]: unknown }) => {
        const { data } = await supabaseAdmin.storage
          .from("sheet-pdfs")
          .createSignedUrl(pdf.storage_path, 3600);
        return { ...pdf, signedUrl: data?.signedUrl } as SheetPdfWithUrl;
      })
  );

  // Legacy fallback: if no sheet_pdfs, use pdf_storage_path
  let legacyPdfUrl: string | undefined;
  if (sheetPdfs.length === 0 && sheet.pdf_storage_path) {
    const { data: pdfUrlData } = await supabaseAdmin.storage
      .from("sheet-pdfs")
      .createSignedUrl(sheet.pdf_storage_path, 3600);
    legacyPdfUrl = pdfUrlData?.signedUrl;
  }

  // Generate MusicXML signed URL
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
      pdfFiles={sheetPdfs}
      pdfUrl={legacyPdfUrl}
      musicXmlUrl={musicXmlUrl}
      tracks={signedTracks}
      syncMarkers={sheet.sync_markers || []}
    />
  );
}
