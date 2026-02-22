import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pdfId: string }> }
) {
  try {
    const { id, pdfId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const { data: pdf } = await supabase
      .from("sheet_pdfs")
      .select("storage_path")
      .eq("id", pdfId)
      .eq("sheet_id", id)
      .single();

    if (!pdf) {
      return NextResponse.json(
        { error: "PDF를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Delete storage file
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.storage.from("sheet-pdfs").remove([pdf.storage_path]);

    // Delete DB record
    const { error } = await supabase
      .from("sheet_pdfs")
      .delete()
      .eq("id", pdfId)
      .eq("sheet_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pdfId: string }> }
) {
  try {
    const { id, pdfId } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.label !== undefined) updates.label = body.label;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("sheet_pdfs")
      .update(updates)
      .eq("id", pdfId)
      .eq("sheet_id", id)
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
