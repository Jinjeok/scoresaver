import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { getSheetPdfVersionPath } from "@/lib/utils/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { pdfId } = await request.json();
    if (!pdfId) {
      return NextResponse.json({ error: "pdfId가 필요합니다" }, { status: 400 });
    }

    const storagePath = getSheetPdfVersionPath(id, pdfId);
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin.storage
      .from("sheet-pdfs")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "업로드 URL 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath });
  } catch (error) {
    return handleApiError(error);
  }
}
