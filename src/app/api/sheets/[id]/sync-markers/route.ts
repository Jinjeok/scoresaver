import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import {
  createSyncMarkerSchema,
  bulkSyncMarkersSchema,
} from "@/lib/utils/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("sync_markers")
      .select("*")
      .eq("sheet_id", id)
      .order("timestamp_ms", { ascending: true });

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

    const body = await request.json();

    // Support both single and bulk creation
    const markers = Array.isArray(body)
      ? bulkSyncMarkersSchema.parse(body)
      : [createSyncMarkerSchema.parse(body)];

    const insertData = markers.map((m) => ({
      ...m,
      sheet_id: id,
    }));

    const { data, error } = await supabase
      .from("sync_markers")
      .insert(insertData)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT replaces all sync markers for a sheet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const markers = bulkSyncMarkersSchema.parse(body);

    // Delete existing markers
    await supabase.from("sync_markers").delete().eq("sheet_id", id);

    // Insert new markers
    if (markers.length > 0) {
      const insertData = markers.map((m) => ({
        ...m,
        sheet_id: id,
      }));

      const { data, error } = await supabase
        .from("sync_markers")
        .insert(insertData)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json([]);
  } catch (error) {
    return handleApiError(error);
  }
}
