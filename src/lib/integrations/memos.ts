import type { SheetWithTracks } from "@/types/sheet";

const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL!;
const MEMOS_ACCESS_TOKEN = process.env.MEMOS_ACCESS_TOKEN!;

export async function syncSheetToMemos(
  sheet: SheetWithTracks
): Promise<string> {
  const content = buildMemoContent(sheet);

  if (sheet.memos_name) {
    const memoId = extractMemoId(sheet.memos_name);
    const response = await fetch(`${MEMOS_BASE_URL}/api/v1/memos/${memoId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${MEMOS_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        visibility: sheet.is_public ? "PUBLIC" : "PRIVATE",
      }),
    });
    if (!response.ok)
      throw new Error(`Memos update failed: ${response.status}`);
    const data = await response.json();
    return data.name;
  } else {
    const response = await fetch(`${MEMOS_BASE_URL}/api/v1/memos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MEMOS_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        visibility: sheet.is_public ? "PUBLIC" : "PRIVATE",
      }),
    });
    if (!response.ok)
      throw new Error(`Memos create failed: ${response.status}`);
    const data = await response.json();
    return data.name;
  }
}

export async function deleteMemo(memosName: string): Promise<void> {
  const memoId = extractMemoId(memosName);
  await fetch(`${MEMOS_BASE_URL}/api/v1/memos/${memoId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${MEMOS_ACCESS_TOKEN}` },
  });
}

function extractMemoId(name: string): string {
  return name.split("/")[1];
}

function buildMemoContent(sheet: SheetWithTracks): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://sheet.mutsuki.kr";

  const lines = [
    `# ${sheet.title}`,
    "",
    sheet.composer ? `**Composer:** ${sheet.composer}` : null,
    sheet.arranger ? `**Arranger:** ${sheet.arranger}` : null,
    sheet.key_signature ? `**Key:** ${sheet.key_signature}` : null,
    sheet.time_signature ? `**Time:** ${sheet.time_signature}` : null,
    sheet.tempo_bpm ? `**Tempo:** ${sheet.tempo_bpm} BPM` : null,
    "",
    sheet.description || null,
    "",
    `**View:** ${siteUrl}/share/${sheet.share_token}`,
    "",
    "#scoresaver #sheetmusic",
    sheet.genre
      ? `#${sheet.genre.toLowerCase().replace(/\s+/g, "")}`
      : null,
  ].filter((line): line is string => line !== null);

  if (sheet.tracks && sheet.tracks.length > 0) {
    lines.push("", "**Audio Tracks:**");
    sheet.tracks.forEach((t) => {
      lines.push(`- ${t.label}`);
    });
  }

  return lines.join("\n");
}
