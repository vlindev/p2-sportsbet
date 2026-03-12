# Unified Implementation Plan — Fix Now (Part 1 of 2)

Source: UI audit (S51) + Backend audit (S52). See audit files for full context.
Items ordered by dependency then by file. Run `tsc --noEmit` after each group.

Groups 1–4 in this file. Groups 5–7 in Part 2.

---

## Group 1: SQL Migration (run in Supabase first)

**🔴-3 | Pool RPCs hardcode 'bookkeeper' as performed_by**
- Files: New migration SQL (updates `submit_pool_result` + `correct_pool_result`)
- Fix: Add `p_performed_by TEXT` parameter to both functions. Replace all hardcoded `'bookkeeper'` in `INSERT INTO audit_log` with `p_performed_by`. Update all client `.rpc()` calls to pass `'bookkeeper'` as argument.
- Depends on: Nothing (must run before client code changes that call these RPCs)
- Size: M

---

## Group 2: BettingActions.tsx

**🔴-1 | Auto-placement includes pool bets in "has bet" check**
- File: `src/components/Bets/BettingActions.tsx:66-68`
- Fix: Add `.is("sporadic_pool_id", null)` to the fetch in `runAutoPlacement()`:
  `.from("bets").select("member_id, team_bet_on, amount_liang").eq("match_id", matchId).eq("status", "active").is("sporadic_pool_id", null)`
- Depends on: Nothing
- Size: S

**🔴-2 | Bulk reduction mutates immutable requested_amount**
- File: `src/components/Bets/BettingActions.tsx:119-125`
- Fix: Remove `requested_amount: 1` from the bet_requests update. Keep only `accepted_amount: 1`:
  `.update({ accepted_amount: 1 })`
- Depends on: Nothing
- Size: S

---

## Group 3: ReportBetColumn.tsx

**UI-1 | Bets not sorted by type**
- File: `src/components/Bets/ReportBetColumn.tsx:67`
- Fix: Before the `.map()`, sort `sideBets`:
  ```ts
  const TYPE_ORDER: Record<string, number> = {
    mandatory_self: 0, voluntary: 1, mandatory_monday: 2,
  };
  const sorted = [...sideBets].sort((a, b) => {
    const t = (TYPE_ORDER[a.bet_type] ?? 1) - (TYPE_ORDER[b.bet_type] ?? 1);
    if (t !== 0) return t;
    return b.amount_liang - a.amount_liang; // within voluntary: amount desc
  });
  ```
  Replace `sideBets.map(...)` with `sorted.map(...)`.
- Depends on: Nothing
- Size: S

**UI-2 | Badge rule: show 補 only, left of amount**
- File: `src/components/Bets/ReportBetColumn.tsx:68-84`
- Fix: Two changes in the bet row render:
  1. Move badge BEFORE the amount span (swap line order)
  2. Only render for `mandatory_monday`:
     ```tsx
     {!isPool && bet.bet_type === "mandatory_monday" && (
       <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">補</span>
     )}
     ```
  Remove the generic `BET_TYPE_LABEL`/`BET_TYPE_STYLE` badge block entirely.
- Depends on: Nothing
- Size: S

**UI-3 | Auto-placed bet rows not greyed out**
- File: `src/components/Bets/ReportBetColumn.tsx:69,72`
- Fix: Add `mandatory_monday` check to both name and amount text color:
  - Name: `bet.bet_type === "mandatory_monday" ? "text-slate-400" : isLoser ? "text-slate-400" : "text-slate-700"`
  - Amount: `bet.bet_type === "mandatory_monday" ? "text-slate-400" : isWinner ? "text-emerald-600" : isLoser ? "text-slate-400" : "text-slate-700"`
- Depends on: Nothing
- Size: S

---

## Group 4: ShareRatioEditor.tsx

**UI-4 | "已鎖定" in report view**
- File: `src/components/Bets/ShareRatioEditor.tsx`
- Fix: Verify whether "已鎖定" text or badge is rendered for completed matches. If present, remove it. The locked state should only hide the edit pencil (already does). Ensure muted styling for completed match context — no badge, no edit button, just the compact ratio display.
- Depends on: Nothing
- Size: S

**🟠-1 | Share partial write → post-write verification**
- File: `src/components/Bets/ShareRatioEditor.tsx:84-112` (inside `saveEdit()`)
- Fix: After both `.update()` calls (lines 84-89), add verification:
  ```ts
  // Verify invariant
  const { data: verify } = await supabase.from("match_team_player_shares")
    .select("share_bps").eq("match_id", matchId).eq("match_side", editingSide)
    .eq("context", context);
  const sum = (verify || []).reduce((s, r) => s + r.share_bps, 0);
  if (sum !== 10_000) {
    // Rollback: restore original values
    await supabase.from("match_team_player_shares")
      .update({ share_bps: ss[0].share_bps, pre_adjustment_bps: null }).eq("id", ss[0].id);
    await supabase.from("match_team_player_shares")
      .update({ share_bps: ss[1].share_bps, pre_adjustment_bps: null }).eq("id", ss[1].id);
    console.error("Share invariant violated:", sum);
    // Show error to user (add setSaveError state if not present)
    setSaving(false); return;
  }
  ```
  Insert between the second update (line 89) and the R17.11 check (line 93).
- Depends on: Nothing
- Size: M
