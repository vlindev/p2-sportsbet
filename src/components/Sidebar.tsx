"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Calendar, ClipboardList, BarChart2, Wallet } from "lucide-react";
import { useOverdueCount } from "@/contexts/OverdueCountContext";

const navItems = [
  { href: "/members",    label: "會員名冊", icon: Users },
  { href: "/matches",    label: "賽事管理", icon: Calendar },
  { href: "/bets",       label: "投注登錄", icon: ClipboardList },
  { href: "/reports",    label: "每週報表", icon: BarChart2 },
  { href: "/settlement", label: "月度結算", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { overdueCount } = useOverdueCount();

  return (
    <aside className="hidden md:flex w-56 bg-slate-900 text-white flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="text-lg font-bold tracking-wide text-white">Casino</div>
        <div className="text-sm text-slate-400 mt-0.5">高爾夫球隊管理系統</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const showBadge = href === "/matches" && overdueCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-orange-500 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {label}
              {showBadge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                  {overdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-600">
        會計管理後台
      </div>
    </aside>
  );
}
