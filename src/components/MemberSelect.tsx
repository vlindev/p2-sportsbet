"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

type Member = { id: string; name: string; active: boolean };

type Props = {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  exclude?: string[];
  dayExclude?: string[];
  betExclude?: string[];
  error?: boolean;
};

export default function MemberSelect({
  members,
  value,
  onChange,
  placeholder = "選擇球員",
  exclude = [],
  dayExclude = [],
  betExclude = [],
  error = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = members.find((m) => m.id === value);

  const filtered = members.filter(
    (m) =>
      m.active &&
      m.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer bg-white transition-colors ${
          error
            ? "border-red-400 ring-2 ring-red-100 hover:border-red-400"
            : "border-gray-200 hover:border-orange-400"
        }`}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected ? selected.name : placeholder}
        </span>
        {value ? (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-slate-300 hover:text-slate-500 cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="text-slate-400" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋姓名..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">找不到符合的會員</p>
            ) : (
              filtered.map((m) => {
                const isExcluded = exclude.includes(m.id);
                const isDayExcluded = !isExcluded && dayExclude.includes(m.id);
                const isBetExcluded = !isExcluded && !isDayExcluded && betExclude.includes(m.id);
                const isDisabled = isExcluded || isDayExcluded || isBetExcluded;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(m.id);
                        setOpen(false);
                        setQuery("");
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isDisabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "hover:bg-orange-50 text-slate-800 cursor-pointer"
                    }`}
                  >
                    {m.name}
                    {isExcluded && <span className="text-xs text-slate-300 ml-1.5">已選</span>}
                    {isDayExcluded && <span className="text-xs text-slate-300 ml-1.5">已排賽</span>}
                    {isBetExcluded && <span className="text-xs text-slate-300 ml-1.5">已投注</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
