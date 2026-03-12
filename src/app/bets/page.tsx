"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MatchBetReport from "@/components/Bets/MatchSettlementReport";
import MatchBetEntry from "@/components/Bets/MatchBetEntry";
import BetsLandingPage from "@/components/BetsLanding/BetsLandingPage";
import type { Match } from "@/types";

function BetsContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const fromTab = searchParams.get("from");

  const [matchStatus, setMatchStatus] = useState<Match["status"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    supabase.from("matches").select("status").eq("id", matchId).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("找不到此賽事"); }
        else { setMatchStatus(data.status as Match["status"]); }
        setLoading(false);
      });
  }, [matchId]);

  const backUrl = fromTab === "bets" ? "/bets" : fromTab ? `/matches?tab=${fromTab}` : "/matches";
  const backLabel = fromTab === "bets" ? "← 返回投注" : "← 返回賽事";

  // Match-filtered view
  if (matchId) {
    if (loading) {
      return (
        <div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto">
          <div className="text-slate-400 text-sm">載入中...</div>
        </div>
      );
    }

    if (error || !matchStatus) {
      return (
        <div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto">
          <p className="text-red-500 text-sm mb-4">{error || "發生錯誤"}</p>
          <button
            onClick={() => window.location.href = backUrl}
            className="text-sm text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
          >
            {backLabel}
          </button>
        </div>
      );
    }

    // Bettable matches → entry view; completed/cancelled/active → report view
    if (matchStatus === "scheduled" || matchStatus === "betting_closed") {
      return <MatchBetEntry matchId={matchId} backUrl={backUrl} backLabel={backLabel} />;
    }

    return <MatchBetReport matchId={matchId} backUrl={backUrl} backLabel={backLabel} />;
  }

  // Default view — landing page with match list + member lookup tabs
  return <BetsLandingPage />;
}

export default function BetsPage() {
  return (
    <Suspense fallback={<div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto"><div className="text-slate-400 text-sm">載入中...</div></div>}>
      <BetsContent />
    </Suspense>
  );
}
