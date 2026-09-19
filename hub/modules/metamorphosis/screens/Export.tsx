"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, PageTitle } from "@/core/ui";

/** My pages: everything in the room as plain text, for him to keep or hand to a therapist. */
export function Export() {
  const text = useQuery(api.metamorphosis.entries.exportMine);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My pages" subtitle="Everything in this room, as plain text. Yours to keep anywhere, or to hand to a therapist. A share link with an expiry is coming in a later build." />
      <Card>
        <Btn
          disabled={!text}
          onClick={() => {
            if (!text) return;
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "metamorphosis.txt";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download my pages
        </Btn>
        {text && <pre className="sh-muted mt-3" style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{text.slice(0, 1500)}{text.length > 1500 ? "\n…" : ""}</pre>}
      </Card>
    </div>
  );
}
