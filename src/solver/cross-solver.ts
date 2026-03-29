import {
  CubeState,
  createSolvedState,
  cloneState,
  applyMove,
  applyMoves,
  getCrossCoord,
  isCrossSolved,
} from "./cube-state";
import { Move, MOVE_COUNT, Solution, Slot } from "./types";
import { generateCrossMoveTable, shouldPruneMove } from "./moves";
import { getCrossPruningTable } from "./pruning";

/**
 * Solve the cross using IDA* with the cross pruning table.
 *
 * Returns all solutions from optimal length to optimal + maxExtraDepth.
 */
export function solveCross(
  scrambledState: CubeState,
  maxExtraDepth: number,
  onSolution?: (solution: Solution) => void,
): Solution[] {
  const pruningTable = getCrossPruningTable();
  const crossMoveTable = generateCrossMoveTable();

  const initialCoord = getCrossCoord(scrambledState);
  const initialHeuristic = pruningTable[initialCoord];

  // Already solved
  if (initialHeuristic === 0) {
    const sol: Solution = { moves: [], length: 0, isOptimal: true };
    onSolution?.(sol);
    return [sol];
  }

  const solutions: Solution[] = [];
  let optimalLength: number | null = null;
  const path: Move[] = [];
  const coordStack: number[] = [initialCoord];

  function search(depth: number, maxDepth: number, lastMove: Move): boolean {
    const coord = coordStack[depth];
    const h = pruningTable[coord];

    if (h === 0xff) return false; // unreachable state (shouldn't happen)
    if (h > maxDepth - depth) return false; // prune: can't reach goal in remaining moves

    if (depth === maxDepth) {
      if (h === 0) {
        // Found a solution
        const moveCopy = path.slice(0, depth);
        const isOptimal = optimalLength === null || depth === optimalLength;
        if (optimalLength === null) optimalLength = depth;
        const sol: Solution = { moves: moveCopy, length: depth, isOptimal };
        solutions.push(sol);
        onSolution?.(sol);
        return true;
      }
      return false;
    }

    let found = false;
    for (let m = 0; m < MOVE_COUNT; m++) {
      if (shouldPruneMove(m, lastMove)) continue;

      const newCoord = crossMoveTable[coord * MOVE_COUNT + m];
      if (newCoord < 0) continue;

      path[depth] = m;
      coordStack[depth + 1] = newCoord;
      if (search(depth + 1, maxDepth, m)) {
        found = true;
      }
    }

    return found;
  }

  // IDA*: increase depth limit from heuristic estimate
  for (let maxDepth = initialHeuristic; maxDepth <= 20; maxDepth++) {
    if (optimalLength !== null && maxDepth > optimalLength + maxExtraDepth) break;

    search(0, maxDepth, -1 as Move);
  }

  return solutions;
}
