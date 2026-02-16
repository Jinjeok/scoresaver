import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { updateSheetSchema } from "@/lib/utils/validation";
import { syncSheetToNotion, deleteNotionPage } from "@/lib/integrations/notion";
import { syncSheetToMemos, deleteMemo } from "@/lib/integrations/memos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: sheet, error } = await supabase
      .from("sheets")
      .select(
        "*, sheet_tags(tag_id, tags(id, name)), audio_tracks(*), sync_markers(*)"
      )
      .eq("id", id)
      .single();

    if (error || !sheet) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { sheet_tags, ...rest } = sheet;
    return NextResponse.json({
      ...rest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: (sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    const body = await request.json();
    const { tags, ...metadata } = updateSheetSchema
      .extend({ tags: updateSheetSchema.shape.tags })
      .parse(body);

    // Update sheet metadata
    const updateData = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("sheets")
        .update(updateData)
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Remove existing tags
      await supabase.from("sheet_tags").delete().eq("sheet_id", id);

      // Add new tags
      for (const tagName of tags) {
        const { data: tagData } = await supabase
          .from("tags")
          .upsert({ name: tagName }, { onConflict: "name" })
          .select()
          .single();

        if (tagData) {
          await supabase
            .from("sheet_tags")
            .insert({ sheet_id: id, tag_id: tagData.id });
        }
      }
    }

    // Fetch updated sheet
    const { data: updatedSheet } = await supabase
      .from("sheets")
      .select("*, sheet_tags(tag_id, tags(id, name)), audio_tracks(*)")
      .eq("id", id)
      .single();

    if (updatedSheet) {
      const sheetWithTags = {
        ...updatedSheet,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (updatedSheet.sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
      };

      // Async integration sync
      const supabaseAdmin = createAdminClient();

      if (process.env.NOTION_API_KEY) {
        syncSheetToNotion(sheetWithTags)
          .then((notionPageId) =>
            supabaseAdmin
              .from("sheets")
              .update({ notion_page_id: notionPageId })
              .eq("id", id)
          )
          .catch((err) =>
            console.error(`Notion sync failed for sheet ${id}:`, err)
          );
      }

      if (process.env.MEMOS_BASE_URL) {
        syncSheetToMemos({
          ...sheetWithTags,
          tracks: updatedSheet.audio_tracks || [],
        })
          .then((memosName) =>
            supabaseAdmin
              .from("sheets")
              .update({ memos_name: memosName })
              .eq("id", id)
          )
          .catch((err) =>
            console.error(`Memos sync failed for sheet ${id}:`, err)
          );
      }

      return NextResponse.json(sheetWithTags);
    }

    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);

    // Fetch sheet for cleanup
    const { data: sheet } = await supabase
      .from("sheets")
      .select("*, audio_tracks(*)")
      .eq("id", id)
      .single();

    if (!sheet) {
      return NextResponse.json(
        { error: "악보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Delete storage files
    await supabaseAdmin.storage
      .from("sheet-pdfs")
      .remove([sheet.pdf_storage_path]);

    if (sheet.thumbnail_path) {
      await supabaseAdmin.storage
        .from("sheet-pdfs")
        .remove([sheet.thumbnail_path]);
    }

    // Delete MusicXML file
    if (sheet.musicxml_storage_path) {
      await supabaseAdmin.storage
        .from("musicxml-files")
        .remove([sheet.musicxml_storage_path]);
    }

    // Delete audio files
    if (sheet.audio_tracks?.length > 0) {
      const audioPaths = sheet.audio_tracks.map(
        (t: { storage_path: string }) => t.storage_path
      );
      await supabaseAdmin.storage.from("audio-files").remove(audioPaths);
    }

    // Delete from external services
    if (sheet.notion_page_id) {
      deleteNotionPage(sheet.notion_page_id).catch((err) =>
        console.error(`Notion delete failed:`, err)
      );
    }
    if (sheet.memos_name) {
      deleteMemo(sheet.memos_name).catch((err) =>
        console.error(`Memos delete failed:`, err)
      );
    }

    // Delete sheet (cascades to audio_tracks, sync_markers, sheet_tags)
    const { error } = await supabase.from("sheets").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
