/**
 * Canonical client-side eligibility: can a NEW pool result be entered?
 * Mirrors submit_pool_result.sql line 26: status IN ('active', 'completed').
 * Does NOT cover corrections — correct_pool_result.sql has no match status gate.
 */
export const POOL_RESULT_ALLOWED_MATCH_STATUSES = ['active', 'completed'] as const;

export function canEnterPoolResult(
  matchStatus: string,
  poolResult: string | null
): boolean {
  const poolResolved = poolResult === 'team_a' || poolResult === 'team_b';
  return (POOL_RESULT_ALLOWED_MATCH_STATUSES as readonly string[]).includes(matchStatus)
    && !poolResolved;
}
