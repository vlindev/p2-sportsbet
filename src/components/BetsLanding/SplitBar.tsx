"use client";

type Props = {
  countA: number;
  countB: number;
  total: number | null; // null for optional (no center, no gap)
  amountA?: number;     // for optional capacity display
  amountB?: number;
  capacity?: number;    // capacity_zhi for optional matches
};

export default function SplitBar({ countA, countB, total, amountA, amountB, capacity }: Props) {
  const isMonday = total !== null;
  const totalBettors = countA + countB;

  // Bar gradient stops
  let gradient: string;
  if (isMonday) {
    const pctA = total > 0 ? (countA / total) * 100 : 0;
    const pctB = total > 0 ? (countB / total) * 100 : 0;
    const endA = pctA;
    const startB = 100 - pctB;
    gradient = `linear-gradient(to right, #2dd4bf 0%, #2dd4bf ${endA}%, #e5e7eb ${endA}%, #e5e7eb ${startB}%, #60a5fa ${startB}%, #60a5fa 100%)`;
  } else {
    // Optional: proportional A vs B, no gap
    const sum = countA + countB;
    const pctA = sum > 0 ? (countA / sum) * 100 : 50;
    gradient = `linear-gradient(to right, #2dd4bf 0%, #2dd4bf ${pctA}%, #60a5fa ${pctA}%, #60a5fa 100%)`;
  }

  const isFull = isMonday && totalBettors >= total;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">A <span className="font-bold">{countA}</span></span>
        {isMonday && (
          <span className={`text-xs ${isFull ? "font-medium text-emerald-600" : "text-slate-400"}`}>
            {totalBettors}/{total}
          </span>
        )}
        <span className="font-medium text-slate-700"><span className="font-bold">{countB}</span> B</span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: totalBettors === 0 && !isMonday ? "#e5e7eb" : gradient }}
      />
      {!isMonday && capacity != null && (
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{amountA ?? 0}/{capacity}支</span>
          <span>{amountB ?? 0}/{capacity}支</span>
        </div>
      )}
    </div>
  );
}
