import type { SporadicPool } from "@/types";

type Props = {
  poolIndex: number;
  pool: SporadicPool;
};

export default function PoolReportHeader({ poolIndex, pool }: Props) {
  const resultLabel = pool.result === "team_a" ? "A 隊勝" : pool.result === "team_b" ? "B 隊勝" : null;

  return (
    <div className="bg-fuchsia-50 border-[1.5px] border-purple-200 rounded-xl px-5 py-4 mb-4 mt-2">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-[13px] font-semibold px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700">
          加強盤 #{poolIndex + 1}
        </span>
        <span className="text-sm text-purple-600">{pool.opened_by_team}隊開盤</span>
        <span className="text-[13px] font-semibold text-fuchsia-700">容量 {pool.capacity_zhi}支</span>
      </div>
      {pool.handicap_type !== "不讓分" ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <span>{pool.handicap_team}隊</span>
          <span className="font-bold text-orange-500">
            讓 {pool.handicap_value} {pool.handicap_type === "讓點" ? "點" : "洞"}
          </span>
        </div>
      ) : (
        <div className="text-sm text-slate-500 mb-1">平盤</div>
      )}
      {resultLabel && (
        <div className="bg-emerald-50 rounded-lg py-2 text-center mt-2">
          <span className="text-sm font-semibold text-emerald-600">{resultLabel}（獨立結算）</span>
        </div>
      )}
    </div>
  );
}
