/**
 * Comprehensive xcross verification.
 * Run with: npx tsx src/solver/verify-xcross.ts
 */
import { createSolvedState, cloneState, applyMoves, applyMove, isCrossSolved, isSlotSolved } from "./cube-state";
import { parseScramble, formatMoves } from "../lib/notation";
import { generateCrossPruningTable, generateCrossCornerPruningTable, generateCrossEdgePruningTable } from "./pruning";
import { generateCrossMoveTable, generateCornerMoveTable, generateEdgeMoveTable } from "./moves";
import { solveCross } from "./cross-solver";
import { solveXCross } from "./xcross-solver";
import { Slot, SLOT_NAMES, MOVE_COUNT } from "./types";
import { SLOT_CORNER, SLOT_EDGE } from "./constants";

// Init all tables
generateCrossMoveTable();
generateCornerMoveTable();
generateEdgeMoveTable();
generateCrossPruningTable();
for (const slot of [Slot.FR, Slot.FL, Slot.BL, Slot.BR]) {
  generateCrossCornerPruningTable(SLOT_CORNER[slot]);
  generateCrossEdgePruningTable(SLOT_EDGE[slot]);
}

// Generate random scrambles (simple: random moves, not random-state)
function randomScramble(length: number): number[] {
  const moves: number[] = [];
  let lastMove = -1;
  for (let i = 0; i < length; i++) {
    let m: number;
    do {
      m = Math.floor(Math.random() * MOVE_COUNT);
    } while (m >= 0 && lastMove >= 0 && Math.floor(m / 3) === Math.floor(lastMove / 3));
    moves.push(m);
    lastMove = m;
  }
  return moves;
}

console.log("=== Comprehensive XCross Verification ===\n");

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
const failures: string[] = [];

for (let trial = 0; trial < 50; trial++) {
  const scrambleMoves = randomScramble(20);
  const scrambleStr = formatMoves(scrambleMoves);
  const scrambledState = createSolvedState();
  applyMoves(scrambledState, scrambleMoves);

  for (const slot of [Slot.FR, Slot.FL, Slot.BL, Slot.BR]) {
    const solutions = solveXCross(cloneState(scrambledState), slot, 0); // only optimal

    if (solutions.length === 0) {
      // This shouldn't happen for xcross (always solvable)
      totalTests++;
      totalFailed++;
      failures.push(`Trial ${trial}, ${SLOT_NAMES[slot]}: NO SOLUTIONS FOUND for scramble ${scrambleStr}`);
      continue;
    }

    // Verify EVERY solution
    for (const sol of solutions) {
      totalTests++;
      const verifyState = cloneState(scrambledState);
      applyMoves(verifyState, sol.moves);

      const crossOk = isCrossSolved(verifyState);
      const cornerPiece = SLOT_CORNER[slot];
      const edgePiece = SLOT_EDGE[slot];
      const slotOk = isSlotSolved(verifyState, cornerPiece, edgePiece);

      if (crossOk && slotOk) {
        totalPassed++;
      } else {
        totalFailed++;
        const detail = `cross=${crossOk}, slot=${slotOk}`;
        failures.push(
          `Trial ${trial}, ${SLOT_NAMES[slot]}: ${formatMoves(sol.moves)} (${sol.length} moves) - ${detail}`
        );
        if (failures.length <= 5) {
          console.log(`  FAIL: scramble="${scrambleStr}"`);
          console.log(`        solution="${formatMoves(sol.moves)}" slot=${SLOT_NAMES[slot]}`);
          console.log(`        cross=${crossOk}, corner=${verifyState.cp[cornerPiece]}@co=${verifyState.co[cornerPiece]}, edge=${verifyState.ep[edgePiece]}@eo=${verifyState.eo[edgePiece]}`);
          console.log(`        Expected: corner=${cornerPiece}@co=0, edge=${edgePiece}@eo=0`);
        }
      }
    }
  }
}

console.log(`\nResults: ${totalPassed}/${totalTests} passed, ${totalFailed} failed`);
if (failures.length > 0) {
  console.log(`\nFirst ${Math.min(10, failures.length)} failures:`);
  for (const f of failures.slice(0, 10)) {
    console.log(`  ${f}`);
  }
}
