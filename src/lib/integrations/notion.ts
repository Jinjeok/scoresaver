import { Client } from "@notionhq/client";
import type { SheetWithTags } from "@/types/sheet";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export async function syncSheetToNotion(
  sheet: SheetWithTags
): Promise<string> {
  const properties = buildNotionProperties(sheet);

  if (sheet.notion_page_id) {
    await notion.pages.update({
      page_id: sheet.notion_page_id,
      properties,
    });
    return sheet.notion_page_id;
  } else {
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
    });
    return response.id;
  }
}

export async function deleteNotionPage(notionPageId: string): Promise<void> {
  await notion.pages.update({
    page_id: notionPageId,
    archived: true,
  });
}

function buildNotionProperties(sheet: SheetWithTags) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = {
    Title: { title: [{ text: { content: sheet.title } }] },
    Composer: {
      rich_text: [{ text: { content: sheet.composer ?? "" } }],
    },
    Arranger: {
      rich_text: [{ text: { content: sheet.arranger ?? "" } }],
    },
    Public: { checkbox: sheet.is_public },
    "Share Link": {
      url: `${siteUrl}/share/${sheet.share_token}`,
    },
    Created: { date: { start: sheet.created_at } },
    Updated: { date: { start: sheet.updated_at } },
  };

  if (sheet.genre) {
    props.Genre = { select: { name: sheet.genre } };
  }
  if (sheet.key_signature) {
    props.Key = { select: { name: sheet.key_signature } };
  }
  if (sheet.time_signature) {
    props["Time Signature"] = { select: { name: sheet.time_signature } };
  }
  if (sheet.tempo_bpm) {
    props["Tempo (BPM)"] = { number: sheet.tempo_bpm };
  }
  if (sheet.page_count) {
    props.Pages = { number: sheet.page_count };
  }
  if (sheet.tags && sheet.tags.length > 0) {
    props.Tags = {
      multi_select: sheet.tags.map((t) => ({ name: t.name })),
    };
  }

  return props;
}
