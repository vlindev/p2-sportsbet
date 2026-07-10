# Last Wrap — Session 86 (2026-07-10/11) — ★ PIVOT SESSION ★

**Duration:** 5h 37m
**Type:** Strategic + deliverable. No production code written. One canonical rule edited. Major project direction change.
**Headline:** External engineering team onboarded → system being rebuilt as "2.0" → authored a complete bilingual URD (User Requirements Document) as the handoff spec.

---

## 0. Why this session matters

This is the session the project turned a corner. For ~85 sessions Veronica built solo and stalled short of launch. This session she (a) named the bottleneck, (b) brought on a team to break it, and (c) produced the artifact that hands the build off. Everything below is the record of that turn. If you read one thing before the next session, read §2 (the strategic reframe) and §5 (the URD decisions) — they define the new direction and supersede the old solo pre-launch roadmap.

---

## 1. Full context reload (start of session)

At Veronica's explicit instruction, I read **all 89 memory/rules/wrap/schema files in full**, deliberately bypassing the project's three-tier "grep-only, never read canonical in full" protocol. Rationale accepted: an explicit in-conversation instruction from the decision authority overrides a standing default; no file edit to CLAUDE.md required. Files read: canonical R1–R29 (index + master + 7 clusters), all 9 RPC SQL files, 3 schema CSV exports, all feedback/design/plan/presentation memory files, 15 rolling wraps (s71–s85), 0-memory, session-log, both auto-memory MEMORY files + backups. Context peaked ~61% of the 1M window — confirming that earlier-session misreads were judgment errors, not context saturation.

**Correction of my own earlier behavior this session:** I twice misread Veronica (guessed she'd "half-admit" something; over-explained after being told to be concise). She pushed back both times, correctly. Captured as feedback (see §9).

---

## 2. The strategic conversation — bottleneck, team, reframe

### 2a. The bottleneck (diagnosed and agreed)
Working solo, Veronica's systems-rigor optimized for **correctness of the parts she found intellectually elegant** — the settlement engine was re-audited across S52/S75/S80/S84/S85 — while the actual **launch-blockers stayed unbuilt** across ~85 sessions: weekly report (Step 6), monthly settlement UI (Step 7), auth (Step 9), all still unstarted. The safety energy flowed to the interesting problem (settlement atomicity, already largely handled by RPCs) rather than the genuinely dangerous one (permissive `allow_all` RLS, no auth — flagged as the #1 real risk in her own S84 advisor doc). Root cause: **no forcing function in a solo project**; self-imposed deadlines slipped without consequence; "more correct" always felt more responsible than "ship imperfect." She had diagnosed this herself in S83 and the correction didn't hold — evidence the pull is structural, not willpower.

### 2b. The breakthrough
She brought on an **external engineering team**: 7+ years in the betting/gambling industry, have shipped real products, working **for free**. They want to rebuild the system fresh ("2.0"), using her existing build only as a behavioural/UX reference (not porting the code) — their reasoning: easier to build fresh their own way than inherit a solo-built codebase. She was never going to fight the rewrite.

### 2c. The reframe (the durable insight)
- The rewrite is correct: **the value was never the code** (her own architecture brief says so — replacement cost is in the constraint graph, not the source). Don't defend 85 sessions of code as sunk cost.
- **Freeze the product** — the concept is at ~70–80%, "good enough for v1." Refining it further without users is the architecture trap in a new costume. "We never know if we never ship."
- **Asymmetric correctness rule:** ship the *product* imperfect and iterate, but the *money math must be right on day one* — a wrong payout is irreversible loss of trust with 85 people who know her mother. Her instinct to over-invest in the settlement engine was correct *for that one layer*; the mistake was being rigorous everywhere instead of rigorous-where-it-counts + shippable-everywhere-else.
- **Her new role = domain authority / oracle**, not builder. The one person who owns what "correct" and "useful" mean for this specific club. This is the version of ownership that finally escapes the identity trap that stalled her.
- **Constraint vs conviction:** every "deferred / manual / Phase 2 / workaround" in the old build was a fossil of *what she couldn't build alone*, not *what she decided was right*. With a capable team, the constraint-driven decisions reopen; the conviction-driven ones (the domain rules, workflow, transparency principle) stay locked.
- **Guard against a new trap:** having a team ≠ opening a wishlist Pandora's box. The free team's time is the scarcest, most fragile resource — ruthless prioritization matters *more* now, and the forcing function must be *her* saying no, not just "the team exists."

### 2d. Domain-expertise double-edge (flagged for handoff)
The team's 7 years in betting is the asset that finally peer-reviews the hard parts — AND the risk: they carry sportsbook priors (odds, house edge, bookmaker, pooled stakes). This club is **none of that** — peer-to-peer, 1:1, players-as-house, rake rounded to nearest NT$100, 20兩 min exposure, 3-step Monday auto-placement. Experienced betting engineers are *more* likely to "correct" the rules toward an industry norm that doesn't apply and be confidently wrong. This drove the single most important sentence in the URD (the anti-sportsbook framing atop Appendix D).

---

## 3. Product phase decisions (the scope spine)

- **Phase 1 (BUILD NOW):** bookkeeper-facing only, **single club**. Two success criteria: (1) prove the money math is provably correct, (2) gather a first real dataset of bets/behaviour to design Phase 2 on. **NO member-facing anything** — members keep receiving results via the bookkeeper's weekly group-chat post, exactly as today; only the bookkeeper's job gets easier (button-click real-time calc vs manual Excel across 85 members).
- **Phase 2 (future, do not build):** member-facing — members view own data + place own bets.
- **Phase 3 (future, do not build):** scale to multiple clubs, per-club rules/rates.
- **Directive to team:** build Phase 1 only; don't foreclose 2/3; make only the *cheap* future-proofing choices (don't hard-code club rules/fee rates — hold as config). Framing: "tenant zero of a product, not a one-club tool." Lean single-club now.
- Channel question (standalone web / LINE-native / hybrid) → **moot for Phase 1** (no member surface). Deferred to Phase 2. Auth shrinks to a few bookkeeper/admin accounts.

---

## 4. On writing a good URD (the teaching + the standard)

Established the working definition before drafting:
- A URD specifies **WHAT users need and WHY, not HOW** the system delivers it — the "how" (stack, physical schema) is the engineers' job. **Exception:** domain rules are NOT "how" — they're the definition of *correct*, and go all the way in.
- Real engineers use it as a working instrument: decompose into functional reqs → tickets → acceptance tests; use scope boundaries for sprint planning; treat it as the shared contract.
- Quality bar (ISO/IEC/IEEE 29148): each requirement unambiguous, verifiable/testable, necessary, singular, feasible, consistent, prioritized, traceable. Set as a whole: complete, consistent, bounded (explicit about what's OUT).
- **"Read once and build" is a north star, not a metric** — good back-and-forth is expected and desirable; the URD's job is to change *remedial* questions ("what do you mean") into *generative* ones ("your rule covers X, what about Y?"). Living doc, not one-shot.
- **Length:** as long as the domain is irreducibly complex and not a line longer. Her call: **≤5-page core, appendices as long as needed.** Reason (hers, correct): the team is working **free** — keep the first ask concise, lower activation energy to start, expand detail as the working rhythm builds. It's a relationship/onboarding decision, not a formatting one. Also: the product is expressed by the demo, the correctness by the appendices — so the core's only job is to orient experts and get out of the way. Guardrail: lean on *orientation*, complete on *correctness* (rules + worked examples must be complete from day one even behind a lean core).

---

## 5. The URD build (v1 → v4) and every material decision

Iterated v1→v4 in-session; deleted drafts v1–v3; **v4 renamed to `URD-Golf-Betting-System.md`** (English master). Then translated to Traditional Chinese. Key decisions and reversals along the way:

- **Data model:** chose to attach the **existing 10-table schema + RPC list as a reference appendix** ("this is the shape that works and is tested; redesign freely"), NOT dictate schema. Conceptual-model narrative in core was rejected as redundant; the real schema does that job.
- **Removed the old §7 "open decisions"** (channel, member-model) once phasing resolved them — they became Phase-2 decisions, not open questions.
- **§6 MoSCoW placement/repetition (her catch):** made §6 the single, complete, terse at-a-glance scope summary; stripped the duplicated "out of scope" list from §2 so exclusions live in exactly one place. §6 is a deliberate "in conclusion" for a skimming engineer; the top-of-doc pointer routes skimmers to it.
- **§5 Non-functional reqs** kept (standard, expected section) — explained to her as the cross-cutting *quality bar* (correctness, security, auditability, usability, durability) vs §4's *feature list*.
- **New requirements she added** (none exist in current build — flagged for team):
  1. **Assisted match creation from pasted group-chat text** → system detects players/teams/handicap/date → pre-filled preview → bookkeeper reviews & confirms (never auto-creates). MoSCoW: Should.
  2. **Settle-tracking (mark paid)** → Must. Marking settled is **terminal & protected**: outstanding balance recalculates, settled amount drops out, later result corrections cannot silently overwrite a settled record.
  3. **Settlement confirmation (commit a period's numbers)** → Must. Distinct from #2: confirming *finalizes the period's math* (weekly + monthly), runs the double-check (§5.1), becomes the official record balances carry forward from.
  4. **Weekly settlement + weekly reports** → Must (was monthly-only).
  5. **1v1 / 1v2 / 1v3 formats** → Must. Current schema has 4 fixed player slots; this is a structural change (needs a flexible team-membership representation). Settlement math already generalizes.
  6. **Real-time unsettled balance per member row** → folded into §4.1 and §6 Must.
- **Two money-state functions (#2, #3) were never on her radar before this session** — she called them crucial. Classic URD value: surfaced before the engineers build around their absence.
- **Anti-sportsbook framing** (top of Appendix D): "peer-to-peer, players-as-house, 1:1, NOT a bookmaker/odds/pooled-stakes model… follow these rules literally, not industry convention." Highest-leverage sentence for this specific team.
- **4 worked settlement examples as pass/fail acceptance tests** (Appendix E): (1) standard 2v2 (the organizer-verified S20 example), (2) sporadic pool settling independently / one-sided house, (3) non-50/50 player share split (70/30), (4) correction flipping an already-settled 1v1. I derived #2–4 strictly from canonical rules (R5, R16–R21, R23.11), NOT from the code (she doesn't trust the settlement code), each self-checked to zero-sum. **These need 創隊長's numeric sign-off** — not yet verified.
- **Consistency fixes she/I caught in review:** "four players agree handicap" → "the players" (1v1/1v2/1v3); dropped a triple-stated double-check line; added settlement-confirmation to the "what the demo lacks" list; surfaced cancellation/player-replacement (R23–R25) into §4.2.
- **Appendix H — 9 captioned screenshots** of the existing system added to the Chinese version (renamed to clean filenames `01`–`09` in `here/`, captioned in 繁中 by workflow order: 會員 → 賽事 → 建立 → 賽果 → 結算). I viewed every image to caption accurately.

**Bilingual output:** English master + `URD-高爾夫投注系統-繁中.md` (Taiwanese-standard Mandarin; rule IDs / table / function names kept in original for traceability; club terms 封盤/自動派注/選手佔成/加強盤/抽水 used natively). Her manual edits to the Chinese version: English section headers on some sections, added date/owner line, condensed phrasing, tightened Appendix G wording. One clobber incident: her editor overwrote my first Appendix H insert (stale in-memory copy saved over disk) — re-applied against her current version; warned her to edit in one place only.

---

## 6. Canonical rule change (the one real edit to a frozen file)

**R22.4 changed monthly → weekly.** Original (S22, organizer-confirmed): "Settlement is calculated monthly. Money changes hands on the 4th Monday." New: "Settlement is calculated and reconciled WEEKLY… Monthly totals are a cumulative roll-up." Confirmed with 創隊長. Applied as a **dated, visible revision** (2026-07-10 note in R22.4 + version-line annotation) rather than a silent overwrite, to respect the frozen-file convention. **Consequence:** other memory files (MEMORY.md data-model notes, design docs) still say "monthly" in places and will drift until reconciled.

---

## 7. Deliverables + PDF export

Files now in project root:
- `URD-Golf-Betting-System.md` — English master.
- `URD-高爾夫投注系統-繁中.md` — Chinese (the version being sent).
- `URD-高爾夫投注系統-繁中.pdf` — **the send artifact.**
- `URD-高爾夫投注系統-繁中.html` — browser-print fallback (margins added).
- `here/` — 9 renamed screenshots (`01-…`–`09-…`).

**PDF export saga:** `md-to-pdf` (via npx, headless-browser render) produced a PDF but it rendered **badly** (CJK/layout broken). She switched to the browser Cmd+Shift+V route but got stuck (VS Code built-in preview has no "Open in Browser" without an extension). Fix: I generated a standalone HTML via `md-to-pdf --as-html`, then **injected print CSS** (`@page { margin: 2cm }`, centered 820px max-width body, PingFang TC / Heiti TC CJK fonts, image borders). She opens the HTML → Cmd+P → Save as PDF for a clean, margined result. **English PDF not yet generated.**

---

## 8. Open threads / next-session TODO

1. **創隊長 to verify the 4 worked examples** (URD Appendix E) — derived from rules, not code; need numeric sign-off before they count as acceptance tests.
2. **`canonical-rules.md` deliberately NOT sent** to the engineers (her test to see if they ask for it). Consequence to remember: URD Appendix D + E are the **entire correctness contract** the team currently holds.
3. **Reconcile "monthly" references** across other memory files with the new weekly R22.4.
4. **Generate the English PDF** if/when needed.
5. **Table count:** her instinct "only 10 tables?" was correct — the new reqs imply ~13–16 (a `match_players` junction for variable teams, a weekly settlement-period table, an auth/users table, eventually a `clubs` table for Phase 3). Correctly **left to the engineers** — URD Appendix F is reference-only, and the requirements will drive them to it. Good question to pose to them.
6. **Await team's questions** on the URD — the generative ones are the doc working; watch specifically for sportsbook-prior divergences on the rules.

---

## 9. Preferences / feedback captured to memory

- **`project_2.0_team_rewrite_urd.md`** (project) — the whole pivot: team, 2.0 rewrite, phases, new reqs, canonical change, open threads. This is the **active project direction**, superseding the solo pre-launch roadmap (`plan-ticklish-chasing-cocke.md`).
- **`feedback_analytical_partner_no_projection.md`** (feedback) — (1) she wants analytical rigor, not encouragement ("ChatGPT = therapist, you = better half"; flagged an over-encouraging response as "not that great"); (2) never project hedging/dishonesty onto her — she is consistently direct and self-aware (was offended by a "half-admit" guess); (3) keep responses concise (long ones make her "lazy to think").

---

## 10. Proposed 0-memory.md updates

- `~` Session header → S86.
- `~` Add a prominent **DIRECTION CHANGE (S86)** note near the top of TODO: external team onboarded; system being rebuilt as 2.0; Phase 1 = bookkeeper-only single club; URD (`URD-Golf-Betting-System.md` + 繁中 + PDF) is the handoff spec; solo pre-launch roadmap paused. Point to `project_2.0_team_rewrite_urd.md`.
- `~` Note canonical R22.4 weekly revision + the "monthly references need reconciling" debt.
- `+` New files in root: URD (en/zh/pdf/html), `here/` screenshots.

## 11. Draft session-log entry

| 86 | 2026-07-11 | 5h 37m | ★ PIVOT ★ No production code. Full 89-file context reload. Strategic session: named the solo bottleneck (rigor spent on elegant parts, launch-blockers unbuilt across 85 sessions; no forcing function), onboarded an external betting-industry engineering team (free) rebuilding the system as "2.0" = "v1 of the company." Locked phase scope: P1 bookkeeper-only single club (prove correctness + gather dataset), P2 member-facing, P3 multi-club. Authored bilingual URD (`URD-Golf-Betting-System.md` EN + 繁中 + PDF) as handoff spec: ≤5-page core + appendices (club primer, sporadic-pool explainer, anti-sportsbook framing, 4 worked settlement acceptance tests, 10-table schema reference-only, 9 captioned screenshots). Surfaced new reqs absent from current build: weekly settlement, settle-tracking (terminal/protected), settlement confirmation, 1v1/1v2/1v3, assisted match creation, real-time unsettled balance. Canonical R22.4 monthly→weekly (創隊長-confirmed, dated revision). Captured project pivot + analytical-partner feedback to memory. Open: 創隊長 to verify 4 examples; canonical not sent to team (deliberate test); reconcile monthly refs; English PDF pending. |
