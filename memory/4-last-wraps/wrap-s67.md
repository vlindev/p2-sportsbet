# Last Wrap — Session 67 (2026-03-13)

## Duration: 1h 28m

## What Was Done

### Bug Fixes (2)
1. **Back navigation from 已完成 tab** — clicking 查看投注 → 返回賽事 landed on 當前賽事 instead of 已完成. Root cause: matches page read `?tab=` only in useState initializer (runs once on mount). Next.js client-side navigation reused cached component without remounting. Fix: added `useSearchParams()` + `useEffect` sync + `<Suspense>` wrapper.
2. **分潤異常 on all completed matches** — `sharesValid()` returned false because `match_team_player_shares` rows didn't exist. Root cause: share auto-population code (Session 29-30) was added after these matches were created. Test data SQL also lacked share rows. Fix: universal backfill SQL (all matches without shares got 50/50 default rows), updated `test-data.sql`.

### New Rule: Data Migration Rule
Added to project CLAUDE.md. When adding code that auto-populates companion data at creation time, check whether existing records lack that data. Write backfill SQL + update test-data.sql.

### SIP Step 7 — Visual Sanity Check Items (7 items)
1. ✅ **Removed "已鎖定"** from ShareRatioEditor locked state — noise, implied by match being over
2. ✅ **Removed TEST/STRESS prefixes** from member names in SQL files + ran DB update
3. ✅ **1兩/2兩 always visible** in entry form — removed `entryTeam &&` gate
4. ✅ **封盤 modal explanation** — added "封盤後會員無法自行下注，管理人員仍可新增或修改。"
5. ✅ **自動派注 confirmation modal** — new modal with match name, explanation text, unbetted count
6. 🔄 **Pencil edit mode overhaul** — made visually obvious (orange border/bg, "編輯中" badge, solid pencil). Added change tracking + summary toast on exit. Implemented mandatory_monday team swap (converts to voluntary). Then implemented Option B (inline row expansion) — **user disliked it, needs redesign next session.**
7. ✅ **Hover highlight** — changed from `hover:bg-slate-100/60` to `hover:bg-blue-50`

### Codeword Updates
- `ready` — added step 5: memory health check (flag files near/over 200 lines, recommend bonsai)
- `reboot` — updated reference to match new ready step count

## Decisions

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | mandatory_self: locked, no edit controls | R7.3 — MUST NOT be modified |
| 2 | mandatory_monday: no deletion in edit mode | After 自動派注, bookkeeper's mental model is "everyone covered." Deletion silently breaks that invariant. |
| 3 | mandatory_monday team swap → converts to voluntary | No longer auto-placed after bookkeeper intervention. bet_type, attribution updated. "補" badge removed. |
| 4 | Option B inline expansion: NOT approved | User disliked it. Needs full redesign discussion next session. |
| 5 | Data Migration Rule added to CLAUDE.md | Prevent recurrence of missing companion data on pre-existing records. |

## Feedback Captured
- `feedback_no_time_estimates.md` — never fabricate time estimates; describe actual scope instead
- "Success. No rows returned" = standard SQL INSERT output — not ambiguous, don't ask for verification

## Next Session — Must Discuss First (documented in CLAUDE.md)
1. **Edit mode UX redesign** — what should show when pencil is clicked?
2. **uieval** on two screenshots (user will share)
3. **Post-自動派注 workflow** — how bookkeeper confirms all members have bets after a correction
4. **Sporadic pool section review** — flag issues

## Files Changed
1. `src/app/matches/page.tsx` — useSearchParams + Suspense wrapper for tab sync
2. `src/components/Bets/ShareRatioEditor.tsx` — removed 已鎖定
3. `src/components/Bets/MatchBetEntry.tsx` — amount always visible, auto-place modal, edit mode overhaul (Option B — not approved), hover fix, team swap, change tracking
4. `src/components/CloseBettingModal.tsx` — explanation text
5. `test-data.sql` — added share rows, removed TEST prefix
6. `stress-test-bets.sql` — removed STRESS prefix
7. `CLAUDE.md` (project) — Data Migration Rule + next session discussion items
8. `~/.claude/CLAUDE.md` (global) — ready step 5 memory health check, reboot reference update
9. `~/.claude/projects/.../memory/feedback_no_time_estimates.md` (created)
10. `~/.claude/projects/.../memory/MEMORY.md` (updated: bet editing decision, feedback index)

## Session Log Entry
| 67 | 2026-03-13 | 1h 28m | SIP Step 7: fixed back-nav from completed tab + 分潤異常 (missing shares backfill). 7 visual/UX items: removed 已鎖定, removed TEST/STRESS prefixes, 1兩/2兩 always visible, 封盤+自動派注 confirmation modals, edit mode overhaul (Option B not approved — needs redesign). Data Migration Rule added. Ready codeword now checks memory health. |
