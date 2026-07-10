"use client";

export type BetsLandingTab = "match-list" | "member-batch" | "member-lookup";

const TABS: { id: BetsLandingTab; label: string }[] = [
  { id: "match-list", label: "賽事總覽" },
  { id: "member-batch", label: "會員批次登錄" },
  { id: "member-lookup", label: "會員查詢" },
];

type Props = {
  activeTab: BetsLandingTab;
  onChange: (tab: BetsLandingTab) => void;
};

export default function BetsLandingTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-6 border-b border-gray-200 mb-5 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`pb-3 text-base px-1 cursor-pointer whitespace-nowrap ${
            activeTab === tab.id
              ? "border-b-2 border-orange-500 text-slate-800 font-bold"
              : "border-b-2 border-transparent text-slate-400 font-semibold hover:text-slate-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
