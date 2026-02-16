/**
 * MusicXML 파일 처리 유틸리티
 *
 * .musicxml - 비압축 MusicXML (XML)
 * .mxl - 압축 MusicXML (ZIP)
 */

/**
 * .mxl 파일인지 확인 (ZIP 기반 압축 MusicXML)
 */
export function isMxlFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".mxl");
}

/**
 * .musicxml 또는 .xml 파일인지 확인
 */
export function isMusicXmlFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".musicxml") || lower.endsWith(".xml");
}

/**
 * 지원되는 MusicXML 형식인지 확인
 */
export function isSupportedMusicXml(filename: string): boolean {
  return isMxlFile(filename) || isMusicXmlFile(filename);
}

/**
 * MusicXML에서 메타데이터 추출 (title, composer 등)
 */
export function extractMusicXmlMetadata(xmlString: string): {
  title?: string;
  composer?: string;
  arranger?: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const getTextContent = (selector: string): string | undefined => {
    const el = doc.querySelector(selector);
    return el?.textContent?.trim() || undefined;
  };

  // MusicXML stores metadata in <identification> and <work> elements
  const title =
    getTextContent("work > work-title") ||
    getTextContent("movement-title");

  // Find creator elements by type
  const creators = doc.querySelectorAll("identification > creator");
  let composer: string | undefined;
  let arranger: string | undefined;

  creators.forEach((el) => {
    const type = el.getAttribute("type");
    const text = el.textContent?.trim();
    if (type === "composer" && text) composer = text;
    if (type === "arranger" && text) arranger = text;
  });

  return { title, composer, arranger };
}
