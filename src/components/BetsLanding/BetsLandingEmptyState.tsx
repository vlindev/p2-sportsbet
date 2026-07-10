"use client";

export default function BetsLandingEmptyState() {
  return (
    <div className="p-6 pt-10 min-h-screen max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">投注管理</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-6">
        <p className="text-base font-semibold text-slate-700 mb-1">目前沒有開放投注的賽事</p>
        <p className="text-sm text-slate-400 mb-4">可投注賽事只包含尚未開賽的賽事與已封盤賽事。</p>
        <button
          onClick={() => window.location.href = "/matches"}
          className="text-base font-medium text-orange-500 hover:text-orange-600 cursor-pointer"
        >
          前往賽事管理 →
        </button>
      </div>
    </div>
  );
}
