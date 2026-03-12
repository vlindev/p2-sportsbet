# Architecture Case Study — Technical Brief (Trimmed)
**Created:** 2026-02-25 | **Source:** architecture-case-study-brief.docx (5W1H briefing) + structural analysis sessions

> Trimmed version — loaded every session. For full 5W1H case study (8 sections), load `architecture-brief-full.md` instead.

This document is the technical backbone of all three deliverables. It contains the structural arguments, hard problems, risk analysis, and replacement cost framework that anchor the presentation strategy.

---

## I. Industry-Level Hidden Problems

These exist in the betting/settlement problem space regardless of who builds it:

**Logical inconsistencies** — Betting rules that seem simple in conversation contain implicit contradictions. Example: "mandatory bet for all members" + "capacity limit per match" creates a conflict when member count exceeds capacity. The system must resolve this without manual intervention.

**Concurrency and ordering risks** — Multiple bets placed simultaneously can violate LIFO ordering assumptions. In a concurrent environment, "order" is a design choice, not a natural property. If the system assumes sequential processing but receives parallel inputs, balancing logic produces wrong results silently.

**Payout miscalculation exposure** — Any error in settlement is a direct financial loss. Unlike most software bugs (which cause inconvenience), a payout bug causes a real person to be overcharged or underpaid. The error tolerance is zero.

**Mutual exclusivity conflicts** — Different bet types (mandatory self-bet, auto-placed, voluntary) interact with capacity limits, balancing rules, and validity flags. A bet that is valid under one rule set may be invalid under another. The system must enforce all constraints simultaneously, not sequentially.

**Financial risk amplification** — A single design flaw doesn't cause a single error — it causes a systematic error that compounds across every match, every week, every member. 85 members × 7 Monday matches × 4 weeks = thousands of calculations per month, all flowing through the same logic. One flaw corrupts everything downstream.

---

## II. Architectural Difficulty

**State management complexity** — A match transitions through upcoming → active → completed/cancelled. Bets transition through pending → win/loss. Settlements aggregate monthly. These lifecycles interact: a match completion triggers a fan-out write to all bets, which are later consumed by settlement. Each layer depends on the integrity of the layer before it.

**Constraint resolution modeling** — The system enforces multiple constraints simultaneously: capacity limits, mandatory bets, LIFO balancing, bet type rules, validity flags. These constraints can conflict. The resolution hierarchy — which rule wins when two rules disagree — must be explicit and deterministic.

**Edge-case explosion** — The number of valid system states grows combinatorially. Monday alone: 7 matches × 85 members × 3 bet types × validity flags × capacity limits. Most states are unremarkable. A small subset produces incorrect payouts. Finding and handling that subset is the core engineering challenge.

**Integrity enforcement across dynamic conditions** — The system must maintain financial correctness even as data changes. A match result correction weeks after entry must propagate correctly through all dependent bets and any settlement that consumed them. This is not a simple update — it's a cascading state change through multiple layers.

---

## III. Hard Problems — Centrepiece Arguments

### The Fan-Out Write Problem
When a match result is entered, it must atomically update up to 85 bet rows. This is intentional denormalization — bet results are written at match-result time, not derived at query time, because:
- Settlement needs a stable, auditable input (not a re-derivation that could differ)
- LIFO validity flags (`is_valid: false`) make re-derivation unsafe
- The bookkeeper needs immediate, visible bet-level results

**Consequence:** Correction must reverse and re-apply all N writes. A partial failure during correction is invisible at the match level and only surfaces weeks later when settlement calculates wrong balances.

**Key line:** *"The failure is silent, delayed, and financially consequential. It doesn't throw an error. It doesn't crash. It just produces a wrong number in a spreadsheet that someone discovers three weeks later when money changes hands."*

### The Correction Path Asymmetry
The most dangerous code in the system — and the most architecturally non-obvious.

| | Initial write fails | Correction write fails |
|---|---|---|
| Match-level signal | No result shown — obvious | Corrected result shown — looks fine |
| Time to discovery | Seconds (bookkeeper retries) | Weeks (settlement) |
| Blast radius | 0 (nothing written) | N bets with wrong results |
| Self-healing? | Yes (retry writes fresh) | No (stale data persists) |

The correction path must be MORE reliable than the initial write. Requires read-after-write verification — a distributed systems pattern rarely seen in web applications.

**What separates senior from average:** Average asks "does the code work?" Senior asks "what does failure look like, and who would notice?"

### LIFO Validity Enforcement
LIFO balancing sounds like a simple queue mechanic. In a concurrent financial system, it is an ordering guarantee that must be explicitly enforced at the architecture level. If execution order is assumed rather than designed, payouts are silently wrong.

### The is_valid Flag as Load-Bearing Architecture
LIFO-dropped bets are ghost bets — they exist with results, amounts, member IDs. Settlement must explicitly filter them. If it doesn't: ~3 phantom entries per Monday × 4 Mondays = 12 per month, each too small for individuals to notice. The error compounds silently.

---

## IV. Risk Mitigation Mechanisms

**How the system reduces financial liability:**
- Every payout calculation follows a single, auditable code path — no manual overrides
- Settlement includes a mandatory double-check audit step (calculate twice, compare, block on mismatch)
- Invalid bets are flagged but preserved (not deleted), maintaining a complete audit trail
- Rake is applied programmatically — cannot be adjusted per-transaction

**How it prevents operator exploitation:**
- The bookkeeper enters match results, not payout amounts — the system derives all financial consequences
- No ability to manually adjust a bet result or settlement balance
- All state changes are timestamped and traceable

**How it protects against payout manipulation:**
- Bet results are written from match results via a deterministic function — there is no step where a human chooses who wins money
- LIFO balancing is algorithmic — the bookkeeper cannot choose which bets to drop
- Capacity enforcement is automatic — cannot be selectively overridden

---

## V. Long-Term Infrastructure Value

**Scalability** — The architecture is designed for one club but structured for many. Rake % is configurable per club (stored in data, not hardcoded). Adding a new club requires configuration, not code changes.

**Modularity** — Match management, bet entry, settlement, and reporting are separate concerns with clean boundaries. Each can be enhanced independently.

**Extendibility** — Phase 3 features (player analytics, automatic odds calculation, multi-tenancy) build on the existing data model without schema rewrites. The foundation was designed with future layers in mind.

**Maintainability** — The system is built by the person who understands the domain. Knowledge transfer risk (the #1 killer of outsourced projects) is zero. The decision trail is documented across 12+ build sessions.

---

## VI. Replacement Cost Framework

**2018 pre-AI baseline for an equivalent system:**

| Item | Detail |
|------|--------|
| Team | 5 people: 2 backend, 1 frontend, 1 QA, 1 PM + partial DevOps |
| Timeline | 6-9 months (realistic with delays) |
| Direct cost (Asia) | $108k-$132k USD |
| Direct cost (Western) | $200k-$400k USD |
| Hidden costs | Scope creep, architecture rework, payout error liability, knowledge transfer, maintenance contracts |
| Realistic total (Asia) | $180k-$250k USD |
| Realistic total (Western) | $350k-$500k USD |

**Why betting logic systems fail:** High rework rates because the constraint graph is invisible during requirements. The club can't articulate its own rules precisely enough for a spec. Architecture must be designed by someone who deeply understands both domain AND engineering — that combination is rare.

**The competitive moat:**
- **Layer 1:** Replacement cost — $100k-$250k and 6-9 months to rebuild from zero
- **Layer 2:** Rare founder combination — domain expertise (grew up in the club) + systems thinking + AI collaboration proficiency. Not acquirable through hiring.

**The punchline:**
*"In 2018, this system would have required a 6-9 month development cycle, a 5-person engineering team, and a six-figure budget. Today, it exists as a fully functional decision engine ready for deployment."*
