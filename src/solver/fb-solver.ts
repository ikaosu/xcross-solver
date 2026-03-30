/**
 * IDA* solver for Roux First Block (1x2x3 on D-L).
 *
 * Multi-goal: accepts block at any of 4 L-layer positions.
 * Each solution records goalIdx (0=home, 1=L, 2=L2, 3=L') so the
 * caller can determine the correct physical rotation prefix.
 */

import { CubeState } from "./cube-state";
import {
  getFBEdgeCoord,
  getFBCornerCoord,
  FB_CORNER_COORD_SIZE,
  getFBPruningTable,
  getFBEdgeMoveTableCached,
  getFBCornerMoveTableCached,
  getFBGoalCoords,
} from "./fb-coords";
import { Move, MOVE_COUNT, Solution, moveFace, Face } from "./types";
import { shouldPruneMove } from "./moves";

const MAX_SOLUTIONS_PER_DEPTH = 500;
const UNVISITED = 0xff;

export function solveFB(
  scrambledState: CubeState,
  maxExtraDepth: number,
  onSolution?: (solution: Solution) => void,
): Solution[] {
  const pruning = getFBPruningTable();
  const edgeMove = getFBEdgeMoveTableCached();
  const cornerMove = getFBCornerMoveTableCached();

  // Goal lookup: combined coord → goal index
  const goals = getFBGoalCoords();
  const goalMap = new Map<number, number>();
  for (let i = 0; i < goals.length; i++) goalMap.set(goals[i], i);

  const initEdge = getFBEdgeCoord(scrambledState);
  const initCorner = getFBCornerCoord(scrambledState);
  const initH = pruning[initEdge * FB_CORNER_COORD_SIZE + initCorner];

  if (initH === 0) {
    const coord = initEdge * FB_CORNER_COORD_SIZE + initCorner;
    const sol: Solution = { moves: [], length: 0, isOptimal: true, goalIdx: goalMap.get(coord) ?? 0 };
    onSolution?.(sol);
    return [sol];
  }

  const solutions: Solution[] = [];
  let optimalLength: number | null = null;
  let solutionsAtCurrentDepth = 0;
  const path: Move[] = [];
  const edgeStack: number[] = [initEdge];
  const cornerStack: number[] = [initCorner];

  function search(depth: number, maxDepth: number, lastMove: Move): boolean {
    if (solutionsAtCurrentDepth >= MAX_SOLUTIONS_PER_DEPTH) return true;

    const ec = edgeStack[depth];
    const cc = cornerStack[depth];
    const h = pruning[ec * FB_CORNER_COORD_SIZE + cc];

    if (h === UNVISITED) return false;
    if (h > maxDepth - depth) return false;

    if (depth === maxDepth) {
      if (h === 0) {
        // Filter trailing L/R (L rotates the block redundantly, R is a no-op for FB)
        if (depth > 0) {
          const lf = moveFace(path[depth - 1]);
          if (lf === Face.L || lf === Face.R) return false;
        }

        const coord = ec * FB_CORNER_COORD_SIZE + cc;
        const goalIdx = goalMap.get(coord) ?? 0;
        const moveCopy = path.slice(0, depth);
        const isOptimal = optimalLength === null || depth === optimalLength;
        if (optimalLength === null) optimalLength = depth;
        const sol: Solution = { moves: moveCopy, length: depth, isOptimal, goalIdx };
        solutions.push(sol);
        solutionsAtCurrentDepth++;
        onSolution?.(sol);
        return true;
      }
      return false;
    }

    let found = false;
    for (let m = 0; m < MOVE_COUNT; m++) {
      if (solutionsAtCurrentDepth >= MAX_SOLUTIONS_PER_DEPTH) return true;
      if (shouldPruneMove(m, lastMove)) continue;

      path[depth] = m;
      edgeStack[depth + 1] = edgeMove[ec * MOVE_COUNT + m];
      cornerStack[depth + 1] = cornerMove[cc * MOVE_COUNT + m];

      if (search(depth + 1, maxDepth, m)) {
        found = true;
      }
    }

    return found;
  }

  for (let maxDepth = initH; maxDepth <= 20; maxDepth++) {
    if (optimalLength !== null && maxDepth > optimalLength + maxExtraDepth) break;
    solutionsAtCurrentDepth = 0;
    search(0, maxDepth, -1 as Move);
  }

  return solutions;
}
