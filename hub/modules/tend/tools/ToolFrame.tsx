"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Btn, LinkBtn, PageTitle } from "@/core/ui";
import { toolByKey } from "./registry";

interface ToolUse {
  useId: Id<"tendToolUses"> | null;
  /** Keep something the tool produced. Merged into the use record. */
  keep: (saved: unknown) => Promise<void>;
}

const ToolUseContext = createContext<ToolUse | null>(null);

export function useToolUse(): ToolUse {
  const ctx = useContext(ToolUseContext);
  if (!ctx) throw new Error("useToolUse must be used inside ToolFrame");
  return ctx;
}

/**
 * Every tool lives in this frame: its name and two-minute version at the
 * top, and the same gentle close at the bottom, "Did that help a little,
 * not really, or not at all?" The answer is private and only decides
 * which tools are offered first.
 */
export function ToolFrame({ toolKey, children }: { toolKey: string; children: ReactNode }) {
  const meta = toolByKey(toolKey);
  const start = useMutation(api.tend.tools.start);
  const finish = useMutation(api.tend.tools.finish);
  const [useId, setUseId] = useState<Id<"tendToolUses"> | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start({ tool: toolKey }).then(setUseId);
  }, [start, toolKey]);

  const value: ToolUse = {
    useId,
    keep: async (saved) => {
      if (useId) await finish({ id: useId, saved });
    },
  };

  if (!meta) return null;
  return (
    <ToolUseContext.Provider value={value}>
      <div className="sh-container sh-narrow tend-tool">
        <PageTitle title={meta.name} subtitle={meta.forWhen} action={<LinkBtn href="/tend/tools" variant="ghost">All tools</LinkBtn>} />
        <p className="sh-hint">Two-minute version: {meta.twoMinute}</p>
        {children}
        <section className="sh-card tend-close" aria-label="Did that help">
          {closed ? (
            <p>
              Noted. <Link href="/tend" className="sh-link">Back to Tend</Link>
            </p>
          ) : (
            <>
              <p>
                <strong>Did that help?</strong>
              </p>
              <div className="sh-choices">
                {(
                  [
                    ["little", "A little"],
                    ["notReally", "Not really"],
                    ["notAtAll", "Not at all"],
                  ] as const
                ).map(([k, label]) => (
                  <Btn
                    key={k}
                    variant="secondary"
                    disabled={!useId}
                    onClick={() => {
                      if (useId) void finish({ id: useId, helped: k });
                      setClosed(label);
                    }}
                  >
                    {label}
                  </Btn>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </ToolUseContext.Provider>
  );
}
