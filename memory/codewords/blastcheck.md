# blastcheck — Execution Protocol

Run a blast radius check on a recent change.
Goal: detect **cross-context drift** — places where the main target change was implemented, but other contexts sharing the same assumptions are now inconsistent.

## Core rule
**Scope follows shared assumptions, not technical layers.**

Do not limit the check to UI/frontend/backend by default.
Do not expand the check to everything.
Follow the assumptions introduced, changed, or relied on by the change.

## Non-negotiable rules
- Do not stop at file search results. Read and assess actual code.
- Do not report only "related locations." Report whether each one is still correct.
- Do not overclaim completeness. Use `Not reviewed` or `Out of scope` when needed.
- If semantics, workflow meaning, status meaning, validation, or shared data interpretation changed, trace all consumers.
- Optimize for correctness, not minimal token usage.

---

## Inputs
Use whichever are available:
- git diff
- touched files
- recent conversation/context
- plan/mockup discussion
- user-provided intent

Two invocation modes:
- `blastcheck` → infer intent from available evidence
- `blastcheck [intent]` → use provided intent plus code observations

If intent is unclear, infer it and label confidence.
Ask minimal questions — only where ambiguity materially weakens the check.

---

## Execution

Run all phases to completion without pausing. The full report is the artifact for review. If the framing looks wrong after reading the report, correct and rerun.

---

## Phase 1 — Frame the change

### 1. Summarize observed change
State what changed in concrete terms:
- files
- components
- patterns
- workflows
- state meanings
- validation/enforcement
- parent/child relationships
- affected views

### 2. State intent
Give a one-line intended outcome. Label it:
- `Provided`
- `Inferred (high confidence)`
- `Inferred (low confidence)`
- `Ambiguous`

### 3. Extract assumptions
From observed change + intent, extract the assumptions the change:
- introduces
- modifies
- depends on

An assumption = a statement about context that must be true for the change to be correct.

### 4. Type each assumption
Use exactly one type per assumption:
- `Render context`
- `Visual parity`
- `Workflow`
- `Semantic / data meaning`
- `Behavioral rule`
- `Constraint / enforcement`

### 5. Predict blast surfaces
List likely affected surfaces before searching, such as:
- reused components
- sibling sections
- create/edit/report modes
- parent/child cards
- tabs/views
- mobile variants
- filters/selectors
- queries/RPCs
- settlement/report consumers
- approval/pending flows

---

## Phase 2 — Search and assess

For each assumption:

1. Find other locations that share the same assumption.
2. Read the relevant code.
3. Assess whether the assumption still holds.
4. Record a verdict with reasoning.

Use the search method that fits the assumption:
- grep/ripgrep
- symbol/usages
- imports/call sites
- wrapper/container tracing
- prop/data flow tracing
- status consumer tracing
- query/RPC tracing
- filter/selector tracing
- event handler tracing
- validation path tracing

### Search guidance by assumption type

#### Render context
Check:
- usage sites
- parents/wrappers
- containment/layout structure

Assess:
- does the component still render in the assumed context?
- do the styling/layout assumptions still hold?

#### Visual parity
Check:
- sibling sections
- equivalent surfaces
- alternate modes/states

Assess:
- would users expect these surfaces to stay aligned?
- was one upgraded while another equivalent surface stayed old?

#### Workflow
Check:
- entry paths
- edit flows
- result flows
- parallel task surfaces

Assess:
- is the workflow improvement applied consistently?
- are action order and discoverability still correct elsewhere?

#### Semantic / data meaning
Check:
- status consumers
- enums
- derived state
- filters
- queries
- RPCs
- reports
- tab placement/grouping logic

Assess:
- do all consumers interpret the meaning consistently?
- is a local meaning being treated as a global meaning?

#### Behavioral rule
Check:
- event handlers
- transitions
- move/hide/archive logic
- parent/child coordination
- post-action side effects

Assess:
- is behavior still correct in related contexts?
- does one action wrongly move/hide another still-actionable context?

#### Constraint / enforcement
Check:
- backend validation
- writes/server actions
- UI affordances
- pending/approval flows
- error/warning states

Assess:
- is the rule actually enforced?
- is the UI honest about enforcement state?

---

## Phase 2.5 — Surface parity sweep

After assumption-based assessment, do one explicit sweep:

Ask:
**What adjacent surfaces would a reasonable user expect to stay aligned with this change, even if they were not found by assumption tracing?**

For each relevant surface, mark one:
- `Covered by assumption check`
- `Separately reviewed`
- `Not reviewed`
- `Out of scope`

Do not skip this step.

---

## Phase 3 — Report

The framing block appears first so it can be audited before reading findings. If the framing looks wrong — missing assumptions, wrong intent, incomplete blast surfaces — correct and rerun. Do not patch findings manually.

Use this exact structure:

```
## Blast Radius Check

**Change:** [one line]
**Intent:** [one line + provided/inferred status]
**Framing confidence:** [High / Medium / Low]

### Framing
**Observed change**
- ...

**Assumptions**
1. `[Type]` ...
2. `[Type]` ...

**Predicted blast surfaces**
- ...

### Findings by assumption

#### Assumption 1 — `[Type]`
`[full assumption sentence]`

- `path/file.tsx:123` — ✅ **Consistent**
  [why]

- `path/file.tsx:456` — ❌ **Needs update**
  [what is wrong and why]

- `path/file.tsx:789` — ⚠️ **Needs discussion**
  [ambiguity or tradeoff]

- `path/file.tsx:012` — 🔄 **Source needs revision**
  [the blast radius check revealed that the originating change itself may be based on a
  wrong assumption — describe what the check found and why the source change may need
  revisiting, not just downstream contexts]

(Repeat for each assumption.)

### Surface parity sweep
- `Surface A` — Covered by assumption check — ✅ Consistent
- `Surface B` — Separately reviewed — ❌ Needs update
- `Surface C` — Not reviewed
- `Surface D` — Out of scope

### Summary
- ✅ Consistent: [N]
- ❌ Needs update: [N]
- ⚠️ Needs discussion: [N]
- 🔄 Source needs revision: [N]
- ⏸ Not reviewed: [N]
- 🚫 Out of scope: [N]

### Limits
State any real limitations, such as:
- intent was inferred
- framing confidence was low
- some surfaces were not reviewed
- some assumptions may be incomplete
- search was limited by available context
```

---

## Handoff

Findings feed into the current SIP step as additional scope. Resolution before proceeding:

- ❌ **Needs update** — treated as implementation tasks. Resolved before moving to the next SIP step.
- ⚠️ **Needs discussion** — discussed and resolved before the next SIP step. May result in needs update, out of scope, or accepted divergence.
- 🔄 **Source needs revision** — pauses the current SIP step pending discussion. The originating change may need to be revisited before downstream findings are acted on.
- ⏸ **Not reviewed** — logged as known gaps. Do not block progress, but carry forward as open items.

---

## SIP integration

**Step 6 (Implementation) → Step 7 (Visual sanity check):** Claude automatically initiates blastcheck at Step 6 completion — not triggered by the user. Runs to completion. Report is produced in the same exchange as the implementation handoff, before any context switch to screenshots.

**Step 9 (Fix pass) → Step 10 (UI polish):** Conditional, with a mechanical trigger. If any file was touched in the fix pass that was not touched in Step 6, run blastcheck again. If the fix pass touched only files already covered by the Step 6 check, skip. No judgment call required.

**Monitoring:** Assess execution quality on the first 2–3 real runs. If Phase 2.5 consistently surfaces things that Phase 2 missed, the assumption types need revision. If ❌ Needs update findings are being produced that the assumption tracing didn't predict, the blast surface prediction step needs more depth.

---

## Skip rule
Skip blastcheck only if the change is truly local and introduces no shared assumption.

Possible skip cases:
- copy-only text change
- isolated non-reused spacing tweak
- internal refactor with no behavior/meaning/workflow change

If skipped, output:
`Skipped blastcheck: [reason]. No changed shared assumptions detected.`

Do not skip just because the diff is small.

---

## What this replaces

`feedback_sporadic_pool_coverage.md` is redundant in principle — it was a hardcoded instance of blast radius checking. It will be retired after blastcheck has run successfully across at least two or three real sessions. Until then, it remains as a backstop.

---

## Final standard
A valid blastcheck must:
- extract explicit assumptions
- type them
- search beyond touched files
- assess actual code
- include a parity sweep
- trace backend/data consumers when semantics or enforcement are involved
- clearly separate reviewed vs not reviewed vs out of scope
- name real limitations honestly
