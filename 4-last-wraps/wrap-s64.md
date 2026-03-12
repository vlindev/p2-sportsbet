# Last Wrap — Session 64 (2026-03-12)

## Duration: 4h 6m

## What Was Done

### Mockup v3 → v4 (3 feedback items)

1. **今日賽事 dropdown** — S63 request was misunderstood. User wanted `<optgroup>` section headers *inside* the dropdown menu, not a label above it. Fixed: `<optgroup label="今日賽事">` + `<optgroup label="本週其他">`. External label removed.

2. **分潤比例 card → metric card style** — user wanted it as visually clear as 總計. Options: (A) metric card with hero %, (B) current + visual weight, (C) compact pills. **Chosen: A.** Centered team label, hero `50%`, player names below. Matches 總計 visual language.

3. **封盤 button → iPhone toggle** — amber button too similar to orange 新增, different sizing = visual noise. Options: (A) change color to slate, (B) same size in row, (C) move out of card. **User proposed: iPhone toggle.** Grey OFF / amber ON. Confirmation modal still triggers — noted for implementation.

### Typography Accessibility Audit

Users are 50+ year old adults. 14px minimum functional text, 16px action buttons. Full audit found **12 elements below 14px:**
- **Category A (raise to 14px):** player names under heroes, metric sub-text, 編輯, 已鎖定, expanded detail, NTD amounts, export buttons
- **Category B (keep 12px):** badges — 週一, 勝/敗, （選手）, 補
- **Category D (raise to 16px):** A隊/B隊, 1兩/2兩, 新增, 自動派注/全額降注

New hierarchy: T0=24px heroes, T1=18px match name, T2=16px team names + all buttons, T3=14px everything else, T4=12px badges only. **Approved, NOT yet applied to mockup.**

### New Codewords: `typoaudit` + `uieval`

Both use **split pattern**: short pointer in CLAUDE.md, full rubric in `~/.claude/codewords/`. Loaded only on trigger.
- `typoaudit` — typography accessibility audit (5-section analysis)
- `uieval` — professional UX/UI design critique (6 dimensions + priority fixes)

### Cross-Device Sync (major infrastructure)

User's MacBook arrives tomorrow. Discovered `~/.claude/` (all codewords, permissions, 60+ sessions of memory) was local with no backup.

**Built:**
- `~/.claude/` git repo → `github.com:vlindev/claude-config` (private)
- `.gitignore` whitelist: 16 essential files (~188KB) tracked, 325MB transient excluded
- `wrap` updated: now syncs `~/.claude/` AND project repo
- `ready` updated: pulls `~/.claude/` before reading memory
- `~/Desktop/projects/macbook-setup-guide.md` — 11-phase setup guide (merged with earlier guide)

**Tracked:** CLAUDE.md, settings.json, settings.local.json, codewords/*.md, plans/*.md, plugins/installed_plugins.json, projects/*/memory/*.md, projects/*/session-log.md

### Preferences Captured
- **Proactive risk identification** — `feedback_proactive_risk.md`. Flag single-point-of-failure risks to workflow immediately.

## Decisions
1. **今日賽事 = optgroup inside dropdown** — not external label (S63 misunderstanding corrected)
2. **分潤比例 = metric card style (Option A)** — hero % centered, same visual language as 總計
3. **封盤 = iPhone toggle** — OFF grey / ON amber. Confirmation modal preserved.
4. **Typography: 14px floor for readable text, 12px for badges only, 16px for action buttons** — approved
5. **Codeword split pattern** — short pointer in CLAUDE.md, full rubric in ~/.claude/codewords/
6. **~/.claude/ backed up to GitHub** — wrap auto-pushes, ready auto-pulls
7. **MacBook username MUST be `veronicalin`** — paths are keyed by full filesystem path

## Still Open
- **Apply typography fixes to mockup v4** — approved but not yet applied
- **Continue mockup review** — may have more feedback after typo fixes
- **No implementation yet** — SIP Step 4 (Mockup review)

## Files Changed This Session
1. `3-mockup-HTML/Mockup-Bets-Entry-Report-Redesign.html` — v3→v4
2. `memory/design-bets-entry-report-redesign.md` — v4 decisions + typo audit
3. `~/.claude/CLAUDE.md` — typoaudit/uieval split, wrap/ready sync
4. `~/.claude/codewords/typoaudit.md` — created
5. `~/.claude/codewords/uieval.md` — created
6. `~/.claude/.gitignore` — created
7. `~/.claude/projects/.../memory/feedback_proactive_risk.md` — created
8. `~/Desktop/projects/CODEWORDS.md` — uieval + typoaudit rubric pointers
9. `~/Desktop/projects/macbook-setup-guide.md` — created + merged

## Session Log Entry
| 64 | 2026-03-12 | 4h 6m | Mockup v4: 今日賽事 optgroup inside dropdown (S63 fix), 分潤比例 metric card with hero %, 封盤 iPhone toggle. Typography audit: 12 below-floor items categorized, 14px/16px floor approved (not yet applied). New codewords: typoaudit + uieval (split pattern — rubrics in ~/.claude/codewords/). Major: ~/.claude/ backed up to GitHub (claude-config repo), wrap/ready auto-sync added, macbook-setup-guide.md created. |
