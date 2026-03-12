"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type OverdueCountContextValue = {
  overdueCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const OverdueCountContext = createContext<OverdueCountContextValue | null>(null);

export function OverdueCountProvider({ children }: { children: React.ReactNode }) {
  const [overdueCount, setOverdueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkOverdue = useCallback(async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const { count, error: queryError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lt("date", today);
    if (queryError) {
      console.error("Overdue count query failed:", queryError);
      setError("無法取得逾期賽事數量");
    } else {
      setOverdueCount(count ?? 0);
      setError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkOverdue();
    const interval = setInterval(checkOverdue, 60_000);
    return () => clearInterval(interval);
  }, [checkOverdue]);

  return (
    <OverdueCountContext.Provider value={{ overdueCount, isLoading, error, refetch: checkOverdue }}>
      {children}
    </OverdueCountContext.Provider>
  );
}

export function useOverdueCount(): OverdueCountContextValue {
  const context = useContext(OverdueCountContext);
  if (!context) {
    throw new Error("useOverdueCount must be used within an OverdueCountProvider");
  }
  return context;
}
