"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import BetsLandingEmptyState from "./BetsLandingEmptyState";
import BetsLandingTabs, { type BetsLandingTab } from "./BetsLandingTabs";
import MatchListTab from "./MatchListTab";
import MemberBatchEntryTab from "./MemberBatchEntryTab";
import MemberLookupTab from "./MemberLookupTab";
import type { Match, Bet } from "@/types";
import type { LandingMember } from "./types";

export default function BetsLandingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [members, setMembers] = useState<LandingMember[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [poolCounts, setPoolCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BetsLandingTab>("match-list");

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    // Q1: bettable matches
    const { data: matchData, error: matchErr } = await supabase
      .from("matches")
      .select("*")
      .in("status", ["scheduled", "betting_closed"])
      .order("date")
      .order("start_time")
      .order("name");
    if (matchErr) { setFetchError("無法載入賽事資料"); setLoading(false); return; }

    const ms = (matchData || []) as Match[];
    setMatches(ms);

    if (ms.length === 0) {
      setLoading(false);
      return;
    }

    const matchIds = ms.map((m) => m.id);

    // Q2, Q3, Q4 in parallel
    const [mbRes, betRes, poolRes] = await Promise.all([
      supabase.from("members").select("id, name, active"),
      supabase
        .from("bets")
        .select("*")
        .in("match_id", matchIds)
        .eq("status", "active")
        .is("sporadic_pool_id", null),
      supabase
        .from("sporadic_pools")
        .select("id, match_id")
        .in("match_id", matchIds)
        .neq("result", "cancelled"),
    ]);

    if (mbRes.error) { setFetchError("無法載入會員資料"); setLoading(false); return; }

    const mbs = (mbRes.data || []) as LandingMember[];
    setMembers(mbs);
    setMemberMap(Object.fromEntries(mbs.map((m) => [m.id, m.name])));

    // Bets — degrade gracefully if fails
    if (betRes.error) {
      console.error("Fetch bets:", betRes.error);
      setBets([]);
    } else {
      setBets((betRes.data || []) as Bet[]);
    }

    // Pool counts — degrade gracefully
    if (poolRes.error) {
      console.error("Fetch pools:", poolRes.error);
      setPoolCounts({});
    } else {
      const counts: Record<string, number> = {};
      for (const p of poolRes.data || []) {
        const pid = (p as { match_id: string }).match_id;
        counts[pid] = (counts[pid] || 0) + 1;
      }
      setPoolCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  // Refetch bets only (after any bet-changing action)
  const refreshBets = useCallback(async () => {
    const matchIds = matches.map((m) => m.id);
    if (matchIds.length === 0) return;
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .in("match_id", matchIds)
      .eq("status", "active")
      .is("sporadic_pool_id", null);
    if (error) { console.error("Refresh bets:", error); return; }
    setBets((data || []) as Bet[]);
  }, [matches]);

  // Optimistic match status update (封盤/取消封盤)
  function handleMatchStatusChange(matchId: string, newStatus: Match["status"]) {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
    );
  }

  const activeMemberCount = members.filter((m) => m.active).length;

  if (loading) {
    return (
      <div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto">
        <div className="text-slate-400 text-sm">載入中...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto">
        <p className="text-red-500 text-sm mb-3">{fetchError}</p>
        <button onClick={loadData} className="text-sm text-orange-500 hover:text-orange-600 cursor-pointer">
          重新載入
        </button>
      </div>
    );
  }

  if (matches.length === 0) return <BetsLandingEmptyState />;

  return (
    <div className="p-6 pt-10 pb-32 min-h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">投注管理</h2>
      </div>

      {/* Tabs */}
      <BetsLandingTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "match-list" && (
        <MatchListTab
          matches={matches}
          bets={bets}
          memberMap={memberMap}
          activeMemberCount={activeMemberCount}
          poolCounts={poolCounts}
          onMatchStatusChange={handleMatchStatusChange}
          onBetsChange={refreshBets}
          members={members}
        />
      )}
      {activeTab === "member-batch" && (
        <MemberBatchEntryTab
          matches={matches}
          bets={bets}
          members={members}
          memberMap={memberMap}
          onBetsChange={refreshBets}
        />
      )}
      {activeTab === "member-lookup" && (
        <MemberLookupTab
          matches={matches}
          bets={bets}
          members={members}
          memberMap={memberMap}
          onBetsChange={refreshBets}
        />
      )}
    </div>
  );
}
