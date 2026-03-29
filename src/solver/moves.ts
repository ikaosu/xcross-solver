import {
  CubeState,
  createSolvedState,
  cloneState,
  applyMove,
  getCrossCoord,
  getCornerCoord,
  getEdgeCoord,
  CROSS_COORD_SIZE,
  CORNER_COORD_SIZE,
  EDGE_COORD_SIZE,
} from "./cube-state";
import { MOVE_COUNT, Move, moveFace } from "./types";

// ============================================================
// Move tables: precomputed coordinate transitions
// moveTable[coord * MOVE_COUNT + move] = newCoord
// ============================================================

let crossMoveTable: Int32Array | null = null;
let cornerMoveTable: Int32Array | null = null;
let edgeMoveTable: Int32Array | null = null;

// ============================================================
// Cross coordinate decoder
// ============================================================

/**
 * Decode cross perm coordinate back to the 4 edge positions.
 * Encoding: coord = ((rank[0] * 11 + rank[1]) * 10 + rank[2]) * 9 + rank[3]
 * Bases: 12, 11, 10, 9 (decreasing)
 */
function decodeCrossPermCoord(permCoord: number, positions: number[]): void {
  // Decode mixed-radix digits (reverse order)
  const ranks = [0, 0, 0, 0];
  let remaining = permCoord;
  ranks[3] = remaining % 9;  remaining = (remaining / 9) | 0;
  ranks[2] = remaining % 10; remaining = (remaining / 10) | 0;
  ranks[1] = remaining % 11; remaining = (remaining / 11) | 0;
  ranks[0] = remaining; // 0..11

  // Convert ranks to positions using "used" tracking
  const used = new Uint8Array(12);
  for (let i = 0; i < 4; i++) {
    let count = 0;
    for (let j = 0; j < 12; j++) {
      if (!used[j]) {
        if (count === ranks[i]) {
          positions[i] = j;
          used[j] = 1;
          break;
        }
        count++;
      }
    }
  }
}

/**
 * Build a minimal CubeState that only has the cross edges set correctly.
 * Other pieces are in default positions (won't affect cross coordinate).
 */
function buildCrossState(crossCoord: number): CubeState {
  const permCoord = (crossCoord / 16) | 0;
  const oriCoord = crossCoord % 16;

  const state = createSolvedState();
  const positions = [0, 0, 0, 0];
  decodeCrossPermCoord(permCoord, positions);

  // Clear edge positions first - place non-cross edges
  // We only need cross pieces in the right slots for coordinate computation
  // Reset all edge positions to "not a cross edge"
  for (let i = 0; i < 12; i++) {
    state.ep[i] = i;
    state.eo[i] = 0;
  }

  // Place cross edge pieces (4,5,6,7) at decoded positions
  // First, mark the target positions by swapping
  for (let i = 0; i < 4; i++) {
    const piece = 4 + i; // DR=4, DF=5, DL=6, DB=7
    const targetSlot = positions[i];
    const ori = (oriCoord >> i) & 1;

    // Swap: put piece at targetSlot
    const currentSlot = piece; // In default state, piece i is at slot i
    // We need to carefully swap to avoid conflicts
    const displaced = state.ep[targetSlot];
    state.ep[targetSlot] = piece;
    state.ep[currentSlot] = displaced;
    state.eo[targetSlot] = ori;
  }

  return state;
}

/**
 * Generate the cross coordinate move table by decoding each coordinate,
 * applying each move, and re-encoding.
 */
export function generateCrossMoveTable(): Int32Array {
  if (crossMoveTable) return crossMoveTable;

  const size = CROSS_COORD_SIZE; // 190,080
  const table = new Int32Array(size * MOVE_COUNT);

  // For efficiency, build a small set of base states and use them
  // Actually, the simplest correct approach: iterate all coordinates
  const positions = [0, 0, 0, 0];

  for (let permCoord = 0; permCoord < 11880; permCoord++) {
    decodeCrossPermCoord(permCoord, positions);

    for (let oriCoord = 0; oriCoord < 16; oriCoord++) {
      const coord = permCoord * 16 + oriCoord;

      // Build state: directly assign edge permutation
      // Cross pieces (4,5,6,7) go to their decoded positions
      // Non-cross edges fill remaining slots in order
      const state = createSolvedState();
      const ep = state.ep;
      const eo = state.eo;

      // Mark which slots are occupied by cross pieces
      const crossSlots = new Set<number>();
      for (let i = 0; i < 4; i++) crossSlots.add(positions[i]);

      // Place cross pieces
      for (let i = 0; i < 4; i++) {
        ep[positions[i]] = 4 + i;
        eo[positions[i]] = (oriCoord >> i) & 1;
      }

      // Fill remaining slots with non-cross edges (0,1,2,3,8,9,10,11)
      const nonCross = [0, 1, 2, 3, 8, 9, 10, 11];
      let ncIdx = 0;
      for (let s = 0; s < 12; s++) {
        if (!crossSlots.has(s)) {
          ep[s] = nonCross[ncIdx];
          eo[s] = 0;
          ncIdx++;
        }
      }

      // Apply each move and compute new coordinate
      for (let m = 0; m < MOVE_COUNT; m++) {
        const newState = cloneState(state);
        applyMove(newState, m);
        table[coord * MOVE_COUNT + m] = getCrossCoord(newState);
      }
    }
  }

  crossMoveTable = table;
  return table;
}

/**
 * Generate corner coordinate move table.
 * cornerCoord = slot * 3 + orientation, range [0, 24)
 */
export function generateCornerMoveTable(): Int32Array {
  if (cornerMoveTable) return cornerMoveTable;

  const size = CORNER_COORD_SIZE; // 24
  const table = new Int32Array(size * MOVE_COUNT);

  for (let startCoord = 0; startCoord < size; startCoord++) {
    const startSlot = (startCoord / 3) | 0;
    const startOri = startCoord % 3;

    for (let m = 0; m < MOVE_COUNT; m++) {
      const s = createSolvedState();
      // Put piece 0 at startSlot with startOri
      if (startSlot !== 0) {
        s.cp[0] = s.cp[startSlot];
        s.co[0] = 0;
        s.cp[startSlot] = 0;
      }
      s.co[startSlot] = startOri;

      applyMove(s, m);

      table[startCoord * MOVE_COUNT + m] = getCornerCoord(s, 0);
    }
  }

  cornerMoveTable = table;
  return table;
}

/**
 * Generate edge coordinate move table.
 * edgeCoord = slot * 2 + orientation, range [0, 24)
 */
export function generateEdgeMoveTable(): Int32Array {
  if (edgeMoveTable) return edgeMoveTable;

  const size = EDGE_COORD_SIZE; // 24
  const table = new Int32Array(size * MOVE_COUNT);

  for (let startCoord = 0; startCoord < size; startCoord++) {
    const startSlot = (startCoord / 2) | 0;
    const startOri = startCoord % 2;

    for (let m = 0; m < MOVE_COUNT; m++) {
      const s = createSolvedState();
      // Put piece 0 at startSlot with startOri
      if (startSlot !== 0) {
        s.ep[0] = s.ep[startSlot];
        s.eo[0] = 0;
        s.ep[startSlot] = 0;
      }
      s.eo[startSlot] = startOri;

      applyMove(s, m);

      table[startCoord * MOVE_COUNT + m] = getEdgeCoord(s, 0);
    }
  }

  edgeMoveTable = table;
  return table;
}

// ============================================================
// Move pruning: avoid redundant move sequences
// ============================================================

/**
 * Check if a move should be pruned given the last move.
 */
export function shouldPruneMove(move: Move, lastMove: Move): boolean {
  if (lastMove < 0) return false;
  const curFace = moveFace(move);
  const lastFace = moveFace(lastMove);
  if (curFace === lastFace) return true;
  // Opposite faces: U(0)/D(1), R(2)/L(3), F(4)/B(5)
  if ((curFace ^ lastFace) === 1 && curFace < lastFace) return true;
  return false;
}
