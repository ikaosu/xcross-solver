/**
 * Quick test script for the cross and xcross solver.
 * Run with: npx tsx src/solver/test-solver.ts
 */
import { createSolvedState, applyMoves, isCrossSolved, isSlotSolved } from "./cube-state";
import { parseScramble, formatMoves } from "../lib/notation";
import { generateCrossPruningTable, generateCrossCornerPruningTable, generateCrossEdgePruningTable } from "./pruning";
import { generateCrossMoveTable, generateCornerMoveTable, generateEdgeMoveTable } from "./moves";
import { solveCross } from "./cross-solver";
import { solveXCross } from "./xcross-solver";
import { Slot, SLOT_NAMES } from "./types";
import { SLOT_CORNER, SLOT_EDGE } from "./constants";

function testCrossSolver() {
  console.log("=== Cross Solver Test ===\n");

  console.time("Move & pruning tables");
  generateCrossMoveTable();
  generateCrossPruningTable();
  console.timeEnd("Move & pruning tables");

  const testCases = [
    { scramble: "D", expectedOptimal: 1 },
    { scramble: "D2", expectedOptimal: 1 },
    { scramble: "D R D' R'", expectedOptimal: 4 },
    { scramble: "R U R' F' U2 L D B' R2 U F2 D' L2 D F2 D R2 D2 F2", expectedOptimal: null },
  ];

  let pass = 0;
  for (const { scramble, expectedOptimal } of testCases) {
    const moves = parseScramble(scramble);
    const state = createSolvedState();
    applyMoves(state, moves);

    const solutions = solveCross(state, 2);
    const optimal = solutions.length > 0 ? solutions[0].length : -1;

    // Verify solution
    let verified = true;
    if (solutions.length > 0) {
      const verifyState = createSolvedState();
      applyMoves(verifyState, moves);
      applyMoves(verifyState, solutions[0].moves);
      verified = isCrossSolved(verifyState);
    }

    const optCheck = expectedOptimal === null || optimal === expectedOptimal;
    const ok = verified && optCheck;
    console.log(`  ${ok ? "✓" : "✗"} "${scramble}" → ${optimal} moves (${solutions.length} total)${!ok ? " FAIL" : ""}`);
    if (ok) pass++;
  }
  console.log(`\n  ${pass}/${testCases.length} passed\n`);
}

function testXCrossSolver() {
  console.log("=== XCross Solver Test (all 4 slots) ===\n");

  console.time("Additional tables");
  generateCornerMoveTable();
  generateEdgeMoveTable();
  // Generate tables for all 4 F2L slots
  const slots = [Slot.FR, Slot.FL, Slot.BL, Slot.BR];
  for (const slot of slots) {
    generateCrossCornerPruningTable(SLOT_CORNER[slot]);
    generateCrossEdgePruningTable(SLOT_EDGE[slot]);
  }
  console.timeEnd("Additional tables");

  const scramble = "R U R' F' U2 L D B' R2 U F2 D' L2 D F2 D R2 D2 F2";
  const moves = parseScramble(scramble);
  console.log(`\nScramble: ${scramble}\n`);

  for (const slot of slots) {
    const state = createSolvedState();
    applyMoves(state, moves);

    console.time(`  ${SLOT_NAMES[slot]} solve`);
    const solutions = solveXCross(state, slot, 2);
    console.timeEnd(`  ${SLOT_NAMES[slot]} solve`);

    const optimal = solutions.length > 0 ? solutions[0] : null;
    console.log(`  ${SLOT_NAMES[slot]}: ${solutions.length} solutions, optimal = ${optimal?.length ?? "N/A"} moves`);

    if (optimal) {
      console.log(`    Best: ${formatMoves(optimal.moves)}`);
      // Verify
      const verifyState = createSolvedState();
      applyMoves(verifyState, moves);
      applyMoves(verifyState, optimal.moves);
      const crossOk = isCrossSolved(verifyState);
      const slotOk = isSlotSolved(verifyState, SLOT_CORNER[slot], SLOT_EDGE[slot]);
      console.log(`    Verify: cross=${crossOk ? "✓" : "✗"}, slot=${slotOk ? "✓" : "✗"}`);
    }
    console.log();
  }
}

// Run
testCrossSolver();
testXCrossSolver();
