# Unified Implementation Plan — Fix Now (Part 2 of 2)

Groups 5–7. See Part 1 for Groups 1–4.

---

## Group 5: MatchSettlementReport.tsx

**🟠-2 | Billing config not found → settlement silently omitted**
- File: `src/components/Bets/MatchSettlementReport.tsx:51,65,97`
- Fix: Add `billingError` state. Set `true` when `billingRes.error` fires. In render, when `hasResult && !billingConfig`:
  ```tsx
  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 my-4">
    無法載入費率設定，結算無法計算
  </div>
  ```
- Depends on: Nothing
- Size: S

**🟠-3 | Shares missing → wrong settlement silently**
- File: `src/components/Bets/MatchSettlementReport.tsx` (after shares split, before settlement calc ~line 96)
- Fix: Validate shares before computing settlement:
  ```ts
  function sharesValid(shares: MatchTeamPlayerShare[]): boolean {
    for (const side of ["A", "B"] as const) {
      const ss = shares.filter(s => s.match_side === side);
      if (ss.length === 0) return false;
      if (ss.reduce((s, r) => s + r.share_bps, 0) !== 10_000) return false;
    }
    return true;
  }
  ```
  Guard settlement computation: `if (hasResult && billingConfig && sharesValid(baseShares))`.
  When shares invalid, show same style error banner: "分潤資料異常，結算無法計算".
  Apply same check to each pool's shares before computing pool settlement.
- Depends on: Nothing
- Size: M

**🟡-4 | No report refresh mechanism**
- File: `src/components/Bets/MatchSettlementReport.tsx`
- Fix: Extract `load()` from `useEffect` to a stable `useCallback`. Add refresh button near back arrow:
  ```tsx
  <button onClick={() => load()} className="text-sm text-slate-400 hover:text-orange-500 cursor-pointer ml-2">
    重新載入
  </button>
  ```
- Depends on: Nothing
- Size: S

**🟡-5 | Active match: no settlement pending indicator**
- File: `src/components/Bets/MatchSettlementReport.tsx` (after SettlementSection, before SettlementSummary)
- Fix: When `!hasResult`, show info banner:
  ```tsx
  {!hasResult && (
    <div className="text-center text-sm text-slate-400 py-4 mt-2 bg-slate-50 rounded-lg">
      比賽進行中，結算待結果輸入後計算
    </div>
  )}
  ```
- Depends on: Nothing
- Size: S

**🔵-3 | Voided pool renders with no visual state**
- File: `src/components/Bets/MatchSettlementReport.tsx:72`
- Fix: Add `'voided'` to the pool filter:
  `.filter((p: SporadicPool) => p.result !== "cancelled" && p.result !== "voided")`
- Depends on: Nothing
- Size: S

---

## Group 6: MatchBetEntry.tsx + PoolBetSection.tsx

Three items affect the same code paths in both files. Implement in this order.

**🟡-3 | Duplicate bet pre-check**
- Files: `src/components/Bets/MatchBetEntry.tsx:81`, `src/components/Bets/PoolBetSection.tsx:56`
- Fix: At top of `addBet()`, before any insert:
  ```ts
  const { data: dup } = await supabase.from("bets").select("id")
    .eq("match_id", matchId).eq("member_id", entryMemberId)
    .eq("bet_type", "voluntary").eq("status", "active")
    .is("sporadic_pool_id", null).limit(1);
  if (dup && dup.length > 0) {
    setSaveError("此會員已有此場投注"); setSaving(false); return;
  }
  ```
  PoolBetSection: use `.eq("sporadic_pool_id", pool.id)` instead of `.is(null)`.
- Depends on: Nothing
- Size: S (same pattern, both files)

**🟠-5 | Check existing bet_request before creating (quick mitigation)**
- Files: `src/components/Bets/MatchBetEntry.tsx:84`, `src/components/Bets/PoolBetSection.tsx:67`
- Fix: Before `bet_requests` insert, check for existing accepted request:
  ```ts
  const { data: existReq } = await supabase.from("bet_requests").select("id")
    .eq("match_id", matchId).eq("member_id", entryMemberId)
    .eq("bet_type", "voluntary").eq("status", "accepted")
    .is("sporadic_pool_id", null).limit(1);
  if (!existReq || existReq.length === 0) {
    const { error: reqErr } = await supabase.from("bet_requests").insert({...});
    if (reqErr) { setSaveError("儲存失敗"); setSaving(false); return; }
  }
  ```
  PoolBetSection: use `.eq("sporadic_pool_id", pool.id)` instead of `.is(null)`.
- Depends on: 🟡-3 (runs after duplicate check passes)
- Size: S (same pattern, both files)

**🟡-1 | Clean up bet_request on bet deletion**
- Files: `src/components/Bets/MatchBetEntry.tsx:100-106`, `src/components/Bets/PoolBetSection.tsx:86-92`
- Fix: Change `removeBet(betId)` to `removeBet(bet)` (pass full bet object). After successful bet delete:
  ```ts
  await supabase.from("bet_requests").delete()
    .eq("match_id", matchId).eq("member_id", bet.member_id)
    .eq("bet_type", bet.bet_type).eq("status", "accepted")
    .is("sporadic_pool_id", null);
  ```
  PoolBetSection: use `.eq("sporadic_pool_id", pool.id)` instead of `.is(null)`.
  Update the `removeBet` call sites to pass the full bet object.
- Depends on: Nothing
- Size: M (both files, signature change + call site updates)

---

## Group 7: settlement-helpers.ts

**🟠-6 | JS Date month-end overflow in toBillingConfig**
- File: `src/components/Bets/settlement-helpers.ts:8-9`
- Fix: Replace JS Date arithmetic with explicit month/year calculation:
  ```ts
  const [y, m, d] = row.contract_start_date.split("-").map(Number);
  const totalMonths = (y * 12 + (m - 1)) + row.free_period_months;
  const endY = Math.floor(totalMonths / 12);
  const endM = (totalMonths % 12) + 1;
  const lastDay = new Date(endY, endM, 0).getDate();
  const endD = Math.min(d, lastDay);
  const endDate = `${endY}-${String(endM).padStart(2,"0")}-${String(endD).padStart(2,"0")}`;
  ```
  Replace `start.setMonth(...)` / `start.toISOString().slice(0,10)` with `endDate`.
- Depends on: Nothing
- Size: S
