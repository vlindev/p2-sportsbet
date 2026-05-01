# typoaudit — Full Typography Accessibility Audit

Only trigger if `typoaudit` is the entire message. Usable on mockup HTML files OR rendered/implemented pages (when discussing what looks right/wrong).

## Context

The system's end users are 50+ year old adults. This is not a stylistic preference — it is a functional accessibility constraint. Every functional text must be **at least 14px (`text-sm`)**, and action buttons should be **16px (`text-base`)**. However, visual harmony and hierarchy are a **primary constraint** — simply increasing sizes can break layout balance.

## Goal

The goal is twofold:
1. Ensure **no functional text falls below 14px**.
2. Ensure the **typographic hierarchy still works visually** — relative contrast between primary information, secondary information, and metadata tiers remains clear.

In practice this likely means:
- If the smallest font size increases, **secondary and tertiary text tiers may need to increase proportionally**.
- The relative contrast between **primary information, secondary information, and metadata** must remain clear.
- The result should feel **balanced and readable**, not crowded or visually noisy.

## Procedure

1. Read the target file (mockup HTML or component `.tsx`) in full.
2. Catalog every text element with: content, current size (px + Tailwind class), and role in the hierarchy.
3. Present the audit as five sections:

### (1) Current hierarchy tiers
Table of all size tiers currently in use (T0, T1, T2...) with size, role, and examples.

### (2) All elements below 14px
Complete list with element name, current size, and location.

### (3) Categories
Group the below-floor elements into categories based on whether they should be raised or kept:
- **Category A** — readable text that users need to see → should raise to 14px minimum.
- **Category B** — badges/tags with strong color/shape contrast → can stay at 12px (readability via color, not size).
- **Category C** — edge cases requiring discussion.
- **Category D** — action buttons below 16px → should raise.
- Add more categories if needed. For each element, explain *why* it belongs in that category.

### (4) Proposed new hierarchy
Table showing the adjusted tiers after applying the minimum floor. Explain how the relative contrast between tiers is preserved.

### (5) Impact assessment
- Will it break the layout?
- What might feel different?
- What's NOT changing and why?

## Rules

- **Do not change anything.** Present the analysis and wait for user confirmation before applying.
- If the user confirms, apply the changes. If working on a mockup, update the HTML. If working on implemented code, list the specific files and classes to change.
- Evaluate and propose font-size adjustments with a **hierarchy-first approach** rather than simply applying a uniform size increase.
- If making 14px minimum is unreasonable for a specific element, say so with reasoning — don't force it.
