import { describe, it, expect } from "vitest";
import { autoPlaceMonday, ExistingBet } from "../src/lib/auto-placement";

describe("autoPlaceMonday — R10.4", () => {
  // --- Step 1: Balance by count ---

  it("assigns to side with fewer bettors", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p2", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p3", teamBetOn: "B", amountLiang: 5 },
    ];
    const result = autoPlaceMonday(existing, ["m1"]);
    expect(result).toEqual([{ memberId: "m1", teamBetOn: "B" }]);
  });

  it("balances count first, then switches sides", () => {
    // A: 3 bettors, B: 1 bettor, 4 unplaced
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p2", teamBetOn: "A", amountLiang: 2 },
      { memberId: "p3", teamBetOn: "A", amountLiang: 1 },
      { memberId: "p4", teamBetOn: "B", amountLiang: 5 },
    ];
    const result = autoPlaceMonday(existing, ["m1", "m2", "m3", "m4"]);
    // First 2 go to B (fewer count), then counts are equal (3 vs 3)
    expect(result[0].teamBetOn).toBe("B");
    expect(result[1].teamBetOn).toBe("B");
    // After: A=3 bettors 8兩, B=3 bettors 7兩 → Step 2: B has less → m3 to B
    expect(result[2].teamBetOn).toBe("B");
    // After: A=3 bettors 8兩, B=4 bettors 8兩 → Step 1: A has less → m4 to A
    expect(result[3].teamBetOn).toBe("A");
  });

  // --- Session 20 verified example ---

  it("matches Session 20 scenario: 30A/25B with 10 unplaced (per-member recalc)", () => {
    // A: 30 bettors, 50兩. B: 25 bettors, 60兩. 10 unplaced.
    const existing: ExistingBet[] = [];
    for (let i = 0; i < 30; i++) existing.push({ memberId: `a${i}`, teamBetOn: "A", amountLiang: 0 });
    for (let i = 0; i < 25; i++) existing.push({ memberId: `b${i}`, teamBetOn: "B", amountLiang: 0 });
    existing[0].amountLiang = 50;
    existing[30].amountLiang = 60;

    const unplaced = Array.from({ length: 10 }, (_, i) => `m${i}`);
    const result = autoPlaceMonday(existing, unplaced);

    // m0–m4: B has fewer count (30 vs 25..29) → all to B
    for (let i = 0; i < 5; i++) expect(result[i].teamBetOn).toBe("B");
    // After: A=30 bettors 50兩, B=30 bettors 65兩
    // R10.4: recalculate per member, so placements alternate:
    // m5: 30v30 count, 50v65 amount → A (less). A=31,51
    expect(result[5].teamBetOn).toBe("A");
    // m6: 31v30 count → B (fewer). B=31,66
    expect(result[6].teamBetOn).toBe("B");
    // m7: 31v31 count, 51v66 amount → A. A=32,52
    expect(result[7].teamBetOn).toBe("A");
    // m8: 32v31 count → B. B=32,67
    expect(result[8].teamBetOn).toBe("B");
    // m9: 32v32 count, 52v67 amount → A. A=33,53
    expect(result[9].teamBetOn).toBe("A");
    // Final: A=33 bettors 53兩, B=32 bettors 67兩
    expect(result.filter(r => r.teamBetOn === "A").length).toBe(3);
    expect(result.filter(r => r.teamBetOn === "B").length).toBe(7);
  });

  // --- Step 2: Balance by amount ---

  it("uses amount when counts are equal", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p2", teamBetOn: "A", amountLiang: 1 }, // A total: 6
      { memberId: "p3", teamBetOn: "B", amountLiang: 5 },
      { memberId: "p4", teamBetOn: "B", amountLiang: 5 }, // B total: 10
    ];
    const result = autoPlaceMonday(existing, ["m1"]);
    // Counts equal (2 vs 2), A has less amount → assign to A
    expect(result).toEqual([{ memberId: "m1", teamBetOn: "A" }]);
  });

  // --- Step 3: Tiebreaker ---

  it("defaults to Team A when counts and amounts are equal", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p2", teamBetOn: "B", amountLiang: 5 },
    ];
    const result = autoPlaceMonday(existing, ["m1"]);
    expect(result).toEqual([{ memberId: "m1", teamBetOn: "A" }]);
  });

  it("tiebreaker with multiple placements alternates correctly", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p2", teamBetOn: "B", amountLiang: 5 },
    ];
    const result = autoPlaceMonday(existing, ["m1", "m2"]);
    // m1: counts 1v1, amounts 5v5 → tiebreaker → A
    expect(result[0].teamBetOn).toBe("A");
    // After: A=2 bettors 6兩, B=1 bettor 5兩 → m2 goes to B (fewer count)
    expect(result[1].teamBetOn).toBe("B");
  });

  // --- Edge cases ---

  it("returns empty array when no members need placement", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
    ];
    expect(autoPlaceMonday(existing, [])).toEqual([]);
  });

  it("handles no existing bets (all members unplaced)", () => {
    const result = autoPlaceMonday([], ["m1", "m2", "m3"]);
    // m1: 0v0 count, 0v0 amount → tiebreaker → A
    expect(result[0].teamBetOn).toBe("A");
    // m2: A=1, B=0 → B
    expect(result[1].teamBetOn).toBe("B");
    // m3: 1v1 count, 1v1 amount → tiebreaker → A
    expect(result[2].teamBetOn).toBe("A");
  });

  it("counts unique bettors not bet count (member with multiple bets)", () => {
    // Member p1 has both a mandatory_self and voluntary on A
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
      { memberId: "p1", teamBetOn: "A", amountLiang: 2 }, // same member, second bet
      { memberId: "p2", teamBetOn: "B", amountLiang: 5 },
    ];
    const result = autoPlaceMonday(existing, ["m1"]);
    // Count: A=1 unique, B=1 unique (equal)
    // Amount: A=7, B=5 → B has less → assign to B
    expect(result).toEqual([{ memberId: "m1", teamBetOn: "B" }]);
  });

  it("does not mutate input arrays", () => {
    const existing: ExistingBet[] = [
      { memberId: "p1", teamBetOn: "A", amountLiang: 5 },
    ];
    const unplaced = ["m1", "m2"];
    const existingCopy = [...existing];
    const unplacedCopy = [...unplaced];
    autoPlaceMonday(existing, unplaced);
    expect(existing).toEqual(existingCopy);
    expect(unplaced).toEqual(unplacedCopy);
  });
});
