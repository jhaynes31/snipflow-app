/** Rule 2.6: every practice screen says so. */
export default function PracticeBanner({ who }: { who?: string }) {
  return (
    <div className="bg-[#b8860b] text-[#1c1a12] text-xs sm:text-sm px-4 py-1.5 text-center font-semibold" data-practice-banner>
      PRACTICE · The person you are talking to is fictional. Nothing here touches a real lead or recruit.{who ? ` · ${who}` : ""}
    </div>
  );
}
