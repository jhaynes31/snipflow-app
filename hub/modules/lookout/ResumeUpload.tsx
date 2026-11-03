"use client";

import JSZip from "jszip";
import { useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, ErrorNote, Note, timeAgo, useAction } from "@/core/ui";

/** The text of a Word file: each paragraph on its own line. */
async function docxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("That Word file couldn't be opened. Try saving it again, or as a PDF.");
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Upload a resume to fill in the profile. Jobs it lists become draft
 * entries in the work history and its contact lines, tools, and education
 * fill unanswered interview questions. Everything waits for its owner to
 * check and confirm it. PDFs are read once and then deleted.
 */
export function ResumeUpload({ owner, ownerName }: { owner: boolean; ownerName: string }) {
  const uploadUrl = useMutation(api.lookout.data.uploadUrl);
  const read = useConvexAction(api.lookout.ai.importResume);
  const past = useQuery(api.lookout.data.imports);
  const { busy, error, run, setError } = useAction();
  const [result, setResult] = useState<{ rolesAdded: number; answersAdded: number; notes: string[] } | null>(null);

  async function handle(file: File) {
    setResult(null);
    const name = file.name.toLowerCase();
    if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB. Try a smaller copy.");
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const url = await uploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!res.ok) throw new Error("The upload didn't go through. Try again.");
      const { storageId } = (await res.json()) as { storageId: string };
      setResult(await read({ fileName: file.name, pdf: storageId as Id<"_storage"> }));
    } else if (name.endsWith(".docx")) {
      setResult(await read({ fileName: file.name, text: await docxText(file) }));
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      setResult(await read({ fileName: file.name, text: await file.text() }));
    } else if (name.endsWith(".doc") || name.endsWith(".pages") || name.endsWith(".odt")) {
      throw new Error("That kind of file can't be read here. Save it as a PDF or a Word (.docx) file and upload that.");
    } else {
      throw new Error("Upload a PDF, a Word (.docx) file, or a text file.");
    }
  }

  return (
    <Card>
      <h2 className="sh-h2">Fill this in from a resume</h2>
      <p>Upload {owner ? "your" : `${ownerName}'s`} current resume (PDF, Word, or text) and the jobs, dates, duties, tools, contact lines, and education on it come in as drafts.</p>
      <p className="sh-hint">Nothing is added that the resume doesn&apos;t say. Each job and answer is marked as waiting for {owner ? "you" : ownerName} to check and confirm it, and only confirmed details are ever used in an application. Jobs already in the history and questions already answered are left alone. The file itself isn&apos;t kept.</p>
      <label className="sh-btn sh-btn-primary" style={{ display: "inline-flex", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Reading the resume…" : "Choose a resume"}
        <input
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          disabled={busy}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            void run(() => handle(file));
          }}
        />
      </label>
      <ErrorNote error={error} />
      {result && (
        <Note>
          Added {result.rolesAdded} {result.rolesAdded === 1 ? "job" : "jobs"} to the history and {result.answersAdded} {result.answersAdded === 1 ? "interview answer" : "interview answers"}, all waiting to be checked and confirmed.
          {result.notes.length > 0 && <> Worth a look: {result.notes.join(" ")}</>}
        </Note>
      )}
      {past && past.length > 0 && (
        <p className="sh-hint mt-3">Earlier: {past.slice(0, 3).map((p) => `${p.fileName} (${timeAgo(p.importedAt)}: ${p.rolesAdded} jobs, ${p.answersAdded} answers)`).join("; ")}</p>
      )}
    </Card>
  );
}
