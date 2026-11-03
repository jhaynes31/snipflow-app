import JSZip from "jszip";

/**
 * A plain Word document from plain text: one paragraph per line, the
 * all-capitals section headings and the first line in bold. No tables, no
 * columns, no text boxes, so applicant tracking systems read it cleanly.
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(line: string, bold: boolean, size: number): string {
  const run = `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(line)}</w:t></w:r>`;
  return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>${line ? run : ""}</w:p>`;
}

export async function textToDocx(text: string): Promise<Blob> {
  const lines = text.replace(/\r/g, "").split("\n");
  const body = lines.map((l, i) => paragraph(l, i === 0 || (/^[A-Z][A-Z ]{3,}$/.test(l.trim()) && l.trim().length < 40), i === 0 ? 28 : 22)).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** A file name with no dashes either: words joined by underscores. */
export function fileName(...parts: string[]): string {
  return parts.join(" ").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
