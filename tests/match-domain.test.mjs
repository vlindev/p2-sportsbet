/**
 * Match domain helper tests.
 *
 * Run: node tests/match-domain.test.mjs
 */

import { canEnterPoolResult } from "../src/lib/match-domain.ts";

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label} — expected ${expected}, got ${actual}`);
  }
}

console.log("\n=== canEnterPoolResult ===");

assertEqual(canEnterPoolResult("active", "pending"), true, "active pending pool can enter result");
assertEqual(canEnterPoolResult("completed", "pending"), true, "completed pending pool can enter result");
assertEqual(canEnterPoolResult("scheduled", "pending"), false, "scheduled pool cannot enter result");
assertEqual(canEnterPoolResult("betting_closed", "pending"), false, "betting_closed pool cannot enter result");
assertEqual(canEnterPoolResult("cancelled", "pending"), false, "cancelled pool cannot enter result");
assertEqual(canEnterPoolResult("active", "team_a"), false, "resolved team_a pool cannot enter new result");
assertEqual(canEnterPoolResult("completed", "team_b"), false, "resolved team_b pool cannot enter new result");
assertEqual(canEnterPoolResult("active", null), true, "null pool result is treated as unresolved");

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
