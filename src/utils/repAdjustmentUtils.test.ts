/**
 * Test suite for rep adjustment algorithm
 * 
 * Tests ensemble 1RM estimation and percentage table lookup
 */

import {
  getSuggestedReps,
  estimate1RM,
  estimate1RMForDisplay,
} from "./repAdjustmentUtils";

/**
 * Test helper to compare numbers with tolerance
 */
function approxEqual(a: number, b: number, tolerance: number = 0.1): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Test Case 1: Basic scenario with known values
 * User performed 100 kg x 8 reps, now lifting 110 kg
 * Expected: ~5-6 reps (getting heavier, so fewer reps)
 */
function testBasicScenario(): void {
  const lastWeight = 100;
  const lastReps = 8;
  const newWeight = 110;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 1 - Basic: 100kg x 8 → 110kg => ${suggested} reps (expected: 5-6)`,
  );
  console.assert(
    suggested >= 5 && suggested <= 6,
    `Expected 5-6 reps, got ${suggested}`,
  );
}

/**
 * Test Case 2: Same weight
 * User performed 80 kg x 10, lifting 80 kg
 * Expected: ~10 reps
 */
function testSameWeight(): void {
  const lastWeight = 80;
  const lastReps = 10;
  const newWeight = 80;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 2 - Same weight: 80kg x 10 → 80kg => ${suggested} reps (expected: 10)`,
  );
  console.assert(
    suggested === 10,
    `Expected 10 reps, got ${suggested}`,
  );
}

/**
 * Test Case 3: Much lighter weight (endurance)
 * User performed 100 kg x 8, lifting 60 kg
 * Expected: capped at 20 reps (algorithm should return something high but capped)
 */
function testLighterWeight(): void {
  const lastWeight = 100;
  const lastReps = 8;
  const newWeight = 60;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 3 - Lighter: 100kg x 8 → 60kg => ${suggested} reps (expected: 20, capped)`,
  );
  console.assert(
    suggested === 20,
    `Expected 20 reps (capped), got ${suggested}`,
  );
}

/**
 * Test Case 4: Single rep max (1 rep)
 * User performed 150 kg x 1, lifting 140 kg
 * Expected: 1-2 reps
 */
function testSingleRepMax(): void {
  const lastWeight = 150;
  const lastReps = 1;
  const newWeight = 140;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 4 - Single rep: 150kg x 1 → 140kg => ${suggested} reps (expected: 1-2)`,
  );
  console.assert(
    suggested >= 1 && suggested <= 2,
    `Expected 1-2 reps, got ${suggested}`,
  );
}

/**
 * Test Case 5: High reps (endurance range)
 * User performed 40 kg x 20, lifting 45 kg
 * Expected: ~15-18 reps
 */
function testHighReps(): void {
  const lastWeight = 40;
  const lastReps = 20;
  const newWeight = 45;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 5 - High reps: 40kg x 20 → 45kg => ${suggested} reps (expected: 15-18)`,
  );
  console.assert(
    suggested >= 15 && suggested <= 18,
    `Expected 15-18 reps, got ${suggested}`,
  );
}

/**
 * Test Case 6: Edge case - single rep
 * User performed 100 kg x 1, lifting 100 kg
 * Expected: 1 rep (same weight, single rep)
 */
function testSingleRepSameWeight(): void {
  const lastWeight = 100;
  const lastReps = 1;
  const newWeight = 100;

  const suggested = getSuggestedReps(lastWeight, lastReps, newWeight);
  console.log(
    `✓ Test 6 - Single rep same weight: 100kg x 1 → 100kg => ${suggested} reps (expected: 1)`,
  );
  console.assert(
    suggested === 1,
    `Expected 1 rep, got ${suggested}`,
  );
}

/**
 * Test Case 7: Invalid inputs
 * Test that function handles invalid inputs gracefully
 */
function testInvalidInputs(): void {
  // Zero weight
  const result1 = getSuggestedReps(0, 8, 100);
  console.log(
    `✓ Test 7a - Invalid (zero weight): 0kg x 8 → 100kg => ${result1} reps (expected: 1)`,
  );
  console.assert(result1 === 1, `Expected 1 rep for invalid input`);

  // Negative weight
  const result2 = getSuggestedReps(100, -8, 100);
  console.log(
    `✓ Test 7b - Invalid (negative reps): 100kg x -8 → 100kg => ${result2} reps (expected: 1)`,
  );
  console.assert(result2 === 1, `Expected 1 rep for invalid input`);

  // NaN
  const result3 = getSuggestedReps(NaN, 8, 100);
  console.log(
    `✓ Test 7c - Invalid (NaN): NaNkg x 8 → 100kg => ${result3} reps (expected: 1)`,
  );
  console.assert(result3 === 1, `Expected 1 rep for invalid input`);
}

/**
 * Test Case 8: 1RM estimate variations
 * Verify ensemble estimation is different from just Epley
 */
function test1RMEstimates(): void {
  const lastWeight = 100;
  const lastReps = 10;

  const ensemble1RM = estimate1RM(lastWeight, lastReps);
  const epley1RM = estimate1RMForDisplay(lastWeight, lastReps);

  console.log(
    `✓ Test 8 - 1RM estimates: 100kg x 10 => Ensemble: ${ensemble1RM.toFixed(1)}kg, Epley: ${epley1RM.toFixed(1)}kg`,
  );
  console.assert(
    Math.abs(ensemble1RM - epley1RM) > 0.1,
    `Ensemble and Epley should differ, got ${ensemble1RM} vs ${epley1RM}`,
  );
}

/**
 * Test Case 9: Progressive overload chain
 * Multiple sets with cascading weight changes
 */
function testProgressiveChain(): void {
  // First set: 100 kg x 8
  const set1LastWeight = 100;
  const set1LastReps = 8;
  const set1NewWeight = 105; // +5 kg

  const set1Reps = getSuggestedReps(set1LastWeight, set1LastReps, set1NewWeight);

  // Second set: Use result from first set as "last" data
  const set2LastWeight = set1NewWeight;
  const set2LastReps = set1Reps;
  const set2NewWeight = 110; // Another +5 kg

  const set2Reps = getSuggestedReps(set2LastWeight, set2LastReps, set2NewWeight);

  console.log(
    `✓ Test 9 - Progressive chain: 100x8 → 105x${set1Reps} → 110x${set2Reps}`,
  );
  console.assert(
    set1Reps > 0 && set1Reps <= 20,
    `Set 1 reps out of range: ${set1Reps}`,
  );
  console.assert(
    set2Reps > 0 && set2Reps <= 20,
    `Set 2 reps out of range: ${set2Reps}`,
  );
}

/**
 * Test Case 10: Typical workout progression
 * Mimics real-world progression (Bench Press progression)
 */
function testRealisticProgression(): void {
  const exercises = [
    // Week 1, Session 1: Warm-up sets
    { last: { weight: 60, reps: 5 }, new: 80, expected: "3-4" },
    // Working set
    { last: { weight: 80, reps: 10 }, new: 85, expected: "8-9" },
    // Back-off set
    { last: { weight: 85, reps: 8 }, new: 80, expected: "10-11" },
  ];

  console.log("✓ Test 10 - Realistic progression:");
  exercises.forEach((ex, idx) => {
    const suggested = getSuggestedReps(
      ex.last.weight,
      ex.last.reps,
      ex.new,
    );
    console.log(
      `  Set ${idx + 1}: ${ex.last.weight}kg x ${ex.last.reps} → ${ex.new}kg => ${suggested} reps (expected: ${ex.expected})`,
    );
  });
}

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log("🧪 Running Rep Adjustment Algorithm Tests...\n");

  try {
    testBasicScenario();
    testSameWeight();
    testLighterWeight();
    testSingleRepMax();
    testHighReps();
    testSingleRepSameWeight();
    testInvalidInputs();
    test1RMEstimates();
    testProgressiveChain();
    testRealisticProgression();

    console.log("\n✅ All tests completed!\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  // Running in Node.js
  runAllTests();
}
