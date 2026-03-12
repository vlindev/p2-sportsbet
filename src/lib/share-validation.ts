/**
 * R17.11 — Minimum Exposure Validation (base match only, not sporadic pools per R17.12)
 *
 * Checks whether both players on a team side meet the minimum exposure threshold.
 * Returns a Map of share adjustments needed, or null if no adjustment required.
 *
 * Pure function — no DB dependency. Callers handle writes.
 */

export function checkMinExposure(
  sideShares: { id: string; share_bps: number }[],
  opposingTotalBetsLiang: number,
  minExposureLiang: number,
): Map<string, { originalBps: number; newBps: number }> | null {
  if (sideShares.length !== 2 || opposingTotalBetsLiang <= 0) return null;

  const [s0, s1] = sideShares;
  const exp0 = Math.floor(opposingTotalBetsLiang * s0.share_bps / 10_000);
  const exp1 = Math.floor(opposingTotalBetsLiang * s1.share_bps / 10_000);

  if (exp0 >= minExposureLiang && exp1 >= minExposureLiang) return null;

  // Total < 2 × min → impossible to satisfy both, force 50/50
  if (opposingTotalBetsLiang < 2 * minExposureLiang) {
    if (s0.share_bps === 5000 && s1.share_bps === 5000) return null;
    return new Map([
      [s0.id, { originalBps: s0.share_bps, newBps: 5000 }],
      [s1.id, { originalBps: s1.share_bps, newBps: 5000 }],
    ]);
  }

  // Find minimum share % to meet threshold
  const minSharePct = Math.ceil(minExposureLiang / opposingTotalBetsLiang * 100);
  const minBps = minSharePct * 100;

  // Identify the lower-share player and adjust upward
  const [low, high] = s0.share_bps <= s1.share_bps ? [s0, s1] : [s1, s0];
  if (low.share_bps >= minBps) return null;

  return new Map([
    [low.id, { originalBps: low.share_bps, newBps: minBps }],
    [high.id, { originalBps: high.share_bps, newBps: 10_000 - minBps }],
  ]);
}
