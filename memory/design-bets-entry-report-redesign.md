# Bets Entry + Report Redesign — Design Decisions

> Created Session 63, updated Session 64. Mockup: `3-mockup-HTML/Mockup-Bets-Entry-Report-Redesign.html` (v4)

## Status: Mockup v4. Typography audit completed — fixes approved, not yet applied. Next: apply typo fixes → continue review.

## Final Page Order (confirmed)

### Entry View
```
Back nav
今日賽事 dropdown label + MatchTabBar
MatchHeader
分潤比例 card (two-column A/B sub-cards, edit button)
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
分潤比例 card (locked, muted, same two-column layout)
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

### E7. 分潤比例 as metric card (v4 — hero percentage style)
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

### R9. 分潤 on report view — same card, locked
- Same two-column layout, but `opacity-85`, lighter text, "已鎖定" label instead of edit button.

### Dropdown: optgroup headers inside select (v4 — replaced external label)
- **v3:** "今日賽事" label above the `<select>` dropdown. User clarification: they meant a section header INSIDE the dropdown menu when expanded, not above it.
- **Now:** `<optgroup label="今日賽事">` groups today's matches. `<optgroup label="本週其他">` for other matches. No external label. Native HTML, no custom component needed.

### "投注明細" section header on entry view
- Added for consistency with report view's "結算明細". User wanted to try it.

### Typography accessibility (v4 audit — approved, not yet applied)
- **Context:** System users are 50+ year old adults. Minimum 14px for all functional text, 16px for action buttons.
- **Audit found 12 elements below 14px.** Categorized into: (A) readable text to raise — player names under hero %, metric sub-text, expanded detail, NTD amounts, 編輯/已鎖定 labels, export buttons. (B) Badges to keep at 12px — 週一例行賽, 勝/敗, （選手）, 補. (D) Action buttons to raise to 16px — A隊/B隊, 1兩/2兩, 新增, 自動派注/全額降注.
- **New hierarchy:** T0=24px (heroes), T1=18px (match name), T2=16px (team names + all action buttons), T3=14px (everything else), T4=12px (badges only).
- **User confirmed approach.** Not yet applied to mockup.

## Open / Still Under Review
- **Typography fixes** — approved by user, need to be applied to mockup v4.
- **Ongoing mockup review** — user may have more feedback after typo fixes are applied.
- **No implementation yet** — still in SIP Step 4 (Mockup review).

## Questions Resolved
1. ~~Progressive disclosure removal~~ → Yes, remove (confirmed)
2. ~~Report compact totals bar content~~ → Dropped entirely
3. ~~Optional match summary strip~~ → Show capacity usage
4. ~~Disabled submit hint text~~ → Skip (confirmed)
