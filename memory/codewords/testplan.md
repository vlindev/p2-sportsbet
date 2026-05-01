# Functional Test Plan Generator

Use this to generate structured test scenarios for a feature that has been implemented. The user runs the tests and reports results. Claude compiles failures into a fix list.

---

## PHASE 1 — Gather Context

Before generating any test scenarios:

1. Read the plan/requirements for the feature being tested (from session context, memory files, or execution plan)
2. Read the relevant source files to understand what was actually built
3. Identify all user-facing actions, state transitions, and data operations
4. Note all documented edge cases and error handling requirements

**Coverage rule:** Every user-visible state transition identified in this phase must be tested at least once in Phase 2. If a state transition exists in the code but has no corresponding test scenario, that is a gap — add one.

If no plan or requirements exist for this feature, stop and say so. Do not generate tests without a source of truth to test against.

---

## PHASE 2 — Generate Test Scenarios

Produce a numbered test plan organized in these sections, in this order:

### Setup
State the app needs to be in before testing starts. Include any required test data, navigation path, and preconditions.

### Happy Path
Normal workflow — the expected use case, step by step. This is the most important section. If the happy path fails, nothing else matters.

### Input Variations
Different valid inputs, boundary values, minimum/maximum amounts. Test that the system handles the full range of legitimate use correctly.

### Edge Cases
- Empty states (no data yet)
- Single item vs many items
- Overflow / long text / large numbers
- Simultaneous or rapid actions
- Boundary conditions specific to the feature
- Feature-specific edge cases derived from the implementation logic — read the code and identify scenarios that only this feature's internals would reveal

### Error States
- Invalid input (wrong type, out of range, missing required fields)
- Network/database failure (what does the user see?)
- Permission or state conflicts (action attempted in wrong status)

### End-to-End Workflow
One complete real-world user workflow from start to finish. Not isolated actions — the full sequence as a real user would perform it in production. Reference the user's actual role and daily tasks.

**Format for each scenario:**

```
#N | [Section] | Action: [what to do] | Expected: [what should happen] | Check: [what to verify]
```

**Rules:**
- Every scenario must be traceable to the plan or to code that was actually built — no scenarios for features that don't exist or weren't part of this implementation
- Only test what was actually built — do not test unimplemented features
- Include the exact values, labels, and states to look for (not vague "should work correctly")
- Number consecutively across all sections (not restarting per section)

---

## PHASE 3 — Await Results

Stop after Phase 2. The user will run the tests and report results.

When results come back:
1. Compile all failures into a numbered fix list
2. Group related failures that likely share a root cause
3. Assign severity: **Critical** (blocks workflow, data error), **Medium** (wrong behavior, recoverable), **Low** (cosmetic, non-blocking)
4. For each failure, provide:
   - **Probable root cause** — what is actually wrong, based on the code
   - **Likely file or component** — where to look (`src/components/X.tsx:~line`)
   - **Suggested investigation direction** — what to check first, what to read, what condition to trace
5. Present the fix list. Do not fix anything until the user confirms which items to address.

---

## Hard Constraints
- No test scenarios without a plan or requirements source
- No testing unbuilt features
- No fixing during this protocol — test plan and failure compilation only
- Every scenario must have a concrete expected result, not "should work"
- Every state transition identified in Phase 1 must have at least one test scenario
