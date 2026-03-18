# Bets Entry + Report Redesign — Design Decisions

> Created Session 63, updated Session 64. Mockup: `3-mockup-HTML/Mockup-Bets-Entry-Report-Redesign.html` (v4)

## Status: Implementation in progress (Session 72). UIEval fixes applied. MatchHeader + ShareRatioEditor redesigned.

## Final Page Order (confirmed)

### Entry View
```
Back nav
今日賽事 dropdown label + MatchTabBar
MatchHeader
選手佔成 card (two-column A/B sub-cards, edit button)
Entry form card (封盤 button + 未投注 count in header)
  - betting_closed state: amber banner + actions inside same card
投注明細 section header
Bet columns (alternating rows, teal bg on 選手, grey 補 rows)
Pool sections
```

### Report View
```
Back nav + refresh
今日賽事 dropdown label + MatchTabBar
MatchHeader (with result banner)
選手佔成 card (locked, muted, same two-column layout)
結算明細 section header
Settlement columns (chevrons, stronger winner bg emerald-50/60)
總計 card (three metric cards + rake line + disabled export buttons)
```

## Confirmed Decisions

### E1. Form stays near top (reversed from original proposal)
- **Original proposal:** Move columns above form (see-before-act).
- **User's challenge (point 10):** Phone call workflow — bookkeeper navigates here to add a bet immediately. Landing page already provides the overview.
- **Final:** Form stays near top. The entry page is an action page, not a survey page. The bets landing page fulfills the "see" part.

### E2. No summary strip — "未投注" in form heading
- **Why:** Column headers already show A/B counts/totals. Strip was redundant. "未投注 44人" integrated into form card heading next to "新增投注".
- Optional matches: show capacity usage (A 5支 | B 3支 / 20支) instead of unbetted count.

### E3. 選手 rows — background color only
- **v2 had:** teal left border + teal bg + inter-row border.
- **User feedback:** "no need for extra thickened border line." Just different background is enough.
- **Final:** `bg-teal-50/50 rounded` only. No borders.

### E4. Amount toggle orange (was slate)
- One visual language for all toggles within the form.

### E5. Progressive disclosure removed
- All form options (member + team + amount) visible simultaneously. Confirmed by user.

### E6. 封盤 as iPhone-style toggle (v4 — replaced amber button)
- **v3:** `bg-amber-500 text-white` button in form card header. Problem: too close in color to orange 新增 button below, different height/width created visual noise.
- **Options considered:** (A) Change color to slate-700, (B) Same size as form buttons, (C) Move out of form card entirely, (D) iPhone toggle.
- **Now:** iPhone-style toggle switch in form header. OFF state: grey track + "封盤" label. ON state: amber track + "已封盤" label. Amber banner below shows 自動派注/全額降注 actions. 取消封盤 text link removed — toggling back OFF serves the same purpose.
- **Implementation note:** Toggle click STILL triggers the existing confirmation modal in both directions. The toggle is a visual change, not a workflow change.
- **betting_closed state:** amber banner + actions (自動派注/全額降注) inside the form card, form still visible below. Card border changes to `border-amber-200`.

### E7. 選手佔成 as metric card (v4 — hero percentage style)
- **v3:** Two-column A/B sub-cards with name/percentage rows. User feedback: "looks better than before but we can do even better — make it much more visually clear, just like the 總計 box."
- **Options considered:** (A) Metric card style with hero %, (B) Keep layout but add visual weight + colored accents, (C) Compact pill style.
- **Now:** Same visual language as 總計 cards. Each side is a centered card: team label on top (`text-sm`), hero percentage (`text-2xl font-bold`), player names below (`text-xs`). Edit button top-right.
- **Locked report view:** Same layout, `opacity-85`, lighter text, "已鎖定" label.
- **Placement:** Between MatchHeader and entry form.

### R1. Chevron affordance on expandable settlement rows
- Right-pointing `▸` rotates to `▾` when expanded. Non-expandable rows (external losers) have empty spacer for alignment.

### R2. Stronger winner background: emerald-50/60 (was /30)

### R3. Section headers: text-base font-bold text-slate-600

### R4. Top compact totals bar — DROPPED
- Bookkeeper verifies at bottom. Members look for their own row. No need for top headline.

### R5. Export buttons: disabled with "(即將推出)"

### R6. Bet column background: bg-slate-50/70

### R8. 總計 redesigned as three metric cards
- **Layout:** Three equal `bg-slate-50 rounded-xl` cards in a grid. Label on top (`text-sm font-medium text-slate-500`), number below (`text-2xl font-bold`), detail under that (`text-xs text-slate-400`).
- **Content:** 總投注 | A 隊 | B 隊. Rake as single line below the cards.
- **Rationale:** Verification dashboard, not hero number. Bookkeeper glances to check all numbers look right. No single metric is primary — she's sanity-checking all three equally.
- **User loved this layout.** Sub-labels needed to be bigger (fixed in v3 — moved above numbers).

### R9. 選手佔成 on report view — same card, locked
- Same two-column layout, but `opacity-85`, lighter text, "已鎖定" label instead of edit button.

### Dropdown: optgroup headers inside select (v4 — replaced external label)
- **v3:** "今日賽事" label above the `<select>` dropdown. User clarification: they meant a section header INSIDE the dropdown menu when expanded, not above it.
- **Now:** `<optgroup label="今日賽事">` groups today's matches. `<optgroup label="本週其他">` for other matches. No external label. Native HTML, no custom component needed.

### "投注明細" section header on entry view
- Added for consistency with report view's "結算明細". User wanted to try it.

### Typography accessibility (applied in v5)
- **Context:** System users are 50+ year old adults. Minimum 14px for all functional text, 16px for action buttons.
- **Audit found 12 elements below 14px.** Categorized into: (A) readable text to raise — player names under hero %, metric sub-text, expanded detail, NTD amounts, 編輯/已鎖定 labels, export buttons. (B) Badges to keep at 12px — 週一例行賽, 勝/敗, （選手）, 補. (D) Action buttons to raise to 16px — A隊/B隊, 1兩/2兩, 新增, 自動派注/全額降注.
- **New hierarchy:** T0=24px (heroes), T1=18px (match name), T2=16px (team names + all action buttons), T3=14px (everything else), T4=12px (badges only).
- **User confirmed approach.** Not yet applied to mockup.

### V5 refinements (S65)
- **"編輯" text removed** — pencil icon only (16px), with hover bg. Cleaner.
- **"選手佔成" → "選手佔成"** — renamed across both views.
- **Per-player shares** — when not 50/50, each player gets their own hero % with name below. Two sub-columns per team card (`flex justify-center gap-6`). Entry view shows 40/60 + 30/70 as example.
- **Dropdown styling** — `appearance-none` + custom SVG chevron. `px-5 py-2.5 pr-12`, arrow at `right-4`. Balanced spacing between text and arrow.

### S72. MatchHeader → Hero Matchup Layout (Option C + Position B)
- **Old:** Match name biggest, 3-column team row (A | handicap | B), separate 選手佔成 card below.
- **New:** Hero layout — player names biggest, directional handicap centered (讓1點 → / ← 讓2洞 / 平盤), team labels below. Match name inline with badges. Card has 3 zones: header (badges/name/date) → matchup (hero) → footer (選手佔成).
- **Why:** Two cards (MatchHeader + 選手佔成) competed for attention. Merging into one card with clear hierarchy eliminates redundancy. Player names are what the bookkeeper recognizes, not the match name.
- **Directional handicap:** Arrow points from giving team to receiving team. 平盤 has no arrow (symmetrical = no advantage). Replaces "vs" + separate handicap line.
- **Explored and rejected:** Option A (vertical stack — too tall), Option B (split card — too much visual weight), Option D (same layout reweighted — doesn't solve redundancy), inline row under teams (messy, cluttered hero).

### S72. 選手佔成 — Footer Section (Display Option 2)
- **Old:** Separate card with butterfly bars (or metric cards).
- **New:** One-line footer inside MatchHeader card. `選手佔成　64/36 · 50/50` + 編輯 button. No "A隊"/"B隊" labels — order matches hero layout above (left=A, right=B). Percentage order matches player name order in header.
- **Conditional emphasis:** 50/50 → muted `text-slate-400`. Non-default → `text-slate-800 font-semibold`.
- **Explored and rejected:** Inline badges next to player names (noisy at 50/50), slim collapsible row (still two cards), merged card with conditional butterfly (butterfly redundant at 50/50), shrink butterfly (doesn't fix redundancy), percentage row under team labels (cluttered hero).

### S72. 選手佔成 — Inline Edit (Approach 1)
- **Old:** Separate edit card with presets, slider metaphor, swap button, estimate line — too complex for typing a number.
- **New:** Footer expands to show two rows (A/B), each with: team label, player 1 name, input box %, slash, auto-calculated %, player 2 name. Both teams editable simultaneously. 儲存/取消 top-right.
- **Validation:** R17.11 auto-adjusts on save + temporary toast (8s): "選手曝險不得低於20兩，佔成已調整至最近整數". No permanent banner.
- **Explored and rejected:** Stacked slider bar (visual but over-engineered), mini cards side-by-side (took too much space), inline within header card (header too tall during editing), preset chips (good but Approach 1 was simpler).

### S72. UIEval Fixes — 5 Screens Implemented
- **Screen 1 (確認封盤):** Match name moved into summary card. Imbalance badge (amber >5兩, green ≤5兩). Buttons `text-base`.
- **Screen 2 (確認自動派注):** Same header cleanup. Text → "未投注會員自動派注1兩（系統分配）". Zero-state: green message + 關閉 button. Non-zero: count + expandable member list + team balance + dynamic button.
- **Screen 3 (投注明細):** Toast moved from fixed overlay to inline banner. Player divider "選手 ↑ · 投注 ↓" between self-bets and regular bets.
- **Screen 4 (全額降注):** Warning → "此操作無法還原，需逐筆修改。" Member preview panel showing affected names per team.
- **Screen 5 (選手佔成):** Absorbed into MatchHeader footer (see above).

### S72. Edit Toast Format (Option C)
- **Old:** Single comma-separated line listing every change by name.
- **New:** Grouped summary: "已調整金額 5 筆 · 已換隊 2 筆". Orange highlight on affected rows extended to 5s.

## Open / Still Under Review
- **Sporadic pool edit mode** — deferred, discuss when ready.
- **Post-自動派注 verification** — may need count mechanism.
- **Export buttons** — still placeholder.

## Questions Resolved
1. ~~Progressive disclosure removal~~ → Yes, remove (confirmed)
2. ~~Report compact totals bar content~~ → Dropped entirely
3. ~~Optional match summary strip~~ → Show capacity usage
4. ~~Disabled submit hint text~~ → Skip (confirmed)
