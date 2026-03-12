"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import MemberSelect from "@/components/MemberSelect";
import MatchBetRow from "./MatchBetRow";
import type { Match, Bet } from "@/types";
import type { BetEntryMember, NewBetEntry } from "./types";

export default function BetEntryView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<BetEntryMember[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [existingBets, setExistingBets] = useState<Bet[]>([]);
  const [newBets, setNewBets] = useState<Map<string, NewBetEntry>>(new Map());

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const [mRes, mbRes] = await Promise.all([
        supabase.from("matches").select("*").in("status", ["scheduled", "betting_closed"]).order("date").order("start_time"),
        supabase.from("members").select("id, name, active"),
      ]);
      if (mRes.error) { setFetchError("\u7121\u6CD5\u8F09\u5165\u8CFD\u4E8B\u8CC7\u6599"); setLoading(false); return; }
      if (mbRes.error) { setFetchError("\u7121\u6CD5\u8F09\u5165\u6703\u54E1\u8CC7\u6599"); setLoading(false); return; }
      const ms = mRes.data as Match[];
      setMatches(ms);
      setMembers(mbRes.data as BetEntryMember[]);
      setMemberMap(Object.fromEntries((mbRes.data || []).map((m: { id: string; name: string }) => [m.id, m.name])));
      if (ms.length > 0) setSelectedDate([...new Set(ms.map((m) => m.date))][0]);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedMemberId || !selectedDate) { setExistingBets([]); return; }
    const ids = matches.filter((m) => m.date === selectedDate).map((m) => m.id);
    if (ids.length === 0) { setExistingBets([]); return; }
    supabase.from("bets").select("*")
      .eq("member_id", selectedMemberId).in("match_id", ids)
      .eq("status", "active").is("sporadic_pool_id", null)
      .then(({ data, error }) => {
        if (error) { console.error("Fetch bets failed:", error); return; }
        setExistingBets((data || []) as Bet[]);
      });
  }, [selectedMemberId, selectedDate, matches]);

  const dates = [...new Set(matches.map((m) => m.date))];
  const dateMatches = matches.filter((m) => m.date === selectedDate);
  const completeEntries = [...newBets.entries()].filter(([, e]) => e.amountLiang !== null);

  function playerTeam(match: Match, mid: string): "A" | "B" | null {
    if (match.team_a_player1_id === mid || match.team_a_player2_id === mid) return "A";
    if (match.team_b_player1_id === mid || match.team_b_player2_id === mid) return "B";
    return null;
  }

  function handleMemberChange(id: string) {
    setSelectedMemberId(id);
    setNewBets(new Map());
    setSaveError(null);
    setSaveSuccess(null);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedMemberId("");
    setNewBets(new Map());
    setExistingBets([]);
    setSaveSuccess(null);
  }

  function updateNewBet(matchId: string, entry: NewBetEntry | undefined) {
    setNewBets((prev) => {
      const next = new Map(prev);
      entry ? next.set(matchId, entry) : next.delete(matchId);
      return next;
    });
  }

  async function handleSubmit() {
    if (completeEntries.length === 0 || !selectedMemberId) return;
    setSaving(true);
    setSaveError(null);

    const entries = completeEntries as [string, { teamBetOn: "A" | "B"; amountLiang: 1 | 2 }][];

    const reqs = entries.map(([matchId, e]) => ({
      match_id: matchId, member_id: selectedMemberId, team_bet_on: e.teamBetOn,
      bet_type: "voluntary", requested_amount: e.amountLiang, accepted_amount: e.amountLiang,
      status: "accepted", created_by_role: "bookkeeper", created_via: "manual",
    }));
    const { error: reqErr } = await supabase.from("bet_requests").insert(reqs);
    if (reqErr) { setSaveError("\u5132\u5B58\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66"); console.error("bet_requests insert:", reqErr); setSaving(false); return; }

    const bets = entries.map(([matchId, e]) => ({
      match_id: matchId, member_id: selectedMemberId, team_bet_on: e.teamBetOn,
      amount_liang: e.amountLiang, bet_type: "voluntary", result: "pending", status: "active",
      created_by_role: "bookkeeper", created_via: "manual",
    }));
    const { error: betErr } = await supabase.from("bets").insert(bets);
    if (betErr) { setSaveError("\u5132\u5B58\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66"); console.error("bets insert:", betErr); setSaving(false); return; }

    setSaveSuccess(entries.length);
    setSaving(false);
    setSelectedMemberId("");
    setNewBets(new Map());
    setExistingBets([]);
  }

  function fmtDate(d: string) {
    const dt = new Date(d + "T00:00:00");
    const days = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
    return `${dt.getMonth() + 1}/${dt.getDate()} (${days[dt.getDay()]})`;
  }

  if (loading) return <div className="text-slate-400 text-sm">{"\u8F09\u5165\u4E2D..."}</div>;
  if (fetchError) return (
    <div>
      <p className="text-red-500 text-sm mb-3">{fetchError}</p>
      <button onClick={() => window.location.reload()} className="text-sm text-orange-500 hover:text-orange-600 cursor-pointer">{"\u91CD\u65B0\u8F09\u5165"}</button>
    </div>
  );
  if (dates.length === 0) return <p className="text-sm text-slate-400">{"\u76EE\u524D\u6C92\u6709\u53EF\u6295\u6CE8\u7684\u8CFD\u4E8B"}</p>;

  return (
    <div className="space-y-6">
      {/* Date pills */}
      <div>
        <label className="text-sm font-medium text-slate-500 mb-2 block">{"\u6BD4\u8CFD\u65E5\u671F"}</label>
        <div className="flex gap-2 flex-wrap">
          {dates.map((d) => (
            <button key={d} onClick={() => handleDateChange(d)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                selectedDate === d ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-gray-200 hover:border-orange-300"
              }`}>
              {fmtDate(d)}
              <span className={`ml-1.5 text-xs ${selectedDate === d ? "text-orange-200" : "text-slate-400"}`}>
                {matches.filter((m) => m.date === d).length}{"\u5834"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Member select */}
      <div>
        <label className="text-sm font-medium text-slate-500 mb-2 block">{"\u6703\u54E1"}</label>
        <div className="max-w-sm">
          <MemberSelect members={members} value={selectedMemberId} onChange={handleMemberChange} placeholder={"\u641C\u5C0B\u6703\u54E1\u59D3\u540D..."} />
        </div>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          {"\u2713"} {"\u5DF2\u6210\u529F\u65B0\u589E"} {saveSuccess} {"\u7B46\u6295\u6CE8"}
        </div>
      )}

      {/* Match list */}
      {selectedMemberId && (
        <>
          <div className="space-y-3">
            {dateMatches.map((match) => {
              const pt = playerTeam(match, selectedMemberId);
              return (
                <MatchBetRow key={match.id} match={match} memberMap={memberMap}
                  existingBet={existingBets.find((b) => b.match_id === match.id) || null}
                  isPlayer={pt !== null} playerTeam={pt}
                  newBet={newBets.get(match.id)} onChange={(e) => updateNewBet(match.id, e)} />
              );
            })}
          </div>

          {completeEntries.length > 0 && (
            <div className="sticky bottom-24 md:bottom-4">
              {saveError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-3">{saveError}</div>}
              <button onClick={handleSubmit} disabled={saving}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                {saving ? "\u5132\u5B58\u4E2D..." : `\u78BA\u8A8D\u65B0\u589E ${completeEntries.length} \u7B46\u6295\u6CE8`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
