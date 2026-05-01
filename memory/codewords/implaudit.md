# UI & Implementation Integrity Check

Use this after any implementation session to catch regressions before moving on.

---

## STEP 0 — Visual Diff (when screenshots are provided)

**Trigger:** Run this step only when two screenshots are attached — the approved mockup and the current implementation. If no screenshots are provided, skip to Step 1.

Do a pixel-level visual comparison. Find every difference between the two — no matter how small. This includes layout, spacing, typography, colors, button styles, labels, alignment, element presence, and element order.

For each difference found, report as:
> [Element] — Mockup shows: x → Implementation shows: y → Required change: z

Then produce an action plan:
- Group related changes together
- Order by visual impact (highest first)
- Flag anything that may have backend or state implications

---

## STEP 1 — Frontend Fidelity (Mockup vs Implementation)

Compare the current implementation code against the approved mockup decision log.
Flag any visible difference, no matter how small.

Check each of the following:

- [ ] Layout: column count, grid proportions, element order
- [ ] Spacing: padding, gaps, margins match mockup spec
- [ ] Typography: correct tier applied, bold where specified
- [ ] Colors: exact classes used match mockup
- [ ] Button style: solid vs outlined vs text-link, correct for each action
- [ ] Labels: exact strings match mockup
- [ ] Icons: present where specified, absent where not
- [ ] States: empty, loading, error states exist and are visually distinct
- [ ] Conditional rendering: correct elements show/hide per state
- [ ] Nothing added that wasn't in the mockup

---

## STEP 2 — Backend Logic Integrity (vs Documented Rules/Requirements)

Review all functions touched in this session against the project's documented rules and requirements.
Flag any contradiction, shortcut, or missing guard.

- [ ] State transitions: follow the documented state machine (no skipped states)
- [ ] Data writes: follow the documented pipeline (correct tables, correct order, correct constraints)
- [ ] Business logic: matches documented rules/requirements (calculations, validation, guards)
- [ ] Server/client boundary: no client-side logic that belongs server-side
- [ ] Concurrency: appropriate locking where concurrent writes are possible
- [ ] Error handling: follows documented error handling standards

**Project-specific override:** If the project's CLAUDE.md defines a custom Step 2 checklist for `implaudit`, use that instead of this generic checklist. The project override takes full precedence — do not merge or blend with the generic checklist.

---

## OUTPUT FORMAT

For each flag, report as:

**[STEP] | [Severity: High / Medium / Low] | [What was found] | [What it should be]**

Example:
> STEP 0 | High | Member name column is left-aligned | Should be center-aligned per mockup → Change: add `text-center` to column
> STEP 1 | High | Button label reads "Submit" | Should be "Confirm" per mockup v3
> STEP 2 | High | State transition skips documented intermediate state | Required per rules

Do not fix anything during this check. Report only.
