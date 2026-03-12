export type BetEntryMember = { id: string; name: string; active: boolean };

export type NewBetEntry = {
  teamBetOn: "A" | "B";
  amountLiang: 1 | 2 | null;
};
