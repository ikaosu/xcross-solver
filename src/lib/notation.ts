import {
  Move,
  MOVE_U, MOVE_U_PRIME, MOVE_U2,
  MOVE_D, MOVE_D_PRIME, MOVE_D2,
  MOVE_R, MOVE_R_PRIME, MOVE_R2,
  MOVE_L, MOVE_L_PRIME, MOVE_L2,
  MOVE_F, MOVE_F_PRIME, MOVE_F2,
  MOVE_B, MOVE_B_PRIME, MOVE_B2,
  MOVE_NAMES,
} from "../solver/types";

const NOTATION_MAP: Record<string, Move> = {
  U: MOVE_U, "U'": MOVE_U_PRIME, U2: MOVE_U2,
  D: MOVE_D, "D'": MOVE_D_PRIME, D2: MOVE_D2,
  R: MOVE_R, "R'": MOVE_R_PRIME, R2: MOVE_R2,
  L: MOVE_L, "L'": MOVE_L_PRIME, L2: MOVE_L2,
  F: MOVE_F, "F'": MOVE_F_PRIME, F2: MOVE_F2,
  B: MOVE_B, "B'": MOVE_B_PRIME, B2: MOVE_B2,
};

/**
 * Parse a scramble string into an array of Move indices.
 * Supports standard WCA notation: U, U', U2, R, R', R2, etc.
 */
export function parseScramble(scramble: string): Move[] {
  const tokens = scramble.trim().split(/\s+/).filter(Boolean);
  const moves: Move[] = [];

  for (const token of tokens) {
    // Normalize: replace unicode prime with ASCII
    const normalized = token.replace(/[\u2019\u2018\u0060\u00B4]/g, "'");
    const move = NOTATION_MAP[normalized];
    if (move === undefined) {
      throw new Error(`Invalid move notation: "${token}"`);
    }
    moves.push(move);
  }

  return moves;
}

/**
 * Format an array of Move indices back to standard notation.
 */
export function formatMoves(moves: Move[]): string {
  return moves.map((m) => MOVE_NAMES[m]).join(" ");
}

// ============================================================
// Rotation simplification: any rotation sequence → at most 2 symbols
// ============================================================

const ROT_MAPS: [string, number[]][] = [
  ["",   [0,1,2,3,4,5]],
  ["x",  [5,4,2,3,0,1]], ["x'", [4,5,2,3,1,0]], ["x2", [1,0,2,3,5,4]],
  ["y",  [0,1,4,5,3,2]], ["y'", [0,1,5,4,2,3]], ["y2", [0,1,3,2,5,4]],
  ["z",  [2,3,1,0,4,5]], ["z'", [3,2,0,1,4,5]], ["z2", [1,0,3,2,4,5]],
];

// Precompute: face map → shortest rotation string (all 24 orientations)
const ORIENTATION_TABLE = new Map<string, string>();
for (const [s1, m1] of ROT_MAPS) {
  for (const [s2, m2] of ROT_MAPS) {
    const combined = m1.map(i => m2[i]); // m2 ∘ m1
    const key = combined.join(",");
    const str = [s1, s2].filter(Boolean).join(" ");
    if (!ORIENTATION_TABLE.has(key) || str.length < ORIENTATION_TABLE.get(key)!.length) {
      ORIENTATION_TABLE.set(key, str);
    }
  }
}

/** Simplify a rotation string to at most 2 symbols. */
export function simplifyRotation(rotString: string): string {
  const rots = rotString.trim().split(/\s+/).filter(Boolean);
  if (rots.length === 0) return "";

  // Compute combined face map
  let map = [0, 1, 2, 3, 4, 5];
  for (const r of rots) {
    const entry = ROT_MAPS.find(([s]) => s === r);
    if (!entry) return rotString.trim(); // unknown rotation, return as-is
    map = map.map(i => entry[1][i]);
  }

  return ORIENTATION_TABLE.get(map.join(",")) ?? rotString.trim();
}

/**
 * Validate a scramble string. Returns null if valid, error message if invalid.
 */
export function validateScramble(scramble: string): string | null {
  if (!scramble.trim()) return "Scramble is empty";
  try {
    parseScramble(scramble);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

// ============================================================
// L → Rw conversion for Roux FB display
// ============================================================
// L = Rw x' (wide R then implicit tilt). The x' frame change is
// absorbed into subsequent moves via remapping, so no explicit x
// appears in the output.
//
// Between L...L': moves remap through inv(x') = x direction:
//   U→B, F→U, D→F, B→D, R→R, L→L
// L'/L pairs cancel the frame back to identity.

/**
 * Convert L/L'/L2 to Rw/Rw'/Rw2.
 *
 * 1. Substitute: L = Rw x', L' = x Rw', L2 = Rw2 x2
 * 2. Absorb all x rotations to the front (right-to-left scan,
 *    remapping moves through accumulated rotation).
 *    Balanced L/L' pairs cancel; residual goes to rotationSuffix.
 */
export function convertToRw(moves: Move[]): { moves: string; rotationSuffix: string } {
  // Step 1: Build token list with Rw + x rotation substitutions
  const tokens: string[] = [];
  for (const m of moves) {
    const face = (m / 3) | 0;
    const variant = m % 3;
    if (face === 3) { // L face
      if (variant === 0)      { tokens.push("Rw", "x'"); }   // L  = Rw x'
      else if (variant === 1) { tokens.push("x", "Rw'"); }   // L' = x Rw'
      else                    { tokens.push("Rw2", "x2"); }   // L2 = Rw2 x2
    } else {
      tokens.push(MOVE_NAMES[m]);
    }
  }

  // Step 2: Absorb x rotations to front (right-to-left)
  // R tracks accumulated rotation (all x's to the right of current position).
  // Moves are remapped: M' = R[M.face] (same direction, NOT inverse).
  const X  = [5, 4, 2, 3, 0, 1]; // x:  U→B, D→F, F→U, B→D
  const XP = [4, 5, 2, 3, 1, 0]; // x': U→F, D→B, F→D, B→U
  const X2 = [1, 0, 2, 3, 5, 4]; // x2: U↔D, F↔B
  const ID = [0, 1, 2, 3, 4, 5];

  // compose(a, b) = b ∘ a: apply a first, then b
  function compose(a: number[], b: number[]): number[] {
    return a.map(i => b[i]);
  }

  let R = ID.slice();
  const result: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t === "x")       { R = compose(X, R); }
    else if (t === "x'") { R = compose(XP, R); }
    else if (t === "x2") { R = compose(X2, R); }
    else if (t.startsWith("Rw")) {
      result.unshift(t); // R axis unchanged by x, no remap needed
    } else {
      // Standard move: remap face through R
      const mi = MOVE_NAMES.indexOf(t);
      if (mi >= 0) {
        const face = (mi / 3) | 0;
        const variant = mi % 3;
        result.unshift(MOVE_NAMES[R[face] * 3 + variant]);
      } else {
        result.unshift(t);
      }
    }
  }

  // R is the residual prefix rotation
  let rotationSuffix = "";
  if (R[0] === 5 && R[1] === 4) rotationSuffix = " x";
  else if (R[0] === 4 && R[1] === 5) rotationSuffix = " x'";
  else if (R[0] === 1 && R[1] === 0) rotationSuffix = " x2";

  return { moves: result.join(" "), rotationSuffix };
}
