/**
 * Synchronous solver interface for main-thread usage.
 * Will be replaced with Web Worker in a later phase.
 */
import { CubeState, createSolvedState, cloneState, applyMove, applyMoves } from "./cube-state";
import { parseScramble } from "@/lib/notation";
import { generateCrossMoveTable, generateCornerMoveTable, generateEdgeMoveTable } from "./moves";
import {
  generateCrossPruningTable,
  generateCrossCornerPruningTable,
  generateCrossEdgePruningTable,
} from "./pruning";
import { solveCross } from "./cross-solver";
import { solveXCross, solveAllXCross } from "./xcross-solver";
import { detectPairs, areSlotsAdjacent } from "./pair";
import { NUM_CORNERS, NUM_EDGES } from "./constants";
import {
  Solution, SolverType, Slot, CrossColor, Move, MOVE_COUNT, PairInfo,
} from "./types";

export function initMoveTables(): void {
  generateCrossMoveTable();
  generateCornerMoveTable();
  generateEdgeMoveTable();
}

export function initCrossPruningTable(): void {
  generateCrossPruningTable();
}

export function initXCrossPruningTables(cornerPiece: number, edgePiece: number): void {
  generateCrossCornerPruningTable(cornerPiece);
  generateCrossEdgePruningTable(edgePiece);
}

// ---------------------------------------------------------------------------
// Move remapping for cross color selection
// ---------------------------------------------------------------------------
// When solving cross on a non-D face, we apply a whole-cube rotation so that
// the target face maps to D.  Since the solver only knows face moves, we
// express the rotation as a move-remapping table: for each of the 18 moves we
// say which move it becomes after the rotation is applied.
//
// Rotation needed per color (target -> D):
//   White  (D): identity
//   Yellow (U): x2   (U<->D, F<->B)
//   Green  (F): x'   (F->D->B->U->F, R stays, L stays)
//   Blue   (B): x    (B->D->F->U->B, R stays, L stays)
//   Red    (R): z     (R->D->L->U->R, F stays, B stays)
//   Orange (L): z'    (L->D->R->U->L, F stays, B stays)

/** Build a full 18-entry remap table from a face-level remap (6 entries). */
function buildRemapTable(faceMap: number[]): Move[] {
  // faceMap[originalFace] = newFace.  Variant (CW/CCW/180) stays the same.
  const table: Move[] = new Array(MOVE_COUNT);
  for (let m = 0; m < MOVE_COUNT; m++) {
    const face = (m / 3) | 0;
    const variant = m % 3;
    table[m] = faceMap[face] * 3 + variant;
  }
  return table;
}

// Face indices: U=0 D=1 R=2 L=3 F=4 B=5
const REMAP_IDENTITY = buildRemapTable([0, 1, 2, 3, 4, 5]);

// Whole-cube rotations are proper rotations, so CW/CCW/180 variant is
// preserved under face remapping — only the face index changes.
//
// faceMap[originalFace] = remappedFace

// x (CW around R axis): U->F->D->B->U, R=R, L=L
const REMAP_FOR_X = buildRemapTable([4, 5, 2, 3, 1, 0]);

// x' (CCW around R axis): U->B->D->F->U, R=R, L=L
const REMAP_FOR_X_PRIME = buildRemapTable([5, 4, 2, 3, 0, 1]);

// x2: U<->D, F<->B, R=R, L=L
const REMAP_FOR_X2 = buildRemapTable([1, 0, 2, 3, 5, 4]);

// z (CW around F axis): U->R->D->L->U, F=F, B=B
const REMAP_FOR_Z = buildRemapTable([2, 3, 1, 0, 4, 5]);

// z' (CCW around F axis): U->L->D->R->U, F=F, B=B
const REMAP_FOR_Z_PRIME = buildRemapTable([3, 2, 0, 1, 4, 5]);

/** Get the forward remap table for a given cross color. */
function getRemapForColor(color: CrossColor): Move[] {
  switch (color) {
    case CrossColor.White:  return REMAP_FOR_X2;     // x2: U->D (white=U in standard)
    case CrossColor.Yellow: return REMAP_IDENTITY;   // D already (yellow=D in standard)
    case CrossColor.Green:  return REMAP_FOR_X;       // x: F->D
    case CrossColor.Blue:   return REMAP_FOR_X_PRIME; // x': B->D
    case CrossColor.Red:    return REMAP_FOR_Z;      // z: R->D
    case CrossColor.Orange: return REMAP_FOR_Z_PRIME; // z': L->D
    default: return REMAP_IDENTITY;
  }
}

/** Build the inverse remap table. */
function invertRemap(remap: Move[]): Move[] {
  const inv: Move[] = new Array(MOVE_COUNT);
  for (let m = 0; m < MOVE_COUNT; m++) {
    inv[remap[m]] = m;
  }
  return inv;
}

/** Remap an array of moves using the given table. */
function remapMoves(moves: Move[], table: Move[]): Move[] {
  return moves.map((m) => table[m]);
}

export function solve(
  scramble: string,
  solverType: SolverType,
  slots: Slot[],
  maxExtraDepth: number,
  crossColor: CrossColor = CrossColor.White,
  pairInfos?: PairInfo[],
): Solution[] {
  const rawMoves = parseScramble(scramble);

  // Remap scramble moves so the target cross color face maps to D
  const fwdRemap = getRemapForColor(crossColor);
  const invRemap = invertRemap(fwdRemap);
  const remappedMoves = remapMoves(rawMoves, fwdRemap);

  const state = createSolvedState();
  applyMoves(state, remappedMoves);

  let results: Solution[];
  if (solverType === SolverType.Cross) {
    results = solveCross(state, maxExtraDepth);
  } else if (solverType === SolverType.XCross) {
    if (pairInfos && pairInfos.length > 0) {
      const physicalState = createSolvedState();
      applyMoves(physicalState, rawMoves);

      results = [];
      for (const pair of pairInfos) {
        // Map pair's corner to the correct solver slot
        const solverSlot = pairToSolverSlot(pair.cornerPiece, crossColor);
        if (solverSlot === null) continue;

        let pairOptimal: number | null = null;
        const maxSearch = 8 + maxExtraDepth;

        const allSolutions = solveXCross(state, solverSlot, maxSearch);
        for (const sol of allSolutions) {
          const physicalMoves = remapMoves(sol.moves, invRemap);

          if (isPairPreservedAndInserted(physicalState, physicalMoves, pair.cornerPiece, pair.edgePiece)) {
            if (pairOptimal === null) pairOptimal = sol.length;
            if (sol.length <= pairOptimal + maxExtraDepth) {
              sol.isOptimal = sol.length === pairOptimal;
              sol.slot = solverSlot;
              results.push(sol);
            }
          }
        }
      }
    } else {
      results = solveAllXCross(state, slots, maxExtraDepth);
    }
  } else {
    return [];
  }

  // Tag with color (solution moves stay in solving frame)
  for (const sol of results) {
    sol.crossColor = crossColor;
  }

  return results;
}

// Corner home slot → solver-frame D-layer slot, per cross color rotation.
// x2 swaps: 0↔7, 1↔6, 2↔5, 3↔4
// x:  0→4, 1→5, 5→6, 4→7
// x': 3→7, 2→6, 6→5, 7→4
const CORNER_SLOT_MAP: Record<number, Map<number, number>> = {
  [CrossColor.White]:  new Map([[0,7],[1,6],[2,5],[3,4]]),   // x2
  [CrossColor.Yellow]: new Map([[4,4],[5,5],[6,6],[7,7]]),   // identity
  [CrossColor.Green]:  new Map([[0,4],[1,5],[5,6],[4,7]]),   // x
  [CrossColor.Blue]:   new Map([[3,7],[2,6],[6,5],[7,4]]),   // x'
  [CrossColor.Red]:    new Map([[0,4],[3,7],[7,6],[4,1]]),   // z (4→1 is U-layer, won't work)
  [CrossColor.Orange]: new Map([[1,3],[2,2],[6,1],[5,4]]),   // z'
};

function pairToSolverSlot(cornerPiece: number, crossColor: CrossColor): Slot | null {
  const map = CORNER_SLOT_MAP[crossColor];
  const solverCornerSlot = map?.get(cornerPiece);
  if (solverCornerSlot === undefined || solverCornerSlot < 4 || solverCornerSlot > 7) return null;
  return (solverCornerSlot - 4) as Slot;
}

/**
 * Check if a pair stays adjacent throughout AND both pieces end up at their home slots.
 * This ensures the pair is actually "used" (inserted into its F2L slot).
 */
function isPairPreservedAndInserted(
  physicalState: CubeState,
  physicalMoves: Move[],
  cornerPiece: number,
  edgePiece: number,
): boolean {
  const state = cloneState(physicalState);

  for (const m of physicalMoves) {
    applyMove(state, m);

    let cornerSlot = -1;
    for (let i = 0; i < NUM_CORNERS; i++) {
      if (state.cp[i] === cornerPiece) { cornerSlot = i; break; }
    }
    let edgeSlot = -1;
    for (let i = 0; i < NUM_EDGES; i++) {
      if (state.ep[i] === edgePiece) { edgeSlot = i; break; }
    }

    if (!areSlotsAdjacent(cornerSlot, edgeSlot)) return false;
  }

  // Verify the corner ended up at its home slot with correct orientation
  if (state.cp[cornerPiece] !== cornerPiece || state.co[cornerPiece] !== 0) return false;
  // Verify the edge ended up at its home slot with correct orientation
  if (state.ep[edgePiece] !== edgePiece || state.eo[edgePiece] !== 0) return false;

  return true;
}

/**
 * Detect existing F2L pairs in the PHYSICAL scrambled state for a given cross color.
 */
export function findPairs(scramble: string, crossColor: CrossColor = CrossColor.White): PairInfo[] {
  const rawMoves = parseScramble(scramble);
  const state = createSolvedState();
  applyMoves(state, rawMoves); // no remap - physical state
  return detectPairs(state, crossColor);
}
