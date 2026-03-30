/**
 * FB (Roux First Block) coordinate system.
 *
 * First Block = 1x2x3 block on D-L side:
 *   Edges:   DL(6), FL(9), BL(10)
 *   Corners: DLF(5), DBL(6)
 *
 * Edge coordinate:   P(12,3) × 2³ = 1320 × 8 = 10,560
 * Corner coordinate: P(8,2)  × 3² =   56 × 9 =    504
 * Combined:          10,560 × 504 = 5,322,240
 */

import {
  CubeState,
  createSolvedState,
  cloneState,
  applyMove,
} from "./cube-state";
import { DL, FL, BL, DLF, DBL, NUM_EDGES, NUM_CORNERS } from "./constants";
import { MOVE_COUNT, MOVE_L, MOVE_L2, MOVE_L_PRIME } from "./types";

// ============================================================
// Constants
// ============================================================

const FB_EDGE_PIECES = [DL, FL, BL] as const;   // 6, 9, 10
const FB_CORNER_PIECES = [DLF, DBL] as const;   // 5, 6

export const FB_EDGE_PERM_SIZE = 1320;   // P(12,3) = 12×11×10
export const FB_EDGE_ORI_SIZE = 8;       // 2³
export const FB_EDGE_COORD_SIZE = FB_EDGE_PERM_SIZE * FB_EDGE_ORI_SIZE;  // 10,560

export const FB_CORNER_PERM_SIZE = 56;   // P(8,2) = 8×7
export const FB_CORNER_ORI_SIZE = 9;     // 3²
export const FB_CORNER_COORD_SIZE = FB_CORNER_PERM_SIZE * FB_CORNER_ORI_SIZE;  // 504

export const FB_COORD_SIZE = FB_EDGE_COORD_SIZE * FB_CORNER_COORD_SIZE;  // 5,322,240

// ============================================================
// Coordinate encoders
// ============================================================

export function getFBEdgeCoord(s: CubeState): number {
  // Find positions of the 3 FB edge pieces
  const pos = [0, 0, 0];
  for (let slot = 0; slot < NUM_EDGES; slot++) {
    const piece = s.ep[slot];
    if (piece === DL) pos[0] = slot;
    else if (piece === FL) pos[1] = slot;
    else if (piece === BL) pos[2] = slot;
  }

  // Lehmer code for 3 positions among 12
  let permCoord = 0;
  const used = new Uint8Array(12);
  for (let i = 0; i < 3; i++) {
    let rank = 0;
    for (let j = 0; j < pos[i]; j++) {
      if (!used[j]) rank++;
    }
    permCoord = permCoord * (12 - i) + rank;
    used[pos[i]] = 1;
  }

  // Orientation: 3-bit (DL=bit0, FL=bit1, BL=bit2)
  let oriCoord = 0;
  for (let slot = 0; slot < NUM_EDGES; slot++) {
    const piece = s.ep[slot];
    if (piece === DL) oriCoord |= (s.eo[slot] & 1);
    else if (piece === FL) oriCoord |= (s.eo[slot] & 1) << 1;
    else if (piece === BL) oriCoord |= (s.eo[slot] & 1) << 2;
  }

  return permCoord * FB_EDGE_ORI_SIZE + oriCoord;
}

export function getFBCornerCoord(s: CubeState): number {
  const pos = [0, 0];
  let dlf_ori = 0, dbl_ori = 0;
  for (let slot = 0; slot < NUM_CORNERS; slot++) {
    if (s.cp[slot] === DLF) { pos[0] = slot; dlf_ori = s.co[slot]; }
    else if (s.cp[slot] === DBL) { pos[1] = slot; dbl_ori = s.co[slot]; }
  }

  // Lehmer code for 2 positions among 8
  let permCoord = 0;
  const used = new Uint8Array(8);
  for (let i = 0; i < 2; i++) {
    let rank = 0;
    for (let j = 0; j < pos[i]; j++) {
      if (!used[j]) rank++;
    }
    permCoord = permCoord * (8 - i) + rank;
    used[pos[i]] = 1;
  }

  return permCoord * FB_CORNER_ORI_SIZE + dlf_ori * 3 + dbl_ori;
}

// ============================================================
// Coordinate decoders (for move table generation)
// ============================================================

function decodeFBEdgePermCoord(permCoord: number, positions: number[]): void {
  const ranks = [0, 0, 0];
  let rem = permCoord;
  ranks[2] = rem % 10; rem = (rem / 10) | 0;
  ranks[1] = rem % 11; rem = (rem / 11) | 0;
  ranks[0] = rem;

  const used = new Uint8Array(12);
  for (let i = 0; i < 3; i++) {
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

function decodeFBCornerPermCoord(permCoord: number, positions: number[]): void {
  const ranks = [0, 0];
  ranks[1] = permCoord % 7;
  ranks[0] = (permCoord / 7) | 0;

  const used = new Uint8Array(8);
  for (let i = 0; i < 2; i++) {
    let count = 0;
    for (let j = 0; j < 8; j++) {
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

// ============================================================
// Move tables
// ============================================================

let fbEdgeMoveTable: Int32Array | null = null;
let fbCornerMoveTable: Int32Array | null = null;

export function generateFBEdgeMoveTable(): Int32Array {
  if (fbEdgeMoveTable) return fbEdgeMoveTable;

  const size = FB_EDGE_COORD_SIZE;
  const table = new Int32Array(size * MOVE_COUNT);
  const positions = [0, 0, 0];

  // Non-FB edges for filling remaining slots
  const nonFBEdges: number[] = [];
  for (let e = 0; e < 12; e++) {
    if (e !== DL && e !== FL && e !== BL) nonFBEdges.push(e);
  }

  for (let permCoord = 0; permCoord < FB_EDGE_PERM_SIZE; permCoord++) {
    decodeFBEdgePermCoord(permCoord, positions);

    for (let oriCoord = 0; oriCoord < FB_EDGE_ORI_SIZE; oriCoord++) {
      const coord = permCoord * FB_EDGE_ORI_SIZE + oriCoord;

      const state = createSolvedState();
      const occupied = new Set<number>();
      for (let i = 0; i < 3; i++) occupied.add(positions[i]);

      // Place FB edge pieces at decoded positions
      for (let i = 0; i < 3; i++) {
        state.ep[positions[i]] = FB_EDGE_PIECES[i];
        state.eo[positions[i]] = (oriCoord >> i) & 1;
      }

      // Fill remaining slots with non-FB edges
      let ncIdx = 0;
      for (let s = 0; s < 12; s++) {
        if (!occupied.has(s)) {
          state.ep[s] = nonFBEdges[ncIdx];
          state.eo[s] = 0;
          ncIdx++;
        }
      }

      for (let m = 0; m < MOVE_COUNT; m++) {
        const ns = cloneState(state);
        applyMove(ns, m);
        table[coord * MOVE_COUNT + m] = getFBEdgeCoord(ns);
      }
    }
  }

  fbEdgeMoveTable = table;
  return table;
}

export function generateFBCornerMoveTable(): Int32Array {
  if (fbCornerMoveTable) return fbCornerMoveTable;

  const size = FB_CORNER_COORD_SIZE;
  const table = new Int32Array(size * MOVE_COUNT);
  const positions = [0, 0];

  const nonFBCorners: number[] = [];
  for (let c = 0; c < 8; c++) {
    if (c !== DLF && c !== DBL) nonFBCorners.push(c);
  }

  for (let permCoord = 0; permCoord < FB_CORNER_PERM_SIZE; permCoord++) {
    decodeFBCornerPermCoord(permCoord, positions);

    for (let oriCoord = 0; oriCoord < FB_CORNER_ORI_SIZE; oriCoord++) {
      const coord = permCoord * FB_CORNER_ORI_SIZE + oriCoord;
      const dlf_ori = (oriCoord / 3) | 0;
      const dbl_ori = oriCoord % 3;

      const state = createSolvedState();
      const occupied = new Set<number>();
      for (let i = 0; i < 2; i++) occupied.add(positions[i]);

      state.cp[positions[0]] = DLF;
      state.co[positions[0]] = dlf_ori;
      state.cp[positions[1]] = DBL;
      state.co[positions[1]] = dbl_ori;

      let ncIdx = 0;
      for (let s = 0; s < 8; s++) {
        if (!occupied.has(s)) {
          state.cp[s] = nonFBCorners[ncIdx];
          state.co[s] = 0;
          ncIdx++;
        }
      }

      for (let m = 0; m < MOVE_COUNT; m++) {
        const ns = cloneState(state);
        applyMove(ns, m);
        table[coord * MOVE_COUNT + m] = getFBCornerCoord(ns);
      }
    }
  }

  fbCornerMoveTable = table;
  return table;
}

// ============================================================
// FB goal states: identity + L + L2 + L'
// FB is complete when the block is formed at any L-layer position.
// ============================================================

let fbGoalCoords: number[] | null = null;

export function getFBGoalCoords(): number[] {
  if (fbGoalCoords) return fbGoalCoords;
  const goals: number[] = [];
  for (const lMove of [-1, MOVE_L, MOVE_L2, MOVE_L_PRIME]) {
    const s = createSolvedState();
    if (lMove >= 0) applyMove(s, lMove);
    goals.push(getFBEdgeCoord(s) * FB_CORNER_COORD_SIZE + getFBCornerCoord(s));
  }
  fbGoalCoords = goals;
  return goals;
}

// ============================================================
// Pruning table (5,322,240 entries) — BFS from all 4 goal states
// ============================================================

const UNVISITED = 0xff;
let fbPruningTable: Uint8Array | null = null;

export function generateFBPruningTable(
  onProgress?: (percent: number) => void,
): Uint8Array {
  if (fbPruningTable) return fbPruningTable;

  const edgeMove = generateFBEdgeMoveTable();
  const cornerMove = generateFBCornerMoveTable();
  const size = FB_COORD_SIZE;
  const table = new Uint8Array(size);
  table.fill(UNVISITED);

  const goals = getFBGoalCoords();
  let frontier: number[] = [];
  let filled = 0;
  for (const g of goals) {
    if (table[g] === UNVISITED) {
      table[g] = 0;
      frontier.push(g);
      filled++;
    }
  }
  let depth = 0;

  while (frontier.length > 0 && depth < 20) {
    const nextFrontier: number[] = [];
    for (const coord of frontier) {
      const ec = (coord / FB_CORNER_COORD_SIZE) | 0;
      const cc = coord % FB_CORNER_COORD_SIZE;

      for (let m = 0; m < MOVE_COUNT; m++) {
        const newEc = edgeMove[ec * MOVE_COUNT + m];
        const newCc = cornerMove[cc * MOVE_COUNT + m];
        const newCoord = newEc * FB_CORNER_COORD_SIZE + newCc;

        if (table[newCoord] === UNVISITED) {
          table[newCoord] = depth + 1;
          nextFrontier.push(newCoord);
          filled++;
        }
      }
    }
    depth++;
    frontier = nextFrontier;
    onProgress?.(Math.min(100, (filled / size) * 100));
  }

  fbPruningTable = table;
  return table;
}

// ============================================================
// Public accessors
// ============================================================

export function getFBPruningTable(): Uint8Array {
  if (!fbPruningTable) throw new Error("FB pruning table not initialized");
  return fbPruningTable;
}

export function getFBEdgeMoveTableCached(): Int32Array {
  if (!fbEdgeMoveTable) throw new Error("FB edge move table not initialized");
  return fbEdgeMoveTable;
}

export function getFBCornerMoveTableCached(): Int32Array {
  if (!fbCornerMoveTable) throw new Error("FB corner move table not initialized");
  return fbCornerMoveTable;
}
