import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * What a person sees when a page or a server call blows up. One calm screen
 * in the tavern's colours with a Try again button, instead of the router's
 * bare "Something went wrong!". Visitors never see the technical text; John
 * gets a small line of it so whoever fixes things has a clue.
 */
export default function ErrorScreen({ error, reset, admin = false }: ErrorComponentProps & { admin?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);
  const retry = () => {
    reset();
    void router.invalidate();
  };
  const home = admin ? "/admin" : "/";
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-error-screen>
      <div className="w-full max-w-md rounded-xl border border-[#c08020]/40 bg-[#111a28] p-6 text-center space-y-4">
        <p className="text-4xl" aria-hidden="true">🕯️</p>
        <h1 className="font-fantasy text-[#c08020] text-xl">The tavern hit a snag</h1>
        <p className="text-[#a0a0a0] text-sm font-fantasy">Nothing you did caused it. Usually a second try is all it takes.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={retry} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-error-retry>
            Try again
          </button>
          <Link to={home} className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-sm" data-error-home>
            {admin ? "Back to Home" : "Back to The Financial DM"}
          </Link>
        </div>
        {admin && error instanceof Error && error.message && (
          <p className="text-[11px] text-[#606080] font-mono break-words" data-error-detail>
            For whoever fixes it: {error.message.slice(0, 300)}
          </p>
        )}
      </div>
    </main>
  );
}

/** The styled not-found page, shared by the root route and the router default. */
export function NotFoundScreen() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4" style={{ background: "#0d1520" }} data-not-found>
      <div className="text-center space-y-3">
        <p className="text-[#c08020] font-fantasy text-xl">Page not found</p>
        <Link to="/" className="text-[#a0a0a0] text-sm underline hover:text-[#e0e0e0]">Back to The Financial DM</Link>
      </div>
    </main>
  );
}
