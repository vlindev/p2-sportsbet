# Mockup Generation Protocol (MGP)

## Input Source
Use whichever is available — in priority order:
1. An implementation plan or analysis already produced in this session
2. A plan pasted below this prompt

If neither exists, stop and say so. Do not proceed without a plan.

---

## Phase 1 — Make All Design Decisions Autonomously

Before writing any code, make every design decision required to render this mockup.

**Reference for existing patterns (in priority order):**
1. The most recently approved mockup decision log in this session
2. SIP documentation if present
3. Established project conventions (e.g. Chinese-language labels, NTD amounts, role-based UI)
4. General UI conventions for the domain (e.g. financial/data-dense interfaces)

**Decision depth rule:**
- A rejected alternative is REQUIRED for any decision involving: layout structure, visual hierarchy, color, typography tier, button style, or labeling
- A rejected alternative is OPTIONAL for decisions involving only spacing, sizing, or padding
- Every decision must state its reasoning regardless of depth

**Scope rule:**
- Every element in the mockup must be traceable to a specific section or requirement in the plan
- If an element cannot be cited to the plan, it is excluded — no additions for completeness, polish, or assumed convenience
- If the plan is ambiguous or silent on something required to render the mockup, make a decision, mark it `[ASSUMED]`, and state what you assumed and why

Do not ask for input during this phase. Make every call yourself.

---

## Phase 2 — Produce the Mockup

Render the mockup as a React component. If the project does not use React, render as standalone HTML instead.

**Rendering requirements:**
- Use real labels as they appear in the system — no placeholders
- Use realistic numeric values (e.g. actual amounts, real counts)
- All conditional UI states mentioned in the plan must be rendered or clearly noted as a separate state
- No element collapsed, simplified, or omitted for convenience
- Render at full intended density — the mockup must be evaluable as a real UI, not a toy layout

---

## Phase 3 — In-Chat Decision Summary

Output a scannable decision summary in the chat. This is the primary review artifact — read it alongside the rendered mockup to know exactly what was decided and where to look.

**Structure:**

### Assumptions Made
List every `[ASSUMED]` decision here, at the top, before anything else. For each:
> **[Element]** — Assumed: [what was decided] — Because: [why] — Check: [what to look for in the mockup]

### Design Decisions by Section
Group all other decisions by component or section. For each:
> **[Element]** — [Decision made] — [Reasoning] — Rejected: [alternative and why it lost, if required]
> Backend — [note if this decision has backend implications]

---

## Phase 4 — Await Comments

Stop after Phase 3. Do not implement anything beyond the mockup.

When comments are provided:
- Treat each comment as a change request against a specific decision
- Revise the mockup and update the decision summary to reflect accepted changes
- If a comment conflicts with a well-reasoned decision, surface the conflict explicitly before acting — do not silently override sound decisions

---

## Hard Constraints
- No implementation during this protocol — mockup and documentation only
- No element in the mockup without a plan citation
- No decision left undocumented
- No rejected alternatives skipped where required by the decision depth rule
- All assumptions surfaced at the top of Phase 3, never buried
