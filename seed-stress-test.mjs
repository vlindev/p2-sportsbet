// Temporary script — run with: node seed-stress-test.mjs
// Delete after use
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Generate 85 members
const members = [];
const names = [
  "林志明","陳玉華","黃建宏","張淑芬","王志強","李美玲","吳承翰","蔡佳穎","鄭文彬","許雅婷",
  "周俊傑","林佳蓉","陳建志","黃雅惠","張家豪","王淑玲","劉俊宏","蔡雅琪","鄭志偉","許美華",
  "周建國","林淑惠","陳俊賢","黃佳蓉","張志明","王雅芳","劉建宏","蔡淑玲","鄭家豪","許佳琪",
  "周文傑","林雅婷","陳志強","黃美玲","張承翰","王佳穎","劉志偉","蔡雅惠","鄭俊傑","許淑芬",
  "周建志","林玉華","陳家豪","黃佳琪","張文傑","王淑惠","劉俊賢","蔡美華","鄭建國","許雅芳",
  "周志明","林淑玲","陳文彬","黃雅琪","張建宏","王佳蓉","劉志明","蔡淑芬","鄭承翰","許美玲",
  "周俊宏","林雅惠","陳佳穎","黃志強","張雅婷","王俊傑","劉淑惠","蔡志偉","鄭佳蓉","許建宏",
  "周美華","林建國","陳雅芳","黃俊賢","張淑玲","王志偉","劉佳琪","蔡家豪","鄭雅婷","許文傑",
  "周淑芬","林志強","陳美玲","黃承翰","張佳穎",
];

for (let i = 1; i <= 85; i++) {
  members.push({
    id: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, "0")}`,
    name: `STRESS ${names[i - 1]}`,
    phone: `0911-000-${String(i).padStart(3, "0")}`,
    active: true,
  });
}

// 1 match
const matchId = "bbbbbbbb-0000-0000-0000-000000000001";
const match = {
  id: matchId,
  date: "2026-02-23",
  start_time: "07:00",
  match_type: "monday",
  team_a_player1_id: members[0].id,
  team_a_player2_id: members[1].id,
  team_b_player1_id: members[2].id,
  team_b_player2_id: members[3].id,
  handicap_type: "讓點",
  handicap_value: 2,
  handicap_team: "A",
  capacity_zhi: null,
  result: "team_a",
  status: "completed",
};

// Generate 85 bets
const bets = [];
const amounts = [1, 2, 3, 4, 5];

// 4 players: mandatory self-bet
bets.push({ match_id: matchId, member_id: members[0].id, team_bet_on: "A", amount_liang: 5, bet_type: "mandatory_self", result: "win"});
bets.push({ match_id: matchId, member_id: members[1].id, team_bet_on: "A", amount_liang: 5, bet_type: "mandatory_self", result: "win"});
bets.push({ match_id: matchId, member_id: members[2].id, team_bet_on: "B", amount_liang: 5, bet_type: "mandatory_self", result: "loss"});
bets.push({ match_id: matchId, member_id: members[3].id, team_bet_on: "B", amount_liang: 5, bet_type: "mandatory_self", result: "loss"});

// 38 voluntary on Team A (win)
for (let i = 4; i < 42; i++) {
  bets.push({ match_id: matchId, member_id: members[i].id, team_bet_on: "A", amount_liang: amounts[i % 5], bet_type: "voluntary", result: "win"});
}

// 33 voluntary on Team B (loss)
for (let i = 42; i < 75; i++) {
  bets.push({ match_id: matchId, member_id: members[i].id, team_bet_on: "B", amount_liang: amounts[i % 5], bet_type: "voluntary", result: "loss"});
}

// 7 mandatory_monday on Team B (loss)
for (let i = 75; i < 82; i++) {
  bets.push({ match_id: matchId, member_id: members[i].id, team_bet_on: "B", amount_liang: 1, bet_type: "mandatory_monday", result: "loss"});
}

// 3 voided bets (inserted as active, then voided after insert)
for (let i = 82; i < 85; i++) {
  bets.push({ match_id: matchId, member_id: members[i].id, team_bet_on: "A", amount_liang: amounts[i % 5], bet_type: "voluntary", result: "win", status: "voided", void_reason: "legacy_invalidated" });
}

async function seed() {
  console.log(`Inserting ${members.length} members...`);
  const { error: memErr } = await supabase.from("members").insert(members);
  if (memErr) { console.error("Members insert failed:", memErr); return; }

  console.log("Inserting match...");
  const { error: matchErr } = await supabase.from("matches").insert(match);
  if (matchErr) { console.error("Match insert failed:", matchErr); return; }

  console.log(`Inserting ${bets.length} bets...`);
  const { error: betErr } = await supabase.from("bets").insert(bets);
  if (betErr) { console.error("Bets insert failed:", betErr); return; }

  console.log(`\nDone! ${members.length} members, 1 match, ${bets.length} bets (${bets.filter(b => b.status !== "voided").length} active, ${bets.filter(b => b.status === "voided").length} voided)`);
  console.log(`Match ID: ${matchId}`);
  console.log(`\nView at: http://localhost:3000/bets?match=${matchId}&from=completed`);
  console.log(`\nCleanup: run this in Supabase SQL editor:\n  DELETE FROM members WHERE name LIKE 'STRESS%';`);
}

seed();
