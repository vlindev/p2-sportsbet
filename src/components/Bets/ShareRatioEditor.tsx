"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Pencil } from "lucide-react";
import { checkMinExposure } from "@/lib/share-validation";
import type { Match, MatchTeamPlayerShare } from "@/types";

type Props = {
  matchId: string;
  matchStatus: Match["status"];
  teamAPlayers: { id: string; name: string }[];
  teamBPlayers: { id: string; name: string }[];
  context: "base" | "sporadic_pool";
  sporadicPoolId?: string;
  teamATotalBetsLiang: number;
  teamBTotalBetsLiang: number;
  onSharesChanged?: () => void;
};

export default function ShareRatioEditor({
  matchId, matchStatus, teamAPlayers, teamBPlayers, context,
  sporadicPoolId, teamATotalBetsLiang, teamBTotalBetsLiang, onSharesChanged,
}: Props) {
  const [shares, setShares] = useState<MatchTeamPlayerShare[]>([]);
  const [editing, setEditing] = useState(false);
  const [editA, setEditA] = useState(50);
  const [editB, setEditB] = useState(50);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const locked = matchStatus === "active" || matchStatus === "completed" || matchStatus === "cancelled";

  const fetchShares = useCallback(async () => {
    let query = supabase.from("match_team_player_shares").select("*")
      .eq("match_id", matchId).eq("context", context);
    if (context === "sporadic_pool" && sporadicPoolId) {
      query = query.eq("sporadic_pool_id", sporadicPoolId);
    } else {
      query = query.is("sporadic_pool_id", null);
    }
    const { data, error } = await query;
    if (error) { console.error("Fetch shares:", error); return; }
    setShares((data || []) as MatchTeamPlayerShare[]);
  }, [matchId, context, sporadicPoolId]);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  // Sort shares to match the player order passed from the match (player1 first)
  function sideShares(side: "A" | "B"): MatchTeamPlayerShare[] {
    const players = side === "A" ? teamAPlayers : teamBPlayers;
    const ss = shares.filter(s => s.match_side === side);
    return ss.sort((a, b) => {
      const aIdx = players.findIndex(p => p.id === a.player_id);
      const bIdx = players.findIndex(p => p.id === b.player_id);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
  }

  function playerName(id: string, side: "A" | "B"): string {
    const players = side === "A" ? teamAPlayers : teamBPlayers;
    return players.find(p => p.id === id)?.name || "—";
  }

  const ssA = sideShares("A");
  const ssB = sideShares("B");
  if (ssA.length !== 2 || ssB.length !== 2) return null;

  const aPct1 = Math.round(ssA[0].share_bps / 100);
  const aPct2 = Math.round(ssA[1].share_bps / 100);
  const bPct1 = Math.round(ssB[0].share_bps / 100);
  const bPct2 = Math.round(ssB[1].share_bps / 100);
  const all5050 = aPct1 === 50 && aPct2 === 50 && bPct1 === 50 && bPct2 === 50;

  function startEdit() {
    setEditA(aPct1);
    setEditB(bPct1);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  const hasChanges = editing && (editA !== aPct1 || editB !== bPct1);

  async function saveEdit() {
    if (!hasChanges) return;
    setSaving(true);
    let r1711Fired = false;

    // Save A side
    if (editA !== aPct1) {
      const p1Bps = editA * 100;
      const p2Bps = 10_000 - p1Bps;
      const { error: e1 } = await supabase.from("match_team_player_shares")
        .update({ share_bps: p1Bps, pre_adjustment_bps: null }).eq("id", ssA[0].id);
      if (e1) { console.error("Save share:", e1); setSaving(false); return; }
      const { error: e2 } = await supabase.from("match_team_player_shares")
        .update({ share_bps: p2Bps, pre_adjustment_bps: null }).eq("id", ssA[1].id);
      if (e2) { console.error("Save share:", e2); setSaving(false); return; }

      // R17.11 check for A side
      if (matchStatus === "betting_closed" && context === "base") {
        const adjustments = checkMinExposure(
          [{ id: ssA[0].id, share_bps: p1Bps }, { id: ssA[1].id, share_bps: p2Bps }],
          teamBTotalBetsLiang, 20
        );
        if (adjustments) {
          for (const [id, { originalBps, newBps }] of adjustments) {
            await supabase.from("match_team_player_shares")
              .update({ share_bps: newBps, pre_adjustment_bps: originalBps }).eq("id", id);
          }
          r1711Fired = true;
        }
      }
    }

    // Save B side
    if (editB !== bPct1) {
      const p1Bps = editB * 100;
      const p2Bps = 10_000 - p1Bps;
      const { error: e1 } = await supabase.from("match_team_player_shares")
        .update({ share_bps: p1Bps, pre_adjustment_bps: null }).eq("id", ssB[0].id);
      if (e1) { console.error("Save share:", e1); setSaving(false); return; }
      const { error: e2 } = await supabase.from("match_team_player_shares")
        .update({ share_bps: p2Bps, pre_adjustment_bps: null }).eq("id", ssB[1].id);
      if (e2) { console.error("Save share:", e2); setSaving(false); return; }

      // R17.11 check for B side
      if (matchStatus === "betting_closed" && context === "base") {
        const adjustments = checkMinExposure(
          [{ id: ssB[0].id, share_bps: p1Bps }, { id: ssB[1].id, share_bps: p2Bps }],
          teamATotalBetsLiang, 20
        );
        if (adjustments) {
          for (const [id, { originalBps, newBps }] of adjustments) {
            await supabase.from("match_team_player_shares")
              .update({ share_bps: newBps, pre_adjustment_bps: originalBps }).eq("id", id);
          }
          r1711Fired = true;
        }
      }
    }

    setSaving(false);
    setEditing(false);
    fetchShares();
    onSharesChanged?.();

    if (r1711Fired) {
      setToast("選手曝險不得低於20兩，佔成已調整至最近整數");
      setTimeout(() => setToast(null), 8000);
    }
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-500">選手佔成</span>
          <div className="flex items-center gap-2">
            <button onClick={saveEdit} disabled={saving || !hasChanges}
              className="px-4 py-1.5 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "..." : "儲存"}
            </button>
            <button onClick={cancelEdit}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
              取消
            </button>
          </div>
        </div>
        {/* A team row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-slate-500 w-8">A隊</span>
          <span className="text-sm font-medium text-slate-600 min-w-[56px]">{playerName(ssA[0].player_id, "A")}</span>
          <div className={`flex items-center border-[1.5px] rounded-lg overflow-hidden transition-colors ${editA !== aPct1 ? "border-orange-400" : "border-slate-200"}`}>
            <input type="number" min={0} max={100} value={editA}
              onChange={e => setEditA(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-11 py-1.5 text-sm font-semibold text-center border-none outline-none text-slate-800" />
            <span className="text-xs text-slate-400 pr-2">%</span>
          </div>
          <span className="text-sm text-slate-300 font-semibold">/</span>
          <span className="text-sm font-semibold text-slate-500">{100 - editA}%</span>
          <span className="text-sm text-slate-400">{playerName(ssA[1].player_id, "A")}</span>
        </div>
        {/* B team row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500 w-8">B隊</span>
          <span className="text-sm font-medium text-slate-600 min-w-[56px]">{playerName(ssB[0].player_id, "B")}</span>
          <div className={`flex items-center border-[1.5px] rounded-lg overflow-hidden transition-colors ${editB !== bPct1 ? "border-orange-400" : "border-slate-200"}`}>
            <input type="number" min={0} max={100} value={editB}
              onChange={e => setEditB(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-11 py-1.5 text-sm font-semibold text-center border-none outline-none text-slate-800" />
            <span className="text-xs text-slate-400 pr-2">%</span>
          </div>
          <span className="text-sm text-slate-300 font-semibold">/</span>
          <span className="text-sm font-semibold text-slate-500">{100 - editB}%</span>
          <span className="text-sm text-slate-400">{playerName(ssB[1].player_id, "B")}</span>
        </div>
      </div>
    );
  }

  // ── Display mode — one-line footer ──
  return (
    <>
      <div className={`border-t border-gray-100 px-6 py-3.5 flex items-center justify-between ${locked ? "opacity-75" : ""}`}>
        <span className="text-sm">
          <span className="font-semibold text-slate-500">選手佔成</span>
          <span className={`ml-3 ${all5050 ? "text-slate-400" : "text-slate-800 font-semibold"}`}>{aPct1}/{aPct2} · {bPct1}/{bPct2}</span>
        </span>
        {!locked && (
          <button onClick={startEdit}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-orange-500 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <Pencil size={14} /> 編輯
          </button>
        )}
      </div>
      {toast && (
        <div className="px-6 pb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-amber-700">{toast}</p>
          </div>
        </div>
      )}
    </>
  );
}
