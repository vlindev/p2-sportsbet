"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Calendar, ClipboardList, BarChart2, Wallet } from "lucide-react";
import { useOverdueCount } from "@/contexts/OverdueCountContext";

const navItems = [
  { href: "/members",    label: "會員",   icon: Users },
  { href: "/matches",    label: "賽事",   icon: Calendar },
  { href: "/bets",       label: "投注",   icon: ClipboardList },
  { href: "/reports",    label: "報表",   icon: BarChart2 },
  { href: "/settlement", label: "結算",   icon: Wallet },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { overdueCount } = useOverdueCount();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const showBadge = href === "/matches" && overdueCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative ${
                active ? "text-orange-500" : "text-slate-400"
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] flex items-center justify-center rounded-full">
                    {overdueCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
