import {
  NUM_EDGES,
  NUM_CORNERS,
  EDGE_PERM_CYCLES,
  CORNER_PERM_CYCLES,
  EDGE_ORI_DELTA,
  CORNER_ORI_DELTA,
  CROSS_EDGES,
} from "./constants";
import { Move, MOVE_COUNT, moveFace } from "./types";

/**
 * CubeState represents a full Rubik's cube state using arrays for
 * edge/corner permutation and orientation.
 *
 * ep[i] = which edge piece is in slot i
 * eo[i] = orientation of the edge piece in slot i (0 or 1)
 * cp[i] = which corner piece is in slot i
 * co[i] = orientation of the corner piece in slot i (0, 1, or 2)
 */
export interface CubeState {
  ep: Int8Array; // length 12
  eo: Int8Array; // length 12
  cp: Int8Array; // length 8
  co: Int8Array; // length 8
}

export function createSolvedState(): CubeState {
  const ep = new Int8Array(NUM_EDGES);
  const eo = new Int8Array(NUM_EDGES);
  const cp = new Int8Array(NUM_CORNERS);
  const co = new Int8Array(NUM_CORNERS);
  for (let i = 0; i < NUM_EDGES; i++) ep[i] = i;
  for (let i = 0; i < NUM_CORNERS; i++) cp[i] = i;
  return { ep, eo, cp, co };
}

export function cloneState(s: CubeState): CubeState {
  return {
    ep: new Int8Array(s.ep),
    eo: new Int8Array(s.eo),
    cp: new Int8Array(s.cp),
    co: new Int8Array(s.co),
  };
}

// ============================================================
// Apply a single move to a CubeState (mutates in place)
// ============================================================

function applyCWQuarter(s: CubeState, face: number): void {
  const eCycle = EDGE_PERM_CYCLES[face];
  const cCycle = CORNER_PERM_CYCLES[face];
  const eOriDelta = EDGE_ORI_DELTA[face];
  const cOriDelta = CORNER_ORI_DELTA[face];

  // Edge permutation: a->b->c->d->a means slot[b]=old[a], slot[c]=old[b], etc.
  const tmpEp = s.ep[eCycle[3]];
  const tmpEo = s.eo[eCycle[3]];
  for (let i = 3; i > 0; i--) {
    s.ep[eCycle[i]] = s.ep[eCycle[i - 1]];
    s.eo[eCycle[i]] = (s.eo[eCycle[i - 1]] + eOriDelta[i - 1]) % 2 as number;
  }
  s.ep[eCycle[0]] = tmpEp;
  s.eo[eCycle[0]] = (tmpEo + eOriDelta[3]) % 2 as number;

  // Corner permutation
  const tmpCp = s.cp[cCycle[3]];
  const tmpCo = s.co[cCycle[3]];
  for (let i = 3; i > 0; i--) {
    s.cp[cCycle[i]] = s.cp[cCycle[i - 1]];
    s.co[cCycle[i]] = (s.co[cCycle[i - 1]] + cOriDelta[i - 1]) % 3 as number;
  }
  s.cp[cCycle[0]] = tmpCp;
  s.co[cCycle[0]] = (tmpCo + cOriDelta[3]) % 3 as number;
}

function applyCCWQuarter(s: CubeState, face: number): void {
  // CCW = 3 × CW
  applyCWQuarter(s, face);
  applyCWQuarter(s, face);
  applyCWQuarter(s, face);
}

function applyHalfTurn(s: CubeState, face: number): void {
  applyCWQuarter(s, face);
  applyCWQuarter(s, face);
}

/**
 * Apply a move (0..17) to a CubeState in place.
 * Move index = face * 3 + variant (0=CW, 1=CCW, 2=180)
 */
export function applyMove(s: CubeState, m: Move): void {
  const face = moveFace(m);
  const variant = m % 3;
  if (variant === 0) applyCWQuarter(s, face);
  else if (variant === 1) applyCCWQuarter(s, face);
  else applyHalfTurn(s, face);
}

/**
 * Apply a sequence of moves.
 */
export function applyMoves(s: CubeState, moves: Move[]): void {
  for (const m of moves) applyMove(s, m);
}

// ============================================================
// Coordinate encoding for cross (4 D-layer edges)
// ============================================================

/**
 * Encode cross edge permutation coordinate.
 * Tracks where cross edge pieces (DR=4, DF=5, DL=6, DB=7) are located
 * among the 12 edge slots.
 *
 * We encode this as a mixed-radix number representing the positions
 * of the 4 cross edges among 12 slots.
 *
 * Returns a value in [0, 11880) = 12 * 11 * 10 * 9
 */
export function getCrossPermCoord(s: CubeState): number {
  // Find where each cross edge piece is located
  const pos = new Int8Array(4); // pos[i] = slot index of cross edge i
  for (let slot = 0; slot < NUM_EDGES; slot++) {
    const piece = s.ep[slot];
    if (piece >= 4 && piece <= 7) {
      pos[piece - 4] = slot;
    }
  }

  // Encode as Lehmer-like code
  // We track positions of pieces 4,5,6,7 (DR,DF,DL,DB) in order
  let coord = 0;
  const used = new Uint8Array(12);

  for (let i = 0; i < 4; i++) {
    // Count how many unused slots are before pos[i]
    let rank = 0;
    for (let j = 0; j < pos[i]; j++) {
      if (!used[j]) rank++;
    }
    coord = coord * (12 - i) + rank;
    used[pos[i]] = 1;
  }

  return coord;
}

/**
 * Encode cross edge orientation coordinate.
 * 4 edges × 2 orientations = 16 values [0, 16)
 */
export function getCrossOriCoord(s: CubeState): number {
  let coord = 0;
  for (let slot = 0; slot < NUM_EDGES; slot++) {
    const piece = s.ep[slot];
    if (piece >= 4 && piece <= 7) {
      const idx = piece - 4; // 0..3
      coord |= (s.eo[slot] & 1) << idx;
    }
  }
  return coord;
}

/**
 * Combined cross coordinate = crossPerm * 16 + crossOri
 * Range: [0, 190080)
 */
export function getCrossCoord(s: CubeState): number {
  return getCrossPermCoord(s) * 16 + getCrossOriCoord(s);
}

export const CROSS_COORD_SIZE = 11880 * 16; // 190,080

// ============================================================
// Coordinate encoding for a single corner (for xcross)
// ============================================================

/**
 * Encode a corner's position and orientation.
 * cornerPiece: which corner piece (0..7) to track
 * Returns: position * 3 + orientation, range [0, 24)
 */
export function getCornerCoord(s: CubeState, cornerPiece: number): number {
  for (let slot = 0; slot < NUM_CORNERS; slot++) {
    if (s.cp[slot] === cornerPiece) {
      return slot * 3 + s.co[slot];
    }
  }
  return 0; // should never happen
}

export const CORNER_COORD_SIZE = 24; // 8 * 3

// ============================================================
// Coordinate encoding for a single edge (non-cross, for xcross)
// ============================================================

/**
 * Encode a non-cross edge's position and orientation.
 * edgePiece: which edge piece (0..11) to track (should be 0-3 or 8-11)
 * Returns: position * 2 + orientation, range [0, 24)
 */
export function getEdgeCoord(s: CubeState, edgePiece: number): number {
  for (let slot = 0; slot < NUM_EDGES; slot++) {
    if (s.ep[slot] === edgePiece) {
      return slot * 2 + s.eo[slot];
    }
  }
  return 0; // should never happen
}

export const EDGE_COORD_SIZE = 24; // 12 * 2

// ============================================================
// Combined coordinates for pruning tables
// ============================================================

/**
 * Cross + Corner combined coordinate
 * = crossCoord * 24 + cornerCoord
 * Range: [0, 4,561,920)
 */
export function getCrossCornerCoord(s: CubeState, cornerPiece: number): number {
  return getCrossCoord(s) * CORNER_COORD_SIZE + getCornerCoord(s, cornerPiece);
}

export const CROSS_CORNER_COORD_SIZE = CROSS_COORD_SIZE * CORNER_COORD_SIZE; // 4,561,920

/**
 * Cross + Edge combined coordinate
 * = crossCoord * 24 + edgeCoord
 * Range: [0, 4,561,920)
 */
export function getCrossEdgeCoord(s: CubeState, edgePiece: number): number {
  return getCrossCoord(s) * EDGE_COORD_SIZE + getEdgeCoord(s, edgePiece);
}

export const CROSS_EDGE_COORD_SIZE = CROSS_COORD_SIZE * EDGE_COORD_SIZE; // 4,561,920

// ============================================================
// Goal state checks
// ============================================================

/**
 * Check if the cross is solved (D-face edges in correct position and orientation).
 */
export function isCrossSolved(s: CubeState): boolean {
  for (const e of CROSS_EDGES) {
    if (s.ep[e] !== e || s.eo[e] !== 0) return false;
  }
  return true;
}

/**
 * Check if an F2L slot is solved (corner and edge in correct position and orientation).
 */
export function isSlotSolved(s: CubeState, cornerPiece: number, edgePiece: number): boolean {
  // Corner must be in its home slot with orientation 0
  if (s.cp[cornerPiece] !== cornerPiece || s.co[cornerPiece] !== 0) return false;
  // Edge must be in its home slot with orientation 0
  if (s.ep[edgePiece] !== edgePiece || s.eo[edgePiece] !== 0) return false;
  return true;
}
