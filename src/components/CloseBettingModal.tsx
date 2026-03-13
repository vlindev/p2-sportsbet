"use client";

type Props = {
  matchName: string;
  matchType: "monday" | "optional";
  teamACount: number;
  teamBCount: number;
  teamATotal: number;
  teamBTotal: number;
  unbettedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
  fetchError?: string;
};

export default function CloseBettingModal({
  matchName, matchType, teamACount, teamBCount, teamATotal, teamBTotal,
  unbettedCount, onConfirm, onCancel, confirming, fetchError,
}: Props) {
  const isMonday = matchType === "monday";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-1">確認封盤</h3>
        <p className="text-sm text-slate-500 mb-1">{matchName}</p>
        <p className="text-xs text-slate-400 mb-4">封盤後會員無法自行下注，管理人員仍可新增或修改。</p>

        {fetchError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">A 隊</span>
                <span className="font-medium text-slate-700">{teamACount} 人 · {teamATotal} 兩</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">B 隊</span>
                <span className="font-medium text-slate-700">{teamBCount} 人 · {teamBTotal} 兩</span>
              </div>
            </div>

            {isMonday && unbettedCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 mb-4">
                <p className="text-sm text-orange-600 font-medium">{unbettedCount} 位會員尚未投注</p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            取消
          </button>
          <button onClick={onConfirm} disabled={confirming || !!fetchError}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {confirming ? "封盤中..." : "確認封盤"}
          </button>
        </div>
      </div>
    </div>
  );
}
