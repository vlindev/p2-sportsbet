"use client";

import { useState, useRef, useEffect } from "react";
import MemberMatchRow from "./MemberMatchRow";
import MemberQuickActions from "./MemberQuickActions";
import type { Match, Bet } from "@/types";
import type { MemberLookupTabProps } from "./types";

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${dt.getMonth() + 1}/${dt.getDate()} (${days[dt.getDay()]})`;
}

function playerTeam(match: Match, memberId: string): "A" | "B" | null {
  if (match.team_a_player1_id === memberId || match.team_a_player2_id === memberId) return "A";
  if (match.team_b_player1_id === memberId || match.team_b_player2_id === memberId) return "B";
  return null;
}

export default function MemberLookupTab({ matches, bets, members, memberMap, onBetsChange }: MemberLookupTabProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [amountToggle, setAmountToggle] = useState<1 | 2>(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeMembers = members.filter((m) => m.active);
  const filtered = query.length > 0
    ? activeMembers.filter((m) => m.name.includes(query))
    : [];

  function selectMember(id: string, name: string) {
    setSelectedId(id);
    setQuery(name);
    setShowDropdown(false);
  }

  function clearMember() {
    setSelectedId("");
    setQuery("");
  }

  // Data for selected member
  const memberBets = selectedId ? bets.filter((b) => b.member_id === selectedId) : [];

  // Per-match bet lookup
  function getBet(matchId: string): Bet | undefined {
    return memberBets.find((b) => b.match_id === matchId);
  }

  // Summary counts
  const mondayMatches = matches.filter((m) => m.match_type === "monday");
  const optionalMatches = matches.filter((m) => m.match_type === "optional");
  const mondayBetted = mondayMatches.filter((m) => getBet(m.id) || playerTeam(m, selectedId) !== null).length;
  const optionalBetted = optionalMatches.filter((m) => getBet(m.id) !== undefined).length;

  // Unbetted mandatory matches for quick actions (exclude player matches)
  const unbettedMondayMatches = selectedId
    ? mondayMatches.filter((m) => !getBet(m.id) && playerTeam(m, selectedId) === null)
    : [];

  // Group by date
  const dateGroups: { date: string; label: string; matches: Match[] }[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    if (!seen.has(m.date)) {
      seen.add(m.date);
      dateGroups.push({ date: m.date, label: fmtDate(m.date), matches: matches.filter((x) => x.date === m.date) });
    }
  }

  return (
    <div>
      {/* Search input */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId("");
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => { if (query.length > 0 && !selectedId) setShowDropdown(true); }}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300"
            placeholder="搜尋會員姓名..."
          />
          {selectedId && (
            <button onClick={clearMember}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer text-sm">
              ✕
            </button>
          )}
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.map((m) => (
                <button key={m.id} onClick={() => selectMember(m.id, m.name)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 text-slate-800 cursor-pointer">
                  {m.name}
                </button>
              ))}
            </div>
          )}
          {showDropdown && query.length > 0 && filtered.length === 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <p className="text-sm text-slate-400 text-center py-4">找不到符合的會員</p>
            </div>
          )}
        </div>
      </div>

      {/* Member results */}
      {selectedId && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-base font-bold text-slate-800">{memberMap[selectedId] || "—"}</p>
              <p className="text-sm text-slate-500">
                週一 <span className="font-bold text-slate-800">{mondayBetted}</span>/{mondayMatches.length} 場
                {optionalMatches.length > 0 && (
                  <> · 熱身 <span className="font-bold text-slate-800">{optionalBetted}</span>/{optionalMatches.length} 場</>
                )}
              </p>
            </div>

            {/* Match rows */}
            <div className="divide-y divide-gray-50">
              {dateGroups.map((group) => (
                <div key={group.date}>
                  <div className="px-5 py-2 bg-slate-50">
                    <span className="text-sm font-bold text-slate-600">{group.label}</span>
                  </div>
                  {group.matches.map((match) => {
                    const pt = playerTeam(match, selectedId);
                    return (
                      <MemberMatchRow
                        key={match.id}
                        match={match}
                        memberBet={getBet(match.id)}
                        memberId={selectedId}
                        memberMap={memberMap}
                        isPlayer={pt !== null}
                        playerTeam={pt}
                        amountToggle={amountToggle}
                        onBetsChange={onBetsChange}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <MemberQuickActions
            unbettedMondayMatches={unbettedMondayMatches}
            memberId={selectedId}
            amountToggle={amountToggle}
            onAmountChange={setAmountToggle}
            onBetsChange={onBetsChange}
          />
        </>
      )}
    </div>
  );
}
