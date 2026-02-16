export function getSheetPdfPath(sheetId: string): string {
  return `${sheetId}/score.pdf`;
}

export function getSheetThumbnailPath(sheetId: string): string {
  return `${sheetId}/thumbnail.png`;
}

export function getMusicXmlPath(sheetId: string): string {
  return `${sheetId}/score.musicxml`;
}

export function getAudioTrackPath(
  sheetId: string,
  trackId: string,
  extension = "mp3"
): string {
  return `${sheetId}/${trackId}.${extension}`;
}
