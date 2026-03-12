# Last Wrap — Session 57–58 (2026-03-11)

## Duration: ~2h 49m (S57 ran out of context, S58 continued seamlessly)

## What Was Done

**No code written. Pure design iteration — bets page landing mockup v3→v6, full UX critique, v7 changes decided.**

### 1. Mockup iteration (v3 → v6)
Starting from v3 (built in S57), iterated through decisions:
- **v4:** Dropped all 3 sort modes (最近優先/急迫優先/最遠優先). 7-9 matches fit one screen — sorting adds complexity without value.
- **v5:** Removed aggregates card (replaced with slim status line: `已封盤 X/9 · 已派注 X/7`). Removed 封盤 pill from match names. Added team labels to player names. Split member tab bet count (`週一 5/7 場 · 熱身 1/1 場`). Neutral "新增 →" for optional unbetted matches.
- **v6:** `例行` badge → `週一`. Player separator `vs` → fullwidth `｜` for readability next to Latin letters.

### 2. UX/UI design critique
Full professional critique across 5 dimensions (information architecture, visual hierarchy, clarity/cognitive load, consistency, actionability). Key findings:
- Font sizes too small for 50+ target user (text-xs = 12px throughout)
- Progress number (text-lg bold) visually outranks match name (text-sm bold) — inverted hierarchy
- 封盤 status relies on barely-visible amber tint — weakest signal for most important distinction
- Team balance amount row redundant (count alone answers "is this balanced?")
- No row navigation affordance (no chevron, cursor:pointer only)
- Action buttons (封盤) undersized for Fitts's Law compliance

### 3. Action items decided (N1-N6 + M1-M5)
**NEEDED (all confirmed):**
- N1: Font floor 14px, action buttons 16px, match name text-base. 4-tier typography hierarchy
- N2: Drop amount row from team balance (keep count only)
- N3: 3px amber left border on 封盤 rows + keep mild amber tint
- N4: Progress number demoted from text-lg to text-base
- N5: Chevron `›` in match info column, every row
- N6: 封盤 = outlined amber button, 自動派注 = outlined blue, 取消封盤 = text-sm link

**MAYBE (all confirmed):**
- M1: Keep 週一 badge. M2: Toggle into quick actions bar. M3: min-height. M4: Truncate fallback. M5: Keep interaction distinction.

## What's Next (Session 59)
1. Update mockup to v7 — apply all 13 changes
2. Visual review of v7
3. Once approved → SIP Step 5 → Step 6 (Implementation)
