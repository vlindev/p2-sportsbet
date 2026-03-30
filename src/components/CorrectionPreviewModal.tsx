"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  matchId: string;
  settlementContext: "base" | "sporadic_pool";
  sporadicPoolId?: string;
  oldWinner: "team_a" | "team_b";
  newWinner: "team_a" | "team_b";
  onCancel: () => void;
  onConfirm: () => void;
};

type AffectedMember = { member_id: string; name: string; net_liang: number };

export default function CorrectionPreviewModal({
  matchId, settlementContext, sporadicPoolId, oldWinner, newWinner, onCancel, onConfirm,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AffectedMember[]>([]);
  const [hasSettlement, setHasSettlement] = useState(false);

  useEffect(() => {
    async function check() {
      let query = supabase
        .from("match_settlements")
        .select("member_id, net_liang")
        .eq("match_id", matchId)
        .eq("settlement_context", settlementContext);

      if (settlementContext === "sporadic_pool" && sporadicPoolId) {
        query = query.eq("sporadic_pool_id", sporadicPoolId);
      }

      const { data: rows } = await query;

      if (!rows || rows.length === 0) {
        // No settlement persisted yet — skip modal, proceed directly
        setHasSettlement(false);
        setLoading(false);
        return;
      }

      setHasSettlement(true);

      // Fetch member names
      const memberIds = rows.map((r) => r.member_id);
      const { data: memberData } = await supabase
        .from("members")
        .select("id, name")
        .in("id", memberIds);

      const nameMap: Record<string, string> = {};
      for (const m of memberData || []) nameMap[m.id] = m.name;

      setMembers(
        rows.map((r) => ({ member_id: r.member_id, name: nameMap[r.member_id] || "—", net_liang: r.net_liang }))
          .sort((a, b) => Math.abs(b.net_liang) - Math.abs(a.net_liang)),
      );
      setLoading(false);
    }
    check();
  }, [matchId, settlementContext, sporadicPoolId]);

  // No settlement exists — auto-confirm without showing modal
  useEffect(() => {
    if (!loading && !hasSettlement) {
      onConfirm();
    }
  }, [loading, hasSettlement, onConfirm]);

  if (loading || !hasSettlement) return null;

  const oldLabel = oldWinner === "team_a" ? "A 隊" : "B 隊";
  const newLabel = newWinner === "team_a" ? "A 隊" : "B 隊";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">更正結果確認</h3>

        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center gap-3 text-base">
            <span className="font-semibold text-red-500 line-through">{oldLabel}勝</span>
            <span className="text-slate-400">→</span>
            <span className="font-semibold text-emerald-600">{newLabel}勝</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
          此場次已有確認結算。修改勝負將重新計算所有相關結算資料。
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600 mb-2">受影響會員 ({members.length} 人)</p>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.member_id} className="flex justify-between px-3 py-2 text-sm">
                <span className="text-slate-700">{m.name}</span>
                <span className={`tabular-nums font-medium ${m.net_liang > 0 ? "text-emerald-600" : m.net_liang < 0 ? "text-red-600" : "text-slate-400"}`}>
                  {m.net_liang > 0 ? "+" : ""}{m.net_liang}兩
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            取消
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer">
            確認修改
          </button>
        </div>
      </div>
    </div>
  );
}
