/**
 * Monday Auto-Placement Algorithm (R10.4)
 *
 * Pure function, no Supabase dependency.
 * Determines which team side each unplaced member is assigned to.
 *
 * 3-step algorithm applied per member, recalculating after each placement:
 *   Step 1 — Balance by count (unique bettors per side)
 *   Step 2 — Balance by amount (total liang per side)
 *   Step 3 — Tiebreaker: Team A (lexicographically earlier)
 */

export type ExistingBet = {
  memberId: string;
  teamBetOn: "A" | "B";
  amountLiang: number;
};

export type AutoPlacement = {
  memberId: string;
  teamBetOn: "A" | "B";
};

export function autoPlaceMonday(
  existingBets: ExistingBet[],
  unplacedMemberIds: string[]
): AutoPlacement[] {
  const placements: AutoPlacement[] = [];
  const allBets = [...existingBets];

  for (const memberId of unplacedMemberIds) {
    const betsA = allBets.filter((b) => b.teamBetOn === "A");
    const betsB = allBets.filter((b) => b.teamBetOn === "B");

    // Step 1: Balance by count (unique bettors per side)
    const countA = new Set(betsA.map((b) => b.memberId)).size;
    const countB = new Set(betsB.map((b) => b.memberId)).size;

    let teamBetOn: "A" | "B";

    if (countA < countB) {
      teamBetOn = "A";
    } else if (countB < countA) {
      teamBetOn = "B";
    } else {
      // Step 2: Balance by amount
      const amountA = betsA.reduce((sum, b) => sum + b.amountLiang, 0);
      const amountB = betsB.reduce((sum, b) => sum + b.amountLiang, 0);

      if (amountA < amountB) {
        teamBetOn = "A";
      } else if (amountB < amountA) {
        teamBetOn = "B";
      } else {
        // Step 3: Tiebreaker — "A" < "B", always Team A
        teamBetOn = "A";
      }
    }

    placements.push({ memberId, teamBetOn });
    allBets.push({ memberId, teamBetOn, amountLiang: 1 });
  }

  return placements;
}
