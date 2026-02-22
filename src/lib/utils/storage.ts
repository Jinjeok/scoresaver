export function getSheetPdfPath(sheetId: string): string {
  return `${sheetId}/score.pdf`;
}

export function getSheetPdfVersionPath(sheetId: string, pdfId: string): string {
  return `${sheetId}/pdfs/${pdfId}.pdf`;
}

export function getSheetThumbnailPath(sheetId: string): string {
  return `${sheetId}/thumbnail.png`;
}

export function getMusicXmlPath(sheetId: string, extension = "musicxml"): string {
  return `${sheetId}/score.${extension}`;
}

export function getAudioTrackPath(
  sheetId: string,
  trackId: string,
  extension = "mp3"
): string {
  return `${sheetId}/${trackId}.${extension}`;
}
