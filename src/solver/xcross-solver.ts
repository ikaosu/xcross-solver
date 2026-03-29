import {
  CubeState,
  getCrossCoord,
  getCornerCoord,
  getEdgeCoord,
  CORNER_COORD_SIZE,
  EDGE_COORD_SIZE,
} from "./cube-state";
import { Move, MOVE_COUNT, Solution, Slot } from "./types";
import { SLOT_CORNER, SLOT_EDGE } from "./constants";
import {
  generateCrossMoveTable,
  generateCornerMoveTable,
  generateEdgeMoveTable,
  shouldPruneMove,
} from "./moves";
import {
  getCrossPruningTable,
  getCrossCornerPruningTable,
  getCrossEdgePruningTable,
} from "./pruning";

const MAX_SOLUTIONS_PER_DEPTH = 500;

export function solveXCross(
  scrambledState: CubeState,
  slot: Slot,
  maxExtraDepth: number,
  onSolution?: (solution: Solution) => void,
): Solution[] {
  const cornerPiece = SLOT_CORNER[slot];
  const edgePiece = SLOT_EDGE[slot];

  const crossPrune = getCrossPruningTable();
  const crossCornerPrune = getCrossCornerPruningTable(cornerPiece);
  const crossEdgePrune = getCrossEdgePruningTable(edgePiece);
  const crossMove = generateCrossMoveTable();
  const cornerMove = generateCornerMoveTable();
  const edgeMove = generateEdgeMoveTable();

  const initCross = getCrossCoord(scrambledState);
  const initCorner = getCornerCoord(scrambledState, cornerPiece);
  const initEdge = getEdgeCoord(scrambledState, edgePiece);

  const initH = heuristic(initCross, initCorner, initEdge);

  if (initH === 0) {
    const sol: Solution = { moves: [], length: 0, slot, isOptimal: true };
    onSolution?.(sol);
    return [sol];
  }

  const solutions: Solution[] = [];
  let optimalLength: number | null = null;
  let solutionsAtCurrentDepth = 0;
  const path: Move[] = [];

  const crossStack: number[] = [initCross];
  const cornerStack: number[] = [initCorner];
  const edgeStack: number[] = [initEdge];

  function heuristic(crossCoord: number, cornerCoord: number, edgeCoord: number): number {
    const h1 = crossPrune[crossCoord];
    const h2 = crossCornerPrune[crossCoord * CORNER_COORD_SIZE + cornerCoord];
    const h3 = crossEdgePrune[crossCoord * EDGE_COORD_SIZE + edgeCoord];
    return Math.max(h1 === 0xff ? 99 : h1, h2 === 0xff ? 99 : h2, h3 === 0xff ? 99 : h3);
  }

  const goalCornerCoord = cornerPiece * 3 + 0;
  const goalEdgeCoord = edgePiece * 2 + 0;

  function isGoal(crossCoord: number, cornerCoord: number, edgeCoord: number): boolean {
    return crossPrune[crossCoord] === 0 &&
           cornerCoord === goalCornerCoord &&
           edgeCoord === goalEdgeCoord;
  }

  function search(depth: number, maxDepth: number, lastMove: Move): boolean {
    if (solutionsAtCurrentDepth >= MAX_SOLUTIONS_PER_DEPTH) return true;

    const cc = crossStack[depth];
    const cnr = cornerStack[depth];
    const edg = edgeStack[depth];

    const h = heuristic(cc, cnr, edg);
    if (h > maxDepth - depth) return false;

    if (depth === maxDepth) {
      if (isGoal(cc, cnr, edg)) {
        const moveCopy = path.slice(0, depth);
        const isOptimal = optimalLength === null || depth === optimalLength;
        if (optimalLength === null) optimalLength = depth;
        const sol: Solution = { moves: moveCopy, length: depth, slot, isOptimal };
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

      const newCross = crossMove[cc * MOVE_COUNT + m];
      if (newCross < 0) continue;
      const newCorner = cornerMove[cnr * MOVE_COUNT + m];
      const newEdge = edgeMove[edg * MOVE_COUNT + m];

      path[depth] = m;
      crossStack[depth + 1] = newCross;
      cornerStack[depth + 1] = newCorner;
      edgeStack[depth + 1] = newEdge;

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

/**
 * Solve xcross for all specified slots.
 */
export function solveAllXCross(
  scrambledState: CubeState,
  slots: Slot[],
  maxExtraDepth: number,
  onSolution?: (solution: Solution) => void,
): Solution[] {
  const allSolutions: Solution[] = [];
  for (const slot of slots) {
    const solutions = solveXCross(scrambledState, slot, maxExtraDepth);
    for (const sol of solutions) {
      allSolutions.push(sol);
      onSolution?.(sol);
    }
  }
  return allSolutions;
}
