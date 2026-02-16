import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/utils/errors";
import { createSheetSchema } from "@/lib/utils/validation";
import { getSheetPdfPath, getMusicXmlPath } from "@/lib/utils/storage";
import { syncSheetToNotion } from "@/lib/integrations/notion";
import { syncSheetToMemos } from "@/lib/integrations/memos";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("sheets")
      .select("*, sheet_tags(tag_id, tags(id, name))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,composer.ilike.%${search}%,arranger.ilike.%${search}%`
      );
    }

    if (tag) {
      query = query.eq("sheet_tags.tags.name", tag);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Transform sheet_tags to tags
    const sheets = (data || []).map((sheet) => {
      const { sheet_tags, ...rest } = sheet;
      return {
        ...rest,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
      };
    });

    return NextResponse.json({
      sheets,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);

    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const musicXmlFile = formData.get("musicxml") as File | null;
    const metadataStr = formData.get("metadata") as string;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "PDF 파일이 필요합니다" },
        { status: 400 }
      );
    }

    const metadata = createSheetSchema.parse(JSON.parse(metadataStr));
    const tags = metadata.tags || [];

    // Create sheet record first to get ID
    const { data: sheet, error: insertError } = await supabase
      .from("sheets")
      .insert({
        title: metadata.title,
        composer: metadata.composer,
        arranger: metadata.arranger,
        description: metadata.description,
        genre: metadata.genre,
        key_signature: metadata.key_signature,
        time_signature: metadata.time_signature,
        tempo_bpm: metadata.tempo_bpm,
        is_public: metadata.is_public,
        pdf_storage_path: "placeholder",
        created_by: admin.id,
      })
      .select()
      .single();

    if (insertError || !sheet) {
      return NextResponse.json(
        { error: insertError?.message || "악보 생성 실패" },
        { status: 400 }
      );
    }

    // Upload PDF to storage
    const pdfPath = getSheetPdfPath(sheet.id);
    const supabaseAdmin = createAdminClient();
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("sheet-pdfs")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      // Cleanup: delete the sheet record
      await supabase.from("sheets").delete().eq("id", sheet.id);
      return NextResponse.json(
        { error: `PDF 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Upload MusicXML if provided
    let musicXmlPath: string | null = null;
    if (musicXmlFile) {
      musicXmlPath = getMusicXmlPath(sheet.id);
      const musicXmlBuffer = Buffer.from(await musicXmlFile.arrayBuffer());
      const { error: mxmlUploadError } = await supabaseAdmin.storage
        .from("musicxml-files")
        .upload(musicXmlPath, musicXmlBuffer, {
          contentType: "application/xml",
          upsert: true,
        });

      if (mxmlUploadError) {
        console.error(`MusicXML upload failed: ${mxmlUploadError.message}`);
        musicXmlPath = null;
      }
    }

    // Update sheet with actual storage paths
    await supabase
      .from("sheets")
      .update({
        pdf_storage_path: pdfPath,
        ...(musicXmlPath ? { musicxml_storage_path: musicXmlPath } : {}),
      })
      .eq("id", sheet.id);

    // Handle tags
    if (tags.length > 0) {
      for (const tagName of tags) {
        // Upsert tag
        const { data: tagData } = await supabase
          .from("tags")
          .upsert({ name: tagName }, { onConflict: "name" })
          .select()
          .single();

        if (tagData) {
          await supabase
            .from("sheet_tags")
            .insert({ sheet_id: sheet.id, tag_id: tagData.id });
        }
      }
    }

    // Fetch complete sheet with tags
    const { data: fullSheet } = await supabase
      .from("sheets")
      .select("*, sheet_tags(tag_id, tags(id, name))")
      .eq("id", sheet.id)
      .single();

    const sheetWithTags = fullSheet
      ? {
          ...fullSheet,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tags: (fullSheet.sheet_tags || []).map((st: any) => st.tags).filter(Boolean),
        }
      : null;

    // Async integrations (fire-and-forget)
    if (sheetWithTags) {
      if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
        syncSheetToNotion(sheetWithTags)
          .then((notionPageId) =>
            supabaseAdmin
              .from("sheets")
              .update({ notion_page_id: notionPageId })
              .eq("id", sheet.id)
          )
          .catch((err) =>
            console.error(`Notion sync failed for sheet ${sheet.id}:`, err)
          );
      }

      if (process.env.MEMOS_BASE_URL && process.env.MEMOS_ACCESS_TOKEN) {
        syncSheetToMemos({ ...sheetWithTags, tracks: [] })
          .then((memosName) =>
            supabaseAdmin
              .from("sheets")
              .update({ memos_name: memosName })
              .eq("id", sheet.id)
          )
          .catch((err) =>
            console.error(`Memos sync failed for sheet ${sheet.id}:`, err)
          );
      }
    }

    return NextResponse.json(sheetWithTags, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
