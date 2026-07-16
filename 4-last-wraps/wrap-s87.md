# Last Wrap — Session 87 (2026-07-16)

## Duration: ~2h active (timer read 34h 34m — stale segment, session left open across the 07-15→07-16 day boundary; ignore the raw figure)

## Type: Infrastructure / safety. No project code touched. Fixed a cross-device sync failure and closed a recurring silent-file-deletion bug in the wrap flow.

---

## 0. Why this session matters
The visible symptom was small (`ready` showed a stale S82 last-wrap). The real find underneath it was a routine that could **silently delete files and propagate the deletion to all devices** — which had already happened twice to a scratch copy and which the user had "freaked out" about before. This session diagnosed the mechanism and built a two-layer guard so no file can vanish on autopilot again. The user's *original* files were never at risk; only a config-repo duplicate died.

---

## 1. The stale-last-wrap investigation
- `ready` showed **S82** last-wrap while 0-memory + git log showed **S86** was latest.
- Root cause: this machine's **`~/.claude` (config repo) was 4 commits behind** and could not pull. Today's `git pull` (via `p2` alias and `ready`) **aborted** because of uncommitted local changes here: `M settings.json` + a working-tree deletion (`D plans/ticklish-chasing-cocke.md`).
- **The S83–86 wraps all worked correctly** — their last-wrap updates are on the remote (verified `origin/main` = S86). The staleness was purely a local sync failure on this machine, not a wrap failure.
- Why the project repo was fine but config wasn't: the `p2` alias pulls both repos; the project repo was clean (so it pulled — that's why `wrap-s83…s86.md` arrived today), the config repo had local changes (so it aborted).
- This has bitten before — config git log contains `fix last-wrap.md (was stale S74 after rebase)`.

## 2. Sync resolved
- `git stash` → `git pull` (to S86) → `git stash pop`. Conflicts in `settings.json` and `plugins/installed_plugins.json` (both machines had edited them).
- **settings.json resolved:** kept this machine's `theme: light`, `verbose: true`, `autoCompactEnabled: false` + folded in the other machine's `tui: fullscreen`. (Theme clashed: other machine had `light-daltonized`; user chose `light`. Flagged that settings sync means one value wins on both machines.)
- **plugins file:** took the synced/remote version (auto-managed cache metadata, self-heals).
- **User decision (reversal):** wanted the settings uncommitted, then said "commit it anyway" — reasoning: *uncommitted local changes are exactly what blocked the sync, so leaving them risks the same failure again.* → principle: don't leave uncommitted changes sitting in synced repos.

## 3. The silent-deletion diagnosis (the real bug)
- `ticklish-chasing-cocke.md` (a **duplicate** in `~/.claude/plans/`) was deleted in **both** the S83 and S86 wrap commits — that's the "it happened again."
- **Mechanism:** `~/.claude/plans/` is Claude Code's plan-mode scratch folder, which the **app itself auto-cleans**. When it removes a file, `wrap`'s blind **`git add -A && git commit`** faithfully commits that deletion and pushes it everywhere. The wrap doesn't *decide* to delete — it blindly records a deletion done elsewhere. `git add -A` is the propagation vector.
- **The user's original was always safe:** the canonical copy lives in the *project* repo (`p2.sportsbet/memory/plan-ticklish-chasing-cocke.md`, intact). Only the config-repo scratch duplicate died. Her stated standard: she only panics if an **original** is deleted without consent; duplicates are fine.

## 4. The fix — two layers (C + A), installed + tested
- **C (hard wall):** `.githooks/pre-commit` in **both** repos blocks any commit containing a file deletion, printing the filenames. Override: `ALLOW_DELETIONS=1 git commit`. Activated via `git config core.hooksPath .githooks`. **Proven:** test deletion was blocked (exit 1); override committed cleanly (exit 0).
- Made the hook **sync**: config repo `.gitignore` uses a whitelist (`*` + `!` negations) — added `!.githooks/` + `!.githooks/*`. Project repo tracks it normally.
- **A (friendly catch-first):** deletion guard added to `wrap` Step 6 + `commit` step 1 in `~/.claude/CLAUDE.md` — detect `D` lines, STOP, list them in plain language, get explicit confirmation before committing.
- **Self-arming across machines:** added `ready` **step 1b** — at session start it runs `git config core.hooksPath .githooks` in both repos (idempotent). So the hook auto-arms on the first `ready` on ANY machine; the earlier manual per-machine command is now obsolete (and its stale reference was removed from memory).

## 5. Memory written
- `feedback_no_silent_deletions.md` (new) + MEMORY.md pointer — the deletion mechanism, the guard, the override, and the "never commit a deletion silently" rule.
- `feedback_analytical_partner_no_projection.md` — appended signal #3: **plain language on technical/infra topics** (jargon lost her; she wants rigor delivered in accessible language + options with pros/cons for domains outside her expertise).

## 6. Commits this session (all pushed, both repos clean)
Config repo: settings sync → deletion-guard hook+guards → memory capture → ready self-arm → drop obsolete command. Project repo: deletion-guard hook.

---

## Proposed 0-memory.md updates
- `~` Note under Lessons Learned/Gotchas: wrap/commit `git add -A` can silently commit deletions → now guarded by `.githooks/pre-commit` (override `ALLOW_DELETIONS=1`) + wrap/commit guard steps + `ready` auto-arm. See `feedback_no_silent_deletions.md`.
- ⚠️ **0-memory.md is at 221 lines — over the 200 limit. Run `bonsai` next session before work.**

## Draft session-log entry
| 87 | 2026-07-16 | ~2h (timer 34h34m, left open overnight) | Infra/safety, no project code. Fixed stale last-wrap (showed S82): ~/.claude pull was blocked by uncommitted local changes (settings.json + a working-tree deletion); S83–86 wraps worked, this machine was 4 commits behind. Resolved sync (stash→pull→pop; kept theme:light/verbose/autoCompact + tui:fullscreen). Diagnosed recurring silent-deletion bug: Claude Code plan-mode housekeeping deletes ~/.claude/plans/ files → wrap's blind `git add -A` commits & propagates the deletion (killed ticklish-chasing-cocke scratch copy in S83+S86; user's original project copy always safe). Built two-layer guard: `.githooks/pre-commit` hard-blocks deletion commits in both repos (override `ALLOW_DELETIONS=1`, tested) + `wrap`/`commit` ask-first guard in CLAUDE.md + `ready` step 1b auto-arms per machine. Memory: feedback_no_silent_deletions + plain-language signal. ⚠️ 0-memory 221 lines — bonsai needed. |

## Next session
- Run `bonsai` on 0-memory.md (221 → under 200) before any work.
- Project work still paused pending the 2.0 team build (S86 pivot). Open S86 threads unchanged: 創隊長 to verify the 4 URD Appendix E examples; reconcile "monthly"→"weekly" refs; English PDF; await team's URD questions.
