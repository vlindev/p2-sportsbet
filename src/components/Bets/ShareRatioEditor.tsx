"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Pencil, ArrowLeftRight } from "lucide-react";
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

const PRESETS = [
  { label: "50/50", v: 50 },
  { label: "60/40", v: 60 },
  { label: "70/30", v: 70 },
  { label: "80/20", v: 80 },
];

export default function ShareRatioEditor({
  matchId, matchStatus, teamAPlayers, teamBPlayers, context,
  sporadicPoolId, teamATotalBetsLiang, teamBTotalBetsLiang, onSharesChanged,
}: Props) {
  const [shares, setShares] = useState<MatchTeamPlayerShare[]>([]);
  const [editingSide, setEditingSide] = useState<"A" | "B" | null>(null);
  const [editPct, setEditPct] = useState(50);
  const [saving, setSaving] = useState(false);

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

  function sideShares(side: "A" | "B"): MatchTeamPlayerShare[] {
    return shares.filter(s => s.match_side === side)
      .sort((a, b) => a.player_id.localeCompare(b.player_id));
  }

  function playerName(id: string): string {
    return [...teamAPlayers, ...teamBPlayers].find(p => p.id === id)?.name || "—";
  }

  function is5050(side: "A" | "B"): boolean {
    const ss = sideShares(side);
    return ss.length === 2 && ss[0].share_bps === 5000 && ss[1].share_bps === 5000;
  }

  function startEdit(side: "A" | "B") {
    const ss = sideShares(side);
    setEditingSide(side);
    setEditPct(ss.length === 2 ? Math.round(ss[0].share_bps / 100) : 50);
  }

  async function saveEdit() {
    if (!editingSide) return;
    const ss = sideShares(editingSide);
    if (ss.length !== 2) return;
    setSaving(true);

    const p1Bps = editPct * 100;
    const p2Bps = 10_000 - p1Bps;

    const { error: e1 } = await supabase.from("match_team_player_shares")
      .update({ share_bps: p1Bps, pre_adjustment_bps: null }).eq("id", ss[0].id);
    if (e1) { console.error("Save share:", e1); setSaving(false); return; }

    const { error: e2 } = await supabase.from("match_team_player_shares")
      .update({ share_bps: p2Bps, pre_adjustment_bps: null }).eq("id", ss[1].id);
    if (e2) { console.error("Save share:", e2); setSaving(false); return; }

    const { data: verify } = await supabase.from("match_team_player_shares")
      .select("share_bps").eq("match_id", matchId).eq("match_side", editingSide)
      .eq("context", context);
    const shareSum = (verify || []).reduce((s, r: { share_bps: number }) => s + r.share_bps, 0);
    if (shareSum !== 10_000) {
      await supabase.from("match_team_player_shares")
        .update({ share_bps: ss[0].share_bps, pre_adjustment_bps: null }).eq("id", ss[0].id);
      await supabase.from("match_team_player_shares")
        .update({ share_bps: ss[1].share_bps, pre_adjustment_bps: null }).eq("id", ss[1].id);
      console.error("Share invariant violated: sum =", shareSum);
      setSaving(false);
      return;
    }

    if (matchStatus === "betting_closed" && context === "base") {
      const opposingTotal = editingSide === "A" ? teamBTotalBetsLiang : teamATotalBetsLiang;
      const savedShares = [
        { id: ss[0].id, share_bps: p1Bps },
        { id: ss[1].id, share_bps: p2Bps },
      ];
      const adjustments = checkMinExposure(savedShares, opposingTotal, 20);
      if (adjustments) {
        for (const [id, { originalBps, newBps }] of adjustments) {
          const { error } = await supabase.from("match_team_player_shares")
            .update({ share_bps: newBps, pre_adjustment_bps: originalBps }).eq("id", id);
          if (error) console.error("R17.11 adjust:", error);
        }
      }
    }

    setSaving(false);
    setEditingSide(null);
    fetchShares();
    onSharesChanged?.();
  }

  function estimate(side: "A" | "B", pct: number): string {
    const opp = side === "A" ? teamBTotalBetsLiang : teamATotalBetsLiang;
    return (opp * pct / 100).toFixed(1);
  }

  const adjusted = context === "base" ? shares.find(s => s.pre_adjustment_bps !== null) : null;
  const all5050 = is5050("A") && is5050("B");

  if (shares.length === 0) return null;

  // Edit mode for a side
  if (editingSide) {
    const ss = sideShares(editingSide);
    if (ss.length !== 2) return null;
    const p1Name = playerName(ss[0].player_id);
    const p2Name = playerName(ss[1].player_id);
    const p2Edit = 100 - editPct;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <p className="text-sm font-semibold text-slate-500 mb-4">選手佔成</p>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium text-slate-500">{editingSide}隊 選手佔成</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-700 truncate max-w-[140px]">{p1Name}</span>
            <input type="number" min={0} max={100} value={editPct}
              onChange={e => setEditPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
            <span className="text-slate-400 text-xs">%</span>
            <button onClick={() => setEditPct(100 - editPct)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer" title="對調">
              <ArrowLeftRight size={14} />
            </button>
            <span className="text-slate-700 truncate max-w-[140px]">{p2Name}</span>
            <span className="text-sm text-slate-500 tabular-nums">{p2Edit}%</span>
          </div>
          <div className="flex gap-1.5">
            {PRESETS.map(p => (
              <button key={p.v} onClick={() => setEditPct(p.v)}
                className={`px-2 py-1 text-xs rounded border cursor-pointer transition-colors ${
                  editPct === p.v ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
                }`}>{p.label}</button>
            ))}
          </div>
          <div className="text-xs text-slate-400">
            估算 {p1Name} {estimate(editingSide, editPct)}兩 · {p2Name} {estimate(editingSide, p2Edit)}兩
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={saving || editPct < 0 || editPct > 100}
              className="px-3 py-1 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer disabled:opacity-40">
              {saving ? "..." : "儲存"}</button>
            <button onClick={() => setEditingSide(null)}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer">取消</button>
          </div>
        </div>
        {/* Show the other side as read-only below the edit form */}
        {renderSideCard(editingSide === "A" ? "B" : "A")}
      </div>
    );
  }

  // Display mode — metric card style
  return (
    <>
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 ${locked ? "opacity-85" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-semibold ${locked ? "text-slate-400" : "text-slate-500"}`}>選手佔成</span>
          {!locked && (
            <button onClick={() => startEdit("A")} className="p-1.5 rounded text-slate-400 hover:text-orange-500 hover:bg-slate-100 cursor-pointer transition-colors">
              <Pencil size={16} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {renderSideCard("A")}
          {renderSideCard("B")}
        </div>
      </div>
      {adjusted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-amber-700">
            佔成已調整：原 {Math.round(adjusted.pre_adjustment_bps! / 100)}% / {100 - Math.round(adjusted.pre_adjustment_bps! / 100)}%
            → 現 {Math.round(adjusted.share_bps / 100)}% / {100 - Math.round(adjusted.share_bps / 100)}%
            （最低曝險 20兩）
          </p>
        </div>
      )}
    </>
  );

  function renderSideCard(side: "A" | "B") {
    const ss = sideShares(side);
    if (ss.length !== 2) return null;
    const p1Name = playerName(ss[0].player_id);
    const p2Name = playerName(ss[1].player_id);
    const p1Pct = Math.round(ss[0].share_bps / 100);
    const p2Pct = Math.round(ss[1].share_bps / 100);
    const isSide5050 = ss[0].share_bps === 5000 && ss[1].share_bps === 5000;
    const pctColor = locked ? "text-slate-600" : "text-slate-800";
    const labelColor = locked ? "text-slate-400" : "text-slate-500";
    const nameColor = locked ? "text-slate-400" : "text-slate-400";

    return (
      <div className="bg-slate-50 rounded-xl p-4 text-center">
        <p className={`text-sm font-medium ${labelColor} mb-2`}>{side} 隊</p>
        {isSide5050 ? (
          <>
            <p className={`text-2xl font-bold ${pctColor} tabular-nums`}>50%</p>
            <p className={`text-sm ${nameColor} mt-1`}>{p1Name} · {p2Name}</p>
          </>
        ) : (
          <div className="flex justify-center gap-6">
            <div>
              <p className={`text-2xl font-bold ${pctColor} tabular-nums`}>{p1Pct}%</p>
              <p className={`text-sm ${nameColor} mt-1`}>{p1Name}</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${pctColor} tabular-nums`}>{p2Pct}%</p>
              <p className={`text-sm ${nameColor} mt-1`}>{p2Name}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
}
