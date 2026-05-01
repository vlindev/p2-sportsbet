# Bonsai — Memory Trim Procedure

Trim active memory files (0-memory.md and MEMORY.md) when approaching
the 200-line limit. Never trim backup files.

**Note:** 0-memory.md describes project state, not decisions — trim for
accuracy and staleness, not source-of-truth. MEMORY.md stores accumulated
knowledge — trim by verifying what's now derivable from code.

---

## Phase 1 — Backup

1. Ensure the `memory/` folder exists (create if missing)
2. Create rolling monthly backup of each file being trimmed →
   `memory/MEMORY-backup-YYYY-MM.md` and/or `memory/0-memory-backup-YYYY-MM.md`.
   One backup per file per month (overwrites if same month).
3. Check for backup files older than 12 months — flag for deletion.

---

## Phase 2A — Quick Classification

Read the file being trimmed. For each top-level bullet or section,
assign a provisional action:

- **CUT** — remove entirely (likely in the code)
- **CONDENSE** — rewrite shorter (keep conclusion, drop detail)
- **KEEP** — no change needed

This is a fast scan — no file reads yet. Provisional tags carry zero
authority. Only Phase 2B output goes into the report.

If both files need trimming, run Phase 2A on both before starting
Phase 2B on either.

### Classification Rules

1. **Source of truth check** — is this information findable by reading
   project files (code, config, schema), or does it only exist in memory?
   If it's in code → CUT or CONDENSE candidate.
   If it only lives in memory (domain rules, business context, user
   preferences, pending confirmations) → lean KEEP.

2. **Resolved decisions** — decisions fully implemented in code CAN be
   condensed to a summary line + file pointer. The decision's existence
   and conclusion must remain visible (never CUT entirely). Decisions
   not yet implemented stay verbatim.

3. **Never CUT** — domain/business rules not derivable from code,
   pending confirmations, data model (until schema is stable), design
   system principles, lessons learned / gotchas. Condensing these is
   allowed if meaning is fully preserved.

4. **Completed page specs** — condense once built. Code is source of
   truth for implementation details. Keep only: what the page does,
   key patterns, non-obvious decisions.

5. **Fresh session test** — would a fresh session be confused, make
   wrong assumptions, or redo work without this? If yes → KEEP.

6. **When uncertain** — default to CONDENSE, never CUT. Preserving a
   shorter version is always safer than deleting.

---

## Phase 2B — Verification (CUT and CONDENSE only)

For every item provisionally marked CUT or CONDENSE in Phase 2A:

1. **Read the source file(s)** where the implementation lives.
2. **Name the exact component or function** that implements the behavior.
   You cannot claim "it's in the code" without naming what implements it.
3. **Record evidence**: file path + component/function name. Line range
   is optional supporting evidence (useful for review, but not stable).
4. **Tag confidence level**:
   - `[verified]` — read the file, confirmed at named component/function
   - `[inferred]` — believe it's there based on context, did not read
     the file this session
   - `[uncertain]` — couldn't confirm, flagging for user review

**Rules:**
- Only `[verified]` items may be recommended for CUT.
- `[inferred]` items may be recommended for CONDENSE at most, never CUT.
- `[uncertain]` items must be presented to the user with no recommendation.

Items marked KEEP in Phase 2A skip this phase entirely.

---

## Phase 3 — Report

Set a target line count (e.g., "Target: ~160 lines") based on current
size and how much headroom is needed. Then present findings in this
format. Wait for user confirmation before changing anything.

```
## Bonsai Report — [filename] ([current] lines → target ~[N] lines)

### CUT (remove entirely)
| # | Lines | Content summary | Source of truth (component/function) | Confidence |
|---|-------|-----------------|--------------------------------------|------------|

### CONDENSE (rewrite shorter)
| # | Lines | Content summary | What to keep | What to drop | Confidence |
|---|-------|-----------------|--------------|--------------|------------|

### KEEP (no change)
| # | Lines | Content summary | Why code can't replace it |
|---|-------|-----------------|--------------------------|

### Before/After Preview
For each CONDENSE item, show the current text and proposed replacement:

**Lines XX–YY (CONDENSE) [confidence tag]:**
> BEFORE: [current text]
> AFTER: [proposed rewrite]

### Estimated result: [current] → ~[projected] lines
```

---

## Phase 4 — Apply

After user confirms which items to CUT, CONDENSE, or override:

1. Apply all approved changes in a single edit pass
2. Show final line count
3. If any `[inferred]` or `[uncertain]` items were approved by the
   user, apply those too — user confirmation overrides confidence tags

---

## Phase 5 — Rolling wraps cleanup

Check the `4-last-wraps/` folder. If the total file count exceeds 10,
delete the 5 oldest files (by session number in filename). Keep the
newest files. This means cleanup triggers roughly every 5 sessions
when bonsai runs.

Sort by session number extracted from `wrap-sXX.md` filenames, not by
filesystem timestamp. Lower session numbers = older = delete first.
